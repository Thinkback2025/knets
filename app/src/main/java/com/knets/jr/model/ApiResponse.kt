package com.knets.jr.model

data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T?,
    val serverTime: String? = null,
    val useServerTime: Boolean? = null,
    val timeDriftWarning: String? = null
)