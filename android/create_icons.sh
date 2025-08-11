#!/bin/bash

# Create minimal 1x1 pixel PNG icons for Android build
# This creates valid PNG files that satisfy Android build requirements

echo "Creating minimal Android icons..."

# Function to create a 1x1 pixel PNG
create_icon() {
    local size=$1
    local output=$2
    # Create a simple PNG header for 1x1 pixel image
    printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > "$output"
}

# Create all required icon densities
create_icon 48 "app/src/main/res/mipmap-mdpi/ic_launcher.png"
create_icon 48 "app/src/main/res/mipmap-mdpi/ic_launcher_round.png"
create_icon 72 "app/src/main/res/mipmap-hdpi/ic_launcher.png"
create_icon 72 "app/src/main/res/mipmap-hdpi/ic_launcher_round.png"
create_icon 96 "app/src/main/res/mipmap-xhdpi/ic_launcher.png"
create_icon 96 "app/src/main/res/mipmap-xhdpi/ic_launcher_round.png"
create_icon 144 "app/src/main/res/mipmap-xxhdpi/ic_launcher.png"
create_icon 144 "app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png"
create_icon 192 "app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
create_icon 192 "app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png"

echo "Icons created successfully"