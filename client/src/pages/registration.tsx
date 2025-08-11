import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Smartphone, Users, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { registrationSchema, type RegistrationData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Registration() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Fetch country codes
  const { data: countryCodes } = useQuery({
    queryKey: ["/api/config/country-codes"],
    retry: false,
  });

  const form = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      email: "",
      mobileNumber: "",
      countryCode: "+91",
      deviceAdminSecretCode: "",
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      return await apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      setRegistrationComplete(true);
      toast({
        title: "Registration Successful",
        description: "Your parent account has been created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRegistration = (data: RegistrationData) => {
    registrationMutation.mutate(data);
  };

  const generateSecretCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    form.setValue("deviceAdminSecretCode", code);
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Welcome to Knets!</CardTitle>
            <CardDescription>
              Your parent account is ready. You can now add children and connect their devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white border-0 shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-3xl text-gray-900">Create Parent Account</CardTitle>
          <CardDescription>
            Set up your family device management system in just a few steps
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-8 h-1 ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegistration)} className="space-y-6">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <Users className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <h3 className="text-xl font-semibold text-gray-900">Basic Information</h3>
                    <p className="text-sm text-gray-600">Tell us about yourself</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="countryCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countryCodes?.map((country: any) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.code} {country.country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="mobileNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile Number</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel" 
                                placeholder="Enter your mobile number" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    onClick={() => setStep(2)}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!form.watch("username") || !form.watch("email") || !form.watch("mobileNumber")}
                  >
                    Continue to Security Setup
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <Shield className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <h3 className="text-xl font-semibold text-gray-900">Security Information</h3>
                    <p className="text-sm text-gray-600">Create security codes for device protection</p>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      These security codes will be used to protect your children's devices from unauthorized access.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="deviceAdminSecretCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Admin Security Code (4 digits)</FormLabel>
                        <div className="flex space-x-2">
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="Enter 4-digit code" 
                              maxLength={4}
                              {...field} 
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={generateSecretCode}
                          >
                            Generate
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600">
                          This code will be required to disable device admin features
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Unique parent codes will be generated for each child</li>
                      <li>• Enter these codes on children's devices to connect them</li>
                      <li>• Devices will be automatically locked and controlled per your schedules</li>
                      <li>• Real-time location tracking will be enabled</li>
                    </ul>
                  </div>

                  <div className="flex space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={registrationMutation.isPending || !form.watch("deviceAdminSecretCode")}
                    >
                      {registrationMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}