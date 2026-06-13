import { useTheme, LightColors } from "../context/ThemeContext";
import { WebIcon } from "./WebIcon";
import { useWarmUpBrowser } from "../hooks/useWarmUpBrowser";
import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Image, StyleSheet, View, Platform } from "react-native";
import { CustomButton } from "./customButton";
import { useTranslation } from "react-i18next";

WebBrowser.maybeCompleteAuthSession();

// Accept a mode so we know which screen called the OAuth button
interface OAuthProps {
  authMode?: "sign-in" | "sign-up";
  disabled?: boolean;
  onOAuthLoading?: (isLoading: boolean) => void;
}

const OAuth = ({ authMode = "sign-up", disabled = false, onOAuthLoading }: OAuthProps) => {
  const { t } = useTranslation();
  useWarmUpBrowser();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = useCallback(async () => {
    if (disabled) return;
    try {
      setIsLoading(true);
      onOAuthLoading?.(true);

      if (Platform.OS === 'web') {
        if (!signInLoaded || !signUpLoaded) return;
        
        const redirectUrl = window.location.href; 
        const redirectUrlComplete = window.location.origin + (authMode === "sign-up" ? "/home?signup=true" : "/home?login=true");

        if (authMode === "sign-in") {
          await signIn?.authenticateWithRedirect({
            strategy: "oauth_google",
            redirectUrl,
            redirectUrlComplete,
          });
        } else {
          await signUp?.authenticateWithRedirect({
            strategy: "oauth_google",
            redirectUrl,
            redirectUrlComplete,
          });
        }
        return; // Execution stops here because the browser navigates away
      }

      // Create a robust redirect URL that works across all platforms (web, native, pwa)
      const redirectUrl = Linking.createURL("/", { scheme: "trotroapp" });
      
      const { createdSessionId, setActive, signUp: su, signIn: si } =
        await startOAuthFlow({
          redirectUrl,
        });

      if (createdSessionId) {
        if (setActive) {
          await setActive({ session: createdSessionId });
        }
        router.replace({ pathname: "/(root)/(tabs)/home", params: { [authMode === "sign-up" ? "signup" : "login"]: "true" } });
      } else {
        if (si && si.status === "complete" && setActive) {
           await setActive({ session: si.createdSessionId });
           router.replace({ pathname: "/(root)/(tabs)/home", params: { login: "true" } });
        } else if (su && su.status === "complete" && setActive) {
           await setActive({ session: su.createdSessionId });
           router.replace({ pathname: "/(root)/(tabs)/home", params: { signup: "true" } });
        } else if (su && su.status === "missing_requirements") {
           // We have an incomplete Google Account Creation (missing username)
           
           if (authMode === "sign-in") {
               // User clicked Google on the "Sign In" page, but they have no account
               Alert.alert(
                 "Account Not Found",
                 "It looks like you don't have an account yet. Would you like to create one?",
                 [
                   { text: "Cancel", style: "cancel" },
                   { text: "Sign Up", onPress: () => router.replace("/(auth)/sign-up") }
                 ]
               );
               return; 
           }

           // We are legitimately trying to Sign Up! Let's fulfill the username requirement natively.
           try {
             // Grab prefix of their email if available, otherwise 'user'
             const emailAddress = su.emailAddress || "user";
             const prefix = emailAddress.split("@")[0].replace(/[^a-zA-Z0-9_\-]/g, "");
             const randomDigits = Math.floor(1000 + Math.random() * 9000);
             const autoUsername = `${prefix}_${randomDigits}`;

             const updatedSignUp = await su.update({
                username: autoUsername,
             });

             if (updatedSignUp.status === "complete" && setActive) {
                 await setActive({ session: updatedSignUp.createdSessionId });
                 router.replace({ pathname: "/(root)/(tabs)/home", params: { signup: "true" } });
             } else {
                 Alert.alert("Notice", "Profile still missing requirements. Please complete setup later.");
             }
           } catch (updateErr: any) {
               console.error("Error auto-filling username:", updateErr);
               Alert.alert("Setup Error", "We could not automatically finalize your account setup. Please try again or use email sign up.");
           }

        } else {
           Alert.alert("Notice", `OAuth returned but session isn't ready. SignIn Status: ${si?.status}, SignUp Status: ${su?.status}`);
        }
      }
    } catch (err: any) {
      console.error("OAuth error", err);

      // If the user cancels the flow, we don't need to show an error alert
      if (err.errors?.[0]?.code === "oauth_cancelled") {
        return;
      }

      const errObj = err.errors?.[0];
      const errorMessage = errObj?.longMessage || errObj?.message || err.message || (typeof err === "string" ? err : "An error occurred during Google Sign-In");

      if (errorMessage && errorMessage.toLowerCase().includes("already signed in")) {
        router.replace("/(root)/(tabs)/home");
        return;
      }

      let finalMessage = errorMessage;
      
      // Provide specific advice for common environment issues
      if (errorMessage.includes("development") || errorMessage.includes("localhost")) {
        finalMessage = "Clerk configuration error: Ensure your redirect URLs are allowed in the Clerk Dashboard for this environment.";
      }

      Alert.alert(
        t('auth_error', "Authentication Error"),
        `${finalMessage}\n\n${t('try_alternative', 'If Google sign-in persists in failing, please try using the email method instead.')}`,
      );
    } finally {
      setIsLoading(false);
      onOAuthLoading?.(false);
    }
  }, [startOAuthFlow, signIn, signUp, signInLoaded, signUpLoaded, authMode, disabled, onOAuthLoading]);

  return (
    <View style={styles.groupContainer}>
      <CustomButton
        title={t('google_sign_in')}
        onPress={handleGoogleSignIn}
        loading={isLoading}
        disabled={disabled}
        IconLeft={() => (
          <WebIcon
            name="logo-google"
            size={20}
            color="#fff" // Color is ignored for the multi-colored logo-google
            style={styles.googleIcon}
          />
        )}
        containerStyle={[
          styles.googleButtonContainer,
          {
            backgroundColor: isDark ? colors.surface : "#ffffff",
            borderColor: colors.border,
          },
        ]}
        textStyle={[styles.googleButtonText, { color: colors.text }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  groupContainer: {
    width: "100%",
    paddingHorizontal: 10,
  },
  googleButtonContainer: {
    borderWidth: 1,
    marginBottom: 20,
    shadowOpacity: 0.05,
    elevation: 1,
    minWidth: "auto",
  },
  googleButtonText: {
    fontWeight: "600",
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
});

export default OAuth;
