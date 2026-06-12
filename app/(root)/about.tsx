import { useTranslation } from "react-i18next";
import { WebIcon } from "../../components/WebIcon";
import { router } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, LightColors } from "../../context/ThemeContext";

/**
 * About Screen: Provides information about the app's mission, features, and Privacy Policy.
 */
const About = () => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const sections = [
    {
      title: t('about_msg_1_title'),
      content: t('about_msg_1_content'),
      icon: "bus-outline",
    },
    {
      title: t('about_msg_2_title'),
      content: t('about_msg_2_content'),
      icon: "navigate-outline",
    },
    {
      title: t('about_msg_3_title'),
      content: t('about_msg_3_content'),
      icon: "shield-checkmark-outline",
    },
    {
      title: t('about_msg_4_title'),
      content: t('about_msg_4_content'),
      icon: "lock-closed-outline",
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff", borderColor: colors.border, borderWidth: 1 }]}
        >
          <WebIcon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('about_privacy')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandingSection}>
          <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary + "10" }]}>
             <WebIcon name="bus" size={60} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>myTroski Go</Text>
          <Text style={[styles.version, { color: colors.textSecondary }]}>{t('version')} 1.0.0</Text>
        </View>

        {sections.map((section, index) => (
          <View
            key={index}
            style={[styles.sectionCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#fff", borderColor: colors.border }]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.primary + "15" }]}>
                <WebIcon name={section.icon as any} size={22} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {section.content}
            </Text>
          </View>
        ))}

        <View style={styles.footerInfo}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {t('copyright')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  brandingSection: {
    alignItems: "center",
    marginVertical: 30,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  version: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 22,
  },
  footerInfo: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 15,
    fontWeight: "500",
  },
});

export default About;
