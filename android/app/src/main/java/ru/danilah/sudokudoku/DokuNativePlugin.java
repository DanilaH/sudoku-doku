package ru.danilah.sudokudoku;

import android.util.AtomicFile;
import android.os.SystemClock;
import android.content.SharedPreferences;
import com.yandex.mobile.ads.rewarded.*;
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
 private long nextInterstitial=0,nextReward=0,nextBanner=0;
 private boolean rewardLoading=false,rewardShown=false,rewardEarned=false;
 private RewardedAdLoader rewardLoader;
 private RewardedAd rewardAd,displayedReward;
 private PluginCall pendingReward;
 private String rewardId="";
 private SharedPreferences rewards(){return getContext().getSharedPreferences("hint-reward",0);}
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
  if(BuildConfig.ADS_ENABLED) getActivity().runOnUiThread(()->YandexAds.initialize(getContext(),()->{initialized=true;notifyListeners("adsReady",new JSObject(),true);preload();preloadReward();}));
 }
 private void runDisk(PluginCall call,Runnable task){try{disk.execute(task);}catch(java.util.concurrent.RejectedExecutionException e){call.reject("Activity is closing; previous confirmed save is retained",e);}}
 @PluginMethod public void read(PluginCall call){runDisk(call,()->{try{JSObject result=new JSObject();if(!save.getBaseFile().exists()&&!new File(save.getBaseFile()+".bak").exists()){result.put("value",org.json.JSONObject.NULL);}else{result.put("value",new String(save.readFully(),StandardCharsets.UTF_8));}call.resolve(result);}catch(Exception e){call.reject("Не удалось прочитать сохранение",e);}});}
 @PluginMethod public void write(PluginCall call){String value=call.getString("value");if(value==null){call.reject("Missing value");return;}runDisk(call,()->{FileOutputStream stream=null;try{stream=save.startWrite();stream.write(value.getBytes(StandardCharsets.UTF_8));save.finishWrite(stream);call.resolve();}catch(Exception e){if(stream!=null)save.failWrite(stream);call.reject("Не удалось записать сохранение",e);}});}
 @PluginMethod public void keepAwake(PluginCall call){getActivity().runOnUiThread(()->{if(Boolean.TRUE.equals(call.getBoolean("enabled",false)))getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);call.resolve();});}
 @PluginMethod public void event(PluginCall call){if(analytics){String name=call.getString("name","event"),params=call.getString("params","{}");AppMetrica.reportEvent(name,params);}call.resolve();}
 private void report(String name,String format,String code){android.util.Log.i("DokuAds",name+":"+format+":"+code);if(analytics)AppMetrica.reportEvent(name,new JSObject().put("format",format).put("code",code).toString());}
 @PluginMethod public void prepareAd(PluginCall call){getActivity().runOnUiThread(()->{preload();preloadReward();notifyListeners("adsReady",new JSObject());call.resolve();});}
 private void preload(){if(!BuildConfig.ADS_ENABLED||BuildConfig.FORCE_NO_FILL||!initialized||!active||SystemClock.elapsedRealtime()<nextInterstitial||loading||interstitial!=null||getActivity().isDestroyed()||BuildConfig.INTERSTITIAL_ID.isEmpty())return;loading=true;report("ad_request","interstitial","");if(loader==null)loader=new InterstitialAdLoader(getContext());loader.loadAd(new AdRequest.Builder(BuildConfig.INTERSTITIAL_ID).build(),new InterstitialAdLoadListener(){public void onAdLoaded(InterstitialAd ad){loading=false;if(getActivity().isDestroyed()){ad.setAdEventListener(null);return;}interstitial=ad;report("ad_load","interstitial","");}public void onAdFailedToLoad(AdRequestError e){loading=false;nextInterstitial=SystemClock.elapsedRealtime()+30000;report("ad_failure","interstitial",String.valueOf(e.getCode()));}});}
 @PluginMethod public void showAd(PluginCall call){getActivity().runOnUiThread(()->{
  if(pendingAd!=null||pendingReward!=null||interstitial==null||!active||getActivity().isFinishing()){preload();call.resolve(new JSObject().put("shown",false));return;}
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
   if(width<280*density||availableHeight<=0){destroyBanner();call.resolve();return;}
   BannerAdSize size=BannerAdSize.sticky(getContext(),Math.round(width/density));int height=size.getHeightInPixels(getContext());
   if(height>availableHeight){destroyBanner();call.resolve(new JSObject().put("height",height/scale));return;}
   FrameLayout parent=getActivity().findViewById(android.R.id.content);int[] webLoc=new int[2],rootLoc=new int[2];getBridge().getWebView().getLocationOnScreen(webLoc);parent.getLocationOnScreen(rootLoc);
   int left=webLoc[0]-rootLoc[0]+Math.round(call.getFloat("left",0f)*scale),top=webLoc[1]-rootLoc[1]+Math.round(call.getFloat("top",0f)*scale)+(availableHeight-height)/2;
   if(banner!=null&&bannerWidth!=width)destroyBanner();
   boolean fresh=banner==null;if(fresh&&SystemClock.elapsedRealtime()<nextBanner){call.resolve();return;}if(fresh){banner=new BannerAdView(getContext());bannerWidth=width;banner.setAdSize(size);parent.addView(banner);}
   BannerPlacement.place(banner,parent,left,top,width,height);banner.setVisibility(View.VISIBLE);
   if(fresh){banner.setBannerAdEventListener(new BannerAdEventListener(){public void onAdLoaded(){if(!active||getActivity().isDestroyed())destroyBanner();report("ad_load","banner","");}public void onAdFailedToLoad(AdRequestError e){nextBanner=SystemClock.elapsedRealtime()+30000;destroyBanner();report("ad_failure","banner",String.valueOf(e.getCode()));}public void onAdClicked(){}public void onImpression(ImpressionData d){report("ad_impression","banner","");}});report("ad_request","banner","");banner.loadAd(new AdRequest.Builder(BuildConfig.BANNER_ID).build());}
   call.resolve(new JSObject().put("height",height/scale));
  }catch(Exception e){destroyBanner();call.reject("Banner unavailable",e);}
 });}
 private void preloadReward(){
  if(!BuildConfig.ADS_ENABLED||BuildConfig.FORCE_NO_FILL||!initialized||!active||rewardLoading||rewardAd!=null||getActivity().isDestroyed()||BuildConfig.REWARDED_ID.isEmpty()||SystemClock.elapsedRealtime()<nextReward)return;
  rewardLoading=true;if(rewardLoader==null)rewardLoader=new RewardedAdLoader(getContext());report("ad_request","rewarded","");
  rewardLoader.loadAd(new AdRequest.Builder(BuildConfig.REWARDED_ID).build(),new RewardedAdLoadListener(){
   public void onAdLoaded(RewardedAd ad){rewardLoading=false;if(getActivity().isDestroyed()){ad.setAdEventListener(null);return;}rewardAd=ad;report("ad_load","rewarded","");}
   public void onAdFailedToLoad(AdRequestError e){rewardLoading=false;nextReward=SystemClock.elapsedRealtime()+30000;report("ad_failure","rewarded",String.valueOf(e.getCode()));}
  });
 }
 @PluginMethod public void readReward(PluginCall call){SharedPreferences p=rewards();call.resolve(new JSObject().put("id",p.getString("id","" )).put("gameId",p.getString("gameId","")));}
 @PluginMethod public void ackReward(PluginCall call){SharedPreferences p=rewards();if(p.getString("id","").equals(call.getString("id",""))&&!p.edit().clear().commit()){call.reject("Reward acknowledgement failed");return;}call.resolve();}
 @PluginMethod public void showReward(PluginCall call){getActivity().runOnUiThread(()->{
  String gameId=call.getString("gameId","");
  if(gameId.isEmpty()||pendingReward!=null||pendingAd!=null||rewardAd==null||!active||getActivity().isFinishing()||!rewards().getString("id","").isEmpty()){preloadReward();call.resolve(new JSObject().put("rewarded",false).put("shown",false));return;}
  pendingReward=call;rewardShown=false;rewardEarned=false;rewardId=java.util.UUID.randomUUID().toString();
  RewardedAd ad=rewardAd;rewardAd=null;displayedReward=ad;
  ad.setAdEventListener(new RewardedAdEventListener(){
   public void onAdShown(){rewardShown=true;}
   public void onAdFailedToShow(AdError e){ad.setAdEventListener(null);report("ad_failure","rewarded",e.getDescription());finishReward();preloadReward();}
   public void onAdDismissed(){ad.setAdEventListener(null);finishReward();preloadReward();}
   public void onAdClicked(){}
   public void onAdImpression(ImpressionData d){report("ad_impression","rewarded","");}
   public void onRewarded(Reward reward){if(rewardEarned)return;rewardEarned=true;
    boolean saved=rewards().edit().putString("id",rewardId).putString("gameId",gameId).commit();
    if(!saved)report("reward_journal_failure","rewarded","");
    notifyListeners("hintReward",new JSObject().put("id",rewardId).put("gameId",gameId));report("ad_reward","rewarded","");
   }
  });
  try{ad.show(getActivity());}catch(Exception e){ad.setAdEventListener(null);finishReward();preloadReward();}
 });}
 private void finishReward(){PluginCall call=pendingReward;pendingReward=null;displayedReward=null;if(call!=null)call.resolve(new JSObject().put("rewarded",rewardEarned).put("shown",rewardShown).put("rewardId",rewardEarned?rewardId:""));}
 private void destroyBanner(){if(banner!=null){banner.setBannerAdEventListener(null);banner.destroy();if(banner.getParent() instanceof ViewGroup)((ViewGroup)banner.getParent()).removeView(banner);banner=null;bannerWidth=0;}}
 @Override protected void handleOnPause(){active=false;destroyBanner();getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);}
 @Override protected void handleOnResume(){active=true;preload();preloadReward();notifyListeners("adsReady",new JSObject());}
 @Override protected void handleOnDestroy(){if(rewardAd!=null)rewardAd.setAdEventListener(null);if(displayedReward!=null)displayedReward.setAdEventListener(null);rewardAd=null;rewardLoader=null;finishReward();destroyBanner();if(interstitial!=null)interstitial.setAdEventListener(null);interstitial=null;if(displayed!=null)displayed.setAdEventListener(null);loader=null;finishAd(false);disk.shutdown();}
}
