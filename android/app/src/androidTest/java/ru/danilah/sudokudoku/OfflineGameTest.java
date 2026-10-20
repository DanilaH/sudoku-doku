package ru.danilah.sudokudoku;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import android.content.Context;
import android.util.AtomicFile;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class OfflineGameTest {
 private android.webkit.WebView webView(MainActivity a){android.webkit.WebView web=findWebView(a.getWindow().getDecorView());assertNotNull("WebView exists",web);return web;}
 private android.webkit.WebView findWebView(android.view.View view){
  if(view instanceof android.webkit.WebView)return (android.webkit.WebView)view;
  if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++){android.webkit.WebView web=findWebView(group.getChildAt(i));if(web!=null)return web;}}
  return null;
 }
 private void screenshot(String name)throws Exception{
  // WebView DOM changes precede the emulator compositor; wait for the displayed frame.
  InstrumentationRegistry.getInstrumentation().waitForIdleSync();
  Thread.sleep(2000);
  android.graphics.Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
  File path=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),name);
  try(java.io.FileOutputStream out=new java.io.FileOutputStream(path)){assertTrue(bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));}
  bitmap.recycle();
 }
 private String evaluate(ActivityScenario<MainActivity> scenario,String js)throws Exception{
  CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
  scenario.onActivity(a->webView(a).evaluateJavascript(js,v->{result.set(v);latch.countDown();}));
  assertTrue("JS callback",latch.await(5,TimeUnit.SECONDS));return result.get();
 }
 private void tap(ActivityScenario<MainActivity> s,String selector)throws Exception{
  String encoded=evaluate(s,"(()=>{const r=document.querySelector('"+selector+"').getBoundingClientRect();return JSON.stringify([r.x+r.width/2,r.y+r.height/2,innerWidth])})()");
  String json=(String)new org.json.JSONTokener(encoded).nextValue();org.json.JSONArray point=new org.json.JSONArray(json);float[] screen=new float[2];
  s.onActivity(a->{int[] loc=new int[2];webView(a).getLocationOnScreen(loc);try{float scale=(float)(webView(a).getWidth()/point.getDouble(2));screen[0]=loc[0]+(float)point.getDouble(0)*scale;screen[1]=loc[1]+(float)point.getDouble(1)*scale;}catch(Exception e){throw new RuntimeException(e);}});
  long now=android.os.SystemClock.uptimeMillis();android.app.Instrumentation inst=InstrumentationRegistry.getInstrumentation();
  android.view.MotionEvent down=android.view.MotionEvent.obtain(now,now,android.view.MotionEvent.ACTION_DOWN,screen[0],screen[1],0),up=android.view.MotionEvent.obtain(now,now+50,android.view.MotionEvent.ACTION_UP,screen[0],screen[1],0);
  inst.sendPointerSync(down);inst.sendPointerSync(up);down.recycle();up.recycle();
 }
 private void waitFor(ActivityScenario<MainActivity>s,String condition)throws Exception{
  long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(15);
  while(System.nanoTime()<end){if("true".equals(evaluate(s,condition)))return;Thread.sleep(100);}
  fail("Condition timed out: "+condition+"; page="+evaluate(s,"document.body.innerText"));
 }
 @Test public void onlineDemoAdProbe()throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  new AtomicFile(new File(context.getFilesDir(),"sudoku-v1.json")).delete();
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('.new-game .primary')");
   evaluate(s,"document.querySelector('.new-game .primary').click()");waitFor(s,"!!document.querySelector('.difficulty-list button')");
   evaluate(s,"document.querySelector('.difficulty-list button').click()");waitFor(s,"!!document.querySelector('.ad-slot')");
   Thread.sleep(35000);screenshot("online-demo-banner.png");
  }
 }
 @Test public void nativeBannerMatchesReservedSlot()throws Exception{
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('.new-game .primary')");
   evaluate(s,"document.querySelector('.new-game .primary').click()");waitFor(s,"!!document.querySelector('.difficulty-list button')");
   evaluate(s,"document.querySelector('.difficulty-list button').click()");waitFor(s,"!!document.querySelector('.ad-slot')");
   assertEquals("true",evaluate(s,"innerHeight>=740 && document.querySelector('.ad-slot').getBoundingClientRect().bottom<=innerHeight"));
   AtomicReference<android.view.View> found=new AtomicReference<>();
   String data=evaluate(s,"JSON.stringify((()=>{const r=document.querySelector('.ad-slot').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,viewport:innerWidth}})())");
   org.json.JSONObject rect=new org.json.JSONObject(new org.json.JSONTokener(data).nextValue().toString());
   // Deterministic native view uses the production placement code, independently of ad fill.
   s.onActivity(a->{android.widget.FrameLayout root=a.findViewById(android.R.id.content);android.view.View view=new android.view.View(a);view.setBackgroundColor(0xffaabbcc);root.addView(view);found.set(view);int[] wl=new int[2],rl=new int[2];webView(a).getLocationOnScreen(wl);root.getLocationOnScreen(rl);try{double scale=webView(a).getWidth()/rect.getDouble("viewport");BannerPlacement.place(view,root,wl[0]-rl[0]+(int)Math.round(rect.getDouble("x")*scale),wl[1]-rl[1]+(int)Math.round(rect.getDouble("y")*scale),(int)Math.round(rect.getDouble("w")*scale),(int)Math.round(rect.getDouble("h")*scale));}catch(org.json.JSONException e){throw new AssertionError(e);}});
   InstrumentationRegistry.getInstrumentation().waitForIdleSync();Thread.sleep(300);
   s.onActivity(a->{android.view.View view=found.get();android.webkit.WebView web=webView(a);int[] loc=new int[2],wl=new int[2];view.getLocationOnScreen(loc);web.getLocationOnScreen(wl);try{double scale=web.getWidth()/rect.getDouble("viewport");assertEquals("Banner left matches web slot",wl[0]+rect.getDouble("x")*scale,loc[0],2);assertTrue("Banner top inside slot",loc[1]>=wl[1]+rect.getDouble("y")*scale-2);assertTrue("Banner bottom inside slot",loc[1]+view.getHeight()<=wl[1]+(rect.getDouble("y")+rect.getDouble("h"))*scale+2);}catch(org.json.JSONException e){throw new AssertionError(e);}});
   screenshot("banner-slot-portrait.png");
  }
 }
 @Test public void systemBackReturnsHomeAndExits()throws Exception{
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('.new-game')");
   evaluate(s,"document.querySelector('.calendar-link').click()");
   waitFor(s,"!!document.querySelector('.calendar')");
   InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);
   waitFor(s,"!!document.querySelector('.new-game')");
   AtomicReference<MainActivity> activity=new AtomicReference<>();s.onActivity(activity::set);
   InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);
   Thread.sleep(1000);
   assertTrue("Back from Home finishes the activity",activity.get().isFinishing());
  }
 }
 @Test public void offlineFirstLaunchAndNativeSaveRestore()throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  new AtomicFile(new File(context.getFilesDir(),"sudoku-v1.json")).delete();
  int cell;
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('.new-game .primary')");
   s.onActivity(a->{int[] xy=new int[2];webView(a).getLocationOnScreen(xy);android.view.WindowInsets insets=a.getWindow().getDecorView().getRootWindowInsets();assertNotNull(insets);assertTrue("WebView below status bar",xy[1]>=insets.getInsets(android.view.WindowInsets.Type.systemBars()).top);});
   assertEquals("true",evaluate(s,"document.documentElement.scrollHeight <= innerHeight"));
   screenshot("android-home-06.png");
   evaluate(s,"document.querySelector('.calendar-link').click()");
   waitFor(s,"!!document.querySelector('.page-daily')");Thread.sleep(250);screenshot("store-calendar.png");
   evaluate(s,"document.querySelector('.top button').click()");waitFor(s,"!!document.querySelector('.new-game')");
   evaluate(s,"document.querySelector('.home-medal').click()");
   waitFor(s,"!!document.querySelector('.trophy-grid')");Thread.sleep(250);screenshot("store-trophies.png");
   evaluate(s,"document.querySelector('.top button').click()");waitFor(s,"!!document.querySelector('.new-game')");
   evaluate(s,"Array.from(document.querySelectorAll('.home-links button')).find(b=>b.innerText==='Статистика').click()");
   waitFor(s,"!!document.querySelector('.stats-metrics')");Thread.sleep(250);screenshot("store-statistics.png");
   evaluate(s,"document.querySelector('.top button').click()");waitFor(s,"!!document.querySelector('.new-game')");
   evaluate(s,"document.querySelector('.home-profile').click()");waitFor(s,"!!document.querySelector('.profile-page')");
   assertEquals("true",evaluate(s,"document.body.innerText.includes('Локальный профиль') && !document.body.innerText.includes('пока недоступно') && !document.body.innerText.includes('Подключить облачное')"));
   screenshot("store-profile.png");
   evaluate(s,"document.querySelector('.top button').click()");waitFor(s,"!!document.querySelector('.new-game')");

   evaluate(s,"document.querySelector('.new-game .primary').click()");
   waitFor(s,"!!document.querySelector('.difficulty-list button')");
   evaluate(s,"document.querySelector('.difficulty-list button').click()");
   waitFor(s,"!!document.querySelector('.board') && !document.querySelector('.cell').disabled");
   String c=evaluate(s,"Array.from(document.querySelectorAll('.cell')).findIndex(c=>!c.innerText.trim())");cell=Integer.parseInt(c);
   evaluate(s,"document.querySelector('[data-cell=\""+cell+"\"]').click()");
   waitFor(s,"!!document.querySelector('.cell.selected') && !document.querySelector('[aria-label=\"Ввести 3\"]').disabled");
   assertEquals("true",evaluate(s,"document.querySelector('.numpad').getBoundingClientRect().bottom <= innerHeight"));
   tap(s,"[aria-label=\"Ввести 3\"]");
   waitFor(s,"document.querySelector('[data-cell=\""+cell+"\"]').innerText==='3' && document.querySelector('.save-status').innerText==='Сохранено'");
   assertTrue("Native snapshot exists",new File(context.getFilesDir(),"sudoku-v1.json").exists());
   screenshot("android-game-light.png");
   Thread.sleep(1200);
   evaluate(s,"document.querySelector('[aria-label=\"Пауза\"]').click()");
   waitFor(s,"!!document.querySelector('.pause-cover')");
   String paused=evaluate(s,"document.querySelector('.clock>span').innerText");Thread.sleep(1200);
   assertEquals(paused,evaluate(s,"document.querySelector('.clock>span').innerText"));
   screenshot("android-pause.png");
  }
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('.continue')");evaluate(s,"document.querySelector('.continue').click()");
   waitFor(s,"!!document.querySelector('.board')");
   assertEquals("\"3\"",evaluate(s,"document.querySelector('[data-cell=\""+cell+"\"]').innerText"));
   evaluate(s,"Array.from(document.querySelectorAll('.tools button')).find(b=>b.innerText==='Отмена').click()");
   waitFor(s,"document.querySelector('[data-cell=\""+cell+"\"]').innerText.trim()==='' && document.querySelector('.save-status').innerText==='Сохранено'");
  }
 }
 @Test public void processDeathRestoresRedoHistory()throws Exception{
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('.continue')");evaluate(s,"document.querySelector('.continue').click()");
   waitFor(s,"!!document.querySelector('.board') && !document.querySelector('.cell').disabled");
   evaluate(s,"Array.from(document.querySelectorAll('.secondary-tools button')).find(b=>b.innerText==='Повтор').click()");
   waitFor(s,"document.querySelector('.cell.selected').innerText==='3' && document.querySelector('.save-status').innerText==='Сохранено'");
   screenshot("android-restored.png");
  }
 }

}
