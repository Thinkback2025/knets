import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, CheckCircle, AlertTriangle, CreditCard, Smartphone } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePricing } from "@/hooks/usePricing";

// UPI apps available by country
const UPI_APPS_BY_COUNTRY = {
  "+91": [ // India
    { id: "gpay", name: "Google Pay", icon: "💳" },
    { id: "phonepe", name: "PhonePe", icon: "📱" },
    { id: "paytm", name: "Paytm", icon: "💰" },
    { id: "bhim", name: "BHIM", icon: "🏦" },
    { id: "amazonpay", name: "Amazon Pay", icon: "📦" },
    { id: "mobikwik", name: "MobiKwik", icon: "💸" },
    { id: "freecharge", name: "FreeCharge", icon: "⚡" },
    { id: "jiomoney", name: "JioMoney", icon: "📶" },
  ],
  "+880": [ // Bangladesh
    { id: "bkash", name: "bKash", icon: "💳" },
    { id: "rocket", name: "Rocket", icon: "🚀" },
    { id: "nagad", name: "Nagad", icon: "💰" },
  ],
  "+94": [ // Sri Lanka
    { id: "ezpay", name: "eZ Pay", icon: "💳" },
    { id: "frimi", name: "Frimi", icon: "📱" },
  ],
  "+977": [ // Nepal
    { id: "esewa", name: "eSewa", icon: "💳" },
    { id: "khalti", name: "Khalti", icon: "💰" },
  ],
};

interface UserProfileProps {
  user: any;
}

export default function UserProfile({ user }: UserProfileProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { subscriptionPrice } = usePricing();
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState("");
  const [paymentQrCode, setPaymentQrCode] = useState<string | null>(null);
  const [additionalChildren, setAdditionalChildren] = useState(1);
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed' | null>(null);

  // Calculate subscription status
  const subscriptionEndDate = new Date(user.subscriptionEndDate);
  const isExpired = subscriptionEndDate < new Date();
  const daysLeft = Math.ceil((subscriptionEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  // Get UPI apps for user's country
  const countryCode = user.countryCode || user.mobileNumber?.substring(0, 3) || "+91";
  const availableUpiApps = UPI_APPS_BY_COUNTRY[countryCode as keyof typeof UPI_APPS_BY_COUNTRY] || UPI_APPS_BY_COUNTRY["+91"];

  const renewSubscriptionMutation = useMutation({
    mutationFn: async (upiApp: string) => {
      return await apiRequest("POST", "/api/subscription/renew", {
        subscriptionType: "yearly",
        upiApp,
        amount: subscriptionPrice, // Get amount from centralized pricing config
      });
    },
    onSuccess: (data: any) => {
      if (data.qrCode) {
        setPaymentQrCode(data.qrCode);
        setCurrentPaymentId(data.paymentId);
        setPaymentStatus('pending');
        
        // Start monitoring payment status
        startPaymentMonitoring(data.paymentId);
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
        description: "Scan the QR code with any UPI app to pay",
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

  // Payment monitoring function
  const startPaymentMonitoring = (paymentId: string) => {
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payment/status/${paymentId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setPaymentStatus('completed');
          setPaymentQrCode(null);
          setCurrentPaymentId(null);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          toast({
            title: "Payment Successful! ✅",
            description: "Your subscription has been renewed",
            variant: "default",
          });
          // Close dialog after successful payment
          setTimeout(() => {
            setShowRenewalDialog(false);
          }, 2000);
          return;
        } else if (data.status === 'failed') {
          setPaymentStatus('failed');
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
        console.error('Payment status check failed:', error);
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
    renewSubscriptionMutation.mutate(selectedUpiApp);
  };

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{user.username}</CardTitle>
              <CardDescription className="text-sm truncate">{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Mobile Number */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Mobile:</span>
            <span className="text-sm font-medium">{user.mobileNumber}</span>
          </div>

          {/* Subscription Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <Badge variant={isExpired ? "destructive" : "default"} className="text-xs">
              {isExpired ? (
                <>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Expired
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </>
              )}
            </Badge>
          </div>

          {/* Subscription End Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Ends:</span>
            <div className="text-right">
              <div className="text-sm font-medium">
                {subscriptionEndDate.toLocaleDateString()}
              </div>
              {!isExpired && (
                <div className="text-xs text-gray-500">
                  {daysLeft} days left
                </div>
              )}
            </div>
          </div>

          {/* Children Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Children Limit:</span>
            <span className="text-sm font-medium">{user.maxChildren || 3}</span>
          </div>

          {/* Renewal Button */}
          {(isExpired || daysLeft <= 7) && (
            <Button 
              onClick={() => setShowRenewalDialog(true)}
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Renew Account
            </Button>
          )}

          {/* Logout Button */}
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/api/logout'}
            className="w-full"
            size="sm"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Renewal Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <span>Renew Subscription</span>
            </DialogTitle>
            <DialogDescription>
              Choose your preferred UPI payment method to renew for 1 year
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Subscription Details */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Annual Subscription</span>
                <span className="text-lg font-bold text-green-600">₹{subscriptionPrice}</span>
              </div>
              <div className="text-sm text-gray-600">
                • Manage up to {user.maxChildren || 3} children
                • Unlimited device control
                • 24/7 location tracking
                • Advanced scheduling
              </div>
            </div>

            {/* UPI Payment Selection */}
            <div className="space-y-3">
              <Label htmlFor="upi-app" className="text-sm font-medium">
                Select UPI Payment App
              </Label>
              <Select value={selectedUpiApp} onValueChange={setSelectedUpiApp}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your UPI app" />
                </SelectTrigger>
                <SelectContent>
                  {availableUpiApps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      <div className="flex items-center space-x-2">
                        <span>{app.icon}</span>
                        <span>{app.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* QR Code Display */}
            {paymentQrCode && (
              <div className="bg-white p-4 rounded-lg border text-center">
                <h4 className="font-medium text-gray-900 mb-3">Scan QR Code to Pay</h4>
                <img 
                  src={paymentQrCode} 
                  alt="Payment QR Code"
                  className="mx-auto mb-3 border rounded-lg"
                  style={{ width: '200px', height: '200px' }}
                />
                <p className="text-sm text-gray-600 mb-3">
                  Scan with any UPI app (GPay, PhonePe, Paytm, etc.)
                </p>
                
                {/* Payment Status */}
                {paymentStatus === 'pending' && (
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="text-sm text-blue-600">Waiting for payment...</span>
                  </div>
                )}
                
                {paymentStatus === 'completed' && (
                  <div className="flex items-center justify-center mb-3 text-green-600">
                    <span className="text-sm">Payment successful! ✅</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPaymentQrCode(null);
                      setPaymentStatus(null);
                      setCurrentPaymentId(null);
                    }}
                  >
                    Generate New QR
                  </Button>
                  
                  {/* Test button for payment completion */}
                  {currentPaymentId && paymentStatus === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-600"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/payment/complete-manual', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paymentId: currentPaymentId })
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

            {/* Payment Button */}
            <Button 
              onClick={handleRenewal}
              disabled={!selectedUpiApp || renewSubscriptionMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {renewSubscriptionMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  {paymentQrCode ? "Generate New QR Code" : `Pay ₹${subscriptionPrice} with ` + (selectedUpiApp ? availableUpiApps.find(app => app.id === selectedUpiApp)?.name : "UPI")}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}