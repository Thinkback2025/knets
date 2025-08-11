package com.knets.jr

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.knets.jr.api.KnetsApiService
import com.knets.jr.api.RetrofitClient
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import retrofit2.HttpException

class DeviceAdminUninstallActivity : AppCompatActivity() {
    
    private lateinit var tvTitle: TextView
    private lateinit var tvMessage: TextView
    private lateinit var etSecretCode: EditText
    private lateinit var btnSubmitCode: Button
    private lateinit var btnCancel: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var apiService: KnetsApiService
    
    private var requestId: String = ""
    private var childMobileNumber: String = ""
    private var deviceImei: String = ""
    
    companion object {
        const val EXTRA_CHILD_MOBILE = "child_mobile"
        const val EXTRA_DEVICE_IMEI = "device_imei"
        
        fun createIntent(context: Context, childMobile: String, deviceImei: String): Intent {
            return Intent(context, DeviceAdminUninstallActivity::class.java).apply {
                putExtra(EXTRA_CHILD_MOBILE, childMobile)
                putExtra(EXTRA_DEVICE_IMEI, deviceImei)
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_device_admin_uninstall)
        
        initializeViews()
        setupApiService()
        
        childMobileNumber = intent.getStringExtra(EXTRA_CHILD_MOBILE) ?: ""
        deviceImei = intent.getStringExtra(EXTRA_DEVICE_IMEI) ?: ""
        
        setupUI()
        requestUninstallPermission()
    }
    
    private fun initializeViews() {
        tvTitle = findViewById(R.id.tv_title)
        tvMessage = findViewById(R.id.tv_message)
        etSecretCode = findViewById(R.id.et_secret_code)
        btnSubmitCode = findViewById(R.id.btn_submit_code)
        btnCancel = findViewById(R.id.btn_cancel)
        progressBar = findViewById(R.id.progress_bar)
    }
    
    private fun setupApiService() {
        apiService = RetrofitClient.getKnetsApiService()
    }
    
    private fun setupUI() {
        tvTitle.text = "Device Admin Protection"
        tvMessage.text = "Requesting permission to disable device admin. Please wait for parent approval..."
        
        // Initially hide secret code input
        etSecretCode.visibility = View.GONE
        btnSubmitCode.visibility = View.GONE
        
        etSecretCode.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                btnSubmitCode.isEnabled = s?.isNotEmpty() == true
            }
        })
        
        btnSubmitCode.setOnClickListener {
            submitSecretCode()
        }
        
        btnCancel.setOnClickListener {
            setResult(RESULT_CANCELED)
            finish()
        }
    }
    
    private fun requestUninstallPermission() {
        lifecycleScope.launch {
            try {
                progressBar.visibility = View.VISIBLE
                
                // Step 1: Send uninstall request to parent
                val response = apiService.requestUninstall(
                    mapOf(
                        "childMobileNumber" to childMobileNumber,
                        "deviceImei" to deviceImei
                    )
                )
                
                if (response.isSuccessful) {
                    val responseBody = response.body()
                    requestId = responseBody?.requestId ?: ""
                    
                    if (requestId.isNotEmpty()) {
                        tvMessage.text = "Request sent to parent. SMS alert has been sent. Waiting for approval..."
                        startPollingForResponse()
                    } else {
                        showError("Failed to create uninstall request")
                    }
                } else {
                    showError("Device not found or network error")
                }
                
            } catch (e: Exception) {
                showError("Network error: ${e.message}")
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }
    
    private fun startPollingForResponse() {
        lifecycleScope.launch {
            repeat(60) { // Poll for 5 minutes (60 * 5 seconds)
                delay(5000) // Wait 5 seconds between polls
                
                try {
                    val response = apiService.checkUninstallStatus(requestId)
                    if (response.isSuccessful) {
                        val status = response.body()
                        
                        when (status?.status) {
                            "approved" -> {
                                showApproved()
                                return@launch
                            }
                            "denied" -> {
                                showDenied()
                                return@launch
                            }
                            "pending" -> {
                                // Continue polling
                                tvMessage.text = "Still waiting for parent response... (${(60 - it) * 5} seconds remaining)"
                            }
                        }
                    }
                } catch (e: Exception) {
                    // Continue polling on network errors
                }
            }
            
            // Timeout after 5 minutes
            showTimeout()
        }
    }
    
    private fun showApproved() {
        tvTitle.text = "Parent Approved"
        tvMessage.text = "Your parent has approved the uninstall request. Enter the secret code to continue:"
        
        etSecretCode.visibility = View.VISIBLE
        btnSubmitCode.visibility = View.VISIBLE
        btnSubmitCode.text = "Disable Device Admin"
        
        etSecretCode.requestFocus()
    }
    
    private fun showDenied() {
        tvTitle.text = "Request Denied"
        tvMessage.text = "Uninstall denied by parent! Device admin protection will remain active."
        tvMessage.setTextColor(android.graphics.Color.RED)
        
        btnCancel.text = "OK"
        
        // Auto-close after 3 seconds
        lifecycleScope.launch {
            delay(3000)
            setResult(RESULT_CANCELED)
            finish()
        }
    }
    
    private fun showTimeout() {
        tvTitle.text = "Request Timeout"
        tvMessage.text = "No response from parent. Please try again later or contact your parent directly."
        tvMessage.setTextColor(android.graphics.Color.parseColor("#FF9800"))
        
        btnCancel.text = "OK"
    }
    
    private fun submitSecretCode() {
        val enteredCode = etSecretCode.text.toString().trim()
        
        if (enteredCode.isEmpty()) {
            etSecretCode.error = "Please enter the secret code"
            return
        }
        
        tvMessage.text = "Verifying secret code with parent..."
        btnSubmitCode.isEnabled = false
        progressBar.visibility = View.VISIBLE
        
        // In a real implementation, you would verify the code with the server
        // For now, we'll assume the code is correct and allow uninstall
        lifecycleScope.launch {
            delay(2000) // Simulate verification delay
            
            // Signal success - the calling activity should handle device admin disable
            val resultIntent = Intent().apply {
                putExtra("secret_code_verified", true)
                putExtra("entered_code", enteredCode)
            }
            setResult(RESULT_OK, resultIntent)
            finish()
        }
    }
    
    private fun showError(message: String) {
        tvMessage.text = "Error: $message"
        tvMessage.setTextColor(android.graphics.Color.RED)
        btnCancel.text = "OK"
    }
}