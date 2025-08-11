# Basic ProGuard rules for Knets Jr
-keep class com.knets.jr.** { *; }
-keep class retrofit2.** { *; }
-keep class com.google.gson.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**