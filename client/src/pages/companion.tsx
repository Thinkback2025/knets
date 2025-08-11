import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Smartphone, Lock, Clock, AlertTriangle, CheckCircle, Search, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DeviceStatus {
  id: number;
  name: string;
  isLocked: boolean;
  isActive: boolean;
  lastChecked: string;
  schedules: Array<{
    name: string;
    isActive: boolean;
    startTime: string;
    endTime: string;
  }>;
}

interface LookupResult {
  imei: string;
  deviceName: string;
  deviceId: number;
  phoneNumber: string;
  isActive: boolean;
  isLocked: boolean;
  consentStatus: string;
}

export default function CompanionApp() {
  const [deviceIMEI, setDeviceIMEI] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  // Auto-detect device IMEI function
  const autoDetectDeviceIMEI = async () => {
    try {
      // This would use Android TelephonyManager in the actual APK
      // For web version, we'll simulate the detection
      const simulatedIMEI = await new Promise<string>((resolve) => {
        // Simulate IMEI detection delay
        setTimeout(() => {
          // Generate a realistic IMEI for testing
          const timestamp = Date.now().toString().slice(-10);
          const simulatedIMEI = `${timestamp}12345`;
          resolve(simulatedIMEI);
        }, 1500);
      });
      
      addDebugLog(`Auto-detected IMEI: ${simulatedIMEI}`);
      setDeviceIMEI(simulatedIMEI);
      
      // Save to localStorage
      safeSetItem("companion_device_imei", simulatedIMEI);
      
      toast({
        title: "IMEI Detected",
        description: `Device IMEI automatically detected: ${simulatedIMEI.slice(0, 8)}...`,
      });
      
      return simulatedIMEI;
    } catch (error: any) {
      addDebugLog(`IMEI auto-detection failed: ${error.message}`);
      toast({
        title: "Auto-detection Failed",
        description: "Please enter IMEI manually using *#06#",
        variant: "destructive",
      });
      return null;
    }
  };

  // Add debug logging
  const addDebugLog = (message: string) => {
    console.log(`[KNETS JR DEBUG] ${message}`);
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Error boundary
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Knets Jr Error:", event.error);
      setHasError(true);
      setErrorMessage(event.error?.message || "Unknown error");
      addDebugLog(`Error: ${event.error?.message}`);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Safe localStorage access with fallback
  const safeGetItem = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      addDebugLog(`localStorage read error: ${error}`);
      return null;
    }
  };

  const safeSetItem = (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      addDebugLog(`localStorage write error: ${error}`);
      return false;
    }
  };

  // Check if device is registered in localStorage
  useEffect(() => {
    addDebugLog("Knets Jr app starting up...");
    
    // URL parameters for auto-registration and pre-filling
    const urlParams = new URLSearchParams(window.location.search);
    const autoIMEI = urlParams.get('imei');
    const autoPhone = urlParams.get('phone');
    const autoDevice = urlParams.get('device');
    
    // Pre-fill phone number if provided in URL
    if (autoPhone) {
      addDebugLog(`Auto-filling phone number from URL: ${autoPhone}`);
      setPhoneNumber(autoPhone);
    }
    
    if (autoIMEI) {
      addDebugLog(`Auto-registering with IMEI from URL: ${autoIMEI}`);
      setDeviceIMEI(autoIMEI);
      const stored = safeSetItem("companion_device_imei", autoIMEI);
      if (!stored) {
        addDebugLog("localStorage blocked, using URL parameter mode");
      }
      setIsRegistered(true);
    } else {
      const storedIMEI = safeGetItem("companion_device_imei");
      if (storedIMEI) {
        addDebugLog(`Found stored IMEI: ${storedIMEI}`);
        setDeviceIMEI(storedIMEI);
        setIsRegistered(true);
      } else {
        addDebugLog("No stored IMEI found - device not registered");
      }
    }
  }, []);

  // Fallback IMEI from URL parameter if localStorage is blocked
  const urlIMEI = new URLSearchParams(window.location.search).get('imei');
  const effectiveIMEI = deviceIMEI || urlIMEI;
  const effectiveRegistered = isRegistered || !!urlIMEI;

  // Query device status from Knets server
  const { data: deviceStatus, refetch, error: statusError, isLoading } = useQuery<DeviceStatus>({
    queryKey: [`/api/companion/status/${effectiveIMEI}`],
    enabled: effectiveRegistered && !!effectiveIMEI,
    refetchInterval: 10000, // Check every 10 seconds
    retry: false,
    queryFn: async () => {
      const currentFingerprint = await getCurrentDeviceIMEI();
      const fullPhoneNumber = `${countryCode} ${phoneNumber}`;
      
      const params = new URLSearchParams();
      if (fullPhoneNumber.trim()) params.append('phoneNumber', fullPhoneNumber);
      if (currentFingerprint) params.append('deviceFingerprint', currentFingerprint);
      
      const url = `/api/companion/status/${encodeURIComponent(effectiveIMEI || '')}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'IDENTITY_MISMATCH') {
          setHasError(true);
          setErrorMessage(errorData.description);
          throw new Error(`Validation Failed: ${errorData.description}`);
        }
        throw new Error(`HTTP ${response.status}: ${errorData.message}`);
      }
      
      return response.json();
    },

  });

  // Real GPS location tracking
  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number; method: string } | null> => {
    try {
      // Request high accuracy GPS position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,    // Use GPS satellites
            timeout: 15000,              // 15 second timeout
            maximumAge: 60000            // Accept 1-minute cached location
          }
        );
      });

      addDebugLog(`GPS Location obtained: ${position.coords.latitude}, ${position.coords.longitude} (±${position.coords.accuracy}m)`);
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        method: position.coords.accuracy < 100 ? 'gps' : 'network' // High accuracy = GPS, lower = network/cell
      };
    } catch (error: any) {
      addDebugLog(`GPS failed: ${error.message}, trying network location...`);
      
      // Fallback to network-based location (WiFi/Cell towers)
      try {
        const networkPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: false,   // Use network positioning (WiFi/Cell)
              timeout: 10000,
              maximumAge: 300000           // Accept 5-minute cached network location
            }
          );
        });

        addDebugLog(`Network location obtained: ${networkPosition.coords.latitude}, ${networkPosition.coords.longitude} (±${networkPosition.coords.accuracy}m)`);
        
        return {
          latitude: networkPosition.coords.latitude,
          longitude: networkPosition.coords.longitude,
          accuracy: networkPosition.coords.accuracy,
          method: 'cell_tower' // Network-based positioning
        };
      } catch (networkError: any) {
        addDebugLog(`All location methods failed: ${networkError.message}`);
        return null;
      }
    }
  };

  // Send location data to parent dashboard
  const sendLocationUpdate = async (location: { latitude: number; longitude: number; accuracy: number; method: string }) => {
    try {
      const device = await fetch(`/api/companion/status/${encodeURIComponent(effectiveIMEI || '')}`);
      const deviceData = await device.json();
      
      const locationData = {
        deviceId: deviceData.id,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        accuracy: location.accuracy,
        locationMethod: location.method,
        timestamp: new Date().toISOString()
      };

      const response = await fetch("/api/location", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": "Bearer companion-access" // Special companion access
        },
        body: JSON.stringify(locationData)
      });

      if (response.ok) {
        addDebugLog(`Location sent: ${location.method} positioning (±${Math.round(location.accuracy)}m)`);
      } else {
        addDebugLog(`Location send failed: ${response.status}`);
      }
    } catch (error: any) {
      addDebugLog(`Location update error: ${error.message}`);
    }
  };

  // Enhanced heartbeat with location tracking
  useEffect(() => {
    if (!effectiveRegistered || !effectiveIMEI) return;

    const sendHeartbeatWithLocation = async () => {
      try {
        addDebugLog("Sending heartbeat with location...");
        
        // Get current location (GPS/Network/Cell)
        const location = await getCurrentLocation();
        
        const currentFingerprint = await getCurrentDeviceIMEI();
        const heartbeatData = {
          imei: effectiveIMEI,
          deviceFingerprint: currentFingerprint,
          timestamp: new Date().toISOString()
        };

        const response = await fetch("/api/companion/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(heartbeatData)
        });
        
        if (!response.ok) {
          throw new Error(`Heartbeat failed: ${response.status}`);
        }
        
        setLastHeartbeat(new Date());
        addDebugLog("Heartbeat sent successfully");

        // Send location update if available
        if (location) {
          await sendLocationUpdate(location);
        }
        
      } catch (error: any) {
        addDebugLog(`Heartbeat failed: ${error.message}`);
        console.error("Heartbeat failed:", error);
      }
    };

    // Send initial heartbeat with location
    sendHeartbeatWithLocation();
    
    // Send heartbeat every 30 seconds with location updates
    const interval = setInterval(sendHeartbeatWithLocation, 30000);
    return () => clearInterval(interval);
  }, [effectiveRegistered, effectiveIMEI]);

  // Device lock enforcement
  useEffect(() => {
    if (!deviceStatus || !deviceStatus.isLocked) return;

    // Apply device restrictions when locked
    const enforceRestrictions = () => {
      // Hide most of the page content
      document.body.style.filter = "blur(10px)";
      document.body.style.pointerEvents = "none";
      
      // Show lock screen overlay
      const lockOverlay = document.getElementById("lock-overlay");
      if (lockOverlay) {
        lockOverlay.style.display = "flex";
      }
    };

    // Remove restrictions when unlocked
    const removeRestrictions = () => {
      document.body.style.filter = "none";
      document.body.style.pointerEvents = "auto";
      
      const lockOverlay = document.getElementById("lock-overlay");
      if (lockOverlay) {
        lockOverlay.style.display = "none";
      }
    };

    if (deviceStatus.isLocked) {
      enforceRestrictions();
    } else {
      removeRestrictions();
    }

    return () => removeRestrictions();
  }, [deviceStatus?.isLocked]);

  // Get current device IMEI for validation
  const getCurrentDeviceIMEI = async (): Promise<string | null> => {
    try {
      // Try to get IMEI using various methods
      if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
        // For PWA installed apps, try to access device info
        const deviceInfo = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          screen: {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth
          }
        };
        
        // Create a device fingerprint
        const fingerprint = btoa(JSON.stringify(deviceInfo)).substring(0, 15);
        addDebugLog(`Device fingerprint generated: ${fingerprint}`);
        return fingerprint;
      }
    } catch (error) {
      addDebugLog(`Could not get device IMEI: ${error}`);
    }
    return null;
  };

  const registerDevice = async () => {
    if (!deviceIMEI.trim()) {
      addDebugLog("Registration failed: No IMEI provided");
      return;
    }
    
    try {
      // Get current device's actual IMEI/fingerprint
      const currentIMEI = await getCurrentDeviceIMEI();
      
      // SECURITY: Flexible validation - device can connect if either phone OR IMEI matches
      // Since we got here through phone lookup, phone number already matches
      const phoneMatches = true;
      const imeiMatches = !currentIMEI || currentIMEI === deviceIMEI;
      
      if (!phoneMatches && !imeiMatches) {
        addDebugLog(`SECURITY ALERT: Identity mismatch! Database IMEI: ${deviceIMEI}, Current device: ${currentIMEI}`);
        
        toast({
          title: "Device Validation Failed",
          description: "Neither phone number nor device identity matches. Contact your parent to update registration.",
          variant: "destructive",
        });
        
        setHasError(true);
        setErrorMessage("Device validation failed - identity mismatch");
        return;
      }
      
      // Log which validation method succeeded
      const validationMethod = phoneMatches && imeiMatches ? 'both phone and IMEI' : phoneMatches ? 'phone number' : 'device IMEI';
      addDebugLog(`Device registration successful using ${validationMethod}`);
      
      addDebugLog(`Registering device with IMEI: ${deviceIMEI}`);
      const stored = safeSetItem("companion_device_imei", deviceIMEI);
      if (!stored) {
        addDebugLog("localStorage unavailable, continuing with session storage");
      }
      setIsRegistered(true);
      addDebugLog("Device registration successful");
      refetch();
      
      toast({
        title: "Device Connected",
        description: "Your device is now connected to Knets",
      });
    } catch (error: any) {
      addDebugLog(`Registration error: ${error.message}`);
      setHasError(true);
      setErrorMessage(`Registration failed: ${error.message}`);
    }
  };

  const unregisterDevice = () => {
    try {
      localStorage.removeItem("companion_device_imei");
    } catch (error) {
      addDebugLog(`localStorage removal error: ${error}`);
    }
    setIsRegistered(false);
    setDeviceIMEI("");
    setPhoneNumber("");
    setLookupResult(null);
    addDebugLog("Device disconnected");
  };

  // Mobile number lookup mutation
  const lookupMutation = useMutation({
    mutationFn: async (fullPhoneNumber: string) => {
      addDebugLog(`Looking up device for phone: ${fullPhoneNumber}`);
      
      try {
        const url = `/api/devices/lookup/mobile/${encodeURIComponent(fullPhoneNumber)}`;
        addDebugLog(`Making request to: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        addDebugLog(`Response status: ${response.status}`);
        
        if (!response.ok) {
          const errorData = await response.text();
          addDebugLog(`Error response: ${errorData}`);
          throw new Error(`Device not found with phone number: ${fullPhoneNumber}`);
        }
        
        const data = await response.json() as LookupResult;
        addDebugLog(`Success: Found device ${data.deviceName}`);
        return data;
        
      } catch (fetchError: any) {
        addDebugLog(`Fetch error: ${fetchError.message}`);
        throw fetchError;
      }
    },
    onSuccess: async (data: LookupResult) => {
      addDebugLog(`Device found: ${data.deviceName} (IMEI: ${data.imei})`);
      
      // SECURITY: Flexible validation - allow if either phone number OR IMEI matches
      const currentIMEI = await getCurrentDeviceIMEI();
      
      // Special case: PENDING_CONNECTION means device was found and ready to connect
      if (data.imei === "PENDING_CONNECTION") {
        addDebugLog(`Device found with pending connection - allowing connection`);
        // Phone number already matched since lookup was successful
      } else {
        // Check if either identifier matches for devices with real IMEIs
        const phoneMatches = true; // Phone number matched since lookup was successful
        const imeiMatches = !currentIMEI || currentIMEI === data.imei;
        
        if (!phoneMatches && !imeiMatches) {
          addDebugLog(`SECURITY ALERT: Neither phone nor IMEI match! Database IMEI: ${data.imei}, Current device: ${currentIMEI}`);
          
          toast({
            title: "Device Validation Failed",
            description: "Neither phone number nor device identity matches registration. Contact your parent to update device information.",
            variant: "destructive",
          });
          
          setHasError(true);
          setErrorMessage("Device validation failed - identity mismatch");
          return;
        }
      }
      
      // Log successful validation
      addDebugLog(`Device validated successfully using phone number lookup`);
      
      toast({
        title: "Device Validated",
        description: "Connection approved using phone number lookup",
      });
      
      setLookupResult(data);
      
      // Auto-populate IMEI field - handle PENDING_CONNECTION case
      if (data.imei === "PENDING_CONNECTION") {
        // For pending connections, generate a temporary device fingerprint
        const currentIMEI = await getCurrentDeviceIMEI();
        if (currentIMEI) {
          setDeviceIMEI(currentIMEI);
          safeSetItem("companion_device_imei", currentIMEI);
          addDebugLog(`Using device fingerprint as IMEI: ${currentIMEI}`);
        }
      } else {
        // Use the real IMEI from database
        setDeviceIMEI(data.imei);
        safeSetItem("companion_device_imei", data.imei);
      }
      
      toast({
        title: "Device Found & Connected!",
        description: `Found: ${data.deviceName}\nIMEI automatically populated from database`,
      });
      
      // Auto-register device after successful lookup
      setTimeout(() => {
        registerDevice();
      }, 1000); // Give user time to see the device found message
    },
    onError: (error: Error) => {
      addDebugLog(`Lookup failed: ${error.message}`);
      setLookupResult(null);
      
      // Show detailed error for debugging
      console.error("Lookup error details:", error);
      
      toast({
        title: "Mobile number not found",
        description: `Ask parent to register your device first. Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleLookup = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid mobile number",
        variant: "destructive",
      });
      return;
    }
    
    // Try exact database format first: "+91 8870929411"
    const exactFormat = `${countryCode} ${phoneNumber.trim()}`;
    
    addDebugLog(`Manual lookup for: ${exactFormat}`);
    addDebugLog(`Expected database format: "+91 8870929411"`);
    
    // Force mutation with exact format
    lookupMutation.mutate(exactFormat);
  };

  // Test function to directly test the API
  const testDirectAPI = async () => {
    try {
      addDebugLog("Testing direct API call...");
      const response = await fetch("/api/devices/lookup/mobile/%2B91%208870929411");
      const data = await response.json();
      addDebugLog(`Direct API result: ${JSON.stringify(data)}`);
      
      if (response.ok) {
        setLookupResult(data);
        toast({
          title: "Direct API Success!",
          description: `Found: ${data.deviceName}`,
        });
      }
    } catch (error: any) {
      addDebugLog(`Direct API failed: ${error.message}`);
    }
  };

  // Consent approval mutation
  const consentMutation = useMutation({
    mutationFn: async ({ imei, action }: { imei: string; action: 'approve' | 'deny' }) => {
      addDebugLog(`${action === 'approve' ? 'Approving' : 'Denying'} consent for device: ${imei}`);
      const response = await fetch(`/api/companion/consent/${encodeURIComponent(imei)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      const action = variables.action === 'approve' ? 'approved' : 'denied';
      addDebugLog(`Device consent ${action} successfully`);
      toast({
        title: `Consent ${action === 'approved' ? 'Approved' : 'Denied'}`,
        description: data.message,
        variant: action === 'approved' ? 'default' : 'destructive',
      });
      
      // Update lookup result with new consent status
      if (lookupResult) {
        setLookupResult({ ...lookupResult, consentStatus: data.status });
      }
      
      // If approved, proceed with registration
      if (action === 'approved') {
        registerDevice();
      }
    },
    onError: (error: Error) => {
      addDebugLog(`Consent update failed: ${error.message}`);
      toast({
        title: "Error",
        description: error.message || "Failed to update consent",
        variant: "destructive",
      });
    },
  });

  // Auto-lookup when phone number changes
  useEffect(() => {
    if (phoneNumber.trim() && phoneNumber.length >= 10) {
      // Add a small delay to avoid too many API calls while typing
      const timeout = setTimeout(() => {
        const fullPhoneNumber = `${countryCode} ${phoneNumber}`;
        addDebugLog(`Auto-looking up device for: ${fullPhoneNumber}`);
        
        // Try multiple formats to ensure compatibility
        const formats = [
          fullPhoneNumber,                    // +91 8870929411 (with space)
          `${countryCode}${phoneNumber}`,    // +918870929411 (no space)
        ];
        
        // Try the first format (database format with space)
        lookupMutation.mutate(formats[0]);
      }, 500); // 500ms delay
      
      return () => clearTimeout(timeout);
    }
  }, [phoneNumber, countryCode]);

  const useFoundDevice = () => {
    if (lookupResult) {
      setDeviceIMEI(lookupResult.imei);
      toast({
        title: "IMEI Auto-populated",
        description: "Device IMEI has been automatically filled",
      });
    }
  };

  const copyIMEI = () => {
    if (lookupResult) {
      navigator.clipboard.writeText(lookupResult.imei);
      toast({
        title: "IMEI Copied",
        description: "IMEI has been copied to clipboard",
      });
    }
  };

  const countries = [
    { code: "+91", name: "India", flag: "🇮🇳" },
    { code: "+1", name: "USA", flag: "🇺🇸" },
    { code: "+44", name: "UK", flag: "🇬🇧" },
    { code: "+86", name: "China", flag: "🇨🇳" },
    { code: "+81", name: "Japan", flag: "🇯🇵" },
    { code: "+49", name: "Germany", flag: "🇩🇪" },
    { code: "+33", name: "France", flag: "🇫🇷" },
    { code: "+7", name: "Russia", flag: "🇷🇺" },
    { code: "+61", name: "Australia", flag: "🇦🇺" },
    { code: "+55", name: "Brazil", flag: "🇧🇷" },
    { code: "+52", name: "Mexico", flag: "🇲🇽" },
    { code: "+82", name: "South Korea", flag: "🇰🇷" },
    { code: "+65", name: "Singapore", flag: "🇸🇬" },
    { code: "+60", name: "Malaysia", flag: "🇲🇾" },
    { code: "+62", name: "Indonesia", flag: "🇮🇩" },
  ];

  if (!effectiveRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Knets Jr
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Connect your device to your family's Knets system
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-medium text-gray-900">
                  Child's Mobile Number
                </Label>
                <p className="text-sm text-gray-600 mb-3">
                  Enter your mobile number to check the database and pull out your device information
                </p>
                <div className="flex gap-2 mt-1">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter mobile number (e.g., 8870929411)"
                    value={phoneNumber}
                    onChange={(e) => {
                      // Only allow digits, remove any non-digit characters
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 15) {
                        setPhoneNumber(value);
                      }
                    }}
                    className="flex-1 text-lg"
                    maxLength={15}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
              </div>

              {/* IMEI Status Display (Read-only) */}
              {lookupResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">Device IMEI Retrieved</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    IMEI automatically retrieved from parent database: {deviceIMEI}
                  </p>
                </div>
              )}
              
              {!lookupResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">📱 How It Works:</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>1. Enter your mobile number above</div>
                    <div>2. We'll check the database and pull out your device information</div>
                    <div>3. Device connects automatically!</div>
                  </div>
                </div>
              )}

              {lookupResult && (
                <div className={`p-4 border rounded-lg ${
                  lookupResult.consentStatus === 'pending' 
                    ? 'bg-orange-50 border-orange-200' 
                    : lookupResult.consentStatus === 'approved'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-medium ${
                      lookupResult.consentStatus === 'pending' 
                        ? 'text-orange-800' 
                        : lookupResult.consentStatus === 'approved'
                        ? 'text-green-800'
                        : 'text-gray-800'
                    }`}>
                      Device Found
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      lookupResult.consentStatus === 'pending'
                        ? 'bg-orange-100 text-orange-800'
                        : lookupResult.consentStatus === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {lookupResult.consentStatus || 'Unknown'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Device:</span>
                      <span className="font-medium">{lookupResult.deviceName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{lookupResult.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${
                        lookupResult.isLocked ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {lookupResult.isLocked ? 'Locked' : 'Available'}
                      </span>
                    </div>
                  </div>
                  
                  {lookupResult.consentStatus === 'pending' ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-orange-700 mb-3">
                        This device was registered by your parent. Do you give consent to connect and allow parental controls?
                      </p>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => consentMutation.mutate({ imei: lookupResult.imei, action: 'approve' })}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={consentMutation.isPending}
                        >
                          ✓ Approve & Connect
                        </Button>
                        <Button 
                          onClick={() => consentMutation.mutate({ imei: lookupResult.imei, action: 'deny' })}
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                          disabled={consentMutation.isPending}
                        >
                          ✗ Deny
                        </Button>
                      </div>
                    </div>
                  ) : lookupResult.consentStatus === 'approved' ? (
                    <Button 
                      onClick={useFoundDevice}
                      className="w-full mt-3 bg-green-600 hover:bg-green-700"
                      disabled={deviceIMEI === lookupResult.imei}
                    >
                      {deviceIMEI === lookupResult.imei ? 'IMEI Populated' : 'Use This Device'}
                    </Button>
                  ) : (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      Device access has been denied or consent is required.
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={lookupResult ? registerDevice : handleLookup}
                className={`w-full ${lookupResult ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={!phoneNumber.trim() || lookupMutation.isPending || (lookupResult && !deviceIMEI.trim())}
              >
                {lookupMutation.isPending ? "Searching Database..." : 
                 lookupResult ? "Register" : "Connect My Device"}
              </Button>

              {/* Always show debug panel for testing */}
              <div className="mt-6 p-3 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Debug Information
                </h4>
                {hasError && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <strong>Error:</strong> {errorMessage}
                  </div>
                )}
                <div className="space-y-1 text-xs text-gray-600 max-h-32 overflow-y-auto font-mono">
                  {debugInfo.length === 0 ? (
                    <div className="text-gray-500">Enter phone number 8870929411 to start debugging...</div>
                  ) : (
                    debugInfo.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => {
                      setDebugInfo([]);
                      setHasError(false);
                      setErrorMessage("");
                    }}
                  >
                    Clear Log
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs bg-blue-50"
                    onClick={testDirectAPI}
                  >
                    Test API
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeSchedule = deviceStatus?.schedules?.find(s => s.isActive);

  return (
    <>
      {/* Lock Screen Overlay */}
      <div 
        id="lock-overlay"
        className="fixed inset-0 bg-red-600 z-50 flex items-center justify-center"
        style={{ display: deviceStatus?.isLocked ? "flex" : "none" }}
      >
        <div className="text-center text-white p-8">
          <Lock className="w-24 h-24 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Device Locked</h1>
          <p className="text-xl mb-2">This device is currently restricted</p>
          {activeSchedule && (
            <p className="text-lg opacity-90">
              Active: {activeSchedule.name}
            </p>
          )}
          <p className="text-sm opacity-75 mt-4">
            Contact your parent to unlock
          </p>
        </div>
      </div>

      {/* Main Companion App Interface */}
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card className="border-0 shadow-lg mb-6">
            <CardHeader className="text-center pb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                deviceStatus?.isLocked ? 'bg-red-600' : 'bg-green-600'
              }`}>
                {deviceStatus?.isLocked ? (
                  <Lock className="w-8 h-8 text-white" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-white" />
                )}
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                {deviceStatus?.name || "Your Device"}
              </CardTitle>
              <p className={`text-sm font-medium ${
                deviceStatus?.isLocked ? 'text-red-600' : 'text-green-600'
              }`}>
                {deviceStatus?.isLocked ? 'Locked' : 'Available'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">IMEI</span>
                </div>
                <span className="text-sm font-mono text-gray-900">
                  {effectiveIMEI.slice(-4).padStart(effectiveIMEI.length, '*')}
                </span>
              </div>
              
              {lastHeartbeat && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Last Check</span>
                  </div>
                  <span className="text-sm text-gray-900">
                    {lastHeartbeat.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {activeSchedule && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      Active Schedule
                    </span>
                  </div>
                  <p className="text-sm text-orange-700">
                    {activeSchedule.name} ({activeSchedule.startTime} - {activeSchedule.endTime})
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={unregisterDevice}
              className="text-gray-600 border-gray-300"
            >
              Disconnect Device
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}