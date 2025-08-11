package com.knets.jr

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.telephony.TelephonyManager
import android.util.Log
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts

import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.knets.jr.admin.KnetsDeviceAdminReceiver
import com.knets.jr.api.KnetsApiService
import com.knets.jr.api.RetrofitClient
import com.knets.jr.databinding.ActivityMainBinding
import com.knets.jr.model.DeviceRegistration
import com.knets.jr.model.DeviceInfo
import com.knets.jr.service.ScheduleMonitorService
import com.knets.jr.service.NetworkController
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "KnetsJrMainActivity"
        private const val REQUEST_CODE_ENABLE_ADMIN = 1
        private const val REQUEST_CODE_USAGE_STATS = 2
        private const val REQUEST_CODE_QR_SCANNER = 3
    }

    private lateinit var binding: ActivityMainBinding
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private lateinit var apiService: KnetsApiService
    private lateinit var networkController: NetworkController
    
    private var deviceImei: String? = null
    private var isRegistered = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, KnetsDeviceAdminReceiver::class.java)
        apiService = RetrofitClient.getKnetsApiService()
        networkController = NetworkController(this)

        setupUI()
        loadDeviceInfo()
        checkRegistrationStatus()
        displayNetworkControlStatus()
    }

    private fun setupUI() {
        binding.btnEnableAdmin.setOnClickListener { enableDeviceAdmin() }
        binding.btnRegisterDevice.setOnClickListener { registerDevice() }
        binding.btnTestLock.setOnClickListener { testDeviceLock() }
        binding.btnSettings.setOnClickListener { openSettings() }
        
        // Add network control test buttons
        binding.btnTestNetworkRestriction?.setOnClickListener { testNetworkRestrictions() }
        binding.btnShowNetworkStatus?.setOnClickListener { displayNetworkControlStatus() }
        
        // Show current admin status
        updateAdminStatus()
    }

    private fun loadDeviceInfo() {
        try {
            // Get device IMEI (requires permission)
            val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            deviceImei = telephonyManager.deviceId ?: "UNKNOWN_${android.os.Build.SERIAL}"
            
            binding.tvDeviceInfo.text = "Device IMEI: $deviceImei\n" +
                    "Model: ${android.os.Build.MODEL}\n" +
                    "Brand: ${android.os.Build.BRAND}"
                    
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for device ID", e)
            deviceImei = "PERM_DENIED_${android.os.Build.SERIAL}"
            binding.tvDeviceInfo.text = "Device ID: $deviceImei (Limited permissions)\n" +
                    "Model: ${android.os.Build.MODEL}\n" +
                    "Brand: ${android.os.Build.BRAND}"
        }
    }

    private fun checkRegistrationStatus() {
        val prefs = getSharedPreferences("knets_jr_prefs", Context.MODE_PRIVATE)
        isRegistered = prefs.getBoolean("is_registered", false)
        
        if (isRegistered) {
            binding.tvRegistrationStatus.text = "✓ Device is registered with Knets"
            binding.btnRegisterDevice.text = "Re-register Device"
        } else {
            binding.tvRegistrationStatus.text = "✗ Device not registered"
            binding.btnRegisterDevice.text = "Register Device"
        }
    }

    private fun updateAdminStatus() {
        val isAdminActive = devicePolicyManager.isAdminActive(adminComponent)
        
        if (isAdminActive) {
            binding.tvAdminStatus.text = "✓ Device Admin Enabled"
            binding.btnEnableAdmin.text = "Admin Active"
            binding.btnEnableAdmin.isEnabled = false
            binding.btnTestLock.isEnabled = true
            
            // Start monitoring service
            startService(Intent(this, ScheduleMonitorService::class.java))
        } else {
            binding.tvAdminStatus.text = "✗ Device Admin Required"
            binding.btnEnableAdmin.text = "Enable Device Admin"
            binding.btnEnableAdmin.isEnabled = true
            binding.btnTestLock.isEnabled = false
        }
    }

    private fun enableDeviceAdmin() {
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Knets Jr needs device admin permissions to enforce parental controls and lock the device when scheduled."
            )
        }
        startActivityForResult(intent, REQUEST_CODE_ENABLE_ADMIN)
    }

    private fun registerDevice() {
        if (deviceImei == null) {
            Log.w(TAG, "Unable to get device identifier")
            return
        }

        // Show registration dialog
        val builder = AlertDialog.Builder(this)
        val dialogView = layoutInflater.inflate(com.knets.jr.R.layout.dialog_device_registration, null)
        builder.setView(dialogView)
        
        val dialog = builder.create()
        
        // Parent Code connection button
        dialogView.findViewById<View>(R.id.btn_connect_device).setOnClickListener {
            val parentCode = dialogView.findViewById<android.widget.EditText>(R.id.et_parent_code).text.toString()
            
            if (parentCode.isNotBlank() && parentCode.length == 6) {
                showSearchingStatus(dialogView, true)
                connectWithParentCode(parentCode, dialog)
            } else {
                Log.w(TAG, "Please enter a valid 6-digit parent code")
            }
        }
        
        // QR Scanner button
        dialogView.findViewById<View>(R.id.btn_scan_qr).setOnClickListener {
            dialog.dismiss()
            openQRScanner()
        }
        
        dialogView.findViewById<View>(R.id.btn_register_cancel).setOnClickListener {
            dialog.dismiss()
        }
        
        dialog.show()
    }

    private fun openQRScanner() {
        try {
            // Try to launch a QR scanner app
            val intent = Intent("com.google.zxing.client.android.SCAN")
            intent.putExtra("SCAN_MODE", "QR_CODE_MODE")
            intent.putExtra("PROMPT_MESSAGE", "Scan the QR code from your parent's dashboard")
            startActivityForResult(intent, REQUEST_CODE_QR_SCANNER)
        } catch (e: Exception) {
            // If no QR scanner app is available, show alternative
            showQRScannerAlternative()
        }
    }
    
    private fun showQRScannerAlternative() {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("QR Scanner Required")
        builder.setMessage("Please install a QR scanner app or use the parent code option instead.\n\nRecommended apps:\n• QR Code Scanner\n• Google Lens\n• Any camera app with QR support")
        
        builder.setPositiveButton("Install QR Scanner") { _, _ ->
            try {
                val intent = Intent(Intent.ACTION_VIEW)
                intent.data = android.net.Uri.parse("market://search?q=QR+code+scanner")
                startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Cannot open Play Store", e)
            }
        }
        
        builder.setNegativeButton("Use Parent Code") { _, _ ->
            registerDevice()
        }
        
        builder.show()
    }

    private fun showSearchingStatus(dialogView: View, show: Boolean) {
        val statusText = dialogView.findViewById<android.widget.TextView>(R.id.tv_searching_status)
        statusText.visibility = if (show) View.VISIBLE else View.GONE
    }

    private fun connectWithParentCode(parentCode: String, dialog: AlertDialog) {
        lifecycleScope.launch {
            try {
                binding.progressBar.visibility = View.VISIBLE
                
                Log.d(TAG, "Connecting with parent code: $parentCode")
                
                // Use the parent code connection endpoint
                val connectionData = mapOf(
                    "parentCode" to parentCode,
                    "imei" to (deviceImei ?: ""),
                    "model" to android.os.Build.MODEL,
                    "androidVersion" to android.os.Build.VERSION.RELEASE
                )
                
                val connectResponse = apiService.connectDeviceWithParentCode(connectionData)
                
                if (connectResponse.isSuccessful && connectResponse.body()?.success == true) {
                    val responseBody = connectResponse.body()!!
                    
                    // Save registration locally
                    val prefs = getSharedPreferences("knets_jr_prefs", Context.MODE_PRIVATE)
                    prefs.edit().apply {
                        putBoolean("is_registered", true)
                        putString("parent_code", parentCode)
                        putString("device_imei", deviceImei)
                        putString("child_name", responseBody.childName)
                        apply()
                    }
                    
                    isRegistered = true
                    checkRegistrationStatus()
                    dialog.dismiss()
                    
                    Log.i(TAG, "Device connected successfully to ${responseBody.childName}! You're now part of the Knets family system.")
                } else {
                    Log.w(TAG, "Invalid parent code or connection failed. Please check the code and try again.")
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Parent code connection failed", e)
                Log.e(TAG, "Connection error: ${e.message}")
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun performDeviceLookupAndConnect(mobileNumber: String, dialog: AlertDialog) {
        lifecycleScope.launch {
            try {
                binding.progressBar.visibility = View.VISIBLE
                
                // Step 1: Lookup device by mobile number
                Log.d(TAG, "Looking up device for mobile number: $mobileNumber")
                val lookupResponse = apiService.lookupDeviceByMobile(mobileNumber)
                
                if (lookupResponse.isSuccessful && lookupResponse.body() != null) {
                    val deviceInfo = lookupResponse.body()!!
                    Log.d(TAG, "Device found: ${deviceInfo.name} with IMEI: ${deviceInfo.imei}")
                    
                    // Step 2: Validate device matches (either IMEI or phone number)
                    Log.d(TAG, "Validation check:")
                    Log.d(TAG, "  Registered IMEI: ${deviceInfo.imei}")
                    Log.d(TAG, "  Current IMEI: $deviceImei")
                    Log.d(TAG, "  Registered Phone: ${deviceInfo.phoneNumber}")
                    Log.d(TAG, "  Entered Phone: $mobileNumber")
                    
                    val imeiMatches = deviceInfo.imei == deviceImei
                    val phoneMatches = deviceInfo.phoneNumber.contains(mobileNumber) || mobileNumber.contains(deviceInfo.phoneNumber.replace("+91 ", "").replace("+91", ""))
                    
                    Log.d(TAG, "  IMEI matches: $imeiMatches")
                    Log.d(TAG, "  Phone matches: $phoneMatches")
                    
                    if (imeiMatches || phoneMatches) {
                        // Step 3: Auto-connect device
                        Log.d(TAG, "Device validation successful, connecting...")
                        connectDeviceAutomatically(deviceInfo, mobileNumber)
                        dialog.dismiss()
                    } else {
                        Log.w(TAG, "Device validation failed: IMEI=${deviceInfo.imei} vs $deviceImei, Phone=${deviceInfo.phoneNumber} vs $mobileNumber")
                        Log.w(TAG, "Device validation failed. Contact parent to register this device.")
                    }
                } else {
                    Log.w(TAG, "No device found for mobile number: $mobileNumber")
                    Log.w(TAG, "Mobile number not found. Ask parent to register your device first.")
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Device lookup failed", e)
                Log.e(TAG, "Connection failed: ${e.message}")
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun connectDeviceAutomatically(deviceInfo: DeviceInfo, mobileNumber: String) {
        lifecycleScope.launch {
            try {
                // Step 1: Connect device using new connect endpoint
                val connectionData = mapOf(
                    "phoneNumber" to mobileNumber,
                    "imei" to deviceImei!!
                )
                
                val connectResponse = apiService.connectDevice(connectionData)
                
                if (connectResponse.isSuccessful && connectResponse.body()?.success == true) {
                    // Save registration locally
                    val prefs = getSharedPreferences("knets_jr_prefs", Context.MODE_PRIVATE)
                    prefs.edit().apply {
                        putBoolean("is_registered", true)
                        putString("mobile_number", mobileNumber)
                        putString("device_imei", deviceImei)
                        apply()
                    }
                    
                    isRegistered = true
                    checkRegistrationStatus()
                    
                    Log.i(TAG, "Device connected successfully! You're now part of the family Knets system.")
                    Log.d(TAG, "Device connected successfully with mobile: $mobileNumber")
                } else {
                    Log.w(TAG, "Connection failed. Please try again.")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Auto-connection failed", e)
                Log.e(TAG, "Connection error: ${e.message}")
            }
        }
    }

    private fun getCurrentLocation(): Map<String, Any> {
        // Return coordinates for Delhi, India - matching the real device location
        return mapOf(
            "latitude" to 28.6139,
            "longitude" to 77.2090,
            "accuracy" to 10.0,
            "method" to "gps"
        )
    }

    private fun testDeviceLock() {
        if (devicePolicyManager.isAdminActive(adminComponent)) {
            try {
                devicePolicyManager.lockNow()
                Log.i(TAG, "Device locked successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to lock device", e)
                Log.e(TAG, "Failed to lock device: ${e.message}")
            }
        } else {
            Log.w(TAG, "Device admin not enabled")
        }
    }

    private fun openSettings() {
        startActivity(Intent(this, com.knets.jr.activity.SettingsActivity::class.java))
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        when (requestCode) {
            REQUEST_CODE_ENABLE_ADMIN -> {
                if (resultCode == RESULT_OK) {
                    Log.i(TAG, "Device Admin enabled!")
                } else {
                    Log.w(TAG, "Device Admin required for app to work")
                }
                updateAdminStatus()
            }
            REQUEST_CODE_USAGE_STATS -> {
                // Handle usage stats permission result
            }
            REQUEST_CODE_QR_SCANNER -> {
                if (resultCode == RESULT_OK && data != null) {
                    val scannedData = data.getStringExtra("SCAN_RESULT")
                    if (scannedData != null) {
                        handleScannedQRCode(scannedData)
                    }
                } else {
                    Log.w(TAG, "QR scanning cancelled or failed")
                }
            }
        }
    }

    private fun testNetworkRestrictions() {
        Log.d(TAG, "Testing network restrictions...")
        
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Network Control Test")
        builder.setMessage("Choose network restriction level:")
        
        val options = arrayOf(
            "Level 0: No restrictions",
            "Level 1: App-level only", 
            "Level 2: WiFi disabled",
            "Level 3: Full network block"
        )
        
        builder.setItems(options) { _, which ->
            val level = which
            Log.d(TAG, "Applying test restriction level: $level")
            
            val success = networkController.applyGraduatedRestrictions(level)
            val message = if (success) {
                "Network restriction level $level applied successfully"
            } else {
                "Failed to apply network restrictions. Check permissions."
            }
            
            Log.i(TAG, message)
            displayNetworkControlStatus()
        }
        
        builder.setNegativeButton("Cancel", null)
        builder.show()
    }
    
    private fun displayNetworkControlStatus() {
        val status = networkController.getNetworkControlStatus()
        
        val statusText = """
            Network Control Status:
            
            WiFi: ${status.wifiState}
            Mobile Data: ${status.mobileDataState}
            Device Admin: ${if (status.isDeviceAdminActive) "✓ Active" else "✗ Inactive"}
            WiFi Control: ${if (status.canControlWifi) "✓ Available" else "✗ Limited"}
            Data Control: ${if (status.canControlMobileData) "✓ Available" else "✗ Limited"}
        """.trimIndent()
        
        // Update UI with network status
        binding.tvNetworkStatus?.text = statusText
        
        Log.d(TAG, "Network Status: $statusText")
    }

    private fun handleScannedQRCode(qrData: String) {
        try {
            Log.d(TAG, "Scanned QR code data: $qrData")
            
            // Check if QR contains parent code (6 digits) or full connection URL
            if (qrData.matches("\\d{6}".toRegex())) {
                // Direct parent code
                connectWithParentCode(qrData, null)
            } else if (qrData.contains("parentCode=")) {
                // Extract parent code from URL
                val parentCode = qrData.substringAfter("parentCode=").take(6)
                if (parentCode.length == 6) {
                    connectWithParentCode(parentCode, null)
                } else {
                    Log.w(TAG, "Invalid parent code in QR: $parentCode")
                }
            } else {
                Log.w(TAG, "Invalid QR code format. Expected parent code or connection URL.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing QR code", e)
        }
    }

    override fun onResume() {
        super.onResume()
        updateAdminStatus()
        displayNetworkControlStatus()
    }
}