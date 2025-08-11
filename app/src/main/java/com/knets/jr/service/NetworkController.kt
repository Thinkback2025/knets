package com.knets.jr.service

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.wifi.WifiManager
import android.os.Build
import android.os.UserManager
import android.provider.Settings
import android.telephony.TelephonyManager
import android.util.Log
import androidx.annotation.RequiresApi
import com.knets.jr.admin.KnetsDeviceAdminReceiver
import java.lang.reflect.Method

class NetworkController(private val context: Context) {
    
    companion object {
        private const val TAG = "KnetsNetworkController"
    }
    
    private val devicePolicyManager: DevicePolicyManager by lazy {
        context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    }
    
    private val wifiManager: WifiManager by lazy {
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    }
    
    private val telephonyManager: TelephonyManager by lazy {
        context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    }
    
    private val adminComponent: ComponentName by lazy {
        ComponentName(context, KnetsDeviceAdminReceiver::class.java)
    }
    
    // Network Control State
    enum class NetworkState {
        ENABLED,
        DISABLED,
        RESTRICTED
    }
    
    data class NetworkControlStatus(
        val wifiState: NetworkState,
        val mobileDataState: NetworkState,
        val isDeviceAdminActive: Boolean,
        val canControlWifi: Boolean,
        val canControlMobileData: Boolean
    )
    
    /**
     * Get current network control status
     */
    fun getNetworkControlStatus(): NetworkControlStatus {
        val isAdminActive = devicePolicyManager.isAdminActive(adminComponent)
        
        return NetworkControlStatus(
            wifiState = if (wifiManager.isWifiEnabled) NetworkState.ENABLED else NetworkState.DISABLED,
            mobileDataState = getMobileDataState(),
            isDeviceAdminActive = isAdminActive,
            canControlWifi = hasWifiControlPermission(),
            canControlMobileData = hasMobileDataControlPermission()
        )
    }
    
    /**
     * Apply network restrictions based on schedule
     */
    fun applyNetworkRestrictions(restrictWifi: Boolean, restrictMobileData: Boolean): Boolean {
        Log.d(TAG, "Applying network restrictions: WiFi=$restrictWifi, MobileData=$restrictMobileData")
        
        var success = true
        
        // Apply WiFi restrictions
        if (restrictWifi) {
            success = disableWifi() && success
        } else {
            success = enableWifi() && success
        }
        
        // Apply mobile data restrictions
        if (restrictMobileData) {
            success = disableMobileData() && success
        } else {
            success = enableMobileData() && success
        }
        
        return success
    }
    
    /**
     * Enable WiFi using multiple methods
     */
    private fun enableWifi(): Boolean {
        return try {
            when {
                // Method 1: Direct WiFi Manager (Works on older Android versions)
                Build.VERSION.SDK_INT < Build.VERSION_CODES.Q -> {
                    @Suppress("DEPRECATION")
                    wifiManager.isWifiEnabled = true
                    Log.d(TAG, "WiFi enabled using WifiManager (legacy)")
                    true
                }
                
                // Method 2: Device Admin restrictions (Modern Android)
                devicePolicyManager.isAdminActive(adminComponent) -> {
                    devicePolicyManager.clearUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_WIFI)
                    Log.d(TAG, "WiFi enabled using Device Admin")
                    true
                }
                
                // Method 3: Settings intent fallback
                else -> {
                    val intent = Intent(Settings.ACTION_WIFI_SETTINGS)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(intent)
                    Log.d(TAG, "WiFi settings opened for manual enable")
                    false // User needs to enable manually
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enable WiFi", e)
            false
        }
    }
    
    /**
     * Disable WiFi using multiple methods
     */
    private fun disableWifi(): Boolean {
        return try {
            when {
                // Method 1: Direct WiFi Manager (Works on older Android versions)
                Build.VERSION.SDK_INT < Build.VERSION_CODES.Q -> {
                    @Suppress("DEPRECATION")
                    wifiManager.isWifiEnabled = false
                    Log.d(TAG, "WiFi disabled using WifiManager (legacy)")
                    true
                }
                
                // Method 2: Device Admin restrictions (Modern Android)
                devicePolicyManager.isAdminActive(adminComponent) -> {
                    devicePolicyManager.addUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_WIFI)
                    Log.d(TAG, "WiFi disabled using Device Admin")
                    true
                }
                
                else -> {
                    Log.w(TAG, "WiFi control not available on this device/Android version")
                    false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to disable WiFi", e)
            false
        }
    }
    
    /**
     * Enable mobile data using reflection and device admin
     */
    private fun enableMobileData(): Boolean {
        return try {
            when {
                // Method 1: Reflection method (requires system permissions)
                hasMobileDataControlPermission() -> {
                    setMobileDataEnabledReflection(true)
                    Log.d(TAG, "Mobile data enabled using reflection")
                    true
                }
                
                // Method 2: Device Admin restrictions
                devicePolicyManager.isAdminActive(adminComponent) -> {
                    devicePolicyManager.clearUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_MOBILE_NETWORKS)
                    Log.d(TAG, "Mobile data restrictions cleared using Device Admin")
                    true
                }
                
                else -> {
                    Log.w(TAG, "Mobile data control not available")
                    false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enable mobile data", e)
            false
        }
    }
    
    /**
     * Disable mobile data using reflection and device admin
     */
    private fun disableMobileData(): Boolean {
        return try {
            when {
                // Method 1: Reflection method (requires system permissions)
                hasMobileDataControlPermission() -> {
                    setMobileDataEnabledReflection(false)
                    Log.d(TAG, "Mobile data disabled using reflection")
                    true
                }
                
                // Method 2: Device Admin restrictions
                devicePolicyManager.isAdminActive(adminComponent) -> {
                    devicePolicyManager.addUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_MOBILE_NETWORKS)
                    Log.d(TAG, "Mobile data restricted using Device Admin")
                    true
                }
                
                else -> {
                    Log.w(TAG, "Mobile data control not available")
                    false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to disable mobile data", e)
            false
        }
    }
    
    /**
     * Use reflection to control mobile data (requires system permissions)
     */
    private fun setMobileDataEnabledReflection(enabled: Boolean): Boolean {
        return try {
            val telephonyClass = Class.forName(telephonyManager.javaClass.name)
            val setDataEnabledMethod: Method = telephonyClass.getDeclaredMethod("setDataEnabled", Boolean::class.java)
            setDataEnabledMethod.invoke(telephonyManager, enabled)
            true
        } catch (e: Exception) {
            Log.w(TAG, "Reflection method failed for mobile data control", e)
            
            // Fallback: Try ConnectivityManager approach
            try {
                val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                val connectivityClass = Class.forName(connectivityManager.javaClass.name)
                val setMobileDataEnabledMethod: Method = connectivityClass.getDeclaredMethod("setMobileDataEnabled", Boolean::class.java)
                setMobileDataEnabledMethod.invoke(connectivityManager, enabled)
                true
            } catch (e2: Exception) {
                Log.w(TAG, "ConnectivityManager fallback also failed", e2)
                false
            }
        }
    }
    
    /**
     * Get current mobile data state
     */
    private fun getMobileDataState(): NetworkState {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val isDataEnabled = telephonyManager.isDataEnabled
                if (isDataEnabled) NetworkState.ENABLED else NetworkState.DISABLED
            } else {
                // For older Android versions, check using reflection
                val telephonyClass = Class.forName(telephonyManager.javaClass.name)
                val getDataEnabledMethod: Method = telephonyClass.getDeclaredMethod("getDataEnabled")
                val isEnabled = getDataEnabledMethod.invoke(telephonyManager) as Boolean
                if (isEnabled) NetworkState.ENABLED else NetworkState.DISABLED
            }
        } catch (e: Exception) {
            Log.w(TAG, "Cannot determine mobile data state", e)
            NetworkState.ENABLED // Assume enabled if we can't check
        }
    }
    
    /**
     * Check if we have permission to control WiFi
     */
    private fun hasWifiControlPermission(): Boolean {
        return when {
            Build.VERSION.SDK_INT < Build.VERSION_CODES.Q -> true // Legacy method works
            devicePolicyManager.isAdminActive(adminComponent) -> true // Device admin works
            else -> false
        }
    }
    
    /**
     * Check if we have permission to control mobile data
     */
    private fun hasMobileDataControlPermission(): Boolean {
        return try {
            // Check if we can access the reflection methods
            val telephonyClass = Class.forName(telephonyManager.javaClass.name)
            telephonyClass.getDeclaredMethod("setDataEnabled", Boolean::class.java)
            true
        } catch (e: Exception) {
            // Check if device admin can add restrictions
            devicePolicyManager.isAdminActive(adminComponent)
        }
    }
    
    /**
     * Apply graduated network restrictions based on schedule severity
     */
    fun applyGraduatedRestrictions(severityLevel: Int): Boolean {
        Log.d(TAG, "Applying graduated restrictions with severity level: $severityLevel")
        
        return when (severityLevel) {
            1 -> {
                // Level 1: Light restrictions - Block social media apps only
                Log.d(TAG, "Level 1: App-level restrictions only")
                true // Handled by app blocking service
            }
            2 -> {
                // Level 2: Moderate restrictions - Disable WiFi, keep mobile data
                Log.d(TAG, "Level 2: WiFi disabled, mobile data enabled")
                applyNetworkRestrictions(restrictWifi = true, restrictMobileData = false)
            }
            3 -> {
                // Level 3: Strict restrictions - Disable both WiFi and mobile data
                Log.d(TAG, "Level 3: Both WiFi and mobile data disabled")
                applyNetworkRestrictions(restrictWifi = true, restrictMobileData = true)
            }
            else -> {
                // Level 0: No restrictions
                Log.d(TAG, "Level 0: No network restrictions")
                applyNetworkRestrictions(restrictWifi = false, restrictMobileData = false)
            }
        }
    }
    
    /**
     * Emergency override - always allow emergency services
     */
    fun ensureEmergencyAccess(): Boolean {
        Log.d(TAG, "Ensuring emergency access is available")
        
        return try {
            // Always enable mobile data for emergency calls
            if (devicePolicyManager.isAdminActive(adminComponent)) {
                // Don't restrict emergency calling features
                devicePolicyManager.clearUserRestriction(adminComponent, UserManager.DISALLOW_OUTGOING_CALLS)
                Log.d(TAG, "Emergency calling access ensured")
                true
            } else {
                Log.w(TAG, "Device admin not active, cannot ensure emergency access")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to ensure emergency access", e)
            false
        }
    }
}