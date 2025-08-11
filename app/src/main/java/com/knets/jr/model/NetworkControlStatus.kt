package com.knets.jr.model

data class NetworkControlStatus(
    val wifiEnabled: Boolean,
    val mobileDataEnabled: Boolean,
    val restrictionLevel: Int,
    val canControlWifi: Boolean,
    val canControlMobileData: Boolean,
    val isDeviceAdminActive: Boolean,
    val lastUpdated: Long
)

data class NetworkRestrictionRequest(
    val imei: String,
    val restrictionLevel: Int,
    val restrictWifi: Boolean,
    val restrictMobileData: Boolean,
    val timestamp: Long
)

data class NetworkRestrictionResponse(
    val success: Boolean,
    val message: String,
    val appliedLevel: Int,
    val capabilities: NetworkControlCapabilities
)

data class NetworkControlCapabilities(
    val canControlWifi: Boolean,
    val canControlMobileData: Boolean,
    val supportedMethods: List<String>,
    val androidVersion: Int,
    val deviceAdminActive: Boolean
)