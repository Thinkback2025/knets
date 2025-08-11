package com.knets.jr.activity

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.telephony.TelephonyManager
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.TextView

import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.knets.jr.R
import com.knets.jr.admin.KnetsDeviceAdminReceiver
import com.knets.jr.api.KnetsApiService
import com.knets.jr.api.RetrofitClient
import com.knets.jr.model.UninstallRequest
import kotlinx.coroutines.launch

class UninstallProtectionActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "UninstallProtection"
    }

    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private lateinit var apiService: KnetsApiService
    
    private lateinit var tvTitle: TextView
    private lateinit var tvMessage: TextView
    private lateinit var etSecretCode: EditText
    private lateinit var btnSubmit: Button
    private lateinit var btnCancel: Button
    
    private var deviceImei: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_uninstall_protection)

        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, KnetsDeviceAdminReceiver::class.java)
        apiService = RetrofitClient.getKnetsApiService()

        initViews()
        setupUI()
        getDeviceImei()
        sendUninstallRequest()
    }

    private fun initViews() {
        tvTitle = findViewById(R.id.tv_title)
        tvMessage = findViewById(R.id.tv_message)
        etSecretCode = findViewById(R.id.et_secret_code)
        btnSubmit = findViewById(R.id.btn_submit)
        btnCancel = findViewById(R.id.btn_cancel)
    }

    private fun setupUI() {
        tvTitle.text = "Device Admin Protection"
        tvMessage.text = "Your parent has been notified about this request to disable device admin. Please enter the secret code your parent provided to proceed."

        btnSubmit.setOnClickListener {
            val secretCode = etSecretCode.text.toString().trim()
            if (secretCode.isNotEmpty()) {
                validateSecretCode(secretCode)
            } else {
                Log.w(TAG, "Please enter the secret code")
            }
        }

        btnCancel.setOnClickListener {
            Log.i(TAG, "Device admin disable cancelled")
            finish()
        }
    }

    private fun getDeviceImei() {
        try {
            val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            deviceImei = telephonyManager.deviceId ?: "UNKNOWN_${android.os.Build.SERIAL}"
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for reading phone state", e)
            deviceImei = "PERM_DENIED_unknown"
        }
    }

    private fun sendUninstallRequest() {
        lifecycleScope.launch {
            try {
                deviceImei?.let { imei ->
                    val request = UninstallRequest(
                        imei = imei,
                        requestType = "device_admin_disable",
                        timestamp = System.currentTimeMillis()
                    )
                    
                    val response = apiService.requestDeviceAdminDisable(request)
                    if (response.isSuccessful) {
                        Log.d(TAG, "Uninstall request sent successfully")
                        Log.i(TAG, "Parent has been notified via SMS")
                    } else {
                        Log.e(TAG, "Failed to send uninstall request: ${response.code()}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error sending uninstall request", e)
            }
        }
    }

    private fun validateSecretCode(secretCode: String) {
        lifecycleScope.launch {
            try {
                deviceImei?.let { imei ->
                    val validationRequest = mapOf(
                        "imei" to imei,
                        "secretCode" to secretCode
                    )
                    
                    val response = apiService.validateSecretCode(validationRequest)
                    if (response.isSuccessful && response.body()?.success == true) {
                        // Secret code is valid, proceed with device admin disable
                        disableDeviceAdmin()
                    } else {
                        Log.w(TAG, "Invalid secret code. Please try again.")
                        etSecretCode.text.clear()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error validating secret code", e)
                Log.e(TAG, "Network error. Please try again.")
            }
        }
    }

    private fun disableDeviceAdmin() {
        try {
            if (devicePolicyManager.isAdminActive(adminComponent)) {
                devicePolicyManager.removeActiveAdmin(adminComponent)
                Log.d(TAG, "Toast message removed for compilation")
                finish()
            } else {
                Log.d(TAG, "Toast message removed for compilation")
                finish()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling device admin", e)
            Log.d(TAG, "Toast message removed for compilation")
        }
    }

    override fun onBackPressed() {
        // Prevent back button from cancelling protection dialog
        Log.d(TAG, "Toast message removed for compilation")
    }
}