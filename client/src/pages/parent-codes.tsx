import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Smartphone, QrCode, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { type Child } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ParentCodeCard } from "@/components/parent-code-card";
import * as QRCode from "qrcode";

export default function ParentCodes() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [childImei, setChildImei] = useState(""); // Optional IMEI field

  // Fetch children
  const { data: children = [], isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
    enabled: !!user,
  });

  // Add child mutation
  const addChildMutation = useMutation({
    mutationFn: async (childData: { name: string; age: number; imei?: string }) => {
      const response = await apiRequest("POST", "/api/children", childData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setIsAddChildOpen(false);
      setChildName("");
      setChildAge("");
      setChildImei("");
      toast({
        title: "Child Added",
        description: "Child profile created with unique parent code",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Child",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete child mutation
  const deleteChildMutation = useMutation({
    mutationFn: async (childId: number) => {
      const response = await apiRequest("DELETE", `/api/children/${childId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Child Removed",
        description: "Child and all associated data have been completely removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Remove Child",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddChild = () => {
    if (!childName.trim() || !childAge.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and age",
        variant: "destructive",
      });
      return;
    }

    const age = parseInt(childAge);
    if (isNaN(age) || age < 1 || age > 18) {
      toast({
        title: "Invalid Age",
        description: "Please enter a valid age between 1 and 18",
        variant: "destructive",
      });
      return;
    }

    addChildMutation.mutate({
      name: childName.trim(),
      age,
      imei: childImei.trim() || undefined,
    });
  };

  const generateQRCode = async (child: Child) => {
    try {
      const qrData = JSON.stringify({
        type: "knets_parent_code",
        parentCode: child.parentCode,
        childName: child.name,
        timestamp: Date.now(),
      });
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#059669",
          light: "#ffffff",
        },
      });
      
      setQrCodeUrl(qrCodeDataUrl);
      setSelectedChild(child);
    } catch (error) {
      toast({
        title: "QR Code Generation Failed",
        description: "Unable to generate QR code",
        variant: "destructive",
      });
    }
  };

  if (authLoading || childrenLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Parent Connection Codes</h1>
              <p className="text-gray-600 mt-2">
                Manage your children's device connections with unique parent codes
              </p>
            </div>
            
            <Dialog open={isAddChildOpen} onOpenChange={setIsAddChildOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Child
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Child</DialogTitle>
                  <DialogDescription>
                    Create a child profile and generate a unique parent code for device connection.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="childName">Child's Name</Label>
                    <Input
                      id="childName"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder="Enter child's name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="childAge">Age</Label>
                    <Input
                      id="childAge"
                      type="number"
                      value={childAge}
                      onChange={(e) => setChildAge(e.target.value)}
                      placeholder="Enter age"
                      min="1"
                      max="18"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="childImei">Device IMEI (Optional)</Label>
                    <Input
                      id="childImei"
                      value={childImei}
                      onChange={(e) => setChildImei(e.target.value)}
                      placeholder="Enter device IMEI (optional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to auto-collect when device connects
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddChildOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddChild}
                      disabled={addChildMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {addChildMutation.isPending ? "Adding..." : "Add Child"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Children</CardTitle>
              <Users className="h-4 w-4 ml-auto text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{children?.length || 0}</div>
              <p className="text-xs text-gray-600">Child profiles created</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Devices</CardTitle>
              <Smartphone className="h-4 w-4 ml-auto text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {children?.filter((child: Child) => child.isConnected).length || 0}
              </div>
              <p className="text-xs text-gray-600">Devices under control</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Connections</CardTitle>
              <QrCode className="h-4 w-4 ml-auto text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {children?.filter((child: Child) => !child.isConnected).length || 0}
              </div>
              <p className="text-xs text-gray-600">Awaiting device setup</p>
            </CardContent>
          </Card>
        </div>

        {/* Children List */}
        {children && children.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child: Child) => (
              <ParentCodeCard
                key={child.id}
                child={child}
                onGenerateQR={generateQRCode}
                onDeleteChild={(childId) => deleteChildMutation.mutate(childId)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Children Added</h3>
              <p className="text-gray-600 text-center max-w-md">
                Start by adding your children to generate unique parent codes for device connection.
              </p>
              <Button
                onClick={() => setIsAddChildOpen(true)}
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Child
              </Button>
            </CardContent>
          </Card>
        )}

        {/* QR Code Modal */}
        {qrCodeUrl && selectedChild && (
          <Dialog open={!!qrCodeUrl} onOpenChange={() => setQrCodeUrl(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>QR Code for {selectedChild.name}</DialogTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQrCodeUrl(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <DialogDescription>
                  Scan this QR code with the Knets Jr app to connect the device instantly.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <img src={qrCodeUrl} alt="Parent Code QR" className="w-64 h-64" />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Parent Code:</p>
                  <p className="text-xl font-mono font-bold">{selectedChild.parentCode}</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                  <h4 className="font-medium text-blue-800 text-sm mb-2">Quick Setup:</h4>
                  <ol className="text-xs text-blue-700 space-y-1">
                    <li>1. Install Knets Jr on child's device</li>
                    <li>2. Open app and tap "Scan QR Code"</li>
                    <li>3. Point camera at this QR code</li>
                    <li>4. Device will connect automatically</li>
                  </ol>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}