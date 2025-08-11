package com.knets.jr.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.knets.jr.service.ScheduleMonitorService

class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "KnetsBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Boot receiver triggered: ${intent.action}")
        
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_PACKAGE_REPLACED -> {
                // Check if device is registered
                val prefs = context.getSharedPreferences("knets_jr_prefs", Context.MODE_PRIVATE)
                val isRegistered = prefs.getBoolean("is_registered", false)
                
                if (isRegistered) {
                    Log.d(TAG, "Starting Knets Jr service after boot")
                    val serviceIntent = Intent(context, ScheduleMonitorService::class.java)
                    context.startForegroundService(serviceIntent)
                } else {
                    Log.d(TAG, "Device not registered, skipping service start")
                }
            }
        }
    }
}