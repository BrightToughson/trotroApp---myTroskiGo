import { WebIcon } from "../WebIcon";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useCallback } from "react";
import {
    ImageBackground,
    Linking,
    Modal,
    Share,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ScrollView,
} from "react-native";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { styles, width } from "./styles";
import { MenuItem } from "./MenuItem";
import { useUser } from "@clerk/clerk-expo";
import { isAdminUser } from "../../constants/admins";

interface SideMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onShowTutorial: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isVisible, onClose, onShowTutorial }) => {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme, colors } = useTheme();
  const [showModal, setShowModal] = React.useState(isVisible);
  const insets = useSafeAreaInsets();
  
  const { user } = useUser();
  const isAdmin = isAdminUser(user?.primaryEmailAddress?.emailAddress, user?.id);

  const toggleLanguage = useCallback(() => {
    const nextLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(nextLang);
  }, [i18n]);

  const translateX = useSharedValue(-width * 0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      setShowModal(true);
      translateX.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateX.value = withTiming(
        -width * 0.8,
        { duration: 250 },
        (finished) => {
          if (finished) {
            runOnJS(setShowModal)(false);
          }
        },
      );
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [isVisible, opacity, translateX]);

  const animatedDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleEmail = () => {
    Linking.openURL("mailto:mytroskigo@gmail.com?subject=App Feedback");
  };

  const handleShare = async () => {
    try {
      const message = t('checkOutApp', 'Check out myTroski Go - Your smart city commute companion! 🚌');
      await Share.share({
        message,
        url: 'https://mytroskigo.com',
      });
    } catch {}
  };

  const handleWhatsApp = () => {
    const message = t('checkOutApp', 'Check out myTroski Go - Your smart city commute companion! 🚌');
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
    });
  };

  if (!showModal) return null;

  return (
    <Modal visible={showModal} transparent={true} animationType="none" onRequestClose={onClose} hardwareAccelerated={true}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
        </TouchableWithoutFeedback>

        <View style={styles.drawerContainer} pointerEvents="box-none">
          <Animated.View style={[styles.drawer, animatedDrawerStyle, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <ImageBackground
                source={require("../../assets/images/sidemenu/sidebar-image.jpg")}
                style={styles.headerImageBackground}
                resizeMode="cover"
              >
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={styles.headerGradient}>
                  <View style={styles.headerContent}>
                    <Text style={styles.appName}>myTroski Go</Text>
                    <Text style={styles.appSubtitle}>{t('smart_city_commute')}</Text>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
              <MenuItem icon="mail-outline" label={t('send_feedback')} onPress={handleEmail} index={0} colors={colors} />
              <MenuItem
                icon="information-circle-outline"
                label={t('about_us')}
                onPress={() => { onClose(); router.push("/(root)/about"); }}
                index={1}
                colors={colors}
              />
              <MenuItem
                icon="help-circle-outline"
                label={t('app_tutorial')}
                onPress={() => { onClose(); onShowTutorial(); }}
                index={2}
                colors={colors}
              />
              <MenuItem
                iconElement={<Text style={{ fontSize: 24 }}>{i18n.language === 'en' ? '🇫🇷' : '🇬🇧'}</Text>}
                label={i18n.language === 'en' ? t('french') : t('english')}
                onPress={toggleLanguage}
                index={3}
                colors={colors}
                rightElement={
                  <View style={[styles.langBadge, { backgroundColor: colors.primary + '15' }]}>
                     <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '900' }}>{i18n.language.toUpperCase()}</Text>
                  </View>
                }
              />
              <MenuItem
                icon="moon-outline"
                label={t('dark_mode')}
                onPress={toggleTheme}
                index={4}
                colors={colors}
                rightElement={
                  <View pointerEvents="none">
                    <Switch
                      value={isDark}
                      trackColor={{ false: "#d1d5db", true: colors.primary }}
                      thumbColor={"#fff"}
                    />
                  </View>
                }
              />
              <MenuItem
                icon="logo-android"
                label={t('download_android_app', 'Download Android App')}
                onPress={() => { onClose(); Linking.openURL('https://expo.dev/artifacts/eas/PdmETQdkqhniYTf9zvRWRxXUqZ3ltzEgGFQ0zGuSHYE.apk'); }}
                index={5}
                colors={colors}
                rightElement={
                  <View style={[styles.langBadge, { backgroundColor: '#10B98120' }]}>
                     <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '900' }}>APK</Text>
                  </View>
                }
              />

              {isAdmin && (
                <>
                  <View style={styles.divider} />
                  <Text style={[styles.sectionHeader, { color: colors.primary }]}>Admin Panel</Text>

                  <MenuItem
                    icon="grid-outline"
                    label="Admin Dashboard"
                    onPress={() => { onClose(); router.push("/admin"); }}
                    index={6}
                    colors={colors}
                  />
                </>
              )}

              <View style={styles.divider} />
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('shareConnect')}</Text>
              <View style={styles.socialRow}>
                <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.primary }]} onPress={handleShare}>
                  <WebIcon name="share-social" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.socialButton, { backgroundColor: "#25D366" }]} onPress={handleWhatsApp}>
                  <WebIcon name="logo-whatsapp" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

export default SideMenu;
