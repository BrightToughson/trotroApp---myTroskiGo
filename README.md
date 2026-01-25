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

## 🛡️ Security & Moderation

We prioritize a respectful community:

- **Profanity Filter**: Robust blocking of abusive, insulting, or inappropriate language.
- **Anti-Spam**: Automatic blocking of links and URLs in community posts.
- **Rate Limiting**: Users are limited to one post every 5 minutes to prevent spamming.

## 🛠️ Technical Stack

- **Framework**: [Expo](https://expo.dev) / [React Native](https://reactnative.dev)
- **Navigation**: Expo Router (File-based routing)
- **Map Engine**: [React Native Maps](https://github.com/react-native-maps/react-native-maps) with OpenStreetMap integration
- **Authentication**: [Clerk](https://clerk.com)
- **Routing API**: Open Source Routing Machine (OSRM)
- **Geocoding**: Nominatim API
- **State Management**: React Hooks & Centralized Notification Observer Service
- **Persistence**: AsyncStorage & SecureStore

## 🏗️ Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Start the App**:

   ```bash
   npx expo start
   ```

3. **Development Build**:
   Follow the prompts to run on Android (press `a`) or iOS (press `i`).

---

_Built for better, smarter, and safer commuting._
"# trotroApp---myTroskiGo" 
