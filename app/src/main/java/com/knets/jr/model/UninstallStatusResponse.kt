package com.knets.jr.model

data class UninstallStatusResponse(
    val success: Boolean,
    val message: String,
    val requestId: String? = null,
    val status: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)