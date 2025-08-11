import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Shield, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface DeviceAdminUninstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingRequestId?: number;
}

export function DeviceAdminUninstallDialog({ open, onOpenChange, pendingRequestId }: DeviceAdminUninstallDialogProps) {
  const [secretCode, setSecretCode] = useState("");
  const [approve, setApprove] = useState<boolean | null>(null);
  const { toast } = useToast();

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, approve, secretCode }: { requestId: number; approve: boolean; secretCode?: string }) => {
      return apiRequest(`/api/uninstall-requests/${requestId}/respond`, {
        method: "POST",
        body: { approve, secretCode }
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.approve ? "Request Approved" : "Request Denied",
        description: variables.approve 
          ? "Child can now disable device admin and uninstall Knets Jr"
          : "Uninstall request has been denied",
        variant: variables.approve ? "default" : "destructive"
      });
      onOpenChange(false);
      setSecretCode("");
      setApprove(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to request",
        variant: "destructive"
      });
    }
  });

  const sendSecretCodeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/send-secret-code', {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Secret Code Sent",
        description: "Your device admin secret code has been sent to your email",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send secret code",
        variant: "destructive"
      });
    }
  });

  const handleApprove = () => {
    if (!secretCode.trim()) {
      toast({
        title: "Secret Code Required",
        description: "Please enter your device admin secret code to approve uninstall",
        variant: "destructive"
      });
      return;
    }

    if (pendingRequestId) {
      respondMutation.mutate({ 
        requestId: pendingRequestId, 
        approve: true, 
        secretCode: secretCode.trim() 
      });
    }
  };

  const handleDeny = () => {
    if (pendingRequestId) {
      respondMutation.mutate({ 
        requestId: pendingRequestId, 
        approve: false 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <DialogTitle>Device Admin Uninstall Request</DialogTitle>
          </div>
          <DialogDescription>
            Your child is trying to disable device admin and uninstall Knets Jr from their device. 
            This will remove all parental controls.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">Security Alert</span>
            </div>
            <p className="text-sm text-orange-700">
              Approving this request will permanently remove all device controls and monitoring.
            </p>
          </div>

          {approve === null && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Do you want to allow uninstall?</Label>
              <div className="flex space-x-3">
                <Button 
                  variant="destructive" 
                  onClick={() => setApprove(true)}
                  className="flex-1"
                >
                  Yes, Allow Uninstall
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDeny}
                  className="flex-1"
                  disabled={respondMutation.isPending}
                >
                  No, Keep Protection
                </Button>
              </div>
            </div>
          )}

          {approve === true && (
            <div className="space-y-3">
              <Label htmlFor="secretCode">Enter Device Admin Secret Code</Label>
              <Input
                id="secretCode"
                type="password"
                placeholder="Enter your secret code"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                className="font-mono"
              />
              
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sendSecretCodeMutation.mutate()}
                  disabled={sendSecretCodeMutation.isPending}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Forgot Code? Send to Email
                </Button>
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={handleApprove}
                  disabled={respondMutation.isPending || !secretCode.trim()}
                  className="flex-1"
                >
                  Confirm Uninstall
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setApprove(null);
                    setSecretCode("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}