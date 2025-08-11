import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, QrCode, Smartphone, CheckCircle, ArrowRight } from "lucide-react";

interface ParentCodeSetupProps {
  onGetStarted: () => void;
}

export function ParentCodeSetupGuide({ onGetStarted }: ParentCodeSetupProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Set Up Parent Connection Codes
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Create unique codes for each child to securely connect and control their devices
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-green-100">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-green-600 font-bold">1</span>
            </div>
            <CardTitle className="text-lg">Add Children</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <CardDescription>
              Create profiles for each child and generate unique 6-8 digit parent codes
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-100">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-bold">2</span>
            </div>
            <CardTitle className="text-lg">Share Codes</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <CardDescription>
              Use QR codes or manually enter parent codes on children's devices
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-100">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-purple-600 font-bold">3</span>
            </div>
            <CardTitle className="text-lg">Automatic Control</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <CardDescription>
              Devices connect instantly and follow your schedules and restrictions
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
          What You Get
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-gray-700">Unique codes for each child</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-gray-700">QR code sharing for easy setup</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-gray-700">Instant device connection</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-gray-700">Automatic schedule enforcement</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="text-center">
        <Button 
          onClick={onGetStarted}
          size="lg"
          className="bg-green-600 hover:bg-green-700 px-8 py-3"
        >
          Get Started with Parent Codes
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}