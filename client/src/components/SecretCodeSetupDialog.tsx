import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff } from "lucide-react";

interface SecretCodeSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeSet: (code: string) => void;
}

export function SecretCodeSetupDialog({ open, onOpenChange, onCodeSet }: SecretCodeSetupDialogProps) {
  const [secretCode, setSecretCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!secretCode.trim()) {
      toast({
        title: "Secret Code Required",
        description: "Please enter a device admin secret code",
        variant: "destructive"
      });
      return;
    }

    if (secretCode.length < 4) {
      toast({
        title: "Code Too Short",
        description: "Secret code must be at least 4 characters long",
        variant: "destructive"
      });
      return;
    }

    if (secretCode !== confirmCode) {
      toast({
        title: "Codes Don't Match",
        description: "Please ensure both secret codes match",
        variant: "destructive"
      });
      return;
    }

    onCodeSet(secretCode);
    onOpenChange(false);
    setSecretCode("");
    setConfirmCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-green-600" />
            <DialogTitle>Set Device Admin Secret Code</DialogTitle>
          </div>
          <DialogDescription>
            Create a secret code that will be required to disable device admin protection. 
            This prevents children from uninstalling Knets Jr without your permission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Important:</strong> Remember this code! It will be required whenever your child 
              tries to disable device admin or uninstall the Knets Jr app from their device.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="secretCode">Device Admin Secret Code</Label>
            <div className="relative">
              <Input
                id="secretCode"
                type={showCode ? "text" : "password"}
                placeholder="Enter a memorable secret code"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="confirmCode">Confirm Secret Code</Label>
            <Input
              id="confirmCode"
              type={showCode ? "text" : "password"}
              placeholder="Re-enter your secret code"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
            />
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={handleSubmit}
              disabled={!secretCode.trim() || !confirmCode.trim()}
              className="flex-1"
            >
              Set Secret Code
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}