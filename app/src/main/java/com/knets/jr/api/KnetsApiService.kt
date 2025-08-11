package com.knets.jr.api

import com.knets.jr.model.ApiResponse
import com.knets.jr.model.ConnectResponse
import com.knets.jr.model.DeviceRegistration
import com.knets.jr.model.DeviceStatus
import com.knets.jr.model.DeviceInfo
import com.knets.jr.model.Schedule
import com.knets.jr.model.UninstallRequestResponse
import com.knets.jr.model.UninstallStatusResponse
import com.knets.jr.model.UninstallRequest
import retrofit2.Response
import retrofit2.http.*

interface KnetsApiService {
    
    @POST("api/companion/register")
    suspend fun registerDevice(@Body registration: DeviceRegistration): ApiResponse<Any>
    
    @POST("api/companion/connect")
    suspend fun connectDevice(@Body connectionData: Map<String, String>): Response<ApiResponse<Any>>
    
    @POST("api/device/connect")
    suspend fun connectDeviceWithParentCode(@Body connectionData: Map<String, String>): Response<ConnectResponse>
    
    @GET("api/companion/schedules/{imei}")
    suspend fun getDeviceSchedules(@Path("imei") imei: String): List<Schedule>
    
    @PUT("api/companion/status/{imei}")
    suspend fun updateDeviceStatus(@Path("imei") imei: String, @Body status: DeviceStatus): ApiResponse<Any>
    
    @POST("api/companion/heartbeat")
    suspend fun sendHeartbeat(@Body heartbeat: Map<String, Any>): Response<ApiResponse<Any>>
    
    @GET("api/devices/lookup/mobile/{phoneNumber}")
    suspend fun lookupDeviceByMobile(@Path("phoneNumber") phoneNumber: String): Response<DeviceInfo>
    
    @GET("api/companion/device/{imei}")
    suspend fun getDeviceInfo(@Path("imei") imei: String): ApiResponse<DeviceStatus>
    
    @POST("api/companion/lock/{imei}")
    suspend fun lockDevice(@Path("imei") imei: String): ApiResponse<Any>
    
    @POST("api/companion/unlock/{imei}")
    suspend fun unlockDevice(@Path("imei") imei: String): ApiResponse<Any>
    
    @POST("api/companion/request-uninstall")
    suspend fun requestUninstall(@Body request: Map<String, String>): Response<UninstallRequestResponse>
    
    @GET("api/companion/uninstall-status/{requestId}")
    suspend fun checkUninstallStatus(@Path("requestId") requestId: String): Response<UninstallStatusResponse>
    
    @PUT("api/companion/timezone/{imei}")
    suspend fun updateDeviceTimezone(@Path("imei") imei: String, @Body timezoneData: Map<String, String>): Response<ApiResponse<Any>>
    
    @POST("api/companion/request-device-admin-disable")
    suspend fun requestDeviceAdminDisable(@Body request: UninstallRequest): Response<ApiResponse<Any>>
    
    @POST("api/companion/validate-secret-code") 
    suspend fun validateSecretCode(@Body validationData: Map<String, String>): Response<ApiResponse<Any>>
}