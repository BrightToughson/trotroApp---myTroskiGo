import { ms } from '../../lib/metrics';
import { CustomButton } from "@/components/customButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { ProcessingModal } from "@/components/ProcessingModal";
import { WebIcon } from "@/components/WebIcon";
import { useTheme, LightColors } from "@/context/ThemeContext";
import { useSignUp } from "@clerk/expo";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as React from
"react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { isLoaded, signUp } = useSignUp();
  const router = useRouter();
  const { colors, isDark } = useTheme();

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

  const [form, setForm] = React.useState({
    username: "",
    email: "",
  });

  const [loading, setLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [isOAuthLoading, setIsOAuthLoading] = React.useState(false);

  const validate = () => {
    if (!form.email || !form.username) {
      Alert.alert(
        t("validation_error", "Validation Error"),
        t("fill_required_fields", "Please fill out username and email."),
      );
      return false;
    }
    return true;
  };

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    if (!validate()) return;
    setLoading(true);

    try {
      await signUp.create({
        username: form.username,
        emailAddress: form.email,
      });

      // Fire and forget email verification to cut perceived loading time in half
      signUp
        .prepareEmailAddressVerification({ strategy: "email_code" })
        .catch(console.error);

      setSuccessMessage(t('account_created', 'Account Created!'));
      setTimeout(() => {
        setSuccessMessage("");
        setLoading(false);
        router.push({
          pathname: "/(auth)/verify-email",
          params: { email: form.email },
        });
      }, 1500);
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      const errorCode = err.errors?.[0]?.code;

      if (errorCode === "form_identifier_exists") {
        const message = t(
          "email_in_use",
          "This email is already in use. Would you like to sign in instead?",
        );
        if (Platform.OS === "web") {
          if (window.confirm(message)) {
            router.replace("/(auth)/sign-in");
          }
        } else {
          Alert.alert(t("account_exists", "Account Exists"), message, [
            { text: t("cancel", "Cancel") || "Cancel", style: "cancel" },
            {
              text: t("sign_in_btn", "Sign In") || "Sign In",
              onPress: () => router.replace("/(auth)/sign-in"),
            },
          ]);
        }
      } else if (errorCode === "form_username_invalid_character") {
        Alert.alert(
          t("invalid_username", "Invalid Username"),
          t(
            "username_invalid_char_msg",
            "Usernames cannot contain spaces or special characters (like @ or .). Please use only letters, numbers, hyphens (-), or underscores (_).",
          ),
        );
      } else {
        Alert.alert(
          t("error", "Error"),
          err.errors
            ? err.errors[0].message
            : t("generic_signup_error", "An error occurred during sign up"),
        );
      }
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProcessingModal 
        visible={loading || isOAuthLoading || !!successMessage} 
        message={successMessage || t('creating_account', 'Creating Account...')} 
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
              top: ms(-80),
              right: ms(-80),
              width: ms(400),
              height: ms(400),
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
              bottom: ms(-50),
              left: ms(-100),
              width: ms(350),
              height: ms(350),
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
              right: ms(-100),
              width: ms(200),
              height: ms(200),
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
              left: ms(-50),
              width: ms(150),
              height: ms(150),
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
            style={{ position: 'absolute', top: ms(40), left: ms(40), zIndex: 100, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => window.location.href = __DEV__ ? 'http://localhost:5173/' : 'https://mytroski-go-website.vercel.app/'}
          >
            <WebIcon name="arrow-back" size= {24} color={colors.text} />
            <Text style={{ marginLeft: ms(8), color: colors.text, fontWeight: '600', fontSize: ms(16) }}>Back to Website</Text>
          </TouchableOpacity>
        )}
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
            {t("signUp", "Create Account")}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(400).duration(1000).springify()}
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            {t(
              "get_started_nicer",
              "Join our community and enjoy a seamless travel experience.",
            )}
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
          <Animated.View
            entering={FadeInUp.delay(650).duration(800).springify()}
            style={{ marginBottom: ms(16) }}
          >
            <InputField
              label={t("username")}
              value={form.username}
              onChangeText={(text) => setForm({ ...form, username: text })}
              autoCapitalize="none"
            />
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(700).duration(800).springify()}
            style={{ marginBottom: ms(16) }}
          >
            <InputField
              label={t("email")}
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Animated.View>

          <CustomButton
            title={t("sign_up_btn")}
            onPress={onSignUpPress}
            containerStyle={styles.button}
            disabled={isOAuthLoading}
          />

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
              {t("continue_with")}
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

          <OAuth
            authMode="sign-up"
            disabled={loading}
            onOAuthLoading={setIsOAuthLoading}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t("already_have_account")}{" "}
            </Text>
            <Link href="/(auth)/sign-in">
              <Text style={[styles.link, { color: colors.primary }]}>
                {t("sign_in_btn")}
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
    paddingHorizontal: ms(24),
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: ms(40),
  },
  header: {
    marginBottom: ms(40),
    alignItems: "center",
  },
  logoContainer: {
    width: ms(200),
    height: ms(120),
    borderRadius: ms(24),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ms(24),
    shadowOffset: { width: 0, height: ms(10) },
    shadowOpacity: 0.2,
    shadowRadius: ms(20),
    elevation: 10,
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: ms(38),
    fontWeight: "800",
    marginBottom: ms(10),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: ms(18),
    lineHeight: ms(24),
    textAlign: "center",
    paddingHorizontal: ms(20),
  },
  button: {
    marginTop: ms(10),
    marginBottom: ms(16),
  },
  formCard: {
    borderRadius: ms(32),
    padding: ms(24),
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: ms(10) },
    shadowOpacity: 0.1,
    shadowRadius: ms(20),
    elevation: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: ms(8),
    marginBottom: 0,
  },
  footerText: {
    fontSize: ms(16),
  },
  link: {
    fontSize: ms(16),
    fontWeight: "600",
  },
  decorativeCircle: {
    position: "absolute",
    width: ms(300),
    height: ms(300),
    borderRadius: ms(150),
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: ms(20),
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: ms(16),
    fontSize: ms(15),
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  }
});
