package com.knets.jr.model

data class ApiResponse(
    val success: Boolean,
    val message: String? = null,
    val childName: String? = null,
    val deviceStatus: String? = null,
    val data: Any? = null
)

data class ConnectResponse(
    val success: Boolean,
    val message: String? = null,
    val childName: String? = null,
    val deviceId: Int? = null
)