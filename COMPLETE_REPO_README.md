# Knets - Complete Family Device Management System

A comprehensive family device management platform with web dashboard and Android companion app.

## Project Structure

```
knets/
├── android/          # Android build configuration
├── app/             # Android companion app (Knets Jr)
├── client/          # React web dashboard
├── server/          # Express.js backend API
├── shared/          # Shared TypeScript schemas
├── .github/workflows/ # Automated APK builds
└── package.json     # Node.js dependencies
```

## Features

### Web Dashboard
- Parent authentication and management
- Real-time device monitoring
- Schedule management with timezone support
- Network control (WiFi/mobile data restrictions)
- GPS location tracking
- Payment system (UPI integration)
- Child profile management with parent codes

### Android App (Knets Jr)
- Dual connection methods (parent codes + QR scanning)
- Device policy management
- GPS location reporting
- Network restriction enforcement
- Schedule compliance monitoring
- Uninstall protection

## Quick Start

### 1. Web Application
```bash
npm install
npm run dev
```
Access at: http://localhost:5000

### 2. Android APK Build
- Push to GitHub triggers automatic APK build
- Download APK from Actions artifacts
- Install on Android devices (API 33+)

## Environment Setup

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - Session encryption
- `AWS_ACCESS_KEY_ID` - Email service
- `AWS_SECRET_ACCESS_KEY` - Email service
- `SES_FROM_EMAIL` - Sender email

## Parent Codes System

Generated codes for device connection:
- System creates 6-8 digit codes per child
- QR codes available for easy sharing
- Secure device registration workflow

## Database Schema

- Users (authentication)
- Children (profiles with parent codes)
- Devices (IMEI-based registration)
- Schedules (time-based restrictions)
- Activity logs (usage tracking)
- Location logs (GPS data)

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **Android**: Kotlin, Material Design
- **Build**: Vite, GitHub Actions
- **Database**: Drizzle ORM, Neon PostgreSQL

## Deployment

1. **Web Dashboard**: Deploy to Replit or any Node.js hosting
2. **Android APK**: Automatic builds via GitHub Actions
3. **Database**: PostgreSQL (Neon recommended)

## License

Proprietary - Family device management solution