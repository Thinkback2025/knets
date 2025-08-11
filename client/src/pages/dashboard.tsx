import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePricing } from "@/hooks/usePricing";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { QuickStats } from "@/components/quick-stats";
import { DeviceCard } from "@/components/device-card";
import { ScheduleCard } from "@/components/schedule-card";

import { SharedScheduleManagement } from "@/components/shared-schedule-management";
import { ActivityLog } from "@/components/activity-log";
import { DeviceRegistrationModal } from "@/components/device-registration-modal";
import { KnetsJrShareModal } from "@/components/knets-jr-share-modal";
import { SubscriptionRenewalPage } from "@/components/subscription-renewal-page";
import { NetworkControlDashboard } from "@/components/network-control-dashboard";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Bell, Plus, Lock, Unlock, Calendar, TriangleAlert, MapPin, Smartphone, Users, LogOut, CreditCard } from "lucide-react";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { subscriptionPrice, childUpgradePrice } = usePricing();
  
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDeviceForSchedule, setSelectedDeviceForSchedule] = useState<any>(null);
  const [showKnetsJrModal, setShowKnetsJrModal] = useState(false);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState("");
  const [showChildLimitDialog, setShowChildLimitDialog] = useState(false);
  const [additionalChildren, setAdditionalChildren] = useState(1);
  const [childUpgradeQrCode, setChildUpgradeQrCode] = useState<string | null>(null);
  const [childPaymentId, setChildPaymentId] = useState<string | null>(null);
  const [childPaymentStatus, setChildPaymentStatus] = useState<'pending' | 'completed' | 'failed' | null>(null);
  
  // Subscription renewal state
  const [renewalQrCode, setRenewalQrCode] = useState<string | null>(null);
  const [renewalPaymentId, setRenewalPaymentId] = useState<string | null>(null);
  const [renewalPaymentStatus, setRenewalPaymentStatus] = useState<'pending' | 'completed' | 'failed' | null>(null);


  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Check subscription status and block access if inactive
  const isSubscriptionInactive = user?.subscriptionStatus === 'inactive';
  
  // Show subscription renewal page if status is inactive
  if (isAuthenticated && !isLoading && isSubscriptionInactive) {
    return <SubscriptionRenewalPage />;
  }

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
    refetchInterval: 15000, // Auto-refresh stats to match device updates
  });

  const { data: devices } = useQuery({
    queryKey: ["/api/devices"],
    retry: false,
    refetchInterval: 15000, // Auto-refresh every 15 seconds to sync with backend schedule enforcement
  });

  const { data: activities } = useQuery({
    queryKey: ["/api/activity"],
    retry: false,
  });

  const { data: children } = useQuery({
    queryKey: ["/api/children"],
    retry: false,
  });

  // Get currently active schedules for the "Active Now" count
  const { data: activeSchedules = [] } = useQuery({
    queryKey: ["/api/schedules/active"],
    retry: false,
    refetchInterval: 15000, // Auto-refresh active schedules to stay in sync
  });

  // Check subscription status (after devices is available)
  const isSubscriptionExpired = user?.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date();
  const daysLeft = user?.subscriptionEndDate ? Math.ceil((new Date(user.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const childrenCount = devices?.length || 0;
  const maxChildren = user?.maxChildren || 3;

  // Check if any devices are currently locked
  const hasLockedDevices = devices?.some((device: any) => device.isLocked) || false;
  const allDevicesLocked = devices?.every((device: any) => device.isLocked) || false;

  // UPI apps available by country
  const UPI_APPS_BY_COUNTRY = {
    "+91": [ // India
      { id: "gpay", name: "Google Pay", icon: "💳" },
      { id: "phonepe", name: "PhonePe", icon: "📱" },
      { id: "paytm", name: "Paytm", icon: "💰" },
      { id: "bhim", name: "BHIM", icon: "🏦" },
    ],
    "+880": [ // Bangladesh
      { id: "bkash", name: "bKash", icon: "💳" },
      { id: "rocket", name: "Rocket", icon: "🚀" },
    ],
    "+94": [ // Sri Lanka
      { id: "ezpay", name: "eZ Pay", icon: "💳" },
    ],
    "+977": [ // Nepal
      { id: "esewa", name: "eSewa", icon: "💳" },
      { id: "khalti", name: "Khalti", icon: "💰" },
    ],
  };

  // Get UPI apps for user's country
  const countryCode = user?.countryCode || user?.mobileNumber?.substring(0, 3) || "+91";
  const availableUpiApps = UPI_APPS_BY_COUNTRY[countryCode as keyof typeof UPI_APPS_BY_COUNTRY] || UPI_APPS_BY_COUNTRY["+91"];

  const renewSubscriptionMutation = useMutation({
    mutationFn: async (upiApp: string) => {
      const response = await apiRequest("POST", "/api/subscription/renew", {
        subscriptionType: "yearly",
        upiApp,
        amount: subscriptionPrice, // Get subscription price from centralized config
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log("✅ Subscription renewal response:", data);
      console.log("🎯 QR Code received:", data.qrCode ? "YES" : "NO");
      
      if (data.qrCode) {
        console.log("🖼️ Setting renewal QR code...");
        setRenewalQrCode(data.qrCode);
        setRenewalPaymentId(data.paymentId);
        setRenewalPaymentStatus('pending');
        
        // Ensure dialog stays open
        setShowRenewalDialog(true);
        
        // Start monitoring payment status
        startRenewalPaymentMonitoring(data.paymentId);
      } else if (data.paymentUrl) {
        // Fallback to redirect if no QR code
        window.open(data.paymentUrl, "_blank");
        toast({
          title: "Payment Initiated",
          description: "Please complete the payment in the opened window.",
        });
      } else {
        console.error("❌ No QR code or payment URL in response:", data);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const upgradeChildLimitMutation = useMutation({
    mutationFn: async ({ upiApp, additionalChildren }: { upiApp: string; additionalChildren: number }) => {
      console.log("🚀 Making payment request:", { additionalChildren, upiApp });
      const response = await apiRequest("POST", "/api/subscription/upgrade-child-limit", {
        additionalChildren,
        upiApp,
      });
      const data = await response.json();
      console.log("📥 Payment response parsed:", data);
      return data;
    },
    onSuccess: (data: any) => {
      console.log("✅ Child upgrade payment response:", data);
      console.log("🎯 QR Code received:", data.qrCode ? "YES" : "NO");
      
      if (data.qrCode) {
        console.log("🖼️ Setting child QR code...");
        setChildUpgradeQrCode(data.qrCode);
        setChildPaymentId(data.paymentId);
        setChildPaymentStatus('pending');
        
        // Ensure dialog stays open
        setShowChildLimitDialog(true);
        
        // Start monitoring payment status
        startChildPaymentMonitoring(data.paymentId);
      } else {
        console.error("❌ No QR code in response:", data);
      }
      
      if (data.paymentUrl) {
        // Keep the direct UPI link as fallback
        setTimeout(() => {
          if (confirm("Open payment in your UPI app?")) {
            window.location.href = data.paymentUrl;
          }
        }, 2000);
      }
      toast({
        title: "Payment QR Generated",
        description: `Scan QR code to pay ₹${data.totalAmount} for ${additionalChildren} additional children`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRenewal = () => {
    if (!selectedUpiApp) {
      toast({
        title: "Select Payment Method",
        description: "Please select a UPI app to proceed with payment.",
        variant: "destructive",
      });
      return;
    }
    renewSubscriptionMutation.mutate(selectedUpiApp);
  };

  // Child payment monitoring function
  const startChildPaymentMonitoring = (paymentId: string) => {
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payment/status/${paymentId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setChildPaymentStatus('completed');
          setChildUpgradeQrCode(null);
          setChildPaymentId(null);
          // Refresh both user data and dashboard stats to reflect updated child limit
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
          toast({
            title: "Payment Successful! ✅",
            description: `Child limit upgraded! You can now add ${additionalChildren} more children`,
            variant: "default",
          });
          // Close dialog and open device modal
          setTimeout(() => {
            setShowChildLimitDialog(false);
            setShowDeviceModal(true);
          }, 2000);
          return;
        } else if (data.status === 'failed') {
          setChildPaymentStatus('failed');
          toast({
            title: "Payment Failed",
            description: "Please try again or contact support",
            variant: "destructive",
          });
          return;
        }
        
        // Continue monitoring if still pending
        setTimeout(checkPaymentStatus, 3000); // Check every 3 seconds
      } catch (error) {
        console.error('Child payment status check failed:', error);
        setTimeout(checkPaymentStatus, 5000); // Retry in 5 seconds on error
      }
    };
    
    // Start checking after 2 seconds
    setTimeout(checkPaymentStatus, 2000);
  };

  // Renewal payment monitoring function
  const startRenewalPaymentMonitoring = (paymentId: string) => {
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payment/status/${paymentId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setRenewalPaymentStatus('completed');
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          toast({
            title: "Subscription Renewed! ✅",
            description: "Your subscription has been extended for 1 year",
            variant: "default",
          });
          // Close dialog after success
          setTimeout(() => {
            setShowRenewalDialog(false);
            setRenewalQrCode(null);
            setRenewalPaymentId(null);
            setRenewalPaymentStatus(null);
          }, 3000);
          return;
        } else if (data.status === 'failed') {
          setRenewalPaymentStatus('failed');
          toast({
            title: "Payment Failed",
            description: "Please try again or contact support",
            variant: "destructive",
          });
          return;
        }
        
        // Continue monitoring if still pending
        setTimeout(checkPaymentStatus, 3000); // Check every 3 seconds
      } catch (error) {
        console.error('Renewal payment status check failed:', error);
        setTimeout(checkPaymentStatus, 5000); // Retry in 5 seconds on error
      }
    };
    
    // Start checking after 2 seconds
    setTimeout(checkPaymentStatus, 2000);
  };

  const handleChildLimitUpgrade = () => {
    if (!selectedUpiApp) {
      toast({
        title: "Select Payment Method",
        description: "Please select a UPI app to proceed with payment.",
        variant: "destructive",
      });
      return;
    }
    upgradeChildLimitMutation.mutate({ 
      upiApp: selectedUpiApp, 
      additionalChildren: additionalChildren 
    });
  };

  // Toggle lock mutation - locks or unlocks all devices
  const toggleLockMutation = useMutation({
    mutationFn: async () => {
      const action = hasLockedDevices ? "unlock" : "lock";
      const response = await apiRequest("POST", "/api/devices/toggle-lock", { action });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      
      const action = data.action;
      const deviceCount = data.affectedDevices || 0;
      toast({
        title: action === "lock" ? "Devices Locked" : "Devices Unlocked",
        description: `${deviceCount} device(s) ${action === "lock" ? "locked" : "unlocked"}`,
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
        description: "Failed to toggle device lock. Please try again.",
        variant: "destructive",
      });
    },
  });


  // Auto-select first device for schedule management if none selected
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDeviceForSchedule) {
      setSelectedDeviceForSchedule(devices[0]);
    }
  }, [devices, selectedDeviceForSchedule]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-trust-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-trust-blue animate-pulse" />
          </div>
          <p className="text-neutral-dark">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/src/assets/knets-logo.png" 
                alt="Knets Logo" 
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Knets</h1>
                <p className="text-xs text-gray-500">Live the Life</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              <Link href="/location" className="hidden md:block">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-green-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location
                </Button>
              </Link>
              
              <button className="relative p-2 text-gray-600 hover:text-green-600 transition-colors">
                <Bell className="w-5 h-5" />
                {stats?.alerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </button>
              
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 mb-8 text-white">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2 break-words">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, 
                <br className="sm:hidden" />
                <span className="break-words">{user?.firstName || user?.username || 'User'}</span>!
              </h2>
              <p className="text-green-100 text-lg">
                {devices?.length || 0} device{devices?.length !== 1 ? 's' : ''} connected • {stats?.activeDevices || 0} active
              </p>
            </div>
            
            {/* Subscription Info Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[280px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-green-100 text-sm font-medium">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user?.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()
                    ? 'bg-red-500 text-white'
                    : 'bg-green-400 text-green-900'
                }`}>
                  {user?.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date() ? 'Expired' : 'Active'}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-green-100 text-sm">Ends:</span>
                <div className="text-right">
                  <div className="text-white text-sm font-medium">
                    {user?.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-green-200 text-xs">
                    {user?.subscriptionEndDate 
                      ? `${Math.max(0, Math.ceil((new Date(user.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days left`
                      : ''
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-green-100 text-sm">Children Limit:</span>
                <span className="text-white text-sm font-medium">{user?.maxChildren || 3}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  const isExpired = user?.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date();
                  const deviceCount = devices?.length || 0;
                  const maxDevices = user?.maxChildren || 3;
                  
                  if (isExpired) {
                    toast({
                      title: "Subscription Expired",
                      description: "Please renew your subscription to add devices.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (deviceCount >= maxDevices) {
                    // Calculate how many additional children user wants to add
                    const additionalNeeded = 1; // Adding 1 more child
                    setAdditionalChildren(additionalNeeded);
                    setShowChildLimitDialog(true);
                    return;
                  }
                  setShowDeviceModal(true);
                }}
                className="bg-white text-green-600 hover:bg-green-50"
                disabled={user?.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
              
              {/* Only show Renew button if subscription is expired or expiring within 7 days */}
              {(isSubscriptionExpired || (daysLeft <= 7 && daysLeft > 0)) && (
                <Button
                  onClick={() => setShowRenewalDialog(true)}
                  variant="outline"
                  className="bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Renew
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Alert - Only show if expired or expiring within 3 days */}
        {((user?.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()) || 
          (user?.subscriptionEndDate && Math.ceil((new Date(user.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3)) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <TriangleAlert className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  {(user?.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()) ? "Subscription Expired" : "Subscription Expiring Soon"}
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {(user?.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date())
                    ? "Your subscription has expired. Renew now to continue using Knets."
                    : `Your subscription expires in ${user?.subscriptionEndDate ? Math.ceil((new Date(user.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0} day${(user?.subscriptionEndDate ? Math.ceil((new Date(user.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0) !== 1 ? 's' : ''}. Renew now to avoid interruption.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Children Limit Warning */}
        {(devices?.length || 0) >= (user?.maxChildren || 3) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Child Limit Reached
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  You have reached the maximum of {user?.maxChildren || 3} children. Upgrade your plan to add more children.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Children</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {children?.length || 0}/{user?.maxChildren || 3}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Schedules</p>
                  <p className="text-2xl font-bold text-green-600">{activeSchedules?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Locked</p>
                  <p className="text-2xl font-bold text-orange-600">{stats?.lockedDevices || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Alerts</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.alerts || 0}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <TriangleAlert className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Schedules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Quick Actions */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
              <CardDescription className="text-gray-600">
                Instant device controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className={`w-full h-12 ${
                  hasLockedDevices 
                    ? "border-green-200 text-green-600 hover:bg-green-50" 
                    : "border-red-200 text-red-600 hover:bg-red-50"
                }`}
                onClick={() => toggleLockMutation.mutate()}
                disabled={toggleLockMutation.isPending}
              >
                {hasLockedDevices ? (
                  <Unlock className="w-4 h-4 mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                {toggleLockMutation.isPending 
                  ? (hasLockedDevices ? "Unlocking..." : "Locking...")
                  : (hasLockedDevices ? "Unlock All" : "Lock All")
                }
              </Button>
              
              <Link href="/location" className="block">
                <Button variant="outline" className="w-full h-12">
                  <MapPin className="w-4 h-4 mr-2" />
                  Track Location
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="w-full h-16 border-blue-200 text-blue-600 hover:bg-blue-50 flex-col py-2"
                onClick={() => setShowKnetsJrModal(true)}
              >
                <div className="flex items-center">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Share Knets Jr
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  (Send link to child device)
                </span>
              </Button>
            </CardContent>
          </Card>

          {/* Active Schedules */}
          <ScheduleCard />
        </div>

        {/* Connected Devices */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Connected Devices</h3>
          </div>
          
          {devices && devices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device: any) => (
                <DeviceCard 
                  key={device.id} 
                  device={device}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <Smartphone className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No devices yet</h3>
                <p className="text-gray-600 text-center mb-8 max-w-md">
                  Get started by adding your child's device to monitor activity, set schedules, and ensure digital safety.
                </p>
                <Button
                  onClick={() => setShowDeviceModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Device
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Shared Schedule Management */}
        <div id="schedule-management-section" className="mb-8">
          <SharedScheduleManagement />
        </div>

        {/* Network Control Dashboard */}
        <div className="mb-8">
          <NetworkControlDashboard />
        </div>

        {/* Activity Log */}
        <div className="grid grid-cols-1 gap-8">

          {/* Recent Activity */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
            <ActivityLog activities={activities} />
          </div>
        </div>
      </div>

      {/* Device Registration Modal */}
      <DeviceRegistrationModal 
        open={showDeviceModal} 
        onOpenChange={setShowDeviceModal} 
      />

      {/* Knets Jr Share Modal */}
      <KnetsJrShareModal
        open={showKnetsJrModal}
        onOpenChange={setShowKnetsJrModal}
        deviceName="Chintu mobile"
        phoneNumber="+91 8870929411"
      />

      {/* Renewal Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Renew Subscription
            </DialogTitle>
            <DialogDescription>
              Renew your Knets subscription for ₹{subscriptionPrice}/year to continue managing your family's devices.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="upi-app">Select UPI Payment App</Label>
              <Select value={selectedUpiApp} onValueChange={setSelectedUpiApp}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose your preferred UPI app" />
                </SelectTrigger>
                <SelectContent>
                  {availableUpiApps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      <div className="flex items-center gap-2">
                        <span>{app.icon}</span>
                        <span>{app.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* QR Code Display for Renewal */}
            {renewalQrCode && (
              <div className="bg-white p-6 rounded-lg border-2 border-blue-200 text-center mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Scan to Renew Subscription</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Pay ₹{subscriptionPrice} for 1 year subscription renewal
                </p>
                <div className="bg-gray-50 p-4 rounded-lg border inline-block mb-4">
                  <img 
                    src={renewalQrCode} 
                    alt="Renewal Payment QR Code"
                    className="mx-auto"
                    style={{ width: '220px', height: '220px' }}
                    onError={(e) => {
                      console.error("Renewal QR Code image failed to load:", e);
                      console.log("Renewal QR Code src:", renewalQrCode);
                    }}
                    onLoad={() => {
                      console.log("✅ Renewal QR Code image loaded successfully");
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Use any UPI app (GPay, PhonePe, Paytm, BHIM)
                </p>
                
                {/* Renewal Payment Status */}
                {renewalPaymentStatus === 'pending' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <div className="flex items-center justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                      <span className="text-sm font-medium text-blue-700">Waiting for Payment</span>
                    </div>
                    <p className="text-xs text-blue-600 text-center">
                      Complete payment using your UPI app. Status will update automatically.
                    </p>
                  </div>
                )}
                
                {renewalPaymentStatus === 'completed' && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                    <div className="flex items-center justify-center mb-2">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-2">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-green-700">Subscription Renewed!</span>
                    </div>
                    <p className="text-xs text-green-600 text-center">
                      Your subscription has been extended for 1 year. Redirecting to dashboard...
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRenewalQrCode(null);
                      setRenewalPaymentStatus(null);
                      setRenewalPaymentId(null);
                    }}
                    disabled={renewalPaymentStatus === 'completed'}
                  >
                    Generate New QR
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      console.log("🧪 Simulating renewal payment completion...");
                      if (renewalPaymentId) {
                        try {
                          const response = await apiRequest("POST", "/api/subscription/payment-success", {
                            paymentId: renewalPaymentId,
                            transactionId: `TEST_RENEWAL_TXN_${Date.now()}`,
                            status: "success"
                          });
                          await response.json();
                          setRenewalPaymentStatus('completed');
                          toast({
                            title: "Subscription Renewed!",
                            description: "Your subscription has been extended for 1 year",
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                          
                          // Show success message and redirect after 3 seconds
                          setTimeout(() => {
                            setShowRenewalDialog(false);
                            setRenewalQrCode(null);
                            setRenewalPaymentStatus(null);
                            setRenewalPaymentId(null);
                            toast({
                              title: "Welcome Back!",
                              description: "Your subscription is now active for another year",
                            });
                          }, 3000);
                        } catch (error) {
                          console.error("Renewal payment simulation error:", error);
                        }
                      }
                    }}
                    disabled={renewalPaymentStatus === 'completed'}
                  >
                    {renewalPaymentStatus === 'completed' ? 'Payment Received' : 'Simulate Payment'}
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRenewalDialog(false);
                  setRenewalQrCode(null);
                  setRenewalPaymentStatus(null);
                  setRenewalPaymentId(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenewal}
                disabled={!selectedUpiApp || renewSubscriptionMutation.isPending || renewalPaymentStatus === 'completed'}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {renewSubscriptionMutation.isPending ? "Generating QR..." : (renewalQrCode ? "Regenerate QR Code" : `Pay ₹${subscriptionPrice}`)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Child Limit Upgrade Dialog */}
      <Dialog open={showChildLimitDialog} onOpenChange={setShowChildLimitDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Upgrade Child Limit
            </DialogTitle>
            <DialogDescription>
              You've reached your limit of {user?.maxChildren || 3} children. Add more children for ₹{childUpgradePrice} each.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Current Status */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Current Limit:</span>
                <span className="font-semibold">{user?.maxChildren || 3} children</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Additional Children:</span>
                <Select value={additionalChildren.toString()} onValueChange={(value) => setAdditionalChildren(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment Amount */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Price per child:</span>
                <span className="font-semibold">₹{childUpgradePrice}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-lg font-bold text-green-600">₹{additionalChildren * childUpgradePrice}</span>
              </div>
            </div>

            {/* UPI Payment Selection */}
            <div>
              <Label htmlFor="child-upi-app">Select UPI Payment App</Label>
              <Select value={selectedUpiApp} onValueChange={setSelectedUpiApp}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose your preferred UPI app" />
                </SelectTrigger>
                <SelectContent>
                  {availableUpiApps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      <div className="flex items-center gap-2">
                        <span>{app.icon}</span>
                        <span>{app.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* QR Code Display */}
            {childUpgradeQrCode && (
              <div className="bg-white p-6 rounded-lg border-2 border-blue-200 text-center mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Scan to Pay</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Pay ₹{additionalChildren * childUpgradePrice} for {additionalChildren} additional {additionalChildren === 1 ? 'child' : 'children'}
                </p>
                <div className="bg-gray-50 p-4 rounded-lg border inline-block mb-4">
                  <img 
                    src={childUpgradeQrCode} 
                    alt="Payment QR Code"
                    className="mx-auto"
                    style={{ width: '220px', height: '220px' }}
                    onError={(e) => {
                      console.error("QR Code image failed to load:", e);
                      console.log("QR Code src:", childUpgradeQrCode);
                    }}
                    onLoad={() => {
                      console.log("✅ QR Code image loaded successfully");
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Use any UPI app (GPay, PhonePe, Paytm, BHIM)
                </p>
                
                {/* Payment Status */}
                {childPaymentStatus === 'pending' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <div className="flex items-center justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                      <span className="text-sm font-medium text-blue-700">Waiting for Payment</span>
                    </div>
                    <p className="text-xs text-blue-600 text-center">
                      Complete payment using your UPI app. Status will update automatically.
                    </p>
                  </div>
                )}
                
                {childPaymentStatus === 'completed' && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                    <div className="flex items-center justify-center mb-2">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-2">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-green-700">Payment Successful!</span>
                    </div>
                    <p className="text-xs text-green-600 text-center">
                      User account upgraded for {additionalChildren} additional children. Redirecting to add device...
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChildUpgradeQrCode(null);
                      setChildPaymentStatus(null);
                      setChildPaymentId(null);
                    }}
                    disabled={childPaymentStatus === 'completed'}
                  >
                    Generate New QR
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      console.log("🧪 Simulating payment completion...");
                      if (childPaymentId) {
                        try {
                          const response = await apiRequest("POST", "/api/subscription/payment-success", {
                            paymentId: childPaymentId,
                            transactionId: `TEST_TXN_${Date.now()}`,
                            status: "success"
                          });
                          await response.json();
                          setChildPaymentStatus('completed');
                          toast({
                            title: "User Account Updated!",
                            description: `Knets account upgraded for ${additionalChildren} additional children`,
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                          
                          // Show success message and redirect after 3 seconds
                          setTimeout(() => {
                            setShowChildLimitDialog(false);
                            setChildUpgradeQrCode(null);
                            setChildPaymentStatus(null);
                            setChildPaymentId(null);
                            toast({
                              title: "Account Upgrade Complete",
                              description: "Your Knets user account now supports additional children",
                            });
                            // Open device registration modal to add new child
                            setShowDeviceModal(true);
                          }, 3000);
                        } catch (error) {
                          console.error("Payment simulation error:", error);
                        }
                      }
                    }}
                    disabled={childPaymentStatus === 'completed'}
                  >
                    {childPaymentStatus === 'completed' ? 'Payment Received' : 'Simulate Payment'}
                  </Button>
                  
                  {/* Test button for payment completion */}
                  {childPaymentId && childPaymentStatus === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-600"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/payment/complete-manual', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paymentId: childPaymentId })
                          });
                          const result = await response.json();
                          if (result.success) {
                            toast({
                              title: "Payment Completed! ✅",
                              description: "Test payment completed successfully"
                            });
                          } else {
                            toast({
                              title: "Test Failed",
                              description: result.message,
                              variant: "destructive"
                            });
                          }
                        } catch (error) {
                          console.error('Manual payment test failed:', error);
                        }
                      }}
                    >
                      Test Complete
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowChildLimitDialog(false);
                  setChildUpgradeQrCode(null);
                  setChildPaymentStatus(null);
                  setChildPaymentId(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChildLimitUpgrade}
                disabled={!selectedUpiApp || upgradeChildLimitMutation.isPending || childPaymentStatus === 'completed'}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {upgradeChildLimitMutation.isPending ? "Generating QR..." : (childUpgradeQrCode ? "Regenerate QR Code" : `Pay ₹${additionalChildren * 1}`)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
