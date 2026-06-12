import { CodeInput } from "@/components/CodeInput";
import { CustomButton } from "@/components/customButton";
import { useTheme, LightColors } from "@/context/ThemeContext";
import { useSignUp } from "@clerk/clerk-expo";
import { WebIcon } from "@/components/WebIcon";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * VerifyEmail Screen: Final step of the registration flow.
 * Collects the 6-digit OTP from the user to activate their Clerk account.
 */
export default function VerifyEmail() {
  const { t } = useTranslation();
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const logoScale = useSharedValue(0.8);
  const drift1 = useSharedValue(0);
  const drift2 = useSharedValue(0);

  React.useEffect(() => {
    logoScale.value = withSpring(1);
    drift1.value = withRepeat(withTiming(20, { duration: 5000 }), -1, true);
    drift2.value = withRepeat(withTiming(-15, { duration: 7000 }), -1, true);
  }, [logoScale, drift1, drift2]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const animatedDrift1 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift1.value }, { translateY: drift2.value }],
  }));

  const animatedDrift2 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift2.value }, { translateY: drift1.value }],
  }));

  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-submit verification code when it reaches 6 digits
  React.useEffect(() => {
    if (code.length === 6 && !loading) {
      onVerifyPress();
    }
  }, [code]);

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setLoading(true);

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace({ pathname: "/(root)/(tabs)/home", params: { signup: "true" } });
      } else {
        Alert.alert(t('error', 'Error'), t('verification_failed', 'Verification failed. Please try again.'));
      }
    } catch (err: any) {
      Alert.alert(
        t('error', 'Error'),
        err.errors
          ? err.errors[0].message
          : t('verification_error', 'An error occurred during verification'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[
          colors.background,
          isDark ? "#0f172a" : "#f0f4ff",
          isDark ? "#020617" : "#e0e7ff",
        ]}
        style={StyleSheet.absoluteFill}
      />
      {/* Background Decorative Elements */}
      <View
        style={[StyleSheet.absoluteFill, { alignItems: "center" }]}
        pointerEvents="none"
      >
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift1,
            {
              backgroundColor: "#1A2433",
              top: -50,
              right: -50,
              opacity: isDark ? 0.8 : 0.4,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift2,
            {
              backgroundColor: "#FFD700",
              bottom: 100,
              left: -80,
              width: 250,
              height: 250,
              opacity: isDark ? 0.8 : 0.4,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift1,
            {
              backgroundColor: "#1A2433",
              bottom: 50,
              right: 30,
              width: 80,
              height: 80,
              opacity: isDark ? 0.8 : 0.4,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift2,
            {
              backgroundColor: "#FFD700",
              top: 250,
              left: -30,
              width: 60,
              height: 60,
              opacity: isDark ? 0.8 : 0.4,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift1,
            {
              backgroundColor: "#1A2433",
              top: 450,
              right: -50,
              width: 150,
              height: 150,
              opacity: isDark ? 0.8 : 0.4,
            },
          ]}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.closeButton,
          {
            top: Math.max(insets.top, 16),
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(255, 255, 255, 0.8)",
          },
        ]}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(auth)/sign-in");
          }
        }}
      >
        <WebIcon name="close" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top + 60, 80) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(1000).springify()}
          style={styles.header}
        >
          <Animated.View
            style={[
              styles.logoContainer,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(255, 255, 255, 0.6)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.05)",
                borderWidth: 1,
              },
              animatedLogoStyle,
            ]}
          >
            <Image
              source={require("@/assets/logo/mytroski_display.png")}
              style={styles.logo}
              resizeMode="cover"
            />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.delay(200).duration(1000).springify()}
            style={[styles.title, { color: colors.text }]}
          >
            {t('verify_email', 'Verify Email')}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(400).duration(1000).springify()}
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            {t('enter_code_sent_to', 'Enter the code sent to')} {email}
          </Animated.Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(600).duration(1000).springify()}
          style={[
            styles.formCard,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(255, 255, 255, 0.7)",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
            },
          ]}
        >
          <CodeInput value={code} onChangeText={setCode} length={6} />

          <CustomButton
            title={t('verify', 'Verify')}
            onPress={onVerifyPress}
            loading={loading}
            containerStyle={styles.button}
          />
          {loading && (
            <Animated.Text 
              entering={FadeInDown.duration(400)}
              style={[styles.loadingText, { color: colors.primary }]}
            >
              {t('please_wait', 'Please wait...')}
            </Animated.Text>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    padding: 10,
    borderRadius: 24,
  },
  logoContainer: {
    width: 200,
    height: 120,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
    marginBottom: 0,
  },
  formCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  decorativeCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
});
