import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Search, Smartphone, Copy, CheckCircle } from "lucide-react";

interface LookupResult {
  imei: string;
  deviceName: string;
  deviceId: number;
  phoneNumber: string;
  isActive: boolean;
  isLocked: boolean;
  consentStatus: string;
}

const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
];

export function ImeiLookup() {
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const lookupMutation = useMutation({
    mutationFn: async ({ countryCode, phoneNumber }: { countryCode: string, phoneNumber: string }) => {
      const fullPhone = `${countryCode} ${phoneNumber}`;
      const encodedPhone = encodeURIComponent(fullPhone);
      const response = await apiRequest("GET", `/api/devices/lookup/mobile/${encodedPhone}`);
      return await response.json() as LookupResult;
    },
    onSuccess: (data) => {
      setLookupResult(data);
      toast({
        title: "IMEI Found",
        description: `IMEI found for device: ${data.deviceName}`,
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
      
      const errorMessage = error.message;
      if (errorMessage.includes("404")) {
        toast({
          title: "Device Not Found",
          description: "No device found with this mobile number",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to lookup IMEI",
          variant: "destructive",
        });
      }
      setLookupResult(null);
    },
  });

  const handleLookup = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a mobile number",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format (basic validation)
    const cleanNumber = phoneNumber.replace(/\s/g, '');
    if (cleanNumber.length < 7 || cleanNumber.length > 15) {
      toast({
        title: "Invalid Number",
        description: "Please enter a valid mobile number (7-15 digits)",
        variant: "destructive",
      });
      return;
    }

    lookupMutation.mutate({ countryCode, phoneNumber: phoneNumber.trim() });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied",
        description: "IMEI copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy IMEI",
        variant: "destructive",
      });
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Mask the phone number for privacy
    if (phone.includes('+')) {
      const parts = phone.split(' ');
      if (parts.length >= 2) {
        const countryCode = parts[0];
        const number = parts.slice(1).join('');
        if (number.length >= 7) {
          const visibleStart = number.substring(0, 3);
          const visibleEnd = number.substring(number.length - 2);
          return `${countryCode} ${visibleStart}***${visibleEnd}`;
        }
      }
    }
    return phone.replace(/(\+?\d{1,3})\s*(.{3}).+(.{2})/, '$1 $2***$3');
  };

  const formatImei = (imei: string) => {
    // Show first 3 and last 3 digits
    return `${imei.substring(0, 3)}*****${imei.substring(imei.length - 3)}`;
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
          <Search className="w-5 h-5 text-green-600" />
          <span>IMEI Lookup</span>
        </CardTitle>
        <CardDescription className="text-gray-600">
          Find device IMEI using mobile phone number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Mobile Number</Label>
          
          <div className="space-y-2">
            <Label htmlFor="country-code" className="text-sm text-gray-600">Country Code</Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country code" />
              </SelectTrigger>
              <SelectContent>
                {countryCodes.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <div className="flex items-center space-x-2">
                      <span>{country.flag}</span>
                      <span>{country.code}</span>
                      <span className="text-gray-500">({country.country})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm text-gray-600">Phone Number</Label>
            <div className="flex space-x-2">
              <div className="flex items-center px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm font-medium text-gray-700 min-w-[60px] justify-center">
                {countryCode}
              </div>
              <Input
                id="phone"
                type="tel"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => {
                  // Only allow numbers and spaces
                  const value = e.target.value.replace(/[^\d\s]/g, '');
                  setPhoneNumber(value);
                }}
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                maxLength={15}
              />
              <Button
                onClick={handleLookup}
                disabled={lookupMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-4"
              >
                {lookupMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Enter the mobile number without country code (e.g., 98765 43210)
            </p>
          </div>
        </div>

        {lookupResult && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{lookupResult.deviceName}</h4>
                  <p className="text-sm text-gray-600">Phone: {formatPhoneNumber(lookupResult.phoneNumber)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={lookupResult.isActive ? "default" : "secondary"}
                  className={lookupResult.isActive ? "bg-green-100 text-green-800 border-green-200" : ""}
                >
                  {lookupResult.isActive ? "Online" : "Offline"}
                </Badge>
                {lookupResult.isLocked && (
                  <Badge variant="destructive">Locked</Badge>
                )}
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-md border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">IMEI Number</Label>
                  <p className="font-mono text-sm font-medium text-gray-900 mt-1">
                    {formatImei(lookupResult.imei)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Full IMEI: {lookupResult.imei}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(lookupResult.imei)}
                  className="ml-2"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              <span className="font-medium">Consent Status:</span> 
              <span className={`ml-1 ${
                lookupResult.consentStatus === 'approved' ? 'text-green-600' :
                lookupResult.consentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {lookupResult.consentStatus.charAt(0).toUpperCase() + lookupResult.consentStatus.slice(1)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}