# UMMA Archive — Mobile Retrieval System

A high-fidelity mobile application for the UMMA Examination Archive & Retrieval System built with **React Native** and **Expo SDK 57** for Expo Go on physical mobile devices.

---

## 📱 Features & Exact Design Reproduction

- **Splash Screen**:
  - Custom branding with UMMA Archive emblem (palm crest + pen nib).
  - Sparkling ambient backdrop with smooth auto-transition to onboarding.
- **Onboarding Flow (4 Steps)**:
  - **Step 1: Organize Your Archive** (`onboarding_archive`) — Institutional verification badge, 3D archivist character, Archival Cloud Sync badge, pill pagination, and Next CTA.
  - **Step 2: Find What You Need Faster** (`onboarding_search`) — 3D character with holographic query, Index Matched badge, Test Booklet card, and Next CTA.
  - **Step 3: Locate & Verify** (`onboarding_locate`) — 3D guide character on pedestal, verification chip, and Next CTA.
  - **Step 4: Achieve Excellence** (`onboarding_get_started`) — Celebration character, 256-bit security badge, Ready status, and "Get Started" CTA.
  - **Skip Button**: Accessible from any onboarding step to jump directly to Role Selection.
- **Role Selection** (`role`):
  - Choose between **Lecturer**, **Examination Officer**, and **Admin** with custom styled cards and icons.
- **Authentication Screens**:
  - **Sign In / Welcome Back** (`sign up age`) — Ambient background card, UMMA emblem, username/password inputs, and forgot password link.
  - **Create Account** (`login page`) — Full Name, Email, Create Password, Terms notice, and seamless switch to Log In.
  - **Forgot Password** (`forgot password`) — Email/username recovery workflow with confirmation state.
- **Examination Retrieval Portal Dashboard**:
  - Role-specific greeting and actions.
  - Live booklet search across course code, title, and shelf location.
  - Status filter chips (All, Verified, In Shelf, Audited, Pending Review).
  - Detailed booklet retrieval card with shelf number, box number, script count, and modal detail inspection with QR scan retrieval simulation.

---

## 🚀 Running on Mobile via Expo Go (SDK 57)

### 1. Prerequisites
- Install **Expo Go** from Google Play Store (Android) or Apple App Store (iOS) on your mobile phone.
- Ensure your phone and development computer are on the same Wi-Fi network.

### 2. Start the Expo Server
In the project directory, run:
```bash
npm start
```
or
```bash
npx expo start
```

### 3. Open on Mobile
- **Android**: Open the **Expo Go** app and tap **Scan QR Code**, then scan the QR code displayed in your terminal.
- **iOS**: Open the native **Camera** app, scan the terminal QR code, and tap the notification banner to open in Expo Go.
- **Tunnel Mode** (if on different networks or behind strict firewalls):
  ```bash
  npx expo start --tunnel
  ```
