# Error Prone annotations reference compile-time JDK APIs absent on Android.
-dontwarn javax.lang.model.element.Modifier
# Instrumentation is loaded reflectively; optimize the app, not its test harness.
-keep class ** { *; }
-dontoptimize
-dontobfuscate
