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
import { useTheme, LightColors } from "../../context/ThemeContext";

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
              top: -80,
              right: -80,
              width: 350,
              height: 350,
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
              bottom: 100,
              left: -100,
              width: 350,
              height: 350,
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
              bottom: 50,
              right: 30,
              width: 80,
              height: 80,
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
              top: 150,
              right: -40,
              width: 120,
              height: 120,
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
                    <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
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
                            style={{ marginLeft: 8 }} 
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    zIndex: 10,
  },

  backButton: {
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipButtonText: {
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 0.5,
  },

  dotStyle: {
    backgroundColor: "#CBD5E1",
    marginHorizontal: 5,
    width: 10,
    height: 6,
    borderRadius: 4,
  },
  activeDotStyle: {
    marginHorizontal: 5,
    width: 36,
    height: 6,
    borderRadius: 4,
  },

  slide: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  imageContainer: {
    flex: 0.45,
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
    padding: 10,
    marginTop: -20,
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
    maxWidth: 380,
  },
  textContainer: {
    flex: 0.45,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 10,
    width: "100%",
    marginTop: 20,
  },
  glassCard: {
    padding: 16,
    borderRadius: 24,
    width: "100%",
    maxWidth: 480,
    alignSelf: 'center',
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  titleSeparator: {
    width: 200,
    height: 3,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 20,
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 10,
    fontWeight: "500",
  },

  buttonInsideWrapper: {
    width: "100%",
    marginTop: 24,
  },
  fullWidthButton: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  decorativeCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    width: "85%",
    maxWidth: 400,
    borderRadius: 32,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  flagEmoji: {
    fontSize: 38,
    marginRight: 16,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  languageRegion: {
    fontSize: 14,
  },
});

export default Welcome;
