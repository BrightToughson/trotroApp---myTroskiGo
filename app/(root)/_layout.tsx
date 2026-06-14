import { useAuth } from "@clerk/expo";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { useTheme, LightColors } from "../../context/ThemeContext";

/**
 * Main Authenticated Layout: Handles session protection for the (root) route group.
 */
const RootLayout = () => {
  const { isSignedIn } = useAuth(); // Auth status from Clerk
  const { colors } = useTheme();

  // Redirect to sign-in if the user is not authenticated
  useEffect(() => {
    if (isSignedIn === false) {
      router.replace("/(auth)/sign-in");
    }
  }, [isSignedIn]);

  // Prevent flicker while checking auth status
  if (isSignedIn === false) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Tab bar navigation */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
      {/* Isolated detail screens */}
      <Stack.Screen name="find-ride" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="profile" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="about" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
};

export default RootLayout;