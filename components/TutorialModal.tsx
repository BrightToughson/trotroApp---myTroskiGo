import { ms } from '../lib/metrics';
import React, { useRef, useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useTheme, LightColors } from '../context/ThemeContext';
import { WebIcon } from './WebIcon';
import Swiper from 'react-native-swiper';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeInLeft, 
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { CustomButton } from './customButton';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageSelector from
'./LanguageSelector';

type SpotlightFeature = {
  image: any;
  title: string;
  description: string;
};

type TutorialSlideData = {
  mainTitle: string;
  mainImage: any;
  mainDescription?: string;
  bgColors?: [string, string];
  features: SpotlightFeature[];
  isInstallList?: boolean;
};

const getTutorialSlides = (t: any): TutorialSlideData[] => [
  {
    mainTitle: t('tutorialTitle1') || 'Welcome to myTroski Go',
    mainImage: require('../assets/images/tutorial_image/homescreen_tutorial/home_screen.png'),
    features: [
      {
        image: require('../assets/images/tutorial_image/homescreen_tutorial/search destination.png'),
        title: t('tutorial_step_1_title') || 'Find Your Ride',
        description: t('tutorial_step_1_desc') || 'Search for any destination in the city easily.',
      },
      {
        image: require('../assets/images/tutorial_image/homescreen_tutorial/live_update.png'),
        title: t('tutorial_step_3_title') || 'Live Update',
        description: t('tutorial_step_3_desc') || 'See live news about road conditions from other travelers.',
      },
      {
        image: require('../assets/images/tutorial_image/homescreen_tutorial/home screen header.png'),
        title: t('tutorialFeatureDashboardTitle') || 'Dashboard',
        description: t('tutorialFeatureDashboardDesc') || 'Quickly see where you are and where you\'re going.',
      },
      {
        image: require('../assets/images/tutorial_image/homescreen_tutorial/home, history and notification button.png'),
        title: t('tutorialFeatureEasyNavTitle') || 'Easy Navigation',
        description: t('tutorialFeatureEasyNavDesc') || 'Switch between home, history, and alerts with one tap.',
      },
      {
        image: require('../assets/images/tutorial_image/homescreen_tutorial/recent journey.png'),
        title: t('tutorialFeatureRecentTripsTitle') || 'Recent Trips',
        description: t('tutorialFeatureRecentTripsDesc') || 'Quickly jump back into your most frequent routes.',
      }
    ]
  },
  {
    mainTitle: t('tutorialFindSearchTitle') || 'Find Your Ride',
    mainImage: require('../assets/images/tutorial_image/findridescreen_tutorials/find_search_start/find_ride.png'),
    mainDescription: t('tutorialFindSearchDesc') || 'Search for any destination in the city easily.',
    features: [
      {
        image: require('../assets/images/tutorial_image/findridescreen_tutorials/find_search_start/search.png'),
        title: t('tutorialFeatureSearchTitle') || 'Search',
        description: t('tutorialFeatureSearchDesc') || 'Easily look up any terminal or stop.',
      },
      {
        image: require('../assets/images/tutorial_image/findridescreen_tutorials/find_search_start/automatic starting point.png'),
        title: t('tutorialFeatureAutoDetectTitle') || 'Auto Detect',
        description: t('tutorialFeatureAutoDetectDesc') || 'Let us find your location automatically.',
      }
    ]
  },
  {
    mainTitle: t('tutorialStartingPointTitle') || 'Set Your Starting Point',
    mainImage: require('../assets/images/tutorial_image/findridescreen_tutorials/starting point/starting_point_screen.png'),
    mainDescription: t('tutorialStartingPointDesc') || 'Choose exactly where your journey begins.',
    features: [
      {
        image: require('../assets/images/tutorial_image/findridescreen_tutorials/find_search_start/starting point.png'),
        title: t('tutorialFeatureSetStartTitle') || 'Set Start',
        description: t('tutorialFeatureSetStartDesc') || 'Quickly set where your journey begins.',
      },
      {
        image: require('../assets/images/tutorial_image/findridescreen_tutorials/starting point/nearby starting point.png'),
        title: t('tutorialFeatureNearbyTitle') || 'Nearby Stations',
        description: t('tutorialFeatureNearbyDesc') || 'See all the verified hubs around you.',
      },
      {
        image: require('../assets/images/tutorial_image/findridescreen_tutorials/starting point/type starting point.png'),
        title: t('tutorialFeatureManualSearchTitle') || 'Manual Search',
        description: t('tutorialFeatureManualSearchDesc') || 'Type any location to start from there.',
      },
      {
        image: require('../assets/images/tutorial_image/findridescreen_tutorials/starting point/nearest starting point.png'),
        title: t('tutorialFeatureNearestStopTitle') || 'Nearest Stop',
        description: t('tutorialFeatureNearestStopDesc') || 'We will suggest the absolute closest stop to your location.',
      }
    ]
  },
  {
    mainTitle: t('tutorialDestinationTitle') || 'Choose Your Destination',
    mainImage: require('../assets/images/tutorial_image/findridescreen_tutorials/destination/destination_screen.png'),
    mainDescription: t('tutorialDestinationDesc') || 'Pick your final stop and see all available routes.',
    features: [
      {
        image: require('../assets/images/tutorial_image/findridescreen_tutorials/destination/choose destination.png'),
        title: t('tutorialFeatureSelectStopTitle') || 'Select Stop',
        description: t('tutorialFeatureSelectStopDesc') || 'Pick the exact stop where you want to end.',
      },
      {
        image: require('../assets/images/tutorial_image/findridescreen_tutorials/destination/choose region.png'),
        title: t('tutorialFeatureBrowseRegionsTitle') || 'Browse Regions',
        description: t('tutorialFeatureBrowseRegionsDesc') || 'Explore different city regions for destinations.',
      },
      {
        image: require('../assets/images/tutorial_image/findridescreen_tutorials/destination/final destination.png'),
        title: t('tutorialFeatureConfirmedTitle') || 'Confirmed',
        description: t('tutorialFeatureConfirmedDesc') || 'Lock in your destination and get ready to go.',
      }
    ]
  },
  {
    mainTitle: t('tutorialMapDisplayTitle') || 'Track on Map',
    mainImage: require('../assets/images/tutorial_image/map display/map_screen.png'),
    mainDescription: t('tutorialMapDisplayDesc') || 'Follow your journey live on our beautiful interactive map and never miss a stop.',
    features: [
      {
        image: require('../assets/images/tutorial_image/map display/details_screen.png'),
        title: t('tutorialFeatureRouteDetailsTitle') || 'Route Details',
        description: t('tutorialFeatureRouteDetailsDesc') || 'See the full path and every stop along the way.',
      },
      {
        image: require('../assets/images/tutorial_image/map display/journey details display.png'),
        title: t('tutorialFeatureLiveInfoTitle') || 'Live Info',
        description: t('tutorialFeatureLiveInfoDesc') || 'View fares, time, and distance in one place.',
      },
      {
        image: require('../assets/images/tutorial_image/map display/route.png'),
        title: t('tutorialFeatureLiveMapTitle') || 'Live Map',
        description: t('tutorialFeatureLiveMapDesc') || 'Follow the blue line to your destination.',
      }
    ]
  },
  {
    mainTitle: t('tutorialTitle4') || 'Stay Updated',
    mainImage: require('../assets/images/tutorial_image/updatescreen_tutorial/update_screen.png'),
    features: [
      {
        image: require('../assets/images/tutorial_image/updatescreen_tutorial/communtify and official updates.png'),
        title: t('tutorial_step_4_title') || 'Community Updates',
        description: t('tutorial_step_4_desc') || 'Read the latest road conditions reported by others.',
      },
      {
        image: require('../assets/images/tutorial_image/updatescreen_tutorial/make a post.png'),
        title: t('tutorialFeatureMakePostTitle') || 'Make a Post',
        description: t('tutorialFeatureMakePostDesc') || 'Share your own travel updates with the community.',
      }
    ]
  },
  {
    mainTitle: t('tutorialTitle6') || 'Quick Access Menu',
    mainImage: require('../assets/images/tutorial_image/sidemenu_tutorials/sidemeun_screen.png'),
    mainDescription: t('tutorialDesc6') || 'Swipe to access your profile, history, settings, and other important features directly from the side menu.',
    features: []
  },
  {
    mainTitle: t('tutorialTitle5') || 'Install the App',
    mainImage: require('../assets/logo/mytroski_display.png'),
    mainDescription: t('tutorialDesc5') || 'Add myTroski Go to your home screen for quick access.',
    features: [],
    isInstallList: true
  }
];

