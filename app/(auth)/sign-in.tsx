import { useTranslation } from "react-i18next";
import { CodeInput } from "@/components/CodeInput";
import { CustomButton } from "@/components/customButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { ProcessingModal } from "@/components/ProcessingModal";
import { useTheme, LightColors } from "@/context/ThemeContext";
import { useSignIn } from "@clerk/expo";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View, Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebIcon } from "@/components/WebIcon";
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from "react-native-reanimated";

export default function SignIn() {
  const { t } = useTranslation();
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const logoScale = useSharedValue(0.8);
  const drift1 = useSharedValue(0);
  const drift2 = useSharedValue(0);
  const drift3 = useSharedValue(0);
  const drift4 = useSharedValue(0);

  React.useEffect(() => {
    logoScale.value = withSpring(1);
    // Disable heavy continuous drift animations to improve mobile performance
    drift1.value = 0;
    drift2.value = 0;
    drift3.value = 0;
    drift4.value = 0;
  }, [logoScale, drift1, drift2, drift3, drift4]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const animatedDrift1 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift1.value }, { translateY: drift2.value }],
  }));

  const animatedDrift2 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift2.value }, { translateY: drift3.value }],
  }));

  const animatedDrift3 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift3.value }, { translateY: drift4.value }],
  }));

  const animatedDrift4 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift4.value }, { translateY: drift1.value }],
  }));

  const [form, setForm] = useState({
    identifier: "",
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [code, setCode] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setLoading(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: form.identifier,
      });

      if (signInAttempt.status === "needs_first_factor") {
        const emailCodeFactor = signInAttempt.supportedFirstFactors?.find(
          (factor: any) => factor.strategy === "email_code",
        ) as any;

        if (emailCodeFactor) {
          await signIn.prepareFirstFactor({ 
            strategy: "email_code", 
            emailAddressId: emailCodeFactor.emailAddressId 
          });
          setNeedsOtp(true);
          setLoading(false);
        } else {
          Alert.alert(t('error', 'Error'), t('no_email_strategy', 'No email verification strategy found for this user.'));
          setLoading(false);
        }
      } else if (signInAttempt.status === "complete") {
        setSuccessMessage(t('login_success', 'Sign In Successful!'));
        setTimeout(async () => {
          await setActive({ session: signInAttempt.createdSessionId });
          router.replace({ pathname: "/(root)/(tabs)/home", params: { login: "true" } });
        }, 100);
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        Alert.alert(t('error', 'Error'), t('unable_passwordless', 'Unable to start passwordless sign-in.'));
        setLoading(false);
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      
      const hasAccountNotFoundError = err?.errors?.some(
        (e: any) => e.code === "form_identifier_not_found"
      );

      if (hasAccountNotFoundError) {
        const message = t('email_not_found_msg', "We couldn't find an account with that email. Would you like to create one?");
        if (Platform.OS === 'web') {
          if (window.confirm(message)) {
            router.push("/(auth)/sign-up");
          }
        } else {
          Alert.alert(
            t('account_not_found', 'Account Not Found'),
            message,
            [
              { text: t('try_again', 'Try Again'), style: "cancel" },
              {
                text: t('signUp', 'Sign Up'),
                onPress: () => router.push("/(auth)/sign-up"),
              },
            ]
          );
        }
      } else {
        Alert.alert(
          t('error', 'Error'),
          err.errors ? err.errors[0].message : t('error_occurred', 'An error occurred'),
        );
      }
      setLoading(false);
    }
  };
  // Auto-submit OTP when code reaches 6 digits
  React.useEffect(() => {
    if (needsOtp && code.length === 6 && !loading) {
      handleVerifyOtp();
    }
  }, [code, needsOtp]);

  const handleVerifyOtp = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (attempt.status === "complete") {
        setSuccessMessage(t('login_success', 'Verification Successful!'));
        setTimeout(async () => {
          await setActive({ session: attempt.createdSessionId });
          router.replace({ pathname: "/(root)/(tabs)/home", params: { login: "true" } });
        }, 100);
      } else {
        console.error(JSON.stringify(attempt, null, 2));
        Alert.alert(t('error', 'Error'), t('mfa_failed', 'MFA Verification failed.'));
        setLoading(false);
      }
    } catch (err: any) {
       Alert.alert(t('error', 'Error'), err.errors ? err.errors[0].message : t('mfa_failed', 'MFA Verification failed.'));
       setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProcessingModal 
        visible={loading || isOAuthLoading || !!successMessage} 
        message={successMessage || t('signing_in', 'Signing you in...')} 
        isSuccess={!!successMessage} 
      />
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
              backgroundColor: "#0286FF",
              top: -80,
              right: -80,
              width: 400,
              height: 400,
              opacity: isDark ? 0.5 : 0.25,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift2,
            {
              backgroundColor: "#FFD700",
              bottom: -50,
              left: -100,
              width: 350,
              height: 350,
              opacity: isDark ? 0.5 : 0.25,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift3,
            {
              backgroundColor: "#0286FF",
              top: "30%",
              right: -100,
              width: 200,
              height: 200,
              opacity: isDark ? 0.5 : 0.25,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift4,
            {
              backgroundColor: "#FFD700",
              bottom: "40%",
              left: -50,
              width: 150,
              height: 150,
              opacity: isDark ? 0.5 : 0.25,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {Platform.OS === 'web' && (
          <TouchableOpacity 
            style={{ position: 'absolute', top: 40, left: 40, zIndex: 100, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => window.location.href = __DEV__ ? 'http://localhost:5173/' : 'https://mytroski-go-website.vercel.app/'}
          >
            <WebIcon name="arrow-back" size= {24} color={colors.text} />
            <Text style={{ marginLeft: 8, color: colors.text, fontWeight: '600', fontSize: 16 }}>Back to Website</Text>
          </TouchableOpacity>
        )}
        <Animated.View
          entering={FadeInDown.duration(1000).springify()}
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top + 40, 60) }
          ]}
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
            {t('welcome_back')}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(400).duration(1000).springify()}
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            {t('sign_in_msg')}
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
          {needsOtp ? (
            <Animated.View entering={FadeInUp.delay(700).duration(800).springify()}>
              <Text style={{ fontSize: 18, textAlign: "center", marginBottom: 20, color: colors.text }}>
                {t('enter_code_msg')}
              </Text>
              <CodeInput value={code} onChangeText={setCode} length={6} />
              <CustomButton
                title={t('verify_code_btn')}
                onPress={handleVerifyOtp}
                loading={loading}
                containerStyle={styles.button}
              />
              <CustomButton
                title={t('back_to_signin')}
                onPress={() => { setNeedsOtp(false); setCode(""); }}
                containerStyle={{ backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border, marginTop: 8 }}
                textStyle={{ color: colors.text }}
              />
            </Animated.View>
          ) : (
            <>
              <Animated.View
                entering={FadeInDown.delay(700).duration(800).springify()}
              >
                <InputField
                  label={t('email_username')}
                  value={form.identifier}
                  onChangeText={(text) => setForm({ ...form, identifier: text })}
                  autoCapitalize="none"
                />
              </Animated.View>


              <Animated.View
                entering={FadeInUp.delay(1000).duration(800).springify()}
              >
                <CustomButton
                  title={t('sign_in_btn')}
                  onPress={onSignInPress}
                  containerStyle={styles.button}
                  disabled={isOAuthLoading}
                />
              </Animated.View>
            </>
          )}

          <View style={styles.dividerContainer}>
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
              {t('continue_with')}
            </Text>
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            />
          </View>
 
          <OAuth authMode="sign-in" disabled={loading} onOAuthLoading={setIsOAuthLoading} />
 
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t('no_account')}{" "}
            </Text>
            <Link href="/(auth)/sign-up">
              <Text style={[styles.link, { color: colors.primary }]}>
                {t('sign_up_btn')}
              </Text>
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
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
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  button: {
    marginTop: 10,
    marginBottom: 16,
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 0,
  },
  footerText: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    fontWeight: "600",
  },
  decorativeCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 15,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  }
});
