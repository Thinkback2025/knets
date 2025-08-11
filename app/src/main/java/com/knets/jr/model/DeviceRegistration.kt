package com.knets.jr.model

data class DeviceRegistration(
    val imei: String,
    val deviceName: String,
    val childName: String,
    val parentPhone: String,
    val deviceModel: String,
    val deviceBrand: String,
    val androidVersion: String
)