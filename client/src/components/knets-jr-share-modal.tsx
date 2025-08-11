import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, QrCode, Share, ExternalLink, CheckCircle } from "lucide-react";

interface KnetsJrShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName?: string;
  phoneNumber?: string;
}

export function KnetsJrShareModal({ open, onOpenChange, deviceName, phoneNumber }: KnetsJrShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // Create enhanced URL with device information pre-filled
  const baseUrl = `${window.location.origin}/companion`;
  const knetsJrUrl = phoneNumber 
    ? `${baseUrl}?phone=${encodeURIComponent(phoneNumber.replace(/\s+/g, '').replace(/^\+/, ''))}&device=${encodeURIComponent(deviceName || '')}`
    : baseUrl;
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(knetsJrUrl);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Knets Jr link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy link. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const shareNatively = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Knets Jr - Family Device Manager',
          text: `Install Knets Jr on ${deviceName || "your device"} to connect to family controls`,
          url: knetsJrUrl,
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      copyToClipboard();
    }
  };

  const openInNewTab = () => {
    window.open(knetsJrUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <QrCode className="w-5 h-5 mr-2 text-blue-600" />
            Share Knets Jr
          </DialogTitle>
          <DialogDescription>
            Share this link with your child to install Knets Jr on their device
            {deviceName && ` (${deviceName})`}. The phone number will be auto-filled for easy connection.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* URL Display */}
          <div>
            <Label htmlFor="url" className="text-sm font-medium">
              Knets Jr Link
            </Label>
            <div className="flex mt-1">
              <Input
                id="url"
                value={knetsJrUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                className="ml-2 px-3"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Sharing Options */}
          <div className="grid grid-cols-1 gap-2">
            {navigator.share && (
              <Button onClick={shareNatively} className="w-full">
                <Share className="w-4 h-4 mr-2" />
                Share Link
              </Button>
            )}
            
            <Button variant="outline" onClick={openInNewTab} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Knets Jr
            </Button>
            
            {!navigator.share && (
              <Button variant="outline" onClick={copyToClipboard} className="w-full">
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Installation Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Send this link to your child's device</li>
              <li>2. Open the link on their device</li>
              <li>3. Follow the setup process to connect</li>
              {phoneNumber && (
                <li>4. Use mobile number {phoneNumber} to auto-populate device info</li>
              )}
            </ol>
          </div>

          {/* Device Info */}
          {(deviceName || phoneNumber) && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-1">Device Information:</h5>
              {deviceName && (
                <p className="text-sm text-gray-600">Device: {deviceName}</p>
              )}
              {phoneNumber && (
                <p className="text-sm text-gray-600">Phone: {phoneNumber}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}