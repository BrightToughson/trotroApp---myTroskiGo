import { useUser } from "@clerk/clerk-expo";

import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    FlatList,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    Linking,
    Modal,
    RefreshControl,
    useWindowDimensions,
} from "react-native";
import { Image } from 'expo-image';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
    FadeInDown,
    FadeInRight,
    FadeInUp,
    BounceInUp,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    FadeOut,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";
import SideMenu from "../../../components/SideMenu";
import { useTheme } from "../../../context/ThemeContext";
import { HistoryService, Ride } from "../../../lib/HistoryService";
import { Notification, NotificationService } from "../../../lib/NotificationService";
import LanguageSelector from "../../../components/LanguageSelector";
import TutorialModal from "../../../components/TutorialModal";
import { WebIcon } from "../../../components/WebIcon";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import { translateText } from "../../../lib/translate";
import { useInstallPrompt } from "../../../hooks/useInstallPrompt";
import OfficialAnnouncementsModal from "../../../components/OfficialAnnouncementsModal";
import { PulseService, CityPulse } from "../../../lib/PulseService";

const MOCK_NEWS = [
  {
    id: "expressway",
    tag: "highway",
    title: "Accra-Kumasi Expressway begins as military clear 17.75km land for project",
    excerpt: "The military has commenced clearing of the 17.75km land for the Accra-Kumasi Expressway project.",
    image_url: "https://cdn.ghanaweb.com/imagelib/pics/838/83884814.jpg",
    color: "#3B82F6",
    url: "https://www.ghanaweb.com/GhanaHomePage/NewsArchive/Accra-Kumasi-Expressway-begins-as-military-clear-17-75km-land-for-project-2033030"
  }
];

