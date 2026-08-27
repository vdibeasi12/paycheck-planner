# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html
#
# minifyEnabled/shrinkResources turned on Aug 27, 2026 to fix Play Console's
# "Low app optimization" warning. Rules below are a safety net on top of the
# consumer rules Capacitor and Firebase already bundle in their AARs, so a
# release build isn't relying solely on those upstream defaults.

# --- Capacitor core (bridge, plugin dispatch, permissions/activity results) ---
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.** { *; }
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Cordova plugins (bundled via capacitor-cordova-android-plugins) ---
-keep public class * extends org.apache.cordova.* {
    public <methods>;
    public <fields>;
}

# --- Firebase Cloud Messaging (@capacitor/push-notifications) ---
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# --- RevenueCat (@revenuecat/purchases-capacitor) ---
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**

# --- Biometric auth (@aparajita/capacitor-biometric-auth) ---
-keep class com.aparajita.capacitor.biometricauth.** { *; }
-keep class androidx.biometric.** { *; }

# --- Other Capacitor community plugins (in-app-review, etc.) ---
-keep class com.getcapacitor.community.** { *; }

# Keep line-number info so Play Console can deobfuscate crash stack traces
# once you upload the mapping.txt for each release (Play does this
# automatically for AAB uploads as of the Play App Signing default).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
