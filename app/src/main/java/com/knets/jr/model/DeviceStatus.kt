package com.knets.jr.model

data class DeviceStatus(
    val imei: String,
    val isLocked: Boolean,
    val lastChecked: Long,
    val batteryLevel: Int,
    val isOnline: Boolean
)