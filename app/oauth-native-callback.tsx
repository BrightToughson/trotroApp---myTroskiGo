import { View, ActivityIndicator } from 'react-native';

export default function OAuthNativeCallback() {
  // Clerk's ClerkProvider or startOAuthFlow will intercept the URL and process it.
  // This file simply ensures Expo Router doesn't show a "Page Not Found" (404) error
  // while the redirect is being processed.
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
