package ru.danilah.sudokudoku;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle savedInstanceState){registerPlugin(DokuNativePlugin.class);super.onCreate(savedInstanceState);}
}
