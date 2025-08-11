import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Smartphone, Copy, QrCode, CheckCircle, Circle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Child } from "@shared/schema";

interface ParentCodeCardProps {
  child: Child;
  onGenerateQR?: (child: Child) => void;
  onDeleteChild?: (childId: number) => void;
}

export function ParentCodeCard({ child, onGenerateQR, onDeleteChild }: ParentCodeCardProps) {
  const { toast } = useToast();

  const copyParentCode = () => {
    navigator.clipboard.writeText(child.parentCode);
    toast({
      title: "Parent Code Copied",
      description: `Parent code ${child.parentCode} copied to clipboard`,
    });
  };

  return (
    <Card className="border-2 border-green-100 hover:border-green-200 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{child.name}</CardTitle>
              <CardDescription>Age: {child.age} years</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {child.isConnected ? (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                <Circle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Parent Connection Code</p>
            <div className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
              {child.parentCode}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter this code on your child's device to connect
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={copyParentCode}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Code
          </Button>
          
          {onGenerateQR && (
            <Button
              onClick={() => onGenerateQR(child)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Show QR
            </Button>
          )}
          
          {onDeleteChild && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Child</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove <strong>{child.name}</strong> and all associated data including:
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      <li>Connected devices and their data</li>
                      <li>Activity logs and location history</li>
                      <li>Schedule assignments</li>
                      <li>All usage statistics</li>
                    </ul>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteChild(child.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Remove Child
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {!child.isConnected && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-800 text-sm mb-1">Connection Steps:</h4>
            <ol className="text-xs text-blue-700 space-y-1">
              <li>1. Install Knets Jr app on child's device</li>
              <li>2. Open the app and tap "Connect Device"</li>
              <li>3. Enter the parent code: <span className="font-mono font-bold">{child.parentCode}</span></li>
              <li>4. Grant device admin permissions</li>
              <li>5. Device will be locked and controlled automatically</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}