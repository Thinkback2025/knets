package com.knets.jr.model

data class Schedule(
    val id: Int,
    val name: String,
    val startTime: String,
    val endTime: String,
    val days: List<String>,
    val daysOfWeek: List<String> = days, // For backward compatibility
    val isActive: Boolean
)