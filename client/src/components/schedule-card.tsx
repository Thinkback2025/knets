import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import type { Schedule } from "@shared/schema";

export function ScheduleCard() {
  const { isAuthenticated } = useAuth();

  // Fetch all devices to get schedules
  const { data: devices } = useQuery({
    queryKey: ["/api/devices"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Get active schedules using a single query for active schedules
  const { data: activeSchedules = [] } = useQuery({
    queryKey: ["/api/schedules/active"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Since we now use shared schedules, just use all active schedules for this parent
  const allSchedules = activeSchedules;

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isScheduleCurrentlyActive = (schedule: any) => {
    // Since this component only shows schedules from /api/schedules/active, 
    // all schedules here are already filtered as active by the server-side timezone logic
    return true;
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
          <Calendar className="w-5 h-5 text-green-600" />
          <span>Active Schedules</span>
        </CardTitle>
        <CardDescription className="text-gray-600">
          Currently running device schedules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(allSchedules as any[]).map((schedule: any) => {
            const isCurrentlyActive = isScheduleCurrentlyActive(schedule);
            return (
              <div key={schedule.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{schedule.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${
                      isCurrentlyActive ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                    <span className={`text-sm font-medium ${
                      isCurrentlyActive ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {isCurrentlyActive ? 'In use' : 'Scheduled'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {((allSchedules as any[])?.length === 0) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No active schedules</p>
              <p className="text-sm text-gray-600">
                Create schedules to automatically manage device access
              </p>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          className="w-full mt-4 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={() => {
            document.getElementById('schedule-management-section')?.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }}
        >
          View All Schedules
        </Button>
      </CardContent>
    </Card>
  );
}
