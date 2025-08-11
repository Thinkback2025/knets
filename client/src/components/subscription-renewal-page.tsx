import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePricing } from "@/hooks/usePricing";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CreditCard, AlertTriangle, LogOut, CheckCircle } from "lucide-react";

export function SubscriptionRenewalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscriptionPrice } = usePricing();
  
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState("");
  const [renewalQrCode, setRenewalQrCode] = useState<string | null>(null);
  const [renewalPaymentId, setRenewalPaymentId] = useState<string | null>(null);
  const [renewalPaymentStatus, setRenewalPaymentStatus] = useState<'pending' | 'completed' | 'failed' | null>(null);

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

  const renewalMutation = useMutation({
    mutationFn: async ({ upiApp }: { upiApp: string }) => {
      const response = await apiRequest("POST", "/api/subscription/create-renewal", { 
        upiApp, 
        subscriptionType: "yearly",
        amount: subscriptionPrice 
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setRenewalQrCode(data.qrCode);
      setRenewalPaymentId(data.paymentId);
      setRenewalPaymentStatus('pending');
      startRenewalPaymentMonitoring(data.paymentId);
      toast({
        title: "Payment QR Generated",
        description: "Scan the QR code with your UPI app to complete payment",
      });
    },
    onError: (error) => {
      console.error('Renewal payment creation failed:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to generate payment QR. Please try again.",
        variant: "destructive",
      });
    },
  });

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
          // Refresh page to show dashboard after successful renewal
          setTimeout(() => {
            window.location.reload();
          }, 2000);
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

  const handleRenewal = () => {
    if (!selectedUpiApp) {
      toast({
        title: "Select Payment Method",
        description: "Please select a UPI app to proceed with payment.",
        variant: "destructive",
      });
      return;
    }
    renewalMutation.mutate({ upiApp: selectedUpiApp });
  };

  const daysExpired = user?.subscriptionEndDate 
    ? Math.abs(Math.ceil((new Date().getTime() - new Date(user.subscriptionEndDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Expired</h1>
          <p className="text-gray-600">
            Your Knets subscription expired {daysExpired} day{daysExpired !== 1 ? 's' : ''} ago. 
            Renew now to regain access to your dashboard and device management.
          </p>
        </div>

        {/* Renewal Card */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Renew Subscription</CardTitle>
            <CardDescription>
              Restore access to all Knets features for your family's digital safety
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800">Yearly Plan</h3>
                  <p className="text-sm text-green-700">Full access to all features</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-800">₹{subscriptionPrice}</p>
                  <p className="text-sm text-green-600">per year</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Manage up to {user?.maxChildren || 3} children
                </div>
                <div className="flex items-center text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Real-time device control & monitoring
                </div>
                <div className="flex items-center text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  GPS location tracking
                </div>
                <div className="flex items-center text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Schedule-based restrictions
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setShowRenewalDialog(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Renew Subscription
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = "/api/logout"}
            className="text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Renewal Payment Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Renew Subscription
            </DialogTitle>
            <DialogDescription>
              Select your preferred UPI app and complete the payment to renew your subscription.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {renewalPaymentStatus === 'completed' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">Payment Successful!</h3>
                <p className="text-green-600">Your subscription has been renewed. Redirecting to dashboard...</p>
              </div>
            ) : renewalQrCode ? (
              <div className="text-center space-y-4">
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                  <img 
                    src={renewalQrCode} 
                    alt="Payment QR Code" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Scan with {availableUpiApps.find(app => app.id === selectedUpiApp)?.name}</p>
                  <p className="text-sm text-gray-600">Amount: ₹{subscriptionPrice}</p>
                  <p className="text-sm text-gray-500">
                    {renewalPaymentStatus === 'pending' ? 'Waiting for payment...' : 'Complete payment in your UPI app'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label>Select UPI App</Label>
                  <Select value={selectedUpiApp} onValueChange={setSelectedUpiApp}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your UPI app" />
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

                <Button 
                  onClick={handleRenewal}
                  disabled={!selectedUpiApp || renewalMutation.isPending}
                  className="w-full"
                >
                  {renewalMutation.isPending ? 'Generating QR...' : 'Generate Payment QR'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}