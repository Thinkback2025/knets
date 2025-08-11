import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Lock, Clock, AlertTriangle } from "lucide-react";

interface QuickStatsProps {
  stats?: {
    totalDevices: number;
    activeDevices: number;
    lockedDevices: number;
    totalScreenTime: number;
    alerts: number;
  };
}

export function QuickStats({ stats }: QuickStatsProps) {
  const formatScreenTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-neutral-darker">
              {stats?.totalDevices || 0}
            </span>
          </div>
          <h3 className="font-medium text-neutral-darker mb-1">Registered Devices</h3>
          <p className="text-sm text-neutral-dark">All family devices</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success-green/10 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-success-green" />
            </div>
            <span className="text-2xl font-bold text-neutral-darker">
              {stats?.lockedDevices || 0}
            </span>
          </div>
          <h3 className="font-medium text-neutral-darker mb-1">Active Restrictions</h3>
          <p className="text-sm text-neutral-dark">Currently locked</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-warning-orange/10 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning-orange" />
            </div>
            <span className="text-2xl font-bold text-neutral-darker">
              {stats?.totalScreenTime ? formatScreenTime(stats.totalScreenTime) : '0h 0m'}
            </span>
          </div>
          <h3 className="font-medium text-neutral-darker mb-1">Screen Time Today</h3>
          <p className="text-sm text-neutral-dark">Across all devices</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-error-red/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-error-red" />
            </div>
            <span className="text-2xl font-bold text-neutral-darker">
              {stats?.alerts || 0}
            </span>
          </div>
          <h3 className="font-medium text-neutral-darker mb-1">Active Alerts</h3>
          <p className="text-sm text-neutral-dark">Requires attention</p>
        </CardContent>
      </Card>
    </div>
  );
}