export default function Home() {
  const { signup, login } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const { height } = useWindowDimensions();
  const isSmallScreen = height < 750;
  
  // Dynamic spacing for small screens
  const sectionMarginTop = isSmallScreen ? 16 : 28;
  const headerMarginBottom = isSmallScreen ? 12 : 24;
  const searchMarginTop = isSmallScreen ? 16 : 32;
  const searchMarginBottom = isSmallScreen ? 20 : 32;
  const taglineMarginBottom = isSmallScreen ? 4 : 8;
  const paddingVerticalSmall = isSmallScreen ? 10 : 12;
  const searchMinHeight = isSmallScreen ? 64 : 76;
  const headingSize = isSmallScreen ? 16 : 18;
  const sectionTitleSize = isSmallScreen ? 20 : 24;
  const tickerMarginTop = isSmallScreen ? 16 : 24;
  
  // Dynamic font sizes for small screens
  const userNameSize = isSmallScreen ? 14 : 16;
  const taglineSize = isSmallScreen ? 12 : 14;
  const searchSubSize = isSmallScreen ? 10 : 11.5;
  const liveLabelSize = isSmallScreen ? 13 : 14;
  const liveTextSize = isSmallScreen ? 14 : 16;
  
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [latestReport, setLatestReport] = useState<Notification | null>(null);
  const [translatedReportText, setTranslatedReportText] = useState<string>("");
  const [cityPulses, setCityPulses] = useState<CityPulse[]>([]);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isTutorialVisible, setTutorialVisible] = useState(false);
  const [showTutorialPopup, setShowTutorialPopup] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const [isOfficialModalVisible, setIsOfficialModalVisible] = useState(false);
  const [unreadOfficialCount, setUnreadOfficialCount] = useState(0);
  const [showGreeting, setShowGreeting] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowGreeting(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const [showInAppAlert, setShowInAppAlert] = useState<Notification | null>(null);
  const [hasShownAutoInstall, setHasShownAutoInstall] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { isInstallable, promptInstall } = useInstallPrompt();

  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result === 'show_ios_instructions') {
      setShowIOSInstall(true);
    } else if (result === 'show_android_instructions') {
      setShowAndroidInstall(true);
    }
  };
  const insets = useSafeAreaInsets();

  // Show tutorial popup automatically only if not seen before
  React.useEffect(() => {
    if (login === "true" || signup === "true") return;

    const checkTutorial = async () => {
      const hasSeen = await AsyncStorage.getItem("hasSeenTutorial");
      if (hasSeen !== "true") {
        setShowTutorialPopup(true);
      }
    };
    checkTutorial();
  }, [login, signup]);

  // AUTO PWA PROMPT: Show install instructions after 7 seconds if installable
  React.useEffect(() => {
    if (isInstallable && !hasShownAutoInstall && Platform.OS === 'web') {
      const timer = setTimeout(() => {
        handleInstallClick();
        setHasShownAutoInstall(true);
      }, 7000); 
      return () => clearTimeout(timer);
    }
  }, [isInstallable, hasShownAutoInstall]);

  // Handle tutorial trigger after signup/login animation
  React.useEffect(() => {
    if (signup === "true" || login === "true") {
      setTimeout(() => {
        AsyncStorage.getItem("hasSeenTutorial").then(hasSeen => {
          if (hasSeen !== "true") {
            setShowTutorialPopup(true);
          }
        });
      }, 4000); 
    }
  }, [signup, login]);


  const drift1 = useSharedValue(0);
  const drift2 = useSharedValue(0);
  const drift3 = useSharedValue(0);
  const drift4 = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const bounce = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      drift1.value = withRepeat(withTiming(30, { duration: 10000 }), -1, true);
      drift2.value = withRepeat(withTiming(-25, { duration: 12000 }), -1, true);
      drift3.value = withRepeat(withTiming(40, { duration: 15000 }), -1, true);
      drift4.value = withRepeat(withTiming(-35, { duration: 18000 }), -1, true);
      bounce.value = withRepeat(withSequence(withTiming(10, { duration: 800 }), withTiming(0, { duration: 800 })), -1, true);
      pulseScale.value = withRepeat(withSequence(withTiming(1.5, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true);
    }

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, [bounce, drift1, drift2, drift3, drift4, pulseScale]);

  const renderGreetingWithFlag = () => {
    const hours = new Date().getHours();
    let textKey = "goodMorning";
    if (hours < 12) textKey = "goodMorning";
    else if (hours < 17) textKey = "goodAfternoon";
    else textKey = "goodEvening";

    const greetingText = t(textKey) || (hours < 12 ? "Good Morning" : hours < 17 ? "Good Afternoon" : "Good Evening");

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greetingText}, </Text>
        {Platform.OS === 'web' ? (
          <Image source={{ uri: 'https://flagcdn.com/w40/gh.png' }} style={{ width: 22, height: 16, marginLeft: 4, borderRadius: 2 }} />
        ) : (
          <Text style={styles.greeting}>🇬🇭</Text>
        )}
      </View>
    );
  };

  const animatedBounce = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
    opacity: withTiming(scrollY.value > 50 ? 0 : 1, { duration: 300 }),
  }));

  const animatedPulse = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  const animatedDrift1 = useAnimatedStyle(() => ({ transform: [{ translateX: drift1.value }, { translateY: drift2.value }] }));
  const animatedDrift2 = useAnimatedStyle(() => ({ transform: [{ translateX: drift2.value }, { translateY: drift3.value }] }));

  const loadData = useCallback(async () => {
    const history = await HistoryService.getHistory();
    setRecentRides(history.slice(0, 1)); // Show only the single most recent journey
    const notifications = await NotificationService.getNotifications();
    const reports = notifications.filter(n => n.type === 'community_post');
    setLatestReport(reports.length > 0 ? reports[0] : null);

    const officialCount = await NotificationService.getUnreadCountByCategory('official');
    setUnreadOfficialCount(officialCount);

    const pulses = await PulseService.getPulses();
    setCityPulses(pulses);
  }, []);

  useFocusEffect(useCallback(() => { 
    loadData(); 
    const unsubscribe = NotificationService.subscribe(async () => {
      const all = await NotificationService.getNotifications();
      const latest = all.find(n => n.type === 'community_post');
      if (latest && (!latestReport || latest.id !== latestReport.id)) {
        setShowInAppAlert(latest);
        setTimeout(() => setShowInAppAlert(null), 5000);
      }
      loadData();
    }); 
    
    return () => {
      unsubscribe();
      setShowInAppAlert(null); // Clear alert when leaving home screen
    };
  }, [latestReport, loadData]));

  React.useEffect(() => {
    if (!latestReport) return;
    if (String(latestReport.id).startsWith('mock_')) {
      setTranslatedReportText(t(latestReport.message as any));
    } else if (i18n.language !== 'en') {
      translateText(latestReport.message, i18n.language).then(setTranslatedReportText);
    } else {
      setTranslatedReportText(latestReport.message);
    }
  }, [latestReport, i18n.language]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <Animated.View entering={FadeInDown.duration(800)} style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.background, isDark ? "#0f172a" : "#f0f4ff", isDark ? "#020617" : "#e0e7ff"]} style={StyleSheet.absoluteFill} />
      
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.decorativeCircle, animatedDrift1, { backgroundColor: colors.primary, top: -150, right: -50, width: 400, height: 400, opacity: isDark ? 0.3 : 0.15 }]} />
        <Animated.View style={[styles.decorativeCircle, animatedDrift2, { backgroundColor: "#EAB308", bottom: "10%", left: -100, width: 300, height: 300, opacity: isDark ? 0.2 : 0.1 }]} />
      </View>

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent} 
          onScroll={(e) => scrollY.value = e.nativeEvent.contentOffset.y} 
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        >
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={[styles.header, { marginBottom: headerMarginBottom }]}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 16 }}>
              <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.headerIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)" }]}>
                <WebIcon name="menu-outline" size= {24} color={colors.text} />
              </TouchableOpacity>
              {showGreeting && (
                <Animated.View exiting={FadeOut.duration(800)} style={{ marginLeft: 16, flex: 1 }}>
                  {renderGreetingWithFlag()}
                  <Text style={[styles.userName, { color: colors.text, fontSize: userNameSize }]} numberOfLines={1}>{user?.firstName || t('traveler')} 👋</Text>
                </Animated.View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity 
                onPress={() => setIsOfficialModalVisible(true)} 
                style={[styles.headerIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)" }]}
              >
                <WebIcon name="notifications" size= {20} color={colors.text} />
                {unreadOfficialCount > 0 && (
                  <View style={[styles.bellBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.bellBadgeText}>{unreadOfficialCount > 9 ? '9+' : unreadOfficialCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View>
                <TouchableOpacity onPress={() => router.push("/(root)/profile")} style={[styles.avatarContainer, { borderColor: colors.primary }]}>
                  {user?.imageUrl ? (
                    <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                      <WebIcon name="person" size= {24} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
                <View style={[styles.statusDotBadge, { backgroundColor: isOnline ? "#10B981" : "#EF4444", borderColor: colors.background }]} />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={[styles.searchContainer, { marginTop: searchMarginTop, marginBottom: searchMarginBottom }]}>
            <Text style={[styles.tagline, { color: colors.textSecondary, marginBottom: taglineMarginBottom, fontSize: taglineSize }]}>{t('smartCityCommute')}</Text>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => router.push({ pathname: "/(root)/find-ride", params: { origin: "", destination: "", originCoords: "", destCoords: "" } })} 
              style={[
                styles.searchTrigger, 
                { 
                  backgroundColor: isDark ? "rgba(30, 41, 59, 0.6)" : "#ffffff", 
                  borderColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#dbeafe",
                  minHeight: searchMinHeight,
                  paddingVertical: paddingVerticalSmall
                }
              ]}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(59, 130, 246, 0.12)", alignItems: "center", justifyContent: "center" }}>
                <WebIcon name="search" size= {22} color="#3b82f6" />
              </View>
              <View style={{ flex: 1, marginLeft: 16, gap: 4 }}>
                <Text style={{ fontSize: headingSize, fontWeight: "900", color: colors.text, lineHeight: 22 }}>
                  {t('where_going')}
                </Text>
                <Text style={{ fontSize: searchSubSize, fontWeight: '800', color: "#3b82f6", letterSpacing: 0.5 }}>
                  TAP DESTINATION TO PLAN YOUR TRIP
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {isInstallable && (
            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={[styles.section, { marginTop: sectionMarginTop }]}>
              <TouchableOpacity onPress={handleInstallClick} style={[styles.liveTicker, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40', paddingVertical: paddingVerticalSmall }]}>
                <View style={[styles.searchIconBox, { backgroundColor: colors.primary, marginRight: 12 }]}>
                  <WebIcon name="download-outline" size= {18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.liveLabel, { color: colors.primary, fontSize: liveLabelSize }]}>{t('install_app')}</Text>
                  <Text style={[styles.liveText, { color: colors.text, fontSize: liveTextSize, opacity: 0.9 }]} numberOfLines={2}>
                    {t('install_app_desc')}
                  </Text>
                </View>
                <WebIcon name="add-circle" size= {24} color={colors.primary} />
              </TouchableOpacity>
            </Animated.View>
          )}



          <Animated.View entering={FadeInUp.delay(350).duration(600)} style={[styles.section, { marginTop: sectionMarginTop }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: sectionTitleSize }]}>{t('recent_journey', 'Recent Journey')}</Text>
              {recentRides.length > 0 && (
                <TouchableOpacity 
                  style={[styles.viewAllBtn, { backgroundColor: colors.primary + '15', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  onPress={() => router.push("/(root)/(tabs)/history")}
                >
                  <WebIcon name="time" size= {16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800", textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('history')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {recentRides.length > 0 ? (
              <TouchableOpacity 
                onPress={() => router.push({ pathname: "/(root)/find-ride", params: recentRides[0] as Record<string, any> })}
                style={[styles.liveTicker, { backgroundColor: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.7)", borderColor: colors.primary + '20' }]}
              >
                <Animated.View style={[styles.pulseDot, { backgroundColor: colors.primary, marginRight: 8 }, animatedPulse]} />
                <View style={[styles.iconBoxSmall, { backgroundColor: colors.primary + '15', marginRight: 12 }]}>
                   <WebIcon name="bus" size= {18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.liveLabel, { color: colors.primary, fontSize: liveLabelSize }]} numberOfLines={1}>
                    {recentRides[0].destination}
                  </Text>
                  <Text style={[styles.liveText, { color: colors.text, fontSize: liveTextSize }]} numberOfLines={1}>
                    {t('from')} {recentRides[0].origin}
                  </Text>
                </View>
                <View style={styles.liveMeta}>
                   <Text style={[styles.liveTime, { color: colors.textSecondary }]}>{new Date(recentRides[0].date || Date.now()).toLocaleDateString()}</Text>
                   <WebIcon name="chevron-forward" size= {16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.emptyRides, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)", borderColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>{t('no_trips')}</Text>
              </View>
            )}
          </Animated.View>

          {latestReport && (
            <Animated.View entering={FadeInUp.delay(450).duration(600)} style={[styles.section, { marginTop: tickerMarginTop }]}>
              <TouchableOpacity onPress={() => router.push("/(root)/(tabs)/communitypost")} style={[styles.liveTicker, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', paddingVertical: paddingVerticalSmall }]}>
                <Animated.View style={[styles.pulseDot, { backgroundColor: colors.primary }, animatedPulse]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.liveLabel, { color: colors.primary, fontSize: liveLabelSize }]} numberOfLines={1}>
                    {`${latestReport.title} (@${latestReport.username || latestReport.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()})`} • {t('live_update')}
                  </Text>
                  <Text style={[styles.liveText, { color: colors.text, fontSize: liveTextSize }]} numberOfLines={1}>{translatedReportText || latestReport.message}</Text>
                </View>
                <WebIcon name="chevron-forward" size= {16} color={colors.primary} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {showInAppAlert && (
            <Animated.View entering={FadeInDown} exiting={FadeInUp} style={[styles.inAppAlert, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <TouchableOpacity style={styles.inAppAlertContent} onPress={() => { setShowInAppAlert(null); router.push("/(root)/(tabs)/communitypost"); }}>
                <View style={[styles.iconBoxSmall, { backgroundColor: colors.primary + '20' }]}>
                  <WebIcon name="chatbubble-ellipses" size= {18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.alertTitle, { color: colors.text }]}>{showInAppAlert.title}</Text>
                  <Text style={[styles.alertMessage, { color: colors.textSecondary }]} numberOfLines={1}>{showInAppAlert.message}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowInAppAlert(null)}>
                  <WebIcon name="close" size= {20} color={colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.delay(550).duration(600)} style={[styles.section, { marginTop: sectionMarginTop * 1.5 }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text, fontSize: sectionTitleSize }]}>{t('city_pulse')}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: -4 }}>{t('stay_informed_city')}</Text>
              </View>
              {cityPulses.length > 3 && (
                <TouchableOpacity 
                  style={[styles.viewAllBtn, { backgroundColor: colors.primary + '15', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  onPress={() => router.push("/(root)/city-pulse-list")}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800", textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('view_all', 'View All')}</Text>
                  <WebIcon name="chevron-forward" size= {14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.swiperContainer, { height: Platform.OS === 'web' ? 300 : 280 }]}>
              <Swiper 
                key={`swiper-${cityPulses.length}`}
                autoplay={true}
                autoplayTimeout={5} 
                showsPagination={true} 
                showsButtons={Platform.OS === 'web'} 
                loop={true}
                bounces={true}
                height= {Platform.OS === 'web' ? 300 : 280} 
                dot={<View style={{ backgroundColor: 'rgba(255,255,255,0.6)', width: 12, height: 6, borderRadius: 3, marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.8, shadowRadius: 2, elevation: 3 }} />}
                activeDot={<View style={{ backgroundColor: colors.primary, width: 32, height: 6, borderRadius: 3, marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.8, shadowRadius: 2, elevation: 3 }} />}
                paginationStyle={{ top: 16, right: 16, bottom: undefined, left: undefined, alignItems: 'flex-start' }}
                removeClippedSubviews={false}
              >
                {(cityPulses.length > 0 ? cityPulses.slice(0, 3) : (MOCK_NEWS as CityPulse[]).slice(0, 3)).map((item) => (
                  <View 
                    key={item.id} 
                    style={[styles.newsCard, { borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
                    pointerEvents="box-none"
                  >
                    <ImageBackground source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover">
                      <LinearGradient 
                        colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)", isDark ? "rgba(2, 6, 23, 1)" : "rgba(15, 23, 42, 0.98)"]} 
                        style={StyleSheet.absoluteFill} 
                      />
                      <View style={styles.newsTopRow} pointerEvents="none">
                        <View style={[styles.newsGlassTag, { backgroundColor: item.color + 'CC', borderColor: 'rgba(255,255,255,0.3)' }]}>
                          <Text style={styles.newsTagText}>{t(`news_tag_${item.tag.toLowerCase()}`, { defaultValue: item.tag }) as string}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.newsContentOverlay} pointerEvents="box-none">
                        <Text style={styles.newsTitlePremium} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.newsExcerptPremium} numberOfLines={2}>{item.excerpt}</Text>
                        
                        <View style={styles.newsFooter} pointerEvents="box-none">
                           <View style={styles.newsAuthorRow}>
                              <View style={[styles.authorAvatar, { backgroundColor: item.color }]}>
                                 <Text style={styles.authorInitial}>M</Text>
                              </View>
                              <Text style={styles.authorName}>myTroski News</Text>
                           </View>
                           <TouchableOpacity 
                             style={styles.readMorePill} 
                             activeOpacity={0.8}
                             onPress={() => Linking.openURL(item.url)}
                           >
                              <Text style={styles.readMorePillText}>{t('read_more')}</Text>
                              <WebIcon name="arrow-forward" size= {16} color="#fff" />
                           </TouchableOpacity>
                        </View>
                      </View>
                    </ImageBackground>
                  </View>
                ))}
              </Swiper>
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      <SideMenu isVisible={isMenuVisible} onClose={() => setMenuVisible(false)} onShowTutorial={() => { setMenuVisible(false); setTutorialVisible(true); }} />

      {showTutorialPopup && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents="box-none">
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeInUp} style={[styles.welcomeModal, { backgroundColor: colors.surface }]}>
              <LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={styles.modalHeaderGradient}><WebIcon name="information-circle-outline" size= {48} color="#fff" /></LinearGradient>
              <View style={styles.modalTextContainer}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('tutorial_popup_title')}</Text>
                <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>{t('tutorial_popup_desc')}</Text>
              </View>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.skipBtn, { borderColor: colors.border }]} onPress={async () => { await AsyncStorage.setItem("hasSeenTutorial", "true"); setShowTutorialPopup(false); }}>
                  <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>{t('skip')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowTutorialPopup(false); setTutorialVisible(true); }}>
                  <Text style={styles.startBtnText}>{t('tutorial_popup_start')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </View>
      )}

      <TutorialModal isVisible={isTutorialVisible} onClose={() => setTutorialVisible(false)} />

      <OfficialAnnouncementsModal 
        isVisible={isOfficialModalVisible} 
        onClose={() => setIsOfficialModalVisible(false)} 
      />

      {showIOSInstall && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents="box-none">
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeInUp.springify().damping(15)} style={[styles.welcomeModal, { backgroundColor: colors.surface }]}>
              <LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={[styles.modalHeaderGradient, { height: 120 }]}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' }}>
                  <WebIcon name="share-outline" size= {32} color="#fff" />
                </View>
              </LinearGradient>
              <View style={styles.modalTextContainer}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>{t('install_on_ios', 'Install on iOS')}</Text>
                
                <View style={{ width: '100%', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary }}>1</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>
                      Tap the <Text style={{ fontWeight: '800', color: colors.text }}>Share</Text> icon below
                    </Text>
                    <WebIcon name="share-outline" size= {24} color={colors.primary} />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary }}>2</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>
                      Select <Text style={{ fontWeight: '800', color: colors.text }}>Add to Home Screen</Text>
                    </Text>
                    <WebIcon name="add-square-outline" size= {24} color={colors.primary} />
                  </View>
                </View>

              </View>
              <View style={[styles.modalFooter, { borderTopWidth: 0, paddingTop: 0 }]}>
                <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary, width: '100%', flex: 1, height: 56, borderRadius: 20 }]} onPress={() => setShowIOSInstall(false)}>
                  <Text style={[styles.startBtnText, { fontSize: 18 }]}>{t('got_it', 'Got it')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </View>
      )}

      {showAndroidInstall && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents="box-none">
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeInUp.springify().damping(15)} style={[styles.welcomeModal, { backgroundColor: colors.surface }]}>
              <LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={[styles.modalHeaderGradient, { height: 120 }]}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' }}>
                  <WebIcon name="ellipsis-vertical" size= {32} color="#fff" />
                </View>
              </LinearGradient>
              <View style={styles.modalTextContainer}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>{t('install_on_android', 'Install on Android')}</Text>
                
                <View style={{ width: '100%', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary }}>1</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>
                      Tap the <Text style={{ fontWeight: '800', color: colors.text }}>Menu</Text> icon above
                    </Text>
                    <WebIcon name="ellipsis-vertical" size= {24} color={colors.primary} />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary }}>2</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>
                      Select <Text style={{ fontWeight: '800', color: colors.text }}>Install app</Text>
                    </Text>
                    <WebIcon name="download-outline" size= {24} color={colors.primary} />
                  </View>

                  <View style={{ marginTop: 8, marginBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                    <Text style={{ marginHorizontal: 12, color: colors.textSecondary, fontWeight: '800', fontSize: 13 }}>OR</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  </View>

                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', padding: 16, borderRadius: 16, justifyContent: 'center', gap: 12, elevation: 4 }}
                    onPress={() => Linking.openURL('https://expo.dev/artifacts/eas/PdmETQdkqhniYTf9zvRWRxXUqZ3ltzEgGFQ0zGuSHYE.apk')}
                  >
                    <WebIcon name="logo-android" size= {24} color="#fff" />
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>Download native APK</Text>
                  </TouchableOpacity>
                </View>

              </View>
              <View style={[styles.modalFooter, { borderTopWidth: 0, paddingTop: 0 }]}>
                <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary, width: '100%', flex: 1, height: 56, borderRadius: 20 }]} onPress={() => setShowAndroidInstall(false)}>
                  <Text style={[styles.startBtnText, { fontSize: 18 }]}>{t('got_it', 'Got it')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 120 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32, marginTop: 8 },
  greeting: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.8 },
  userName: { fontSize: 16, fontWeight: "900", marginTop: 1, letterSpacing: -0.2 },
  avatarContainer: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, overflow: "hidden" },
  avatar: { width: "100%", height: "100%" },
  avatarPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerIconBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center", elevation: 4 },
  searchTrigger: { flexDirection: "row", alignItems: "center", minHeight: 64, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, ...Platform.select({ web: {}, default: { elevation: 8, shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12 } }) },
  searchDivider: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 12 },
  searchPlaceholder: { fontSize: 16, fontWeight: "600", flex: 1 },
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  emptyRides: { padding: 30, borderRadius: 24, borderStyle: "dashed", borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  searchContainer: { marginBottom: 24 },
  searchIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  swiperContainer: { marginTop: 8 },
  newsCard: { flex: 1, borderRadius: 24, overflow: "hidden", borderWidth: 1, ...Platform.select({ web: {}, default: { elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 } }) },
  newsTopRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  newsGlassTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  liveTicker: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginHorizontal: 2 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  liveLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  liveText: { fontSize: 15, fontWeight: '600' },
  newsTagText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  newsContentOverlay: { paddingVertical: 16, paddingHorizontal: Platform.OS === 'web' ? 48 : 20, paddingBottom: 24, marginTop: "auto" },
  newsTitlePremium: { fontSize: 18, fontWeight: "900", color: "#fff", letterSpacing: -0.2, lineHeight: 24, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  newsExcerptPremium: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500", marginTop: 8, lineHeight: 18, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  newsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  newsAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  authorInitial: { color: '#fff', fontSize: 12, fontWeight: '900' },
  authorName: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700' },
  readMorePill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 6 },
  readMorePillText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  viewAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  newsMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  newsTimeText: { color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: "600" },
  newsReadBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6, elevation: 5 },
  newsReadText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  scrollIndicator: { alignItems: "center", marginTop: 20, marginBottom: 10 },
  scrollText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.8, marginBottom: 2, opacity: 0.5 },
  networkStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 4, alignSelf: 'flex-start' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  statusText: { fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  headerLanguageWrapper: { borderRadius: 14, paddingHorizontal: 4, height: 44, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  welcomeModal: { width: '100%', maxWidth: 340, borderRadius: 32, overflow: 'hidden', elevation: 25 },
  modalHeaderGradient: { height: 120, justifyContent: 'center', alignItems: 'center' },
  modalTextContainer: { padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  modalDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24, letterSpacing: 0.2 },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  skipBtn: { flex: 1, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  skipBtnText: { fontSize: 16, fontWeight: '700' },
  startBtn: { flex: 2, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  decorativeCircle: { position: "absolute", borderRadius: 999 },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  inAppAlert: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 9999,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  inAppAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBoxSmall: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  alertMessage: {
    fontSize: 14,
  },
  statusDotBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  liveMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveTime: {
    fontSize: 12,
    fontWeight: '700',
  },
});
