import { ms } from '../../lib/metrics';
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { WebIcon } from "../../components/WebIcon";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import InputField from "../../components/InputField";
import { ProcessingModal } from "../../components/ProcessingModal";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from
"react-native-reanimated";

/**
 * Profile Screen: Optimized for Web, iOS, and Android.
 * Fixed navigation and modal visibility issues.
 */
const Profile = () => {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { isDark, colors } = useTheme();

  // UI States
  const [updating, setUpdating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [newName, setNewName] = useState(user?.fullName || "");
  const [newEmail, setNewEmail] = useState(
    user?.primaryEmailAddress?.emailAddress || "",
  );
  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");

  const handleError = (e: any) => {
    let errorMsg = e.errors ? e.errors[0].message : t('failed_to_update');
    if (errorMsg.toLowerCase().includes("reverification")) {
      errorMsg = t('reverification_required_msg', 'For security reasons, please log out and log back in to update your profile.');
    }
    if (Platform.OS === "web") alert(errorMsg);
    else Alert.alert(t('error'), errorMsg);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(root)/(tabs)/home");
    }
  };

  const handleLogout = () => {
    const logoutAction = async () => {
      try {
        setUpdating(true);
        setSuccessMessage(t('signing_out', 'Signing out...'));
        await signOut();
        router.replace("/(auth)/sign-in");
      } catch (e) {
        setUpdating(false);
        setSuccessMessage("");
        console.error("Logout error", e);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(t('logout_confirm'))) {
        logoutAction();
      }
    } else {
      Alert.alert(t('logout'), t('logout_confirm'), [
        { text: t('cancel'), style: "cancel" },
        { text: t('logout'), style: "destructive", onPress: logoutAction },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    const deleteAction = async () => {
      try {
        setUpdating(true);
        await user?.delete();
        router.replace("/(auth)/sign-in");
      } catch (e: any) {
        setUpdating(false);
        handleError(e);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to completely delete your account? This action cannot be undone.")) {
        deleteAction();
      }
    } else {
      Alert.alert(
        "Delete Account",
        "Are you sure you want to completely delete your account? This action cannot be undone.",
        [
          { text: t('cancel'), style: "cancel" },
          { text: "Delete Account", style: "destructive", onPress: deleteAction },
        ]
      );
    }
  };

  const onEditImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUpdating(true);
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await user?.setProfileImage({ file: base64 });
        if (Platform.OS === "web") alert(t('profile_pic_updated'));
        else Alert.alert(t('success'), t('profile_pic_updated'));
      }
    } catch (e: any) {
      handleError(e);
    } finally {
      setUpdating(false);
    }
  };

  const onUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      setUpdating(true);
      const parts = newName.trim().split(" ");
      await user?.update({
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
      });
      setModalVisible(false);
      if (Platform.OS === "web") alert(t('profile_updated'));
      else Alert.alert(t('success'), t('profile_updated'));
    } catch (e: any) {
      handleError(e);
    } finally {
      setUpdating(false);
    }
  };

  const onUpdateUsername = async () => {
    if (!newUsername.trim()) return;
    try {
      setUpdating(true);
      await user?.update({
        username: newUsername.trim(),
      });
      setUsernameModalVisible(false);
      if (Platform.OS === "web") alert(t('profile_updated'));
      else Alert.alert(t('success'), t('profile_updated'));
    } catch (e: any) {
      handleError(e);
    } finally {
      setUpdating(false);
    }
  };

  const onUpdateEmail = async () => {
    const emailToUse = newEmail.trim().toLowerCase();
    if (!emailToUse || emailToUse === user?.primaryEmailAddress?.emailAddress) {
      setEmailModalVisible(false);
      return;
    }

    try {
      setUpdating(true);
      await user?.createEmailAddress({ email: emailToUse });
      setEmailModalVisible(false);
      const msg = t('verification_email_sent', { email: emailToUse });
      if (Platform.OS === "web") alert(msg);
      else Alert.alert(t('success'), msg);
    } catch (err: any) {
      handleError(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleClearCache = async () => {
    const clearAction = async () => {
      try {
        setUpdating(true);
        await AsyncStorage.clear();
        if (Platform.OS === 'web') alert(t('cache_cleared', 'App cache has been cleared successfully.'));
        else Alert.alert(t('success'), t('cache_cleared', 'App cache has been cleared successfully.'));
      } catch (e) {
        if (Platform.OS === 'web') alert(t('failed_to_clear_cache', 'Failed to clear cache.'));
        else Alert.alert(t('error'), t('failed_to_clear_cache', 'Failed to clear cache.'));
      } finally {
        setUpdating(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(t('clear_cache_confirm', 'Are you sure you want to clear all local app data and cache?'))) {
        clearAction();
      }
    } else {
      Alert.alert(t('clear_cache', 'Clear Cache'), t('clear_cache_confirm', 'Are you sure you want to clear all local app data and cache?'), [
        { text: t('cancel'), style: "cancel" },
        { text: t('clear', 'Clear'), style: "destructive", onPress: clearAction },
      ]);
    }
  };

  const SettingsItem = ({ icon, label, value, color, onPress }: any) => {
    const iconColor = color || (isDark ? colors.text : "#1a1a1a");
    return (
      <TouchableOpacity
        activeOpacity={0.6}
        style={[styles.itemContainer, { borderBottomColor: colors.border }]}
        onPress={onPress}
      >
        <View style={[styles.iconWrapper, { backgroundColor: iconColor + "15" }]}>
          <WebIcon name={icon} size= {22} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.itemLabel, { color: colors.text }]}>{label}</Text>
          {value && <Text style={[styles.itemValue, { color: colors.textSecondary }]}>{value}</Text>}
        </View>
        <WebIcon name="chevron-forward" size= {18} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.background, isDark ? "#0f172a" : "#f0f4ff", isDark ? "#020617" : "#e0e7ff"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff", borderColor: colors.border, borderWidth: 1 }]}>
            <WebIcon name="arrow-back" size= {24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerMainTitle, { color: colors.text }]}>{t('account')}</Text>
          <View style={{ width: ms(44) }} />
        </View>

        <ProcessingModal 
          visible={updating || !!successMessage} 
          message={successMessage || t('processing', 'Processing...')} 
          isSuccess={!!successMessage && successMessage !== t('signing_out', 'Signing out...')} 
        />

        <ScrollView showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Animated.View entering={ZoomIn.delay(200).duration(800).springify()} style={styles.avatarWrapper}>
              <Image source={{ uri: user?.imageUrl }} style={[styles.avatar, { borderColor: colors.border, borderWidth: ms(2) }]} />
              <TouchableOpacity style={[styles.editBadge, { backgroundColor: colors.primary }]} onPress={onEditImage}>
                <WebIcon name="camera" size= {16} color="#FFF" />
              </TouchableOpacity>
            </Animated.View>
            <Animated.Text entering={FadeInUp.delay(400).duration(800).springify()} style={[styles.userName, { color: colors.text }]}>{user?.fullName || t('traveler')}</Animated.Text>
            <Animated.Text entering={FadeInUp.delay(500).duration(800).springify()} style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.primaryEmailAddress?.emailAddress}</Animated.Text>
          </View>

          <Animated.View entering={FadeInDown.delay(600).duration(800).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('identity')}</Text>
            <View style={[styles.card, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)", borderColor: colors.border }]}>
              <SettingsItem icon="person-outline" label={t('full_name')} value={user?.fullName} onPress={() => setModalVisible(true)} />
              <SettingsItem icon="at-outline" label={t('username')} value={user?.username || t('not_set')} onPress={() => setUsernameModalVisible(true)} />
              <SettingsItem icon="mail-outline" label={t('email')} value={user?.primaryEmailAddress?.emailAddress} onPress={() => setEmailModalVisible(true)} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(700).duration(800).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('language')}</Text>
            <View style={[styles.card, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)", borderColor: colors.border }]}>
               <SettingsItem 
                  icon="globe-outline" 
                  label={i18n.language === 'en' ? t('french') : t('english')} 
                  onPress={() => {
                    const nextLang = i18n.language === 'en' ? 'fr' : 'en';
                    i18n.changeLanguage(nextLang);
                  }} 
                  value={i18n.language.toUpperCase()}
               />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(750).duration(800).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('get_app', 'Get Native App')}</Text>
            <View style={[styles.card, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)", borderColor: colors.border }]}>
               <SettingsItem 
                  icon="logo-android" 
                  label={t('download_android_apk', 'Download Android APK')} 
                  onPress={() => Linking.openURL('https://expo.dev/artifacts/eas/PdmETQdkqhniYTf9zvRWRxXUqZ3ltzEgGFQ0zGuSHYE.apk')} 
                  color="#10B981"
               />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(800).duration(800).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('app_settings', 'App Settings')}</Text>
            <View style={[styles.card, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)", borderColor: colors.border }]}>
              <SettingsItem icon="shield-checkmark-outline" label={t('about_privacy')} onPress={() => router.push("/(root)/about")} />
              <SettingsItem icon="trash-outline" label={t('clear_cache', 'Clear App Cache')} onPress={handleClearCache} color="#EF4444" />
              <SettingsItem icon="warning-outline" label="Delete Account" onPress={handleDeleteAccount} color="#EF4444" />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(900).duration(800).springify()}>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#fff", borderColor: isDark ? "#ef444433" : "#FEE2E2" }]} onPress={handleLogout}>
              <WebIcon name="log-out-outline" size= {20} color="#EF4444" />
              <Text style={styles.logoutText}>{t('logout')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        <Modal visible={modalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('update_name')}</Text>
                <InputField label={t('full_name')} value={newName} onChangeText={setNewName} />
                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.btn, { backgroundColor: colors.border }]}><Text style={{color: colors.text}}>{t('cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={onUpdateName} style={[styles.btn, { backgroundColor: colors.primary }]}><Text style={{color: "#fff"}}>{t('save')}</Text></TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal visible={emailModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('update_email', 'Update Email')}</Text>
                <InputField label={t('email', 'Email')} value={newEmail} onChangeText={setNewEmail} />
                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setEmailModalVisible(false)} style={[styles.btn, { backgroundColor: colors.border }]}><Text style={{color: colors.text}}>{t('cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={onUpdateEmail} style={[styles.btn, { backgroundColor: colors.primary }]}><Text style={{color: "#fff"}}>{t('update_email')}</Text></TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal visible={usernameModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('update_username')}</Text>
                <InputField label={t('username')} value={newUsername} onChangeText={setNewUsername} />
                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setUsernameModalVisible(false)} style={[styles.btn, { backgroundColor: colors.border }]}><Text style={{color: colors.text}}>{t('cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={onUpdateUsername} style={[styles.btn, { backgroundColor: colors.primary }]}><Text style={{color: "#fff"}}>{t('save')}</Text></TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: ms(20) },
  backButton: { width: ms(44), height: ms(44), borderRadius: ms(12), justifyContent: "center", alignItems: "center" },
  headerMainTitle: { fontSize: ms(18), fontWeight: "bold" },
  header: { alignItems: "center", paddingVertical: ms(30) },
  avatarWrapper: { position: "relative", marginBottom: ms(15) },
  avatar: { width: ms(100), height: ms(100), borderRadius: ms(50) },
  editBadge: { position: "absolute", bottom: 0, right: 0, width: ms(32), height: ms(32), borderRadius: ms(16), justifyContent: "center", alignItems: "center", borderWidth: ms(2), borderColor: "#fff" },
  userName: { fontSize: ms(20), fontWeight: "bold" },
  userEmail: { fontSize: ms(16), opacity: 0.7 },
  section: { paddingHorizontal: ms(20), marginTop: ms(20) },
  sectionTitle: { fontSize: ms(15), fontWeight: "bold", textTransform: "uppercase", marginBottom: ms(10) },
  card: { borderRadius: ms(15), overflow: "hidden", borderWidth: 1 },
  itemContainer: { flexDirection: "row", alignItems: "center", padding: ms(15), borderBottomWidth: 1 },
  iconWrapper: { width: ms(40), height: ms(40), borderRadius: ms(10), justifyContent: "center", alignItems: "center", marginRight: ms(15) },
  textContainer: { flex: 1 },
  itemLabel: { fontSize: ms(18), fontWeight: "600" },
  itemValue: { fontSize: ms(15), opacity: 0.6 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", margin: ms(20), padding: ms(15), borderRadius: ms(15), borderWidth: 1 },
  logoutText: { marginLeft: ms(10), color: "#EF4444", fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: ms(20) },
  modalContent: { borderRadius: ms(20), padding: ms(20), alignItems: "center" },
  modalTitle: { fontSize: ms(20), fontWeight: "bold", marginBottom: ms(15) },
  modalButtons: { flexDirection: "row", gap: ms(10), marginTop: ms(20), width: "100%" },
  btn: { flex: 1, height: ms(52), borderRadius: ms(14), justifyContent: "center", alignItems: "center" },
});

export default Profile;