// Inner component to handle the auto-cycling spotlight for features
const FeatureSpotlightView = ({ features, isActiveSlide, fallbackDescription }: { features: SpotlightFeature[], isActiveSlide: boolean, fallbackDescription?: string }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const opacity = useSharedValue(1);

  // Reset index when slide changes
  useEffect(() => {
    setCurrentIndex(0);
    opacity.value = 1;
  }, [isActiveSlide, opacity]);

  useEffect(() => {
    if (!isActiveSlide || features.length <= 1) return;

    const interval = setInterval(() => {
      opacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(setCurrentIndex)((currentIndex + 1) % features.length);
        opacity.value = withTiming(1, { duration: 300 });
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isActiveSlide, features.length, currentIndex, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (features.length === 0) {
    return (
      <View style={styles.noFeatureContainer}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {fallbackDescription || t('tutorial_swipe_hint')}
        </Text>
      </View>
    );
  }

  const currentFeature = features[currentIndex] || features[0];

  return (
    <View style={styles.featureContainer}>
      <View style={styles.featureControlsRow}>
        <View style={styles.sideArrowContainer}>
          {features.length > 1 && currentIndex > 0 && (
            <TouchableOpacity 
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setCurrentIndex((prev) => prev - 1);
                opacity.value = 1;
              }} 
              style={styles.sideArrow}
            >
              <WebIcon name="chevron-back" size= {24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <Animated.View style={[styles.featureAnimatedContainer, animatedStyle]}>
          <View style={styles.featureImageWrapper}>
            <Image 
              source={currentFeature.image} 
              style={styles.featureImage} 
              contentFit="contain"
              transition={300}
            />
          </View>
          <Text style={[styles.featureTitle, { color: colors.text }]}>{currentFeature.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{currentFeature.description}</Text>
        </Animated.View>

        <View style={styles.sideArrowContainer}>
          {features.length > 1 && currentIndex < features.length - 1 && (
            <TouchableOpacity 
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setCurrentIndex((prev) => prev + 1);
                opacity.value = 1;
              }} 
              style={styles.sideArrow}
            >
              <WebIcon name="chevron-forward" size= {24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

interface TutorialModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isVisible, onClose }) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 750;
  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios' || (isWeb && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent));

  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = getTutorialSlides(t);

  // Background drift animations
  const drift1 = useSharedValue(0);
  const drift2 = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      drift1.value = withRepeat(withTiming(25, { duration: 6000 }), -1, true);
      drift2.value = withRepeat(withTiming(-20, { duration: 8000 }), -1, true);
      floatY.value = withRepeat(withTiming(-12, { duration: 2500 }), -1, true);
    }
  }, [isVisible, floatY, drift1, drift2]);

  const animatedDrift1 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift1.value }, { translateY: drift2.value }],
  }));

  const animatedDrift2 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift2.value }, { translateY: drift1.value }],
  }));

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const handleIndexChange = (index: number) => {
    setActiveIndex(index);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Full Screen Frost Blur */}
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(240, 244, 255, 0.9)' }]} />
        ) : (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}

        {/* Animated Background Orbs */}
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", overflow: "hidden" }]} pointerEvents="none">
          <Animated.View
            style={[
              styles.decorativeCircle,
              animatedDrift1,
              {
                backgroundColor: "#2563EB",
                top: ms(-50),
                right: ms(-80),
                width: ms(300),
                height: ms(300),
                opacity: isDark ? 0.3 : 0.15,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.decorativeCircle,
              animatedDrift2,
              {
                backgroundColor: "#FBBF24",
                bottom: ms(100),
                left: ms(-100),
                width: ms(350),
                height: ms(350),
                opacity: isDark ? 0.2 : 0.1,
              },
            ]}
          />
        </View>

        <SafeAreaView style={styles.mainContainer}>
          {/* Top Bar Navigation */}
          <View style={styles.topBar}>
            <Animated.View entering={FadeInLeft.duration(600)} style={{ flexDirection: 'row', alignItems: 'center', gap: ms(12) }}>
              {activeIndex > 0 ? (
                <TouchableOpacity 
                  onPress={() => swiperRef.current?.scrollBy(-1)}
                  style={[styles.iconButton, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)" }]}
                >
                  <WebIcon name="arrow-back" size= {24} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: ms(44) }} />
              )}
              <LanguageSelector />
              
              <View style={[styles.stepCounter, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)" }]}>
                <Text style={[styles.stepCounterText, { color: colors.text }]}>{activeIndex + 1} / {slides.length}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInRight.duration(600)} style={{ flexDirection: 'row', alignItems: 'center', gap: ms(12) }}>
              {activeIndex < slides.length - 1 && (
                <TouchableOpacity 
                  onPress={onClose}
                  style={[styles.skipButton, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)" }]}
                >
                  <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>{t('skip', 'Skip')}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                onPress={onClose}
                style={[styles.iconButton, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)" }]}
              >
                <WebIcon name="close" size= {24} color={colors.text} />
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Swiper
            ref={swiperRef}
            loop={false}
            onIndexChanged={handleIndexChange}
            showsPagination={false}
            scrollEnabled={true}
          >
            {slides.map((slide, index) => (
              <View key={index} style={[styles.slide, isWeb && styles.webSlide]}>
                {/* Floating Main Image */}
                <View style={[styles.imageContainer, { flex: isSmallScreen ? 0.4 : 0.5 }]}>
                  <Animated.View 
                    key={`image-${activeIndex === index}`}
                    entering={index === activeIndex ? FadeInUp.delay(200).duration(1000).springify() : undefined}
                    style={[styles.imageWrapper, floatingStyle]}
                  >
                    <Image
                      source={slide.mainImage}
                      style={styles.slideImage}
                      contentFit="contain"
                      transition={800}
                    />
                  </Animated.View>
                </View>

                {/* Glassmorphism Text Card with Feature Spotlight */}
                <View style={[styles.textContainer, { flex: isSmallScreen ? 0.6 : 0.5 }]}>
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
                          backgroundColor: isDark ? "rgba(15,23,42,0.4)" : "rgba(255,255,255,0.6)",
                        }
                      ]}
                    >
                      <ScrollView 
                        style={{ flex: 1 }} 
                        contentContainerStyle={{ paddingBottom: ms(15) }}
                        showsVerticalScrollIndicator={false} 
                        nestedScrollEnabled={true}
                      >
                        <Animated.Text
                          entering={index === activeIndex ? FadeInLeft.delay(600).duration(1000).springify() : undefined}
                          style={[styles.slideTitle, { color: colors.text, fontSize: isSmallScreen ? 22 : 24 }]}
                        >
                          {slide.mainTitle}
                        </Animated.Text>
                        
                        <View style={[styles.titleSeparator, { backgroundColor: colors.primary }]} />

                        {slide.isInstallList ? (
                          <Animated.View entering={index === activeIndex ? FadeInRight.delay(800).duration(1000).springify() : undefined} style={styles.installListContainer}>
                            {isIOS ? (
                              <>
                                <Text style={[styles.installListText, { color: colors.textSecondary }]}>{t('tutorialInstallStep1')}</Text>
                                <Text style={[styles.installListText, { color: colors.textSecondary }]}>{t('tutorialInstallStep2')}</Text>
                                <Text style={[styles.installListText, { color: colors.textSecondary }]}>{t('tutorialInstallStep3')}</Text>
                              </>
                            ) : (
                              <>
                                <Text style={[styles.installListText, { color: colors.textSecondary }]}>{t('tutorialInstallAndroidStep1')}</Text>
                                <Text style={[styles.installListText, { color: colors.textSecondary }]}>{t('tutorialInstallAndroidStep2')}</Text>
                                <Text style={[styles.installListText, { color: colors.textSecondary }]}>{t('tutorialInstallAndroidStep3')}</Text>
                              </>
                            )}
                          </Animated.View>
                        ) : (
                          <Animated.View entering={index === activeIndex ? FadeInRight.delay(800).duration(1000).springify() : undefined} style={{ width: '100%', flex: 1 }}>
                             <FeatureSpotlightView 
                               features={slide.features} 
                               isActiveSlide={index === activeIndex} 
                               fallbackDescription={slide.mainDescription}
                             />
                          </Animated.View>
                        )}
                      </ScrollView>



                      <Animated.View
                        entering={index === activeIndex ? FadeInUp.delay(1000).duration(1000).springify() : undefined}
                        style={styles.buttonInsideWrapper}
                      >
                        <CustomButton
                          onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            if (index < slides.length - 1) swiperRef.current?.scrollBy(1);
                            else onClose();
                          }}
                          title={index === slides.length - 1 ? t('finish') : t('next')}
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
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    alignSelf: 'center',
  },
  decorativeCircle: {
    position: "absolute",
    width: ms(300),
    height: ms(300),
    borderRadius: ms(150),
  },
  topBar: {
    paddingHorizontal: ms(24),
    paddingVertical: ms(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    zIndex: 10,
  },
  iconButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.1,
    shadowRadius: ms(4),
    elevation: 3,
  },
  slide: {
    flex: 1,
    paddingHorizontal: ms(16),
    paddingTop: 0,
    paddingBottom: ms(80),
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  webSlide: {
    maxWidth: ms(480),
    alignSelf: 'center',
  },
  imageContainer: {
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    padding: 0,
    flex: 0.55,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  slideImage: { 
    width: "100%", 
    height: "100%", 
    maxWidth: ms(500),
  },
  textContainer: {
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: ms(10),
    width: "100%",
    marginTop: ms(-10),
  },
  glassCard: {
    padding: ms(16),
    borderRadius: ms(24),
    width: "100%",
    maxWidth: ms(460),
    alignSelf: 'center',
    borderWidth: ms(1.5),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: ms(15) },
    shadowOpacity: 0.25,
    shadowRadius: ms(25),
    elevation: 10,
  },
  slideTitle: {
    fontSize: ms(28),
    fontWeight: "900",
    marginBottom: ms(12),
    textAlign: "center",
    letterSpacing: -0.5,
  },
  titleSeparator: {
    width: ms(80),
    height: ms(4),
    borderRadius: ms(2),
    alignSelf: 'center',
    marginBottom: ms(15),
  },
  featureContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureAnimatedContainer: {
    alignItems: 'center',
    flex: 1,
  },
  featureImageWrapper: {
    height: ms(60),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(8),
  },
  featureImage: {
    width: '100%',
    height: '100%',
  },
  featureTitle: {
    fontSize: ms(20),
    fontWeight: '800',
    marginBottom: ms(4),
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: ms(16),
    textAlign: "center",
    lineHeight: ms(20),
    paddingHorizontal: ms(10),
    fontWeight: "500",
  },
  noFeatureContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: ms(20),
  },
  featureControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  sideArrowContainer: {
    width: ms(44),
    height: ms(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideArrow: {
    padding: ms(10),
    zIndex: 10,
  },
  installListContainer: {
    width: '100%',
    paddingHorizontal: ms(20),
    gap: ms(12),
  },
  installListText: {
    fontSize: ms(20),
    fontWeight: '600',
    lineHeight: ms(24),
    textAlign: 'center',
    marginBottom: ms(8),
  },
  buttonInsideWrapper: {
    width: "100%",
    marginTop: ms(15),
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
  stepCounter: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepCounterText: {
    fontSize: ms(14),
    fontWeight: '800',
  },
  skipButton: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(8),
    borderRadius: ms(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skipButtonText: {
    fontSize: ms(15),
    fontWeight: '700',
  },

});

export default TutorialModal;
