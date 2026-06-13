import { ms } from '../lib/metrics';
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { SecureStoreWrapper as SecureStore } from "../lib/SecureStoreWrapper";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { WebIcon } from "@/components/WebIcon";
import { useTranslation } from
"react-i18next";

const SPLASH_MIN_DURATION = 5000;

/**
 * Index: The initial entry route that handles redirection logic.
 * Displays an advanced animated splash screen while checking session status.
 */
const Index = () => {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded } = useAuth();
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const [splashFinished, setSplashFinished] = useState(Platform.OS === 'web');

  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const loaderWidth = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Initial entrance and subsequent infinite pulse for the logo
      scale.value = withSpring(1, { damping: 12, stiffness: 100 }, () => {
        scale.value = withRepeat(
          withSequence(
            withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      });

      opacity.value = withTiming(1, { duration: 800 });
      
      // Simulate loading progress bar filling over the duration of the splash
      loaderWidth.value = withTiming(200, { 
        duration: SPLASH_MIN_DURATION, 
        easing: Easing.bezier(0.25, 0.1, 0.25, 1) 
      });
    }
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const animatedLoaderStyle = useAnimatedStyle(() => {
    return {
      width: loaderWidth.value,
    };
  });

  useEffect(() => {
    const checkWelcome = async () => {
      const value = await SecureStore.getItemAsync("hasSeenWelcome");
      setHasSeenWelcome(value === "true");
    };
    checkWelcome();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const timer = setTimeout(() => {
        setSplashFinished(true);
      }, SPLASH_MIN_DURATION);
      return () => clearTimeout(timer);
    }
  }, []);

  // Show splash until all data loads and the minimum splash duration has elapsed
  if (!isLoaded || hasSeenWelcome === null || !splashFinished) {
    return (
      <View style={[styles.container, { backgroundColor: "#111827" }]}>
        <View style={styles.content}>
          <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
            <Image 
              source={require('../assets/logo/mytroskigo.png')} 
              style={styles.logoImage} 
              resizeMode="contain"
            />
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(400).springify().damping(12)}>
            <Text style={styles.title}>{t('app_name', 'myTroski Go')}</Text>
            <Text style={styles.subtitle}>{t('app_subtitle', 'Smart Transit for the City')}</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.loaderTrack}>
            <Animated.View style={[styles.loaderFill, animatedLoaderStyle]} />
          </View>
        </View>
      </View>
    );
  }
  
  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)/home" />;
  }



  if (hasSeenWelcome) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(auth)/welcome" />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: ms(24),
    shadowColor: "#FBBF24",
    shadowOffset: {
      width: 0,
      height: ms(10),
    },
    shadowOpacity: 0.2,
    shadowRadius: ms(30),
    elevation: 15,
  },
  logoImage: {
    width: ms(120),
    height: ms(120),
    borderRadius: ms(30),
  },
  title: {
    fontFamily: "PlusJakartaSans-ExtraBold",
    fontSize: ms(42),
    color: "#F9FAFB",
    textAlign: "center",
    marginBottom: ms(8),
  },
  subtitle: {
    fontFamily: "PlusJakartaSans-Medium",
    fontSize: ms(16),
    color: "#9CA3AF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  footer: {
    paddingBottom: ms(60),
    alignItems: "center",
  },
  loaderTrack: {
    width: ms(200),
    height: ms(4),
    backgroundColor: "#374151",
    borderRadius: ms(2),
    overflow: "hidden",
  },
  loaderFill: {
    height: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: ms(2),
  },
});

export default Index;
