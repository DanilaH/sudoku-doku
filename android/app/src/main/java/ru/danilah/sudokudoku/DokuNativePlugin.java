package ru.danilah.sudokudoku;

import android.util.AtomicFile;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.yandex.mobile.ads.common.*;
import com.yandex.mobile.ads.banner.*;
import com.yandex.mobile.ads.interstitial.*;
import io.appmetrica.analytics.AppMetrica;
import io.appmetrica.analytics.AppMetricaConfig;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name="DokuNative")
public class DokuNativePlugin extends Plugin {
 private final ExecutorService disk=Executors.newSingleThreadExecutor();
 private AtomicFile save;
 private boolean initialized=false,loading=false,shown=false,analytics=false,active=true;
 private BannerAdView banner;
 private int bannerWidth=0;
 private InterstitialAdLoader loader;
 private InterstitialAd interstitial;
 private InterstitialAd displayed;
 private PluginCall pendingAd;
 @Override public void load(){
  save=new AtomicFile(new File(getContext().getFilesDir(),"sudoku-v1.json"));
  if(!BuildConfig.APPMETRICA_KEY.isEmpty()){
   AppMetrica.activate(getContext(),AppMetricaConfig.newConfigBuilder(BuildConfig.APPMETRICA_KEY).withLocationTracking(false).build());analytics=true;
  }
  if(BuildConfig.ADS_ENABLED) getActivity().runOnUiThread(()->YandexAds.initialize(getContext(),()->{initialized=true;notifyListeners("adsReady",new JSObject(),true);preload();}));
 }
 @PluginMethod public void read(PluginCall call){disk.execute(()->{try{JSObject result=new JSObject();if(!save.getBaseFile().exists()&&!new File(save.getBaseFile()+".bak").exists()){result.put("value",org.json.JSONObject.NULL);}else{result.put("value",new String(save.readFully(),StandardCharsets.UTF_8));}call.resolve(result);}catch(Exception e){call.reject("Не удалось прочитать сохранение",e);}});}
 @PluginMethod public void write(PluginCall call){String value=call.getString("value");if(value==null){call.reject("Missing value");return;}disk.execute(()->{FileOutputStream stream=null;try{stream=save.startWrite();stream.write(value.getBytes(StandardCharsets.UTF_8));save.finishWrite(stream);call.resolve();}catch(Exception e){if(stream!=null)save.failWrite(stream);call.reject("Не удалось записать сохранение",e);}});}
 @PluginMethod public void keepAwake(PluginCall call){getActivity().runOnUiThread(()->{if(Boolean.TRUE.equals(call.getBoolean("enabled",false)))getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);call.resolve();});}
 @PluginMethod public void event(PluginCall call){if(analytics){String name=call.getString("name","event"),params=call.getString("params","{}");AppMetrica.reportEvent(name,params);}call.resolve();}
 private void report(String name,String format,String code){if(analytics)AppMetrica.reportEvent(name,new JSObject().put("format",format).put("code",code).toString());}
 @PluginMethod public void prepareAd(PluginCall call){getActivity().runOnUiThread(()->{preload();call.resolve();});}
 private void preload(){if(!BuildConfig.ADS_ENABLED||BuildConfig.FORCE_NO_FILL||!initialized||loading||interstitial!=null||getActivity().isDestroyed()||BuildConfig.INTERSTITIAL_ID.isEmpty())return;loading=true;report("ad_request","interstitial","");if(loader==null)loader=new InterstitialAdLoader(getContext());loader.loadAd(new AdRequest.Builder(BuildConfig.INTERSTITIAL_ID).build(),new InterstitialAdLoadListener(){public void onAdLoaded(InterstitialAd ad){loading=false;if(getActivity().isDestroyed()){ad.setAdEventListener(null);return;}interstitial=ad;report("ad_load","interstitial","");}public void onAdFailedToLoad(AdRequestError e){loading=false;report("ad_failure","interstitial",String.valueOf(e.getCode()));}});}
 @PluginMethod public void showAd(PluginCall call){getActivity().runOnUiThread(()->{
  if(pendingAd!=null||interstitial==null||!active||getActivity().isFinishing()){call.resolve(new JSObject().put("shown",false));return;}
  pendingAd=call;shown=false;InterstitialAd ad=interstitial;interstitial=null;displayed=ad;
  ad.setAdEventListener(new InterstitialAdEventListener(){public void onAdShown(){shown=true;}public void onAdFailedToShow(AdError e){report("ad_failure","interstitial",e.getDescription());ad.setAdEventListener(null);finishAd(false);}public void onAdDismissed(){ad.setAdEventListener(null);finishAd(shown);preload();}public void onAdClicked(){}public void onAdImpression(ImpressionData data){notifyListeners("adImpression",new JSObject());report("ad_impression","interstitial","");}});
  try{ad.show(getActivity());}catch(Exception e){ad.setAdEventListener(null);finishAd(false);}
 });}
 private void finishAd(boolean didShow){PluginCall c=pendingAd;pendingAd=null;displayed=null;if(c!=null)c.resolve(new JSObject().put("shown",didShow));}
 @PluginMethod public void banner(PluginCall call){getActivity().runOnUiThread(()->{
  boolean visible=Boolean.TRUE.equals(call.getBoolean("visible",false));
  if(!BuildConfig.ADS_ENABLED||BuildConfig.FORCE_NO_FILL||!visible||!active||!initialized||BuildConfig.BANNER_ID.isEmpty()){destroyBanner();call.resolve();return;}
  try{
   float density=getContext().getResources().getDisplayMetrics().density;
   float scale=getBridge().getWebView().getWidth()/call.getFloat("viewportWidth",1f);
   int width=Math.round(call.getFloat("width",0f)*scale),availableHeight=Math.round(call.getFloat("height",0f)*scale);
   BannerAdSize size=BannerAdSize.sticky(getContext(),Math.round(width/density));int height=size.getHeightInPixels(getContext());
   if(height>availableHeight||width<280*density){destroyBanner();call.resolve();return;}
   FrameLayout parent=getActivity().findViewById(android.R.id.content);int[] webLoc=new int[2],rootLoc=new int[2];getBridge().getWebView().getLocationOnScreen(webLoc);parent.getLocationOnScreen(rootLoc);
   int left=webLoc[0]-rootLoc[0]+Math.round(call.getFloat("left",0f)*scale),top=webLoc[1]-rootLoc[1]+Math.round(call.getFloat("top",0f)*scale)+(availableHeight-height)/2;
   if(banner!=null&&bannerWidth!=width)destroyBanner();
   boolean fresh=banner==null;if(fresh){banner=new BannerAdView(getContext());bannerWidth=width;banner.setAdSize(size);parent.addView(banner);}
   FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(width,height);lp.leftMargin=left;lp.topMargin=top;banner.setLayoutParams(lp);banner.setVisibility(View.VISIBLE);
   if(fresh){banner.setBannerAdEventListener(new BannerAdEventListener(){public void onAdLoaded(){if(!active||getActivity().isDestroyed())destroyBanner();report("ad_load","banner","");}public void onAdFailedToLoad(AdRequestError e){report("ad_failure","banner",String.valueOf(e.getCode()));}public void onAdClicked(){}public void onImpression(ImpressionData d){report("ad_impression","banner","");}});report("ad_request","banner","");banner.loadAd(new AdRequest.Builder(BuildConfig.BANNER_ID).build());}
   call.resolve();
  }catch(Exception e){destroyBanner();call.reject("Banner unavailable",e);}
 });}
 private void destroyBanner(){if(banner!=null){banner.setBannerAdEventListener(null);banner.destroy();if(banner.getParent() instanceof ViewGroup)((ViewGroup)banner.getParent()).removeView(banner);banner=null;bannerWidth=0;}}
 @Override protected void handleOnPause(){active=false;destroyBanner();getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);}
 @Override protected void handleOnResume(){active=true;}
 @Override protected void handleOnDestroy(){destroyBanner();if(interstitial!=null)interstitial.setAdEventListener(null);interstitial=null;if(displayed!=null)displayed.setAdEventListener(null);loader=null;finishAd(false);disk.shutdown();}
}
