import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Smartphone, AlertTriangle, Shield } from "lucide-react";
import type { Device } from "@shared/schema";

export function NetworkControlDashboard() {
  const { isAuthenticated } = useAuth();

  // Fetch devices
  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ["/api/devices"],
    enabled: isAuthenticated,
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });

  // Fetch active schedules to determine network restrictions
  const { data: activeSchedules = [] } = useQuery({
    queryKey: ["/api/schedules/active"],
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  // Fetch device-schedule assignments
  const { data: deviceSchedules = [] } = useQuery({
    queryKey: ["/api/device-schedules"],
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  // Helper function to check if schedule is active for specific device timezone
  const isScheduleActiveForDevice = (schedule: any, device: Device) => {
    if (!schedule.isActive || !device.timezone) return false;
    
    const now = new Date();
    const deviceTime = new Intl.DateTimeFormat('en-US', {
      timeZone: device.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
    
    // Get day of week for device timezone (0 = Sunday, 6 = Saturday)
    const deviceDate = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: device.timezone,
      weekday: 'short'
    });
    const dayName = formatter.format(deviceDate);
    const dayMap: { [key: string]: number } = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const dayOfWeek = dayMap[dayName];
    
    const daysOfWeek = Array.isArray(schedule.daysOfWeek) 
      ? schedule.daysOfWeek 
      : JSON.parse(schedule.daysOfWeek || '[]');
    
    if (!daysOfWeek.includes(dayOfWeek)) return false;
    
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    const [currentHour, currentMinute] = deviceTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const currentMinutes = currentHour * 60 + currentMinute;
    
    // Handle overnight schedules (e.g., 22:00 to 06:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  };

  const getNetworkStatus = (device: Device) => {
    // Find schedules assigned to this device
    const assignedSchedules = deviceSchedules
      .filter((ds: any) => ds.deviceId === device.id)
      .map((ds: any) => ds.schedule);

    // Filter for schedules that are active for THIS specific device's timezone
    const activeDeviceSchedules = assignedSchedules.filter((schedule: any) => {
      return isScheduleActiveForDevice(schedule, device);
    });

    let restrictionLevel = 0;
    let restrictWifi = false;
    let restrictMobileData = false;
    let allowEmergencyAccess = true;

    // Apply highest restriction from active schedules
    activeDeviceSchedules.forEach((schedule: any) => {
      if (schedule.networkRestrictionLevel > restrictionLevel) {
        restrictionLevel = schedule.networkRestrictionLevel;
        restrictWifi = schedule.restrictWifi;
        restrictMobileData = schedule.restrictMobileData;
        allowEmergencyAccess = schedule.allowEmergencyAccess;
      }
    });

    return {
      restrictionLevel,
      restrictWifi,
      restrictMobileData,
      allowEmergencyAccess,
      hasActiveRestrictions: restrictionLevel > 0 || restrictWifi || restrictMobileData
    };
  };

  const getRestrictionLevelText = (level: number) => {
    switch (level) {
      case 0: return "No restrictions";
      case 1: return "Basic";
      case 2: return "Moderate";
      case 3: return "Strict";
      default: return "Unknown";
    }
  };

  const getRestrictionColor = (level: number) => {
    switch (level) {
      case 0: return "default";
      case 1: return "secondary";
      case 2: return "destructive";
      case 3: return "destructive";
      default: return "secondary";
    }
  };

  if (devicesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>Network Control Status</span>
          </CardTitle>
          <CardDescription>Real-time network restriction status across all devices</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading network status...</p>
        </CardContent>
      </Card>
    );
  }

  if (devices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>Network Control Status</span>
          </CardTitle>
          <CardDescription>Real-time network restriction status across all devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Smartphone className="w-12 h-12 mx-auto text-neutral-dark mb-4" />
            <p className="text-neutral-dark mb-4">No devices registered yet</p>
            <p className="text-sm text-neutral-darker">Add devices to see their network control status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <span>Network Control Status</span>
        </CardTitle>
        <CardDescription>Real-time network restriction status across all devices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.map((device: Device) => {
            const networkStatus = getNetworkStatus(device);
            return (
              <div key={device.id} className="border border-neutral-medium rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{device.name}</h4>
                    <p className="text-sm text-neutral-dark">IMEI: {device.imei || 'Not registered'}</p>
                  </div>
                  <Badge 
                    variant={networkStatus.hasActiveRestrictions ? "destructive" : "default"}
                  >
                    {networkStatus.hasActiveRestrictions ? "Restricted" : "Unrestricted"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-xs">Level</span>
                    </div>
                    <Badge variant={getRestrictionColor(networkStatus.restrictionLevel) as any} size="sm">
                      {getRestrictionLevelText(networkStatus.restrictionLevel)}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {networkStatus.restrictWifi ? 
                        <WifiOff className="w-4 h-4 text-red-600" /> : 
                        <Wifi className="w-4 h-4 text-green-600" />
                      }
                      <span className="text-xs">WiFi</span>
                    </div>
                    <span className="text-xs font-medium">
                      {networkStatus.restrictWifi ? "Blocked" : "Allowed"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {networkStatus.restrictMobileData ? 
                        <Smartphone className="w-4 h-4 text-red-600" /> : 
                        <Smartphone className="w-4 h-4 text-green-600" />
                      }
                      <span className="text-xs">Data</span>
                    </div>
                    <span className="text-xs font-medium">
                      {networkStatus.restrictMobileData ? "Blocked" : "Allowed"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="text-xs">Emergency</span>
                    </div>
                    <span className="text-xs font-medium">
                      {networkStatus.allowEmergencyAccess ? "Allowed" : "Blocked"}
                    </span>
                  </div>
                </div>

                {networkStatus.hasActiveRestrictions && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Network restrictions are currently active due to schedule enforcement
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}