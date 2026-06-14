import { ms } from '../../lib/metrics';
import { WebIcon } from '../../components/WebIcon';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { SecureStoreWrapper as SecureStore } from "../../lib/SecureStoreWrapper";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Platform, Modal, ScrollView } from "react-native";
import { Image } from "expo-image";
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeInLeft,
    FadeInRight,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";
import { CustomButton } from "../../components/customButton";
import { useTranslation } from "react-i18next";
import { useTheme, LightColors } from
"../../context/ThemeContext";

/**
 * Welcome Screen: A premium multi-slide onboarding experience.
 * Uses a Swiper with custom animated transitions to introduce the app's features.
 */
const Welcome = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0); // Tracks current slide
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(true);
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();

  // Shared values for background animations
  const drift1 = useSharedValue(0);
  const drift2 = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    // Start background drift animations (slower, smoother)
    drift1.value = withRepeat(withTiming(25, { duration: 6000 }), -1, true);
    drift2.value = withRepeat(withTiming(-20, { duration: 8000 }), -1, true);

    // Smooth floating animation for the main illustrations
    floatY.value = withRepeat(withTiming(-12, { duration: 2500 }), -1, true);
  }, [floatY, drift1, drift2]);

  const animatedDrift1 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift1.value }, { translateY: drift2.value }],
  }));

  const animatedDrift2 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift2.value }, { translateY: drift1.value }],
  }));

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const backButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(activeIndex === 0 ? 0 : 1, { duration: 300 }),
    transform: [{ scale: withTiming(activeIndex === 0 ? 0.8 : 1, { duration: 300 }) }],
  }));

  /**
   * Marks the welcome flow as completed in persistent storage and navigates to Sign Up
   */
  const completeWelcome = async () => {
    await SecureStore.setItemAsync("hasSeenWelcome", "true");
    router.replace("/(auth)/sign-up");
  };

  /**
   * Advances to the next slide or completes the flow if on the last slide
   */
  const handleNext = () => {
    if (swiperRef.current && activeIndex < slides.length - 1) {
      swiperRef.current.scrollBy(1);
    } else {
      completeWelcome();
    }
  };

  /**
   * Returns to the previous slide
   */
  const handleBack = () => {
    if (swiperRef.current && activeIndex > 0) {
      swiperRef.current.scrollBy(-1);
    }
  };

  // Content for the onboarding slides
  const slides = [
    {
      image: require("../../assets/images/welcome_images/welcome_welcome.png"),
      title: t('welcome_onboard_title', 'Welcome to myTroski Go'),
      description: t('welcome_onboard_desc', 'Experience the smartest way to navigate your city with premium transit features.'),
    },
    {
      image: require("../../assets/images/welcome_images/welcome_search_destination.png"),
      title: t('search_onboard_title', 'Find Your Ride'),
      description: t('search_onboard_desc', 'Easily search for destinations and find the best Trotro routes to get you there.'),
    },
    {
      image: require("../../assets/images/welcome_images/welcome_estimated_fare.png"),
      title: t('fare_onboard_title', 'Fare Estimation'),
      description: t('fare_onboard_desc', 'Get accurate fare calculations and optimize your commute before you travel.'),
    },
    {
      image: require("../../assets/images/welcome_images/welcome_Journey_details.png"),
      title: t('stops_onboard_title', 'Nearest Trotro Stops'),
      description: t('stops_onboard_desc', 'Easily find and navigate to the closest verified Trotro hubs and stops.'),
    },
    {
      image: require("../../assets/images/welcome_images/welcome_community.png"),
      title: t('community_onboard_title', 'Community Updates'),
      description: t('community_onboard_desc', 'Join the network. Share and receive live traffic info, fare updates, and more.'),
    },
    {
      image: require("../../assets/images/welcome_images/welcome_get_started.png"),
      title: t('start_onboard_title', 'Get Started'),
      description: t('start_onboard_desc', 'You are all set! Let us start your journey and find your next ride.'),
    },
  ];

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
        style={[
          StyleSheet.absoluteFill,
          { alignItems: "center", overflow: "hidden" },
        ]}
        pointerEvents="none"
      >
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift1,
            {
              backgroundColor: "#2563EB", // Primary Blue orb
              top: ms(-80),
              right: ms(-80),
              width: ms(350),
              height: ms(350),
              opacity: isDark ? 0.2 : 0.08,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift2,
            {
              backgroundColor: "#FBBF24", // Warm yellow orb
              bottom: ms(100),
              left: ms(-100),
              width: ms(350),
              height: ms(350),
              opacity: isDark ? 0.15 : 0.08,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift1,
            {
              backgroundColor: "#1A2433",
              bottom: ms(50),
              right: ms(30),
              width: ms(80),
              height: ms(80),
              opacity: isDark ? 0.6 : 0.1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift2,
            {
              backgroundColor: "#FFD700",
              top: ms(150),
              right: ms(-40),
              width: ms(120),
              height: ms(120),
              opacity: isDark ? 0.3 : 0.1,
            },
          ]}
        />
      </View>

      <SafeAreaView style={styles.mainContainer}>
        {/* ------------------- TOP NAVIGATION BAR ------------------- */}
        <View style={styles.topButtonContainer}>
          {/* Back button (only shown if not on the first slide) */}
          <Animated.View style={backButtonAnimatedStyle}>
            <TouchableOpacity
              onPress={handleBack}
              disabled={activeIndex === 0}
              style={[
                styles.backButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.8)",
                },
              ]}
            >
              <WebIcon name="arrow-back" size= {24} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>

          {/* Skip button to bypass onboarding */}
          <TouchableOpacity
            onPress={completeWelcome}
            style={[styles.skipButton]}
          >
            <Text style={[styles.skipButtonText, { color: colors.text }]}>
              {t('skip')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ------------------- ONBOARDING SWIPER ------------------- */}
        <Swiper
          ref={swiperRef}
          loop={false}
          paginationStyle={styles.paginationStyle}
          dotStyle={styles.dotStyle}
          activeDotStyle={[
            styles.activeDotStyle,
            { backgroundColor: colors.primary },
          ]}
          onIndexChanged={(index) => setActiveIndex(index)}
          showsButtons={false}
          scrollEnabled={true} // Enabled for all platforms to allow natural navigation
        >
          {slides.map((slide, index) => (
            <View key={index} style={styles.slide}>
              {/* Slide Visual Content with Animation */}
              <View style={styles.imageContainer}>
                <Animated.View 
                  key={`image-${activeIndex === index}`}
                  entering={index === activeIndex ? FadeInUp.delay(200).duration(1000).springify() : undefined}
                  style={[styles.imageWrapper, floatingStyle]}
                >
                  <Image
                    source={slide.image}
                    style={styles.slideImage}
                    contentFit="contain"
                    transition={800}
                  />
                </Animated.View>
              </View>

              {/* Slide Text Content with Animation */}
              <View style={styles.textContainer}>
                <Animated.View
                  key={`text-${activeIndex === index}`}
                  entering={index === activeIndex ? FadeInUp.delay(400).duration(1000).springify() : undefined}
                  style={{ width: "100%" }}
                >
                  <BlurView 
                    intensity={isDark ? 30 : 60} 
                    tint={isDark ? "dark" : "light"}
                    style={[
                      styles.glassCard,
                      {
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)",
                        backgroundColor: isDark ? "rgba(15,23,42,0.3)" : "rgba(255,255,255,0.4)",
                      }
                    ]}
                  >
                    <ScrollView style={{ maxHeight: ms(200) }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                      <Animated.Text
                        entering={index === activeIndex ? FadeInLeft.delay(600).duration(1000).springify() : undefined}
                        style={[styles.slideTitle, { color: colors.text }]}
                      >
                        {slide.title}
                      </Animated.Text>
                      <View style={[styles.titleSeparator, { backgroundColor: colors.primary }]} />
                      <Animated.Text
                        entering={index === activeIndex ? FadeInRight.delay(800).duration(1000).springify() : undefined}
                        style={[
                          styles.slideDescription,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {slide.description}
                      </Animated.Text>
                    </ScrollView>

                    {/* Slide Control Button inside the container */}
                    <Animated.View
                      entering={index === activeIndex ? FadeInUp.delay(1000).duration(1000).springify() : undefined}
                      style={styles.buttonInsideWrapper}
                    >
                      <CustomButton
                        onPress={handleNext}
                        title={index === slides.length - 1 ? t('getStarted') : t('next')}
                        containerStyle={styles.fullWidthButton}
                        IconRight={() => (
                          <WebIcon 
                            name={index === slides.length - 1 ? "checkmark-circle" : "arrow-forward"} 
                            size= {20} 
                            color="#fff" 
                            style={{ marginLeft: ms(8) }} 
                          />
                        )}
                      />
                    </Animated.View>
                  </BlurView>
                </Animated.View>
              </View>
            </View>
          ))}
        </Swiper>

        {/* Language Selection Modal */}
        <Modal
          visible={isLanguageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsLanguageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <Animated.View entering={FadeInUp.springify()} style={[styles.modalContent, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('selectLanguage')}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{t('select_language_subtitle')}</Text>
              
              <TouchableOpacity 
                style={[styles.languageOption, { borderColor: i18n.language.startsWith('en') ? colors.primary : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") }]}
                onPress={() => {
                  i18n.changeLanguage('en');
                  setIsLanguageModalVisible(false);
                }}
              >
                <Text style={styles.flagEmoji}>🇬🇧</Text>
                <View style={styles.languageTextContainer}>
                  <Text style={[styles.languageName, { color: colors.text }]}>{t('english')}</Text>
                  <Text style={[styles.languageRegion, { color: colors.textSecondary }]}>{t('language_region_global')}</Text>
                </View>
                {i18n.language.startsWith('en') && (
                  <WebIcon name="checkmark-circle" size= {24} color={colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.languageOption, { borderColor: i18n.language.startsWith('fr') ? colors.primary : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") }]}
                onPress={() => {
                  i18n.changeLanguage('fr');
                  setIsLanguageModalVisible(false);
                }}
              >
                <Text style={styles.flagEmoji}>🇫🇷</Text>
                <View style={styles.languageTextContainer}>
                  <Text style={[styles.languageName, { color: colors.text }]}>{t('french')}</Text>
                  <Text style={[styles.languageRegion, { color: colors.textSecondary }]}>{t('language_region_french')}</Text>
                </View>
                {i18n.language.startsWith('fr') && (
                  <WebIcon name="checkmark-circle" size= {24} color={colors.primary} />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },

  topButtonContainer: {
    paddingHorizontal: ms(24),
    paddingVertical: ms(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    zIndex: 10,
  },

  backButton: {
    padding: ms(8),
    borderRadius: ms(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.05,
    shadowRadius: ms(4),
    elevation: 2,
  },

  skipButton: {
    paddingHorizontal: ms(20),
    paddingVertical: ms(8),
    borderRadius: ms(20),
  },
  skipButtonText: {
    fontWeight: "700",
    fontSize: ms(18),
    letterSpacing: 0.5,
  },

  paginationStyle: {
    bottom: '45%',
  },
  dotStyle: {
    backgroundColor: "rgba(148, 163, 184, 0.4)",
    marginHorizontal: ms(6),
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  activeDotStyle: {
    marginHorizontal: ms(6),
    width: ms(24),
    height: ms(8),
    borderRadius: ms(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },

  slide: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ms(24),
    paddingTop: ms(10),
    paddingBottom: ms(40),
  },
  imageContainer: {
    flex: 0.45,
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
    padding: ms(10),
    marginTop: ms(-20),
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  slideImage: { 
    width: "100%", 
    height: "100%", 
    maxWidth: ms(380),
  },
  textContainer: {
    flex: 0.45,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: ms(10),
    width: "100%",
    marginTop: ms(20),
  },
  glassCard: {
    padding: ms(16),
    borderRadius: ms(24),
    width: "100%",
    maxWidth: ms(480),
    alignSelf: 'center',
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: ms(8) },
    shadowOpacity: 0.1,
    shadowRadius: ms(12),
    elevation: 4,
  },
  slideTitle: {
    fontSize: ms(28),
    fontWeight: "900",
    marginBottom: ms(16),
    textAlign: "center",
    letterSpacing: -0.5,
  },
  titleSeparator: {
    width: ms(200),
    height: ms(3),
    borderRadius: ms(2),
    alignSelf: 'center',
    marginBottom: ms(16),
  },
  slideDescription: {
    fontSize: ms(20),
    textAlign: "center",
    lineHeight: ms(26),
    paddingHorizontal: ms(10),
    fontWeight: "500",
  },

  buttonInsideWrapper: {
    width: "100%",
    marginTop: ms(24),
  },
  fullWidthButton: {
    width: "100%",
    height: ms(48),
    borderRadius: ms(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: ms(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(8),
    elevation: 5,
  },
  decorativeCircle: {
    position: "absolute",
    width: ms(300),
    height: ms(300),
    borderRadius: ms(150),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    width: "85%",
    maxWidth: ms(400),
    borderRadius: ms(32),
    padding: ms(30),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: ms(10) },
    shadowOpacity: 0.25,
    shadowRadius: ms(15),
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    fontSize: ms(28),
    fontWeight: "800",
    marginBottom: ms(8),
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: ms(16),
    textAlign: "center",
    marginBottom: ms(30),
    lineHeight: ms(20),
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: ms(16),
    borderRadius: ms(20),
    borderWidth: ms(2),
    marginBottom: ms(16),
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  flagEmoji: {
    fontSize: ms(38),
    marginRight: ms(16),
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: ms(20),
    fontWeight: "700",
    marginBottom: ms(2),
  },
  languageRegion: {
    fontSize: ms(14),
  },
});

export default Welcome;
