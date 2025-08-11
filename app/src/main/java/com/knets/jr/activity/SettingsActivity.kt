package com.knets.jr.activity

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.MenuItem
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.knets.jr.R
import com.knets.jr.admin.KnetsDeviceAdminReceiver
import com.knets.jr.databinding.ActivitySettingsBinding
import com.knets.jr.service.ScheduleMonitorService

class SettingsActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivitySettingsBinding
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Knets Jr Settings"

        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, KnetsDeviceAdminReceiver::class.java)

        setupUI()
        loadSettings()
    }

    private fun setupUI() {
        binding.btnDisableAdmin.setOnClickListener { disableDeviceAdmin() }
        binding.btnUnregisterDevice.setOnClickListener { unregisterDevice() }
        binding.btnClearData.setOnClickListener { clearAppData() }
        binding.switchServiceEnabled.setOnCheckedChangeListener { _, isChecked ->
            toggleService(isChecked)
        }
    }

    private fun loadSettings() {
        val prefs = getSharedPreferences("knets_jr_prefs", Context.MODE_PRIVATE)
        
        // Admin status
        val isAdminActive = devicePolicyManager.isAdminActive(adminComponent)
        binding.tvAdminStatus.text = if (isAdminActive) "✓ Active" else "✗ Inactive"
        binding.btnDisableAdmin.isEnabled = isAdminActive
        
        // Registration status
        val isRegistered = prefs.getBoolean("is_registered", false)
        binding.tvRegistrationStatus.text = if (isRegistered) "✓ Registered" else "✗ Not Registered"
        binding.btnUnregisterDevice.isEnabled = isRegistered
        
        // Device info
        val deviceImei = prefs.getString("device_imei", "Unknown")
        val childName = prefs.getString("child_name", "Unknown")
        binding.tvDeviceImei.text = "IMEI: $deviceImei"
        binding.tvChildName.text = "Child: $childName"
        
        // Service status (simplified check)
        binding.switchServiceEnabled.isChecked = isAdminActive && isRegistered
    }

    private fun disableDeviceAdmin() {
        AlertDialog.Builder(this)
            .setTitle("Disable Protection")
            .setMessage("This will disable Knets Jr device protection. Are you sure?")
            .setPositiveButton("Disable") { _, _ ->
                devicePolicyManager.removeActiveAdmin(adminComponent)
                loadSettings()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun unregisterDevice() {
        AlertDialog.Builder(this)
            .setTitle("Unregister Device")
            .setMessage("This will remove this device from Knets. All settings will be lost.")
            .setPositiveButton("Unregister") { _, _ ->
                val prefs = getSharedPreferences("knets_jr_prefs", Context.MODE_PRIVATE)
                prefs.edit().clear().apply()
                
                // Stop service
                stopService(Intent(this, ScheduleMonitorService::class.java))
                
                loadSettings()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun clearAppData() {
        AlertDialog.Builder(this)
            .setTitle("Clear All Data")
            .setMessage("This will remove all app data and reset Knets Jr to initial state.")
            .setPositiveButton("Clear") { _, _ ->
                // Clear preferences
                val prefs = getSharedPreferences("knets_jr_prefs", Context.MODE_PRIVATE)
                prefs.edit().clear().apply()
                
                // Stop service
                stopService(Intent(this, ScheduleMonitorService::class.java))
                
                // Remove device admin if active
                if (devicePolicyManager.isAdminActive(adminComponent)) {
                    devicePolicyManager.removeActiveAdmin(adminComponent)
                }
                
                loadSettings()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun toggleService(enabled: Boolean) {
        val serviceIntent = Intent(this, ScheduleMonitorService::class.java)
        
        if (enabled) {
            startForegroundService(serviceIntent)
        } else {
            stopService(serviceIntent)
        }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                finish()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    override fun onResume() {
        super.onResume()
        loadSettings()
    }
}