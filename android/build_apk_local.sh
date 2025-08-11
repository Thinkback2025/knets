#!/bin/bash

# Local APK build script for Knets Jr
# This script builds the APK locally using the configured Android SDK

echo "Building Knets Jr APK locally..."

# Set Android SDK path
export ANDROID_HOME=/tmp/android-sdk

# Build the APK
./gradlew clean assembleDebug --stacktrace

# Check if build was successful
if [ $? -eq 0 ]; then
    # Copy APK to outputs directory
    mkdir -p outputs
    cp app/build/outputs/apk/debug/knets-jr-debug.apk outputs/
    
    echo "✅ APK build successful!"
    echo "📱 APK location: outputs/knets-jr-debug.apk"
    echo "📦 APK size: $(du -h outputs/knets-jr-debug.apk | cut -f1)"
    
    # Verify APK
    if [ -f "/tmp/android-sdk/build-tools/33.0.1/aapt" ]; then
        echo "📋 APK details:"
        /tmp/android-sdk/build-tools/33.0.1/aapt dump badging outputs/knets-jr-debug.apk | head -3
    fi
else
    echo "❌ APK build failed!"
    exit 1
fi