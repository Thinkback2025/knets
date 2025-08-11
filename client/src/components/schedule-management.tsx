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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Plus, Trash2, Edit, Timer } from "lucide-react";
import type { Device, Schedule } from "@shared/schema";

interface ScheduleManagementProps {
  selectedDevice: Device | null;
}

export function ScheduleManagement({ selectedDevice }: ScheduleManagementProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
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

  // Fetch schedules for selected device
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: [`/api/devices/${selectedDevice?.id}/schedules`],
    enabled: !!selectedDevice && isAuthenticated,
    refetchInterval: 15000, // Auto-refresh every 15 seconds to sync with schedule enforcement
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleData: any) => {
      const response = await apiRequest("POST", "/api/schedules", {
        ...scheduleData,
        deviceId: selectedDevice?.id,
        daysOfWeek: JSON.stringify(scheduleData.daysOfWeek),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${selectedDevice?.id}/schedules`] });
      toast({
        title: "Schedule Created",
        description: "New device schedule has been created successfully",
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

  // Toggle schedule mutation
  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: number; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/schedules/${scheduleId}`, { isActive });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${selectedDevice?.id}/schedules`] });
      toast({
        title: "Schedule Updated",
        description: "Schedule status has been updated",
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
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      await apiRequest("DELETE", `/api/schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${selectedDevice?.id}/schedules`] });
      toast({
        title: "Schedule Deleted",
        description: "Schedule has been removed",
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
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (scheduleData: any) => {
      const response = await apiRequest("PATCH", `/api/schedules/${editingSchedule?.id}`, {
        ...scheduleData,
        daysOfWeek: JSON.stringify(scheduleData.daysOfWeek),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${selectedDevice?.id}/schedules`] });
      toast({
        title: "Schedule Updated",
        description: "Schedule has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
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
        description: "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  // Quick lock mutation for instant periods
  const quickLockMutation = useMutation({
    mutationFn: async (duration: number) => {
      const response = await apiRequest("POST", `/api/devices/${selectedDevice?.id}/quick-lock`, { duration });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Device Locked",
        description: `Device locked for ${data.duration} minutes`,
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
        title: "Error",
        description: "Failed to lock device",
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
  };

  const handleDayToggle = (day: number) => {
    setScheduleFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day) 
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const getDayName = (day: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const setQuickPeriod = (minutes: number) => {
    const now = new Date();
    const end = new Date(now.getTime() + minutes * 60000);
    
    setScheduleFormData(prev => ({
      ...prev,
      name: `Quick Lock - ${minutes}min`,
      startTime: now.toTimeString().slice(0, 5),
      endTime: end.toTimeString().slice(0, 5),
      daysOfWeek: [now.getDay()], // Today only
    }));
  };

  const startEditingSchedule = (schedule: Schedule) => {
    const daysOfWeek = JSON.parse(schedule.daysOfWeek);
    setEditingSchedule(schedule);
    setScheduleFormData({
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      daysOfWeek: daysOfWeek,
      isActive: schedule.isActive,
      networkRestrictionLevel: schedule.networkRestrictionLevel || 0,
      restrictWifi: schedule.restrictWifi || false,
      restrictMobileData: schedule.restrictMobileData || false,
      allowEmergencyAccess: schedule.allowEmergencyAccess ?? true, // default to true
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingSchedule) {
      updateScheduleMutation.mutate(scheduleFormData);
    } else {
      createScheduleMutation.mutate(scheduleFormData);
    }
  };

  if (!selectedDevice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <span>Schedule Management</span>
          </CardTitle>
          <CardDescription>Select a device to manage its schedules</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Lock Periods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="w-5 h-5 text-green-600" />
            <span>Quick Lock</span>
          </CardTitle>
          <CardDescription>Lock device instantly for a set period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => quickLockMutation.mutate(15)}
              disabled={quickLockMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>15 min</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => quickLockMutation.mutate(30)}
              disabled={quickLockMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>30 min</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => quickLockMutation.mutate(60)}
              disabled={quickLockMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>1 hour</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => quickLockMutation.mutate(120)}
              disabled={quickLockMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>2 hours</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Recurring Schedules</span>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Schedule</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Schedule</DialogTitle>
                  <DialogDescription>
                    Set up a recurring lock schedule for {selectedDevice.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-name">Schedule Name</Label>
                    <Input
                      id="schedule-name"
                      value={scheduleFormData.name}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Study Time, Bedtime"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={scheduleFormData.startTime}
                        onChange={(e) => setScheduleFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={scheduleFormData.endTime}
                        onChange={(e) => setScheduleFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Quick Periods</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickPeriod(15)}
                      >
                        15min
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickPeriod(30)}
                      >
                        30min
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickPeriod(60)}
                      >
                        1hr
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2, 3, 4, 5, 6].map(day => (
                        <Button
                          key={day}
                          type="button"
                          variant={scheduleFormData.daysOfWeek.includes(day) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleDayToggle(day)}
                        >
                          {getDayName(day)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="schedule-active"
                      checked={scheduleFormData.isActive}
                      onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="schedule-active">Enable schedule</Label>
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

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!scheduleFormData.name || !scheduleFormData.startTime || !scheduleFormData.endTime || scheduleFormData.daysOfWeek.length === 0 || createScheduleMutation.isPending}
                    >
                      {createScheduleMutation.isPending ? "Creating..." : "Create Schedule"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>Manage recurring lock schedules for {selectedDevice.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <p>Loading schedules...</p>
          ) : (schedules as Schedule[]).length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-neutral-dark mb-4" />
              <p className="text-neutral-dark mb-4">No schedules created yet</p>
              <p className="text-sm text-neutral-darker">Create your first schedule to automatically manage device access</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(schedules as Schedule[]).map((schedule: Schedule) => {
                const daysOfWeek = JSON.parse(schedule.daysOfWeek || '[]');
                return (
                  <div key={schedule.id} className="border border-neutral-medium rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{schedule.name}</h4>
                          <Badge variant={schedule.isActive ? "default" : "secondary"}>
                            {schedule.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-neutral-dark">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                          </span>
                          <span>{daysOfWeek.sort((a: number, b: number) => a - b).map((day: number) => getDayName(day)).join(', ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={(checked) => 
                            toggleScheduleMutation.mutate({ scheduleId: schedule.id, isActive: checked })
                          }
                          disabled={toggleScheduleMutation.isPending}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingSchedule(schedule)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                          disabled={deleteScheduleMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update the schedule details for {selectedDevice.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Schedule Name</Label>
              <Input
                placeholder="e.g., Study Time, Bedtime"
                value={scheduleFormData.name}
                onChange={(e) => setScheduleFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={scheduleFormData.startTime}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={scheduleFormData.endTime}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <Button
                    key={day}
                    type="button"
                    variant={scheduleFormData.daysOfWeek.includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day)}
                  >
                    {getDayName(day)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-schedule-active"
                checked={scheduleFormData.isActive}
                onCheckedChange={(checked) => setScheduleFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="edit-schedule-active">Enable schedule</Label>
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

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingSchedule(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!scheduleFormData.name || !scheduleFormData.startTime || !scheduleFormData.endTime || scheduleFormData.daysOfWeek.length === 0 || updateScheduleMutation.isPending}
              >
                {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}