import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Smartphone, Navigation, Clock, Target, Search, ArrowLeft, Shield } from "lucide-react";
import type { Device, LocationLog } from "@shared/schema";

// Function to convert coordinates to place name using reverse geocoding
const getPlaceName = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    const data = await response.json();
    
    if (data.city && data.countryName) {
      return `${data.city}, ${data.countryName}`;
    } else if (data.locality && data.countryName) {
      return `${data.locality}, ${data.countryName}`;
    } else if (data.countryName) {
      return data.countryName;
    } else {
      return `${latitude}, ${longitude}`;
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return `${latitude}, ${longitude}`;
  }
};

export default function LocationTracking() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [searchImei, setSearchImei] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [placeNames, setPlaceNames] = useState<Record<string, string>>({});

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

  // Fetch devices
  const { data: devices = [] } = useQuery({
    queryKey: ["/api/devices"],
    enabled: isAuthenticated,
  });

  // Fetch locations for selected device
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: [`/api/devices/${selectedDevice?.id}/locations`],
    enabled: !!selectedDevice,
  });

  // Fetch latest location for selected device
  const { data: latestLocation } = useQuery({
    queryKey: [`/api/devices/${selectedDevice?.id}/location/latest`],
    enabled: !!selectedDevice,
  });

  // Effect to load place names for locations
  useEffect(() => {
    const loadPlaceNames = async () => {
      const locationList = [...(locations || [])];
      if (latestLocation) {
        locationList.push(latestLocation);
      }

      for (const location of locationList) {
        const key = `${location.latitude},${location.longitude}`;
        if (!placeNames[key]) {
          const placeName = await getPlaceName(location.latitude, location.longitude);
          setPlaceNames(prev => ({ ...prev, [key]: placeName }));
        }
      }
    };

    if (locations?.length > 0 || latestLocation) {
      loadPlaceNames();
    }
  }, [locations, latestLocation]);

  // Manual location update mutation
  const locationMutation = useMutation({
    mutationFn: async (locationData: {
      deviceId: number;
      latitude: number;
      longitude: number;
      accuracy?: number;
      address?: string;
      locationMethod: string;
    }) => {
      const response = await apiRequest("POST", "/api/location", locationData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${selectedDevice?.id}/locations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${selectedDevice?.id}/location/latest`] });
      toast({
        title: "Location Updated",
        description: "Device location has been updated successfully",
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
        description: "Failed to update location",
        variant: "destructive",
      });
    },
  });

  // Search by IMEI mutation
  const searchImeiMutation = useMutation({
    mutationFn: async (imei: string) => {
      const response = await apiRequest("GET", `/api/location/imei/${imei}`);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("IMEI search results:", data);
      toast({
        title: "Location Found",
        description: `Found ${data.length} location records for this IMEI`,
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
        description: "Failed to search location by IMEI",
        variant: "destructive",
      });
    },
  });

  // Search by phone number mutation
  const searchPhoneMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const encodedPhone = encodeURIComponent(phoneNumber);
      const response = await apiRequest("GET", `/api/location/phone/${encodedPhone}`);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Phone search results:", data);
      toast({
        title: "Location Found",
        description: `Found ${data.length} location records for this phone number`,
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
        description: "Failed to search location by phone number",
        variant: "destructive",
      });
    },
  });

  const formatDistance = (meters: number | null) => {
    if (!meters) return "Unknown";
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLocationMethodBadge = (method: string | null | undefined) => {
    if (!method) {
      return <Badge variant="outline">UNKNOWN</Badge>;
    }
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      gps: "default",
      network: "secondary",
      imei_tracking: "outline",
      cell_tower: "destructive",
      manual: "outline",
    };
    return <Badge variant={variants[method] || "outline"}>{method.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const simulateLocationUpdate = (device: Device) => {
    // Simulate a location update for demo purposes
    const demoLocation = {
      deviceId: device.id,
      latitude: 28.6139 + (Math.random() - 0.5) * 0.01, // Delhi area with small random variation
      longitude: 77.2090 + (Math.random() - 0.5) * 0.01,
      accuracy: Math.random() * 100 + 10,
      address: "Demo Location, New Delhi, India",
      locationMethod: "gps",
    };
    
    locationMutation.mutate(demoLocation);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <div className="w-10 h-10 bg-trust-blue rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-neutral-darker">Location Tracking</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Tabs defaultValue="devices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="devices">Device Locations</TabsTrigger>
          <TabsTrigger value="imei">Search by IMEI</TabsTrigger>
          <TabsTrigger value="phone">Search by Phone</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Device Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5" />
                  <span>Select Device</span>
                </CardTitle>
                <CardDescription>Choose a device to track its location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {devices.length === 0 ? (
                  <p className="text-neutral-dark">No devices registered yet.</p>
                ) : (
                  devices.map((device: Device) => (
                    <div
                      key={device.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDevice?.id === device.id
                          ? "border-trust-blue bg-blue-50"
                          : "border-neutral-medium hover:bg-neutral-light"
                      }`}
                      onClick={() => setSelectedDevice(device)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-neutral-dark">{device.model}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={device.isActive ? "default" : "secondary"}>
                            {device.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Latest Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Latest Location</span>
                </CardTitle>
                <CardDescription>Most recent location data</CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedDevice ? (
                  <p className="text-neutral-dark">Select a device to view its latest location</p>
                ) : latestLocation ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="col-span-2">
                        <p className="text-neutral-dark">Location</p>
                        <p className="font-medium">
                          {placeNames[`${latestLocation.latitude},${latestLocation.longitude}`] || 
                           `${latestLocation.latitude}, ${latestLocation.longitude}`}
                        </p>
                      </div>
                    </div>
                    {latestLocation.address && (
                      <div>
                        <p className="text-neutral-dark">Address</p>
                        <p className="text-sm">{latestLocation.address}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {getLocationMethodBadge(latestLocation.locationMethod)}
                      <span className="text-xs text-neutral-dark">
                        {formatTime(latestLocation.timestamp)}
                      </span>
                    </div>
                    <div className="pt-2">
                      <Button
                        onClick={() => simulateLocationUpdate(selectedDevice)}
                        disabled={locationMutation.isPending}
                        className="w-full"
                      >
                        {locationMutation.isPending ? "Updating..." : "Update Location (Demo)"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <p className="text-neutral-dark">No location data available</p>
                    <Button
                      onClick={() => simulateLocationUpdate(selectedDevice)}
                      disabled={locationMutation.isPending}
                    >
                      {locationMutation.isPending ? "Updating..." : "Add Demo Location"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Location History */}
          {selectedDevice && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Location History</span>
                </CardTitle>
                <CardDescription>Recent location updates for {selectedDevice.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {locationsLoading ? (
                  <p>Loading location history...</p>
                ) : locations.length === 0 ? (
                  <p className="text-neutral-dark">No location history available</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {locations.map((location: LocationLog) => (
                      <div key={location.id} className="border border-neutral-medium rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <span className="font-medium">
                                {placeNames[`${location.latitude},${location.longitude}`] || 
                                 `${location.latitude}, ${location.longitude}`}
                              </span>
                              {location.accuracy && (
                                <span className="text-neutral-dark">±{formatDistance(Number(location.accuracy))}</span>
                              )}
                            </div>
                            {location.address && (
                              <p className="text-sm text-neutral-dark">{location.address}</p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            {getLocationMethodBadge(location.locationMethod)}
                            <p className="text-xs text-neutral-dark">{formatTime(location.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="imei" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Track by IMEI</span>
              </CardTitle>
              <CardDescription>Search location history using device IMEI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-imei">IMEI Number</Label>
                <Input
                  id="search-imei"
                  value={searchImei}
                  onChange={(e) => setSearchImei(e.target.value)}
                  placeholder="Enter 15-digit IMEI number"
                  maxLength={15}
                />
              </div>
              <Button
                onClick={() => searchImeiMutation.mutate(searchImei)}
                disabled={searchImei.length !== 15 || searchImeiMutation.isPending}
                className="w-full"
              >
                {searchImeiMutation.isPending ? "Searching..." : "Search Locations"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phone" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Track by Phone Number</span>
              </CardTitle>
              <CardDescription>Search location history using phone number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-phone">Phone Number</Label>
                <Input
                  id="search-phone"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder="Enter phone number with country code"
                />
              </div>
              <Button
                onClick={() => searchPhoneMutation.mutate(searchPhone)}
                disabled={searchPhone.length < 7 || searchPhoneMutation.isPending}
                className="w-full"
              >
                {searchPhoneMutation.isPending ? "Searching..." : "Search Locations"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}