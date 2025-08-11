package com.knets.jr

import android.app.Activity
import android.os.Bundle
import android.widget.TextView
import android.widget.LinearLayout
import android.widget.Button
import android.widget.EditText
import android.graphics.Color
import android.net.ConnectivityManager
import android.content.Context
import android.net.wifi.WifiManager
import android.widget.Toast
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.telephony.TelephonyManager

class MainActivity : Activity() {
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var deviceAdminReceiver: ComponentName
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        deviceAdminReceiver = ComponentName(this, DeviceAdminReceiver::class.java)
        
        val layout = LinearLayout(this)
        layout.orientation = LinearLayout.VERTICAL
        layout.setPadding(64, 64, 64, 64)
        layout.setBackgroundColor(Color.WHITE)
        
        val title = TextView(this)
        title.text = "Knets Jr - Family Device Management"
        title.textSize = 24f
        title.setTextColor(Color.parseColor("#2563eb"))
        layout.addView(title)
        
        val status = TextView(this)
        status.text = "App is running successfully!"
        status.textSize = 18f
        status.setTextColor(Color.parseColor("#059669"))
        status.setPadding(0, 32, 0, 0)
        layout.addView(status)
        
        // Device Info
        val deviceInfo = TextView(this)
        deviceInfo.text = getDeviceInfo()
        deviceInfo.textSize = 14f
        deviceInfo.setTextColor(Color.parseColor("#374151"))
        deviceInfo.setPadding(0, 16, 0, 0)
        layout.addView(deviceInfo)
        
        // Connection Setup
        val connectionTitle = TextView(this)
        connectionTitle.text = "Connect to Parent Dashboard"
        connectionTitle.textSize = 18f
        connectionTitle.setTextColor(Color.parseColor("#2563eb"))
        connectionTitle.setPadding(0, 24, 0, 8)
        layout.addView(connectionTitle)
        
        val parentCodeInput = EditText(this)
        parentCodeInput.hint = "Enter Parent Code (6 digits)"
        parentCodeInput.textSize = 16f
        parentCodeInput.setPadding(16, 16, 16, 16)
        layout.addView(parentCodeInput)
        
        val connectButton = Button(this)
        connectButton.text = "Connect to Parent"
        connectButton.setPadding(32, 16, 32, 16)
        connectButton.setOnClickListener {
            val parentCode = parentCodeInput.text.toString()
            if (parentCode.length == 6) {
                connectToParent(parentCode)
            } else {
                Toast.makeText(this, "Please enter a valid 6-digit parent code", Toast.LENGTH_SHORT).show()
            }
        }
        layout.addView(connectButton)
        
        // Device Admin Setup
        val adminTitle = TextView(this)
        adminTitle.text = "Device Admin Setup"
        adminTitle.textSize = 18f
        adminTitle.setTextColor(Color.parseColor("#2563eb"))
        adminTitle.setPadding(0, 24, 0, 8)
        layout.addView(adminTitle)
        
        val adminStatus = TextView(this)
        adminStatus.text = "Device Admin: ${if (isDeviceAdmin()) "✓ Enabled" else "✗ Not Enabled"}"
        adminStatus.textSize = 16f
        adminStatus.setTextColor(if (isDeviceAdmin()) Color.parseColor("#059669") else Color.parseColor("#dc2626"))
        adminStatus.setPadding(0, 8, 0, 0)
        layout.addView(adminStatus)
        
        val enableAdminButton = Button(this)
        enableAdminButton.text = if (isDeviceAdmin()) "Device Admin Enabled" else "Enable Device Admin"
        enableAdminButton.isEnabled = !isDeviceAdmin()
        enableAdminButton.setPadding(32, 16, 32, 16)
        enableAdminButton.setOnClickListener {
            enableDeviceAdmin()
        }
        layout.addView(enableAdminButton)
        
        // Network status display
        val networkStatus = TextView(this)
        networkStatus.text = getNetworkStatus()
        networkStatus.textSize = 16f
        networkStatus.setTextColor(Color.parseColor("#374151"))
        networkStatus.setPadding(0, 24, 0, 0)
        layout.addView(networkStatus)
        
        // Network control button
        val networkButton = Button(this)
        networkButton.text = "Check Network Control"
        networkButton.setPadding(32, 16, 32, 16)
        networkButton.setOnClickListener {
            checkNetworkPermissions()
        }
        layout.addView(networkButton)
        
        setContentView(layout)
    }
    
    private fun getNetworkStatus(): String {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        
        val networkInfo = connectivityManager.activeNetworkInfo
        val isConnected = networkInfo?.isConnected == true
        val connectionType = when {
            networkInfo?.type == ConnectivityManager.TYPE_WIFI -> "WiFi"
            networkInfo?.type == ConnectivityManager.TYPE_MOBILE -> "Mobile Data"
            else -> "Unknown"
        }
        
        return "Network: ${if (isConnected) "Connected" else "Disconnected"} ($connectionType)\nWiFi Enabled: ${wifiManager.isWifiEnabled}"
    }
    
    private fun getDeviceInfo(): String {
        val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val imei = try {
            telephonyManager.deviceId ?: "Unknown"
        } catch (e: Exception) {
            "Permission Required"
        }
        
        return "Device IMEI: $imei\nModel: ${android.os.Build.MODEL}\nAndroid: ${android.os.Build.VERSION.RELEASE}"
    }
    
    private fun isDeviceAdmin(): Boolean {
        return devicePolicyManager.isAdminActive(deviceAdminReceiver)
    }
    
    private fun enableDeviceAdmin() {
        if (!isDeviceAdmin()) {
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, deviceAdminReceiver)
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, 
                "Enable device admin to allow Knets Jr to manage this device for family safety")
            startActivityForResult(intent, 1)
        }
    }
    
    private fun connectToParent(parentCode: String) {
        // This would connect to your web dashboard
        // For now, we'll simulate the connection
        val deviceInfo = getDeviceInfo()
        val message = "Connecting to parent dashboard with code: $parentCode\n\n$deviceInfo"
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        
        // TODO: Add actual API call to connect to parent dashboard
        // Example: POST to https://your-dashboard.com/api/connect-device
        // with parentCode and device information
    }
    
    private fun checkNetworkPermissions() {
        try {
            val hasNetworkAccess = checkSelfPermission(android.Manifest.permission.ACCESS_NETWORK_STATE) == 
                android.content.pm.PackageManager.PERMISSION_GRANTED
            val hasWifiAccess = checkSelfPermission(android.Manifest.permission.ACCESS_WIFI_STATE) == 
                android.content.pm.PackageManager.PERMISSION_GRANTED
            val isAdmin = isDeviceAdmin()
            
            val message = "Network Access: ${if (hasNetworkAccess) "✓" else "✗"}\nWiFi Access: ${if (hasWifiAccess) "✓" else "✗"}\nDevice Admin: ${if (isAdmin) "✓" else "✗"}"
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Error checking permissions: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1) {
            if (resultCode == Activity.RESULT_OK) {
                Toast.makeText(this, "Device Admin enabled successfully!", Toast.LENGTH_LONG).show()
                // Refresh the UI
                recreate()
            } else {
                Toast.makeText(this, "Device Admin is required for full functionality", Toast.LENGTH_LONG).show()
            }
        }
    }
}