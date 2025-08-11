FROM openjdk:11-jdk

# Install Android SDK
RUN apt-get update && apt-get install -y wget unzip
RUN mkdir -p /opt/android-sdk
WORKDIR /opt/android-sdk

# Download and install Android SDK
RUN wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
RUN unzip commandlinetools-linux-9477386_latest.zip
RUN mkdir cmdline-tools/latest
RUN mv cmdline-tools/bin cmdline-tools/lib cmdline-tools/NOTICE.txt cmdline-tools/source.properties cmdline-tools/latest/

# Set environment variables
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Accept licenses and install packages
RUN yes | sdkmanager --licenses
RUN sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

# Copy project
WORKDIR /app
COPY . .

# Make gradlew executable and build
RUN chmod +x gradlew
RUN ./gradlew clean assembleDebug

# Copy APK to output
RUN mkdir -p /output
RUN find . -name "*.apk" -exec cp {} /output/ \;