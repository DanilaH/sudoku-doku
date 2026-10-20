package ru.danilah.sudokudoku;
import android.view.View;
import android.widget.FrameLayout;
/** Coordinates are relative to the root border; FrameLayout adds its padding itself. */
public final class BannerPlacement {
 public static void place(View view,FrameLayout parent,int left,int top,int width,int height){
  FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(width,height);
  lp.leftMargin=left-parent.getPaddingLeft();lp.topMargin=top-parent.getPaddingTop();view.setLayoutParams(lp);
 }
}
