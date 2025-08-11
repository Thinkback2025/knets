package com.knets.jr.model

data class DeviceInfo(
    val id: Int,
    val name: String,
    val imei: String,
    val phoneNumber: String,
    val childName: String,
    val status: String,
    val isLocked: Boolean,
    val lastSeen: String?,
    val consentStatus: String
)