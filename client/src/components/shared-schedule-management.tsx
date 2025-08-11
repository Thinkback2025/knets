import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, Trash2, Edit, Timer, Smartphone, Users } from "lucide-react";
import type { Device, Schedule } from "@shared/schema";

export function SharedScheduleManagement() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [scheduleFormData, setScheduleFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    daysOfWeek: [] as number[],
    isActive: true,
    networkRestrictionLevel: 0,
    restrictWifi: false,
    restrictMobileData: false,
    allowEmergencyAccess: true,
  });

  // Fetch all schedules for the parent
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["/api/schedules"],
    enabled: isAuthenticated,
  });

  // Fetch all devices
  const { data: devices = [] } = useQuery({
    queryKey: ["/api/devices"],
    enabled: isAuthenticated,
    refetchInterval: 15000, // Auto-refresh every 15 seconds to sync with schedule enforcement
    onSuccess: (data) => {
      console.log('[DEBUG] Devices fetched for shared schedule:', data.map(d => ({ id: d.id, name: d.name })));
    }
  });

  // Fetch all schedules for devices (using a single query that gets device-schedule mappings)
  const { data: allDeviceSchedules = [] } = useQuery({
    queryKey: ["/api/device-schedules"],
    enabled: isAuthenticated,
    refetchInterval: 15000, // Auto-refresh device-schedule mappings
  });

  // Create a map of device ID to schedules for easy lookup
  const deviceScheduleMap = allDeviceSchedules.reduce((acc: Record<number, any[]>, item: any) => {
    if (!acc[item.deviceId]) {
      acc[item.deviceId] = [];
    }
    acc[item.deviceId].push(item.schedule);
    return acc;
  }, {});

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleData: any) => {
      const response = await apiRequest("POST", "/api/schedules", {
        ...scheduleData,
        deviceIds: selectedDeviceIds,
        daysOfWeek: JSON.stringify(scheduleData.daysOfWeek),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/active"] });
      devices.forEach((device: Device) => {
        queryClient.invalidateQueries({ queryKey: [`/api/devices/${device.id}/schedules`] });
      });
      toast({
        title: "Schedule Created",
        description: "Shared schedule has been created and assigned to selected devices",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create schedule",
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!editingSchedule) throw new Error("No schedule selected for editing");
      console.log('[DEBUG] Updating schedule with data:', updates);
      console.log('[DEBUG] Network controls:', {
        networkRestrictionLevel: updates.networkRestrictionLevel,
        restrictWifi: updates.restrictWifi,
        restrictMobileData: updates.restrictMobileData,
        allowEmergencyAccess: updates.allowEmergencyAccess
      });
      const response = await apiRequest("PATCH", `/api/schedules/${editingSchedule.id}`, {
        ...updates,
        daysOfWeek: JSON.stringify(updates.daysOfWeek),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Update failed:', response.status, errorText);
        throw new Error(`Update failed: ${response.status} ${errorText}`);
      }
      const result = await response.json();
      console.log('[DEBUG] Update response:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/active"] });
      devices.forEach((device: Device) => {
        queryClient.invalidateQueries({ queryKey: [`/api/devices/${device.id}/schedules`] });
      });
      toast({
        title: "Schedule Updated",
        description: "Schedule has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await apiRequest("DELETE", `/api/schedules/${scheduleId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/active"] });
      devices.forEach((device: Device) => {
        queryClient.invalidateQueries({ queryKey: [`/api/devices/${device.id}/schedules`] });
      });
      toast({
        title: "Schedule Deleted",
        description: "Schedule has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      });
    },
  });

  // Assign device to schedule mutation
  const assignDeviceMutation = useMutation({
    mutationFn: async ({ scheduleId, deviceId }: { scheduleId: number; deviceId: number }) => {
      const response = await apiRequest("POST", `/api/schedules/${scheduleId}/devices/${deviceId}`);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/device-schedules"] });
      devices.forEach((device: Device) => {
        queryClient.invalidateQueries({ queryKey: [`/api/devices/${device.id}/schedules`] });
      });
      const device = devices.find(d => d.id === variables.deviceId);
      toast({
        title: "Device Connected",
        description: `${device?.name} is now following this schedule`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Connection Failed", 
        description: "Failed to connect device to schedule",
        variant: "destructive",
      });
    },
  });

  // Remove device from schedule mutation
  const removeDeviceMutation = useMutation({
    mutationFn: async ({ scheduleId, deviceId }: { scheduleId: number; deviceId: number }) => {
      const response = await apiRequest("DELETE", `/api/schedules/${scheduleId}/devices/${deviceId}`);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/device-schedules"] });
      devices.forEach((device: Device) => {
        queryClient.invalidateQueries({ queryKey: [`/api/devices/${device.id}/schedules`] });
      });
      const device = devices.find(d => d.id === variables.deviceId);
      toast({
        title: "Device Disconnected",
        description: `${device?.name} is no longer following this schedule`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect device from schedule", 
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setScheduleFormData({
      name: "",
      startTime: "",
      endTime: "",
      daysOfWeek: [],
      isActive: true,
      networkRestrictionLevel: 0,
      restrictWifi: false,
      restrictMobileData: false,
      allowEmergencyAccess: true,
    });
    setSelectedDeviceIds([]);
  };

  const startEditingSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    let daysOfWeek = [];
    try {
      daysOfWeek = JSON.parse(schedule.daysOfWeek || '[]');
    } catch {
      daysOfWeek = [];
    }
    
    setScheduleFormData({
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      daysOfWeek,
      isActive: schedule.isActive,
      networkRestrictionLevel: schedule.networkRestrictionLevel || 0,
      restrictWifi: schedule.restrictWifi || false,
      restrictMobileData: schedule.restrictMobileData || false,
      allowEmergencyAccess: schedule.allowEmergencyAccess ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const handleDayToggle = (dayIndex: number, checked: boolean) => {
    if (checked) {
      setScheduleFormData(prev => ({
        ...prev,
        daysOfWeek: [...prev.daysOfWeek, dayIndex]
      }));
    } else {
      setScheduleFormData(prev => ({
        ...prev,
        daysOfWeek: prev.daysOfWeek.filter(day => day !== dayIndex)
      }));
    }
  };

  const handleDeviceSelection = (deviceId: number, checked: boolean) => {
    console.log(`[DEBUG] Device ${deviceId} ${checked ? 'selected' : 'deselected'}`);
    if (checked) {
      setSelectedDeviceIds(prev => {
        const updated = [...prev, deviceId];
        console.log('[DEBUG] Updated selected devices:', updated);
        return updated;
      });
    } else {
      setSelectedDeviceIds(prev => {
        const updated = prev.filter(id => id !== deviceId);
        console.log('[DEBUG] Updated selected devices:', updated);
        return updated;
      });
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDays = (daysOfWeek: string) => {
    try {
      const days = JSON.parse(daysOfWeek);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      // Sort the days numerically first, then map to names
      const sortedDays = days.sort((a: number, b: number) => a - b);
      return sortedDays.map((day: number) => dayNames[day]).join(', ');
    } catch {
      return 'Invalid days';
    }
  };

  const isScheduleCurrentlyActive = (schedule: Schedule) => {
    // Use proper time-based checking for each device in its own timezone
    const connectedDevices = devices.filter((device: Device) => {
      const deviceSchedules = deviceScheduleMap[device.id] || [];
      return deviceSchedules.some((s: any) => s.id === schedule.id);
    });
    
    // Check if this specific schedule should be active for any connected device
    // based on device-specific timezone and current time
    for (const device of connectedDevices) {
      if (isScheduleActiveForDevice(schedule, device)) {
        return true;
      }
    }
    
    return false;
  };

  const isScheduleActiveForDevice = (schedule: Schedule, device: Device) => {
    // Get device timezone, with fallbacks
    let deviceTimeZone = device.timezone || 'UTC';
    
    // Timezone data is now properly included from backend
    
    if (deviceTimeZone === 'UTC' && device.phoneNumber) {
      // You could add timezone detection logic here based on phone number
      deviceTimeZone = 'UTC';
    }
    
    const now = new Date();
    const deviceTime = new Date(now.toLocaleString("en-US", { timeZone: deviceTimeZone }));
    const currentTime = deviceTime.toTimeString().slice(0, 5);
    const currentDay = deviceTime.getDay();
    
    let daysOfWeek;
    try {
      daysOfWeek = JSON.parse(schedule.daysOfWeek || '[]');
    } catch {
      daysOfWeek = [];
    }
    
    // Handle both string format (["monday", "tuesday"]) and numeric format ([0, 1, 2])
    let isScheduledForToday = false;
    if (daysOfWeek.length > 0) {
      if (typeof daysOfWeek[0] === 'string') {
        // String format: convert current day to string
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        isScheduledForToday = daysOfWeek.includes(dayNames[currentDay]);
      } else {
        // Numeric format: use current day directly
        isScheduledForToday = daysOfWeek.includes(currentDay);
      }
    }
    
    if (!isScheduledForToday) return false;
    
    const startTime = schedule.startTime;
    const endTime = schedule.endTime;
    
    // Proper timezone-based schedule checking for all devices
    
    // Handle overnight schedules (e.g., 22:00 - 06:30)
    if (startTime > endTime) {
      // Overnight schedule: active if current time >= start OR current time <= end
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      // Same day schedule: active if current time is between start and end
      return currentTime >= startTime && currentTime <= endTime;
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (schedulesLoading) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Shared Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading schedules...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-green-600" />
          Shared Schedules
        </CardTitle>
        <CardDescription>
          Create schedules that can be shared across multiple devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Shared Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Shared Schedule</DialogTitle>
              <DialogDescription>
                Create a schedule that can be applied to multiple devices
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="schedule-name">Schedule Name</Label>
                <Input
                  id="schedule-name"
                  value={scheduleFormData.name}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., School Hours, Bedtime"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={scheduleFormData.startTime}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={scheduleFormData.endTime}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Days of Week</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {dayNames.map((day, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${index}`}
                        checked={scheduleFormData.daysOfWeek.includes(index)}
                        onCheckedChange={(checked) => handleDayToggle(index, checked as boolean)}
                      />
                      <Label htmlFor={`day-${index}`} className="text-sm">{day}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Select Devices</Label>
                <div className="space-y-2 mt-2">
                  {devices.map((device: Device) => (
                    <div key={device.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`device-${device.id}`}
                        checked={selectedDeviceIds.includes(device.id)}
                        onCheckedChange={(checked) => handleDeviceSelection(device.id, checked as boolean)}
                      />
                      <Label htmlFor={`device-${device.id}`} className="text-sm flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        {device.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-active"
                  checked={scheduleFormData.isActive}
                  onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="is-active">Active</Label>
              </div>

              {/* Network Control Options */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-medium">Network Control</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="restriction-level" className="text-sm">Restriction Level</Label>
                  <Select
                    value={scheduleFormData.networkRestrictionLevel.toString()}
                    onValueChange={(value) => setScheduleFormData(prev => ({ ...prev, networkRestrictionLevel: parseInt(value) }))}
                  >
                    <SelectTrigger id="restriction-level">
                      <SelectValue placeholder="Select restriction level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No restrictions</SelectItem>
                      <SelectItem value="1">Basic restrictions</SelectItem>
                      <SelectItem value="2">Moderate restrictions</SelectItem>
                      <SelectItem value="3">Strict restrictions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="restrict-wifi"
                      checked={scheduleFormData.restrictWifi}
                      onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, restrictWifi: checked }))}
                    />
                    <Label htmlFor="restrict-wifi" className="text-sm">Block WiFi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="restrict-mobile-data"
                      checked={scheduleFormData.restrictMobileData}
                      onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, restrictMobileData: checked }))}
                    />
                    <Label htmlFor="restrict-mobile-data" className="text-sm">Block Mobile Data</Label>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="allow-emergency"
                    checked={scheduleFormData.allowEmergencyAccess}
                    onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, allowEmergencyAccess: checked }))}
                  />
                  <Label htmlFor="allow-emergency" className="text-sm">Allow Emergency Access</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => createScheduleMutation.mutate(scheduleFormData)}
                  disabled={createScheduleMutation.isPending || !scheduleFormData.name || !scheduleFormData.startTime || !scheduleFormData.endTime}
                  className="flex-1"
                >
                  {createScheduleMutation.isPending ? "Creating..." : "Create Schedule"}
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-3">
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No shared schedules yet</p>
              <p className="text-sm">Create your first shared schedule to get started</p>
            </div>
          ) : (
            schedules.map((schedule: Schedule) => {
              // Get devices connected to this schedule using the device-schedule map
              const connectedDevices = devices.filter((device: Device) => {
                const deviceSchedules = deviceScheduleMap[device.id] || [];
                return deviceSchedules.some((s: any) => s.id === schedule.id);
              });

              return (
                <div key={schedule.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{schedule.name}</h4>
                        {!schedule.isActive ? (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            Disabled
                          </Badge>
                        ) : isScheduleCurrentlyActive(schedule) ? (
                          <Badge variant="default" className="bg-red-100 text-red-800 border-red-300">
                            Active Now
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                            Scheduled
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDays(schedule.daysOfWeek)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Connected to {connectedDevices.length} device(s)
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditingSchedule(schedule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                        disabled={deleteScheduleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Device Connection Management */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm font-medium mb-2">Device Controls:</div>
                    <div className="space-y-2">
                      {devices.map((device: Device) => {
                        const deviceSchedules = deviceScheduleMap[device.id] || [];
                        const isConnected = deviceSchedules.some((s: any) => s.id === schedule.id);
                        return (
                          <div key={device.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 relative z-10">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              <span className="text-sm font-medium">{device.name}</span>
                              {isConnected && isScheduleCurrentlyActive(schedule) && (
                                <Badge variant="default" className="bg-red-100 text-red-800 border-red-300 text-xs">
                                  Active Now
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log(`[DEBUG] Toggling device ${device.id} for schedule ${schedule.id}: ${!isConnected}`);
                                  if (!isConnected) {
                                    assignDeviceMutation.mutate({ scheduleId: schedule.id, deviceId: device.id });
                                  } else {
                                    removeDeviceMutation.mutate({ scheduleId: schedule.id, deviceId: device.id });
                                  }
                                }}
                                disabled={assignDeviceMutation.isPending || removeDeviceMutation.isPending}
                                className={`
                                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 
                                  focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
                                  ${isConnected ? 'bg-blue-600' : 'bg-gray-200'}
                                `}
                              >
                                <span
                                  className={`
                                    pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 
                                    transition duration-200 ease-in-out transform
                                    ${isConnected ? 'translate-x-5' : 'translate-x-0'}
                                  `}
                                />
                              </button>
                              <span className="text-xs text-gray-500 min-w-[60px]">
                                {isConnected ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Edit Schedule Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Schedule</DialogTitle>
              <DialogDescription>
                Update the schedule details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-schedule-name">Schedule Name</Label>
                <Input
                  id="edit-schedule-name"
                  value={scheduleFormData.name}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., School Hours, Bedtime"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-start-time">Start Time</Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={scheduleFormData.startTime}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-end-time">End Time</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={scheduleFormData.endTime}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Days of Week</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {dayNames.map((day, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-day-${index}`}
                        checked={scheduleFormData.daysOfWeek.includes(index)}
                        onCheckedChange={(checked) => handleDayToggle(index, checked as boolean)}
                      />
                      <Label htmlFor={`edit-day-${index}`} className="text-sm">{day}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-active"
                  checked={scheduleFormData.isActive}
                  onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="edit-is-active">Active</Label>
              </div>

              {/* Network Control Options */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-medium">Network Control</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-restriction-level" className="text-sm">Restriction Level</Label>
                  <Select
                    value={scheduleFormData.networkRestrictionLevel.toString()}
                    onValueChange={(value) => setScheduleFormData(prev => ({ ...prev, networkRestrictionLevel: parseInt(value) }))}
                  >
                    <SelectTrigger id="edit-restriction-level">
                      <SelectValue placeholder="Select restriction level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No restrictions</SelectItem>
                      <SelectItem value="1">Basic restrictions</SelectItem>
                      <SelectItem value="2">Moderate restrictions</SelectItem>
                      <SelectItem value="3">Strict restrictions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-restrict-wifi"
                      checked={scheduleFormData.restrictWifi}
                      onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, restrictWifi: checked }))}
                    />
                    <Label htmlFor="edit-restrict-wifi" className="text-sm">Block WiFi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-restrict-mobile-data"
                      checked={scheduleFormData.restrictMobileData}
                      onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, restrictMobileData: checked }))}
                    />
                    <Label htmlFor="edit-restrict-mobile-data" className="text-sm">Block Mobile Data</Label>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-allow-emergency"
                    checked={scheduleFormData.allowEmergencyAccess}
                    onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, allowEmergencyAccess: checked }))}
                  />
                  <Label htmlFor="edit-allow-emergency" className="text-sm">Allow Emergency Access</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => updateScheduleMutation.mutate(scheduleFormData)}
                  disabled={updateScheduleMutation.isPending || !scheduleFormData.name || !scheduleFormData.startTime || !scheduleFormData.endTime}
                  className="flex-1"
                >
                  {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingSchedule(null);
                    resetForm();
                  }} 
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}