import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Plus, AlertTriangle } from "lucide-react";

interface ActivityLogProps {
  activities?: Array<{
    id: number;
    deviceId: number;
    action: string;
    description: string;
    timestamp: string;
    metadata?: any;
  }>;
}

export function ActivityLog({ activities }: ActivityLogProps) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'device_locked':
        return <Lock className="w-4 h-4 text-error-red" />;
      case 'device_unlocked':
        return <Unlock className="w-4 h-4 text-success-green" />;
      case 'device_registered':
        return <Plus className="w-4 h-4 text-trust-blue" />;
      case 'emergency_unlock':
        return <AlertTriangle className="w-4 h-4 text-warning-orange" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-neutral-dark" />;
    }
  };

  const getActivityIconBg = (action: string) => {
    switch (action) {
      case 'device_locked':
        return 'bg-error-red/10';
      case 'device_unlocked':
        return 'bg-success-green/10';
      case 'device_registered':
        return 'bg-trust-blue/10';
      case 'emergency_unlock':
        return 'bg-warning-orange/10';
      default:
        return 'bg-neutral-medium';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Button variant="ghost" className="text-trust-blue hover:text-blue-700">
            View Full Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityIconBg(activity.action)}`}>
                {getActivityIcon(activity.action)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-neutral-darker">{activity.description}</p>
                <p className="text-xs text-neutral-dark">{formatTimestamp(activity.timestamp)}</p>
              </div>
              <span className="text-xs text-neutral-dark capitalize">
                {activity.action.replace('_', ' ')}
              </span>
            </div>
          ))}
          
          {(!activities || activities.length === 0) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-neutral-medium rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-neutral-dark" />
              </div>
              <p className="text-neutral-dark mb-2">No recent activity</p>
              <p className="text-sm text-neutral-dark">
                Device activities will appear here once you start monitoring
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
