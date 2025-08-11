package com.knets.jr.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.knets.jr.R
import com.knets.jr.admin.KnetsDeviceAdminReceiver
import com.knets.jr.api.KnetsApiService
import com.knets.jr.api.RetrofitClient
import com.knets.jr.model.DeviceStatus
import com.knets.jr.model.Schedule
import com.knets.jr.service.NetworkController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.TimeZone

class ScheduleMonitorService : Service() {
    
    companion object {
        private const val TAG = "ScheduleMonitorService"
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "knets_jr_service"
        private const val CHECK_INTERVAL = 30000L // 30 seconds
    }

    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private lateinit var apiService: KnetsApiService
    private lateinit var notificationManager: NotificationManager
    private lateinit var networkController: NetworkController
    
    private var monitoringJob: Job? = null
    private var deviceImei: String? = null
    private var isDeviceLocked = false
    private var currentNetworkRestrictionLevel = 0

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")
        
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, KnetsDeviceAdminReceiver::class.java)
        apiService = RetrofitClient.getKnetsApiService()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        networkController = NetworkController(this)
        
        createNotificationChannel()
        
        // Load device IMEI from preferences
        val prefs = getSharedPreferences("knets_jr_prefs", Context.MODE_PRIVATE)
        deviceImei = prefs.getString("device_imei", null)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started")
        
        startForeground(NOTIFICATION_ID, createNotification("Knets Jr is protecting this device"))
        
        startMonitoring()
        
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Knets Jr Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Knets Jr parental control service"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(message: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Knets Jr")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun startMonitoring() {
        monitoringJob?.cancel()
        monitoringJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                try {
                    checkSchedulesAndEnforce()
                    delay(CHECK_INTERVAL)
                } catch (e: Exception) {
                    Log.e(TAG, "Error in monitoring loop", e)
                    delay(CHECK_INTERVAL)
                }
            }
        }
    }

    private suspend fun checkSchedulesAndEnforce() {
        if (deviceImei == null) {
            Log.w(TAG, "No device IMEI configured")
            return
        }

        if (!isDeviceAdminActive()) {
            Log.w(TAG, "Device admin not active")
            return
        }

        try {
            // Fetch current schedules for this device
            val schedules = apiService.getDeviceSchedules(deviceImei!!)
            val activeSchedules = schedules.filter { isScheduleActive(it) }

            if (activeSchedules.isNotEmpty() && !isDeviceLocked) {
                // Should be locked and network restricted
                lockDevice()
                
                // Apply network restrictions based on schedule type
                val restrictionLevel = determineRestrictionLevel(activeSchedules)
                applyNetworkRestrictions(restrictionLevel)
                
                updateNotification("Device locked - Schedule active (Network restricted)")
                reportDeviceStatus(true)
            } else if (activeSchedules.isEmpty() && isDeviceLocked) {
                // Should be unlocked and network enabled
                updateNotification("Schedule ended - Device can be unlocked")
                
                // Remove network restrictions
                applyNetworkRestrictions(0)
                
                reportDeviceStatus(false)
                isDeviceLocked = false
            } else if (activeSchedules.isNotEmpty()) {
                // Device is already locked, but check if restriction level changed
                val restrictionLevel = determineRestrictionLevel(activeSchedules)
                if (restrictionLevel != currentNetworkRestrictionLevel) {
                    applyNetworkRestrictions(restrictionLevel)
                    updateNotification("Network restrictions updated")
                }
            }

            // Send heartbeat
            sendHeartbeat()

        } catch (e: Exception) {
            Log.e(TAG, "Error checking schedules", e)
        }
    }

    private fun isScheduleActive(schedule: Schedule): Boolean {
        if (!schedule.isActive) return false

        // SECURITY: Always use system time, not device time to prevent manipulation
        val calendar = Calendar.getInstance()
        val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
        val currentMinute = calendar.get(Calendar.MINUTE)
        val currentDayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
        
        Log.d(TAG, "Schedule check using system time: ${currentHour}:${String.format("%02d", currentMinute)}")

        // Convert to minutes for easier comparison
        val currentTimeMinutes = currentHour * 60 + currentMinute

        // Parse schedule times
        val startParts = schedule.startTime.split(":")
        val endParts = schedule.endTime.split(":")
        val startMinutes = startParts[0].toInt() * 60 + startParts[1].toInt()
        val endMinutes = endParts[0].toInt() * 60 + endParts[1].toInt()

        // Check if current day is in schedule (simplified check)
        val dayMatches = schedule.days.isNotEmpty() // Assume schedule is applicable if days are defined

        if (!dayMatches) return false

        // Check time range (handle overnight schedules)
        return if (endMinutes > startMinutes) {
            // Same day schedule
            currentTimeMinutes in startMinutes..endMinutes
        } else {
            // Overnight schedule
            currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes
        }
    }

    private fun lockDevice() {
        try {
            if (isDeviceAdminActive()) {
                devicePolicyManager.lockNow()
                isDeviceLocked = true
                Log.d(TAG, "Device locked successfully")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to lock device", e)
        }
    }

    private fun isDeviceAdminActive(): Boolean {
        return devicePolicyManager.isAdminActive(adminComponent)
    }

    private suspend fun reportDeviceStatus(locked: Boolean) {
        try {
            deviceImei?.let { imei ->
                val status = DeviceStatus(
                    imei = imei,
                    isLocked = locked,
                    lastChecked = System.currentTimeMillis(),
                    batteryLevel = getBatteryLevel(),
                    isOnline = true
                )
                apiService.updateDeviceStatus(imei, status)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to report device status", e)
        }
    }

    private suspend fun sendHeartbeat() {
        try {
            deviceImei?.let { imei ->
                val heartbeatData = mapOf(
                    "imei" to imei,
                    "timestamp" to System.currentTimeMillis(),
                    "deviceTime" to System.currentTimeMillis(), // Send device time for manipulation detection
                    "status" to "active"
                )
                val heartbeatResponse = apiService.sendHeartbeat(heartbeatData)
                
                // Update device timezone on successful heartbeat and handle server time sync
                if (heartbeatResponse.isSuccessful) {
                    updateDeviceTimezone(imei)
                    
                    // Check if server wants us to use server time for security
                    val responseBody = heartbeatResponse.body()
                    if (responseBody?.success == true) {
                        Log.d(TAG, "Heartbeat successful - using server time for schedule validation")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send heartbeat", e)
        }
    }
    
    private suspend fun updateDeviceTimezone(imei: String) {
        try {
            val timezone = TimeZone.getDefault().id
            val timezoneData = mapOf("timezone" to timezone)
            
            val response = apiService.updateDeviceTimezone(imei, timezoneData)
            if (response.isSuccessful) {
                Log.d(TAG, "Device timezone updated to: $timezone")
            } else {
                Log.e(TAG, "Failed to update timezone: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Timezone update request failed", e)
        }
    }

    private fun getBatteryLevel(): Int {
        // Implement battery level detection
        return 100 // Placeholder
    }

    private fun determineRestrictionLevel(activeSchedules: List<Schedule>): Int {
        // Determine restriction level based on schedule types and severity
        return when {
            activeSchedules.any { it.name.contains("Bed", ignoreCase = true) || 
                                 it.name.contains("Sleep", ignoreCase = true) } -> 3 // Strict: Full network block
            activeSchedules.any { it.name.contains("Study", ignoreCase = true) || 
                                 it.name.contains("School", ignoreCase = true) } -> 2 // Moderate: WiFi only
            activeSchedules.any { it.name.contains("Limit", ignoreCase = true) } -> 1 // Light: App-level only
            else -> 2 // Default to moderate restrictions
        }
    }
    
    private fun applyNetworkRestrictions(level: Int) {
        if (level == currentNetworkRestrictionLevel) {
            Log.d(TAG, "Network restriction level unchanged: $level")
            return
        }
        
        Log.d(TAG, "Applying network restrictions - Level: $level")
        
        try {
            // Ensure emergency access is always available
            networkController.ensureEmergencyAccess()
            
            // Apply graduated restrictions
            val success = networkController.applyGraduatedRestrictions(level)
            
            if (success) {
                currentNetworkRestrictionLevel = level
                Log.d(TAG, "Network restrictions applied successfully")
                
                // Save current restriction level to preferences
                val prefs = getSharedPreferences("knets_jr_prefs", Context.MODE_PRIVATE)
                prefs.edit().putInt("network_restriction_level", level).apply()
            } else {
                Log.w(TAG, "Failed to apply network restrictions")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error applying network restrictions", e)
        }
    }
    
    private fun getNetworkControlStatus(): String {
        val status = networkController.getNetworkControlStatus()
        return "WiFi: ${status.wifiState}, Mobile: ${status.mobileDataState}, " +
               "Admin: ${status.isDeviceAdminActive}, " +
               "WiFi Control: ${status.canControlWifi}, Data Control: ${status.canControlMobileData}"
    }

    private fun updateNotification(message: String) {
        val notification = createNotification(message)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
        
        // Remove all network restrictions when service stops
        try {
            networkController.applyGraduatedRestrictions(0)
            Log.d(TAG, "Network restrictions removed on service destroy")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to remove network restrictions on destroy", e)
        }
        
        monitoringJob?.cancel()
    }
}