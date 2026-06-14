import { useAuth } from '@clerk/expo'
import { Redirect, Stack } from 'expo-router'

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Redirect href={'/(root)/(tabs)/home'} />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot" options={{ presentation: 'modal' }} />
      <Stack.Screen name="verify-email" options={{ presentation: 'modal' }} />
    </Stack>
  )
}