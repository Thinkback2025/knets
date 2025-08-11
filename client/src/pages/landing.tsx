import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Clock, Users, CheckCircle, Eye, EyeOff, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";



export default function Landing() {
  const { toast } = useToast();
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  
  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobileNumber: "",
    countryCode: "+91",
    deviceAdminSecretCode: "",
    confirmSecretCode: ""
  });

  const { data: countryCodes } = useQuery({
    queryKey: ["/api/config/country-codes"],
    retry: false,
  });

  const handleSignUp = () => {
    setShowSignupDialog(true);
    setSignupStep(1);
  };

  const handleStep1Continue = () => {
    if (!signupData.username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a username",
        variant: "destructive"
      });
      return;
    }
    
    if (!signupData.email.trim() || !signupData.email.includes("@")) {
      toast({
        title: "Valid Email Required",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    if (signupData.password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }
    
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords match",
        variant: "destructive"
      });
      return;
    }
    
    if (!signupData.mobileNumber.trim()) {
      toast({
        title: "Mobile Number Required",
        description: "Please enter your mobile number",
        variant: "destructive"
      });
      return;
    }
    
    setSignupStep(2);
  };

  const handleSecretCodeSetup = () => {
    if (!signupData.deviceAdminSecretCode.trim()) {
      toast({
        title: "Secret Code Required",
        description: "Please create a device admin secret code",
        variant: "destructive"
      });
      return;
    }
    
    if (signupData.deviceAdminSecretCode.length < 4) {
      toast({
        title: "Code Too Short",
        description: "Secret code must be at least 4 characters long",
        variant: "destructive"
      });
      return;
    }
    
    if (signupData.deviceAdminSecretCode !== signupData.confirmSecretCode) {
      toast({
        title: "Secret Codes Don't Match",
        description: "Please ensure both secret codes match",
        variant: "destructive"
      });
      return;
    }
    
    // Store signup data in localStorage temporarily
    localStorage.setItem('pendingSignupData', JSON.stringify(signupData));
    
    toast({
      title: "Account Setup Complete!",
      description: "Redirecting to complete registration...",
    });
    
    // Close dialog and redirect to login
    setShowSignupDialog(false);
    setTimeout(() => {
      window.location.href = '/api/login';
    }, 1000);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 min-h-16">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <img 
                src="/src/assets/knets-logo.png" 
                alt="Knets Logo" 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <h1 className="text-lg font-semibold text-gray-900">Knets</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/api/login'}
                className="border-green-600 text-green-600 hover:bg-green-50 text-sm px-3"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleSignUp}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-sm px-3"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Create Account</span>
                <span className="sm:hidden">Sign Up</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Manage Your Family's Digital Life with Confidence
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Take control of your children's device usage with smart scheduling, 
            remote monitoring, and emergency controls designed with families in mind.
          </p>


        </div>
      </section>



      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Built for Modern Families
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-green-600/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Remote Control</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Lock and unlock devices remotely using IMEI and mobile number identification
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-600/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle className="text-lg">Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Set automatic lock schedules for bedtime, study hours, and family time
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-warning-orange/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-warning-orange" />
                </div>
                <CardTitle className="text-lg">Family Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor all family devices from one secure, intuitive dashboard
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-error-red/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-error-red" />
                </div>
                <CardTitle className="text-lg">Emergency Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Instant emergency unlock for urgent situations and family safety
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">
            Privacy & Consent First
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-trust-blue/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-trust-blue" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Secure by Design</h4>
              <p className="text-gray-600">
                All data is encrypted and stored securely with industry-standard protection
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-safe-green/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-safe-green" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Consent Required</h4>
              <p className="text-gray-600">
                Children must approve device monitoring - transparency is key to trust
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-warning-orange/10 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-warning-orange" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Family Focused</h4>
              <p className="text-gray-600">
                Tools designed to build healthy digital habits, not just restrictions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/src/assets/knets-logo.png" 
                alt="Knets Logo" 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span className="text-lg font-semibold">Knets</span>
            </div>
            <div className="text-sm text-gray-400">
              Built with families in mind. Privacy first.
            </div>
          </div>
        </div>
      </footer>

      {/* Enhanced Signup Dialog with Device Admin Secret Code */}
      <Dialog open={showSignupDialog} onOpenChange={setShowSignupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-green-600" />
              <DialogTitle>
                {signupStep === 1 ? "Create Your Account" : "Device Admin Protection Setup"}
              </DialogTitle>
            </div>
            <DialogDescription>
              {signupStep === 1 
                ? "Enter your details to create a new Knets account"
                : "Create a secret code to protect device admin settings from being disabled by children"
              }
            </DialogDescription>
          </DialogHeader>

          {signupStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={signupData.username}
                  onChange={(e) => setSignupData({...signupData, username: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="flex space-x-2">
                  <Popover open={countryCodeOpen} onOpenChange={setCountryCodeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-32 justify-between"
                      >
                        {signupData.countryCode && countryCodes
                          ? countryCodes.find((country: any) => country.code === signupData.countryCode)?.flag + " " + signupData.countryCode
                          : "🇮🇳 +91"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandList className="max-h-[200px] overflow-auto">
                          {countryCodes && countryCodes.map((country: any) => (
                            <CommandItem
                              value={`${country.country} ${country.code}`}
                              key={country.code}
                              onSelect={() => {
                                setSignupData({...signupData, countryCode: country.code});
                                setCountryCodeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  country.code === signupData.countryCode
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {country.flag} {country.code} - {country.country}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input
                    id="mobile"
                    placeholder="Enter mobile number"
                    value={signupData.mobileNumber}
                    onChange={(e) => setSignupData({...signupData, mobileNumber: e.target.value})}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button onClick={handleStep1Continue} className="flex-1">
                  Continue to Security Setup
                </Button>
                <Button variant="outline" onClick={() => setShowSignupDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {signupStep === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Important:</strong> This secret code prevents children from disabling device admin 
                  or uninstalling Knets Jr without your permission. Choose something memorable but secure.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretCode">Device Admin Secret Code</Label>
                <div className="relative">
                  <Input
                    id="secretCode"
                    type={showSecretCode ? "text" : "password"}
                    placeholder="Create a memorable secret code"
                    value={signupData.deviceAdminSecretCode}
                    onChange={(e) => setSignupData({...signupData, deviceAdminSecretCode: e.target.value})}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSecretCode(!showSecretCode)}
                  >
                    {showSecretCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmSecretCode">Confirm Secret Code</Label>
                <Input
                  id="confirmSecretCode"
                  type={showSecretCode ? "text" : "password"}
                  placeholder="Re-enter your secret code"
                  value={signupData.confirmSecretCode}
                  onChange={(e) => setSignupData({...signupData, confirmSecretCode: e.target.value})}
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  ✓ This code will be required when children try to uninstall the app<br/>
                  ✓ SMS alerts will be sent to {signupData.countryCode} {signupData.mobileNumber}<br/>
                  ✓ Recovery emails will be sent to {signupData.email}
                </p>
              </div>

              <div className="flex space-x-3">
                <Button onClick={handleSecretCodeSetup} className="flex-1">
                  Complete Account Setup
                </Button>
                <Button variant="outline" onClick={() => setSignupStep(1)} className="flex-1">
                  Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
