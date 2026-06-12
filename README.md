# TrotroApp 🚌💨

**TrotroApp** is a high-performance React Native application designed for efficient smart city commuting. It provides real-time routing, community-driven updates, and a seamless travel experience for commuters.

## ✨ Features

### 📍 Real-Time Routing & Navigation

- **Dynamic Route Calculation**: Uses OSRM (Open Source Routing Machine) to calculate the best paths for driving, walking, or cycling.
- **Live Location Tracking**: Continuously tracks the user's position to guide them through their journey.
- **Bus Stop Integration**: Automatically finds and displays the nearest bus stops along your route.

### 🕒 Ride History & Smart Re-Search

- **Journey Logs**: Automatically saves completed trips with origins, destinations, price estimates, and duration.
- **"Search Again"**: Re-initiate previous searches instantly. The app stores geographic coordinates for historical rides to ensure precise route re-calculation without manual input.

### 🔔 Community Notifications & Updates

- **Latest Updates Swiper**: Fixed news items and dynamic community reports displayed directly on the Home screen.
- **Unread Indicators**: Visual "blue dot" notifications for new community posts and news updates.
- **Auto-Expiry**: Community reports are automatically removed after 24 hours to keep information fresh and relevant.
- **Manual Management**: Users can delete their own reports with a confirmation safety check.

## 🚀 Performance Optimizations

To ensure a smooth experience even on lower-end devices:

- **Intelligent Caching**: Implemented in-memory caching for OSRM routes and bus stop lookups to minimize API latency and data usage.
- **Adaptive Re-calculation**: The app uses a 200m movement threshold for route refreshes, preventing excessive battery drain and unnecessary API calls.
- **Optimized UI**: Efficient state management and flat list rendering for history and notifications.

## 🛡️ Security & Privacy

We prioritize a respectful and secure community:

- **Privacy Policy**: Location data is used exclusively for real-time routing and live tracking. Personal data is never sold to third parties.
- **Secure Authentication**: Uses Clerk SDK for industry-standard user authentication and identity management.
- **Profanity Filter**: Robust blocking of abusive, insulting, or inappropriate language.
- **Anti-Spam**: Automatic blocking of links and URLs in community posts.
- **Rate Limiting**: Users are limited to one post every 5 minutes to prevent spamming.

## 🌐 Platform Support & Web Compatibility

The app is fully optimized for **Android, iOS, and Web** (React 19):

- **Hybrid Map Engine**: Implemented a custom `MapViewWrapper` that uses `react-native-maps` on mobile and a robust **Leaflet.js + Iframe bridge** on the web to ensure identical route rendering without version conflicts.
- **Platform Wrappers**: Created safe wrappers for `SecureStore` (localStorage fallback) and `Notifications` to ensure zero-crash stability across all environments.
- **Resolution Mastery**: Responsive layouts and polyfills (e.g., `setImmediate`) ensure a perfect pixel-perfect experience on high-density mobile screens and desktop browsers alike.

## 🛠️ Technical Stack

- **Framework**: [Expo](https://expo.dev) (SDK 54) / [React Native](https://reactnative.dev)
  - Leverages the Expo ecosystem for rapid development and cross-platform consistency. The app uses SDK 54 features like the New Architecture for enhanced performance.
- **React Version**: 19.1.0
  - Utilizes the latest React features and concurrent rendering. Compatibility across platforms is maintained through custom polyfills and platform-specific shims.
- **Navigation**: Expo Router (File-based routing)
  - Implements a modern, URL-friendly navigation system that mirrors the project's file structure, making deep-linking and web navigation seamless.
- **Map Engine**: React Native Maps (Mobile) & Leaflet.js (Web Bridge)
  - A hybrid approach that uses Google/Apple Maps on mobile for native performance, and a custom Leaflet.js-powered iframe bridge on web to display identical routes and markers without library conflicts.
- **Authentication**: [Clerk](https://clerk.com)
  - Provides enterprise-grade identity management, supporting secure sign-ins, profile management, and token caching across all platforms.
- **Routing API**: Open Source Routing Machine (OSRM)
  - Powers the core navigation logic by calculating multi-modal routes (walking and transit) with custom heuristics for local city commuting.
- **State Management**: React Hooks & Centralized Notification Observer Service
  - Uses a lightweight, reactive state system combined with a custom observer service to handle real-time community updates and notification syncing.

## 🏗️ Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Start the App**:

   - **Standard**: `npx expo start`
   - **Web (Bypass Network)**: `npm run web:offline`
   - **Mobile**: Press `a` for Android or `i` for iOS in the terminal.

---

_Built for better, smarter, and safer commuting._
