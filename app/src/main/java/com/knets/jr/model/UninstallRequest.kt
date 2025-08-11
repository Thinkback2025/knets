package com.knets.jr.model

data class UninstallRequest(
    val imei: String,
    val requestType: String,
    val timestamp: Long
)