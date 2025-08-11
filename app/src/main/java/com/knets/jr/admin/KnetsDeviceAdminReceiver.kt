package com.knets.jr.admin

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log


class KnetsDeviceAdminReceiver : DeviceAdminReceiver() {
    
    companion object {
        private const val TAG = "KnetsDeviceAdmin"
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.d(TAG, "Knets Jr Device Admin enabled")
        // Log.d(TAG, "Knets Jr protection enabled") - Toast removed for compilation compatibility
        
        // Start the schedule monitoring service
        context.startService(Intent(context, com.knets.jr.service.ScheduleMonitorService::class.java))
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        Log.d(TAG, "Device admin disable requested - launching protection dialog")
        
        // Launch protection activity to handle secret code validation
        val protectionIntent = Intent(context, com.knets.jr.activity.UninstallProtectionActivity::class.java)
        protectionIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(protectionIntent)
        
        // Return message to show in system dialog
        return "Knets Jr requires parent permission to disable device admin. Please wait..."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.d(TAG, "Knets Jr Device Admin disabled")
        // Log.d(TAG, "Knets Jr protection disabled") - Toast removed for compilation compatibility
        
        // Stop the schedule monitoring service
        context.stopService(Intent(context, com.knets.jr.service.ScheduleMonitorService::class.java))
    }

    override fun onPasswordChanged(context: Context, intent: Intent, user: android.os.UserHandle) {
        super.onPasswordChanged(context, intent, user)
        Log.d(TAG, "Device password changed")
    }

    override fun onPasswordFailed(context: Context, intent: Intent, user: android.os.UserHandle) {
        super.onPasswordFailed(context, intent, user)
        Log.d(TAG, "Device password failed")
    }

    override fun onPasswordSucceeded(context: Context, intent: Intent, user: android.os.UserHandle) {
        super.onPasswordSucceeded(context, intent, user)
        Log.d(TAG, "Device password succeeded")
    }

    override fun onLockTaskModeEntering(
        context: Context,
        intent: Intent,
        pkg: String
    ) {
        super.onLockTaskModeEntering(context, intent, pkg)
        Log.d(TAG, "Lock task mode entering: $pkg")
    }

    override fun onLockTaskModeExiting(context: Context, intent: Intent) {
        super.onLockTaskModeExiting(context, intent)
        Log.d(TAG, "Lock task mode exiting")
    }
}