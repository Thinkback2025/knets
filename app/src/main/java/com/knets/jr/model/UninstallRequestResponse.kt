package com.knets.jr.model

data class UninstallRequestResponse(
    val success: Boolean,
    val message: String,
    val requestId: String
)