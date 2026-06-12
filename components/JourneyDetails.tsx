import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../context/ThemeContext";
import { Location, ActiveLeg, TripDetails } from "../constants/types";
import { ScrollIndicator } from "./ScrollIndicator";
import { WebIcon } from "./WebIcon";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const LoadingState = ({ isDark, colors }: any) => {
  const { t } = useTranslation();
  const progressAnim = useSharedValue(-300);
  const textOpacity = useSharedValue(1);
  const [msgIndex, setMsgIndex] = React.useState(0);

  const statusMessages = [
    t("finding_trotros"),
    t("calculating_routes"),
    t("fetching_fares"),
    t("optimizing_journey"),
  ];

  React.useEffect(() => {
    // Professional Liquid Shimmer
    progressAnim.value = withRepeat(
      withTiming(400, {
        duration: 2000,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      false,
    );

    const interval = setInterval(() => {
      // Text breathing transition
      textOpacity.value = withSequence(
        withTiming(0, { duration: 400 }),
        withTiming(1, { duration: 600 }),
      );
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % statusMessages.length);
      }, 400);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progressAnim.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.loadingContainer}>
      <View
        style={[
          styles.loadingBar,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
          },
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
          <LinearGradient
            colors={[
              "transparent",
              colors.primary,
              colors.primary + "80",
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, width: 300 }}
          />
        </Animated.View>
      </View>
      <Animated.Text
        style={[
          styles.loadingStatusText,
          animatedTextStyle,
          { color: colors.textSecondary },
        ]}
      >
        {statusMessages[msgIndex]}
      </Animated.Text>
    </View>
  );
};

const QUICK_DESTINATIONS = [
  { id: "1", name: "Circle", icon: "bus", lat: 5.5599, lng: -0.2084 },
  { id: "2", name: "Accra Mall", icon: "cart", lat: 5.62, lng: -0.1736 },
  { id: "3", name: "Madina", icon: "business", lat: 5.6681, lng: -0.1656 },
  { id: "4", name: "Airport", icon: "airplane", lat: 5.6037, lng: -0.1706 },
  { id: "5", name: "37 Station", icon: "medkit", lat: 5.5866, lng: -0.1872 },
  { id: "6", name: "Tema Station", icon: "train", lat: 5.5488, lng: -0.2019 },
];
const START_ACCENT = "#10b981";
const DEST_ACCENT = "#3b82f6";

const LEG_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

interface JourneyDetailsProps {
  origin: string;
  originLocation?: Location | null;
  destination: string;
  destinationLocation?: Location | null;
  priceEstimate: string | null;
  isManualFare?: boolean;
  tripDetails: TripDetails | null;
  activeLegs: ActiveLeg[];
  loading: boolean;
  openSearch: (field: "origin" | "destination") => void;
  handleStartTrip?: () => void;
  handleEndJourney: () => void | Promise<void>;
  resetRide?: () => void;
  isNavigationMode?: boolean;
  onSelectShortcut?: (location: any) => void;
  onSnapToCurrentLocation?: () => void;
  nearbyHubs?: any[];
  onStepPress?: (coords: any[]) => void;
  walkingCoords1?: any[];
  walkingCoords2?: any[];
  transferWalkingCoords?: any[][];
}

// Enhanced Ribbon Summary for at-a-glance understanding
const RouteRibbon = ({
  legs,
  walkMins1,
  walkMins2,
  colors,
  onStepPress,
  walkingCoords1,
  walkingCoords2,
  transferWalkingCoords = [],
}: any) => {
  const { t } = useTranslation();
  type RibbonStep = { type: string; icon: any; color?: string; coords?: any[] };
  const steps: RibbonStep[] = [];

  steps.push({ type: "origin", icon: "flag", coords: legs[0]?.coordinates });
  if (Math.round(walkMins1) > 0)
    steps.push({
      type: "walk",
      icon: "walk",
      coords: walkingCoords1 || legs[0]?.coordinates,
    });
  legs.forEach((_: any, i: number) => {
    steps.push({
      type: "bus",
      icon: "bus",
      color: LEG_COLORS[i % LEG_COLORS.length],
      coords: legs[i].coordinates,
    });
    if (i < legs.length - 1) {
      const hasWalk = transferWalkingCoords[i] && transferWalkingCoords[i].length > 1 && Math.round(transferWalkingCoords[i].duration || 0) > 0;
      steps.push({
        type: hasWalk ? "walk" : "transfer",
        icon: hasWalk ? "walk" : "swap-horizontal",
        coords: hasWalk ? transferWalkingCoords[i] : legs[i].coordinates,
      });
    }
  });
  if (Math.round(walkMins2) > 0)
    steps.push({
      type: "walk",
      icon: "walk",
      coords: walkingCoords2 || legs[legs.length - 1]?.coordinates,
    });
  steps.push({
    type: "destination",
    icon: "location",
    coords: legs[legs.length - 1]?.coordinates,
  });

  return (
    <View style={{ alignItems: "center" }}>
      <View style={styles.ribbonContainer}>
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => step.coords && onStepPress?.(step.coords)}
              style={[
                styles.ribbonStep,
                {
                  backgroundColor:
                    step.color ||
                    (step.type === "origin"
                      ? "#10b981"
                      : step.type === "destination"
                        ? "#3b82f6"
                        : colors.border + "40"),
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                },
              ]}
            >
              <WebIcon
                name={step.icon}
                size={15}
                color={step.type === "walk" ? colors.text : "#fff"}
              />
            </TouchableOpacity>
            {i < steps.length - 1 && (
              <View
                style={[styles.ribbonLink, { backgroundColor: colors.border }]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
      <Animated.View entering={FadeIn.delay(800)}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "900",
            color: colors.primary,
            opacity: 0.8,
            letterSpacing: 1.5,
            marginTop: 6,
          }}
        >
          {t("journey_milestones", "JOURNEY MILESTONES • TAP TO ZOOM").toUpperCase()}
        </Text>
      </Animated.View>
    </View>
  );
};

const TransitLegItem = React.memo(
  ({
    leg,
    idx,
    isLast,
    onStepPress,
    transferWalk,
  }: {
    leg: ActiveLeg;
    idx: number;
    isLast: boolean;
    isExpanded?: boolean;
    onToggleExpand?: (idx: number) => void;
    totalLegs?: number;
    onStepPress?: (coords: any[]) => void;
    transferWalk?: any;
  }) => {
    const { t } = useTranslation();
    const { colors, isDark } = useTheme();
    const legColor = LEG_COLORS[idx % LEG_COLORS.length] || colors.primary;

    return (
      <View style={{ marginBottom: 12 }}>
        <Animated.View
          entering={FadeInDown.delay(100 * idx)}
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff",
            borderWidth: 1.5,
            borderColor: legColor + "40",
            borderRadius: 20,
            overflow: "hidden",
            elevation: 3,
            shadowColor: legColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          }}
        >
          <TouchableOpacity
            style={{ flexDirection: "row", padding: 14, alignItems: "center" }}
            activeOpacity={0.7}
            onPress={() => onStepPress?.(leg.coordinates)}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: legColor,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: legColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <WebIcon name="bus" size={22} color="#fff" />
            </View>

            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text, marginBottom: 2, letterSpacing: -0.3 }}>
                {t('take_trotro_to', 'Take Trotro to {{destination}}', { destination: leg.endStop.name })}
              </Text>
              
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary }}>
                Board at {leg.startStop.name}
              </Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: legColor + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                   <WebIcon name="time-outline" size={14} color={legColor} />
                   <Text style={{ fontSize: 14, fontWeight: "800", color: legColor, marginLeft: 4 }}>
                     {Math.round(leg.duration)} min
                   </Text>
                </View>
                {leg.fare && (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#10b98115", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                     <WebIcon name="cash-outline" size={14} color="#10b981" />
                     <Text style={{ fontSize: 14, fontWeight: "800", color: "#10b981", marginLeft: 4 }}>
                       {leg.fare}
                     </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* FRIENDLY TRANSFER INDICATOR */}
        {!isLast && (
          <View style={{ alignItems: "center", marginVertical: 4 }}>
            <View style={{ width: 3, height: 16, backgroundColor: legColor + "40", borderRadius: 1.5 }} />
            <View style={{ 
              backgroundColor: isDark ? "#334155" : "#f1f5f9", 
              paddingVertical: 6, 
              paddingHorizontal: 14, 
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border
            }}>
              <WebIcon name={transferWalk?.coordinates?.length > 1 && Math.round(transferWalk.duration) > 0 ? "walk" : "swap-horizontal"} size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textSecondary, marginLeft: 6 }}>
                {transferWalk?.coordinates?.length > 1 && Math.round(transferWalk.duration) > 0
                  ? `Walk ${Math.round(transferWalk.duration)} min to next stop`
                  : `Transfer here`}
              </Text>
            </View>
            <View style={{ width: 3, height: 16, backgroundColor: LEG_COLORS[(idx + 1) % LEG_COLORS.length] + "40", borderRadius: 1.5 }} />
          </View>
        )}
      </View>
    );
  },
);

TransitLegItem.displayName = "TransitLegItem";

export default function JourneyDetails({
  origin,
  originLocation,
  destination,
  destinationLocation,
  priceEstimate,
  isManualFare,
  tripDetails,
  activeLegs,
  loading,
  openSearch,
  handleStartTrip,
  handleEndJourney,
  resetRide,
  isNavigationMode,
  onSelectShortcut,
  onSnapToCurrentLocation,
  nearbyHubs = [],
  onStepPress,
  walkingCoords1,
  walkingCoords2,
  transferWalkingCoords = [],
}: JourneyDetailsProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = false; // Always use mobile layout for the phone emulator
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // Pulsing animation for mini start button
  const pulseScale = useSharedValue(1);
  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
      true,
    );
  }, []);

  const setDetailsVisibleInternal = React.useCallback((visible: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDetailsVisible(visible);
  }, []);

  React.useEffect(() => {
    if (isNavigationMode) setDetailsVisibleInternal(false);
    else if (activeLegs.length > 0) {
      // Auto-hide details when a route is found so map is clear
      setDetailsVisibleInternal(false);
    } else {
      setDetailsVisibleInternal(false);
    }
  }, [isNavigationMode, activeLegs.length, setDetailsVisibleInternal]);

  const toggleDetails = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDetailsVisible((prev) => !prev);
  }, []);

  const touchStartY = React.useRef(0);

  const handleGrabberTouchStart = React.useCallback((e: any) => {
    touchStartY.current = e.nativeEvent.pageY;
  }, []);

  const handleGrabberTouchEnd = React.useCallback((e: any) => {
    const dy = e.nativeEvent.pageY - touchStartY.current;
    if (dy > 30) {
      setDetailsVisibleInternal(false);
    } else if (dy < -30) {
      setDetailsVisibleInternal(true);
    } else {
      toggleDetails();
    }
  }, [toggleDetails, setDetailsVisibleInternal]);

  const toggleLegExpansion = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedLegIndex(expandedLegIndex === idx ? null : idx);
  };

  const handleStepPressInternal = React.useCallback(
    (coords: any[]) => {
      onStepPress?.(coords);
      setDetailsVisibleInternal(false);
    },
    [onStepPress, setDetailsVisibleInternal],
  );

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    // Show hint if there's more than 20px of content below
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 30;
    if (isCloseToBottom && showScrollHint) setShowScrollHint(false);
    else if (!isCloseToBottom && !showScrollHint) setShowScrollHint(true);
  };

  // Threshold for snapping (decreased height for a sleeker look)
  const expandedHeight =
    activeLegs.length > 0 ? SCREEN_HEIGHT * 0.65 : SCREEN_HEIGHT * 0.55;
  const collapsedHeight = activeLegs.length > 0 ? 260 : 220;

  const animatedHeightStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(isDetailsVisible ? expandedHeight : collapsedHeight, {
        damping: 18,
        stiffness: 100,
      }),
    };
  }, [isDetailsVisible, expandedHeight, collapsedHeight]);

  if (loading) {
    return (
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[
          styles.searchCard,
          {
            height: 180,
            backgroundColor: isDark ? "rgba(30, 41, 59, 0.95)" : "#fff",
            borderColor: colors.border,
            width: isDesktop ? 400 : "100%",
            left: isDesktop ? 20 : 0,
            bottom: isDesktop ? 20 : 0,
            right: isDesktop ? undefined : 0,
            borderBottomLeftRadius: isDesktop ? 32 : 0,
            borderBottomRightRadius: isDesktop ? 32 : 0,
            borderWidth: isDesktop ? 1 : styles.searchCard.borderTopWidth,
          },
        ]}
      >
        <View style={styles.grabberContainer}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        </View>
        <LoadingState isDark={isDark} colors={colors} />
      </Animated.View>
    );
  }

  // --- NAVIGATION MINI BAR ---
  if (isNavigationMode && !isDetailsVisible) {
    return (
      <Animated.View
        style={[
          styles.navMiniBar,
          {
            backgroundColor: isDark ? "#111827" : "#fff",
            borderColor: colors.border,
            width: isDesktop ? 400 : "100%",
            left: isDesktop ? 20 : 0,
            bottom: isDesktop ? 20 : 0,
            right: isDesktop ? undefined : 0,
            borderBottomLeftRadius: isDesktop ? 32 : 0,
            borderBottomRightRadius: isDesktop ? 32 : 0,
            borderWidth: isDesktop ? 1 : styles.navMiniBar.borderTopWidth,
          },
        ]}
      >
        <View
          style={styles.grabberContainer}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleGrabberTouchStart}
          onResponderRelease={handleGrabberTouchEnd}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.navBarContent}>
          <View style={[styles.navMetrics, { alignItems: 'flex-start', flex: 1 }]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={[
                  styles.navFareBadge,
                  { backgroundColor: colors.primary + "12", marginLeft: 0, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 },
                ]}
              >
                <Text style={[styles.navFareText, { color: colors.primary, fontSize: 19, fontWeight: '900' }]}>
                  {priceEstimate}
                </Text>
              </View>
            </View>
            <Text style={[styles.navSubText, { color: colors.textSecondary, fontSize: 16, marginTop: 6 }]}>
              {activeLegs.reduce((acc, l) => acc + l.distance, 0).toFixed(1)} km
              • {t("remaining")}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setDetailsVisibleInternal(true)}
              style={[
                styles.navStepsBtn,
                { backgroundColor: colors.primary + "10", width: 44, height: 44, borderRadius: 22 },
              ]}
            >
              <WebIcon name="list" size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEndJourney}
              style={[styles.navExitBtnCircle, { backgroundColor: "#EF4444", width: 'auto', paddingHorizontal: 16, height: 44, borderRadius: 22, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }]}
            >
              <WebIcon name="close" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { zIndex: 100 }]}
      pointerEvents="box-none"
      entering={FadeInDown.delay(200).duration(1000).springify()}
    >
      <Animated.View
        style={[
          styles.searchCard,
          animatedHeightStyle,
          {
            backgroundColor: isDark
              ? "rgba(30, 41, 59, 0.75)"
              : "rgba(255, 255, 255, 0.85)",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            overflow: "hidden",
            width: isDesktop ? 400 : "100%",
            left: isDesktop ? 20 : 0,
            bottom: isDesktop ? 20 : 0,
            right: isDesktop ? undefined : 0,
            borderBottomLeftRadius: isDesktop ? 32 : 0,
            borderBottomRightRadius: isDesktop ? 32 : 0,
            borderWidth: isDesktop ? 1 : styles.searchCard.borderTopWidth,
            // @ts-ignore
            backdropFilter: "blur(20px)",
            // @ts-ignore
            WebkitBackdropFilter: "blur(20px)",
          },
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(15, 23, 42, 0.85)"
                : "rgba(255, 255, 255, 0.95)",
            },
          ]}
        />

        {/* Grabber Handle */}
        <View
          style={styles.grabberContainer}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleGrabberTouchStart}
          onResponderRelease={handleGrabberTouchEnd}
        >
          <View
            style={[
              styles.grabber,
              { backgroundColor: isDark ? "#475569" : "#cbd5e1" },
            ]}
          />
        </View>

        {/* Simplified Friendly Trip Summary (Always Visible if there's a trip) */}
        {tripDetails && activeLegs.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, alignItems: "center", width: "100%" }}>
            
            {/* BACK TO SEARCH BUTTON */}
            {!isNavigationMode && (
              <View style={{ width: "100%", flexDirection: "row", justifyContent: "flex-start", marginBottom: 8 }}>
                 <TouchableOpacity 
                   activeOpacity={0.8}
                   onPress={resetRide || handleEndJourney} 
                   style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                 >
                   <WebIcon name="arrow-back" size={16} color={colors.textSecondary} />
                   <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textSecondary, marginLeft: 4 }}>
                     {t("back_to_search", "Back to search").toUpperCase()}
                   </Text>
                 </TouchableOpacity>
              </View>
            )}

            {!isDetailsVisible && !isNavigationMode ? (
               // Collapsed Premium State
               <View style={{ width: '100%' }}>
                  <TouchableOpacity 
                    activeOpacity={0.9}
                    onPress={toggleDetails}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f9fafb",
                      padding: 16,
                      borderRadius: 24,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + "15", justifyContent: "center", alignItems: "center" }}>
                      <WebIcon name="bus" size={32} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>Est:</Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>{priceEstimate}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#10b981", marginRight: 8 }}>
                          {tripDetails.travelMins + tripDetails.walkMins1 + tripDetails.walkMins2 + (tripDetails.trafficMins || 0) + (tripDetails.waitTimeMins || 0)} {t("min")}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary }}>
                          • Tap for steps
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleStartTrip}
                    activeOpacity={0.9}
                    style={{ width: "100%" }}
                  >
                    <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                      <LinearGradient
                        colors={[colors.primary, colors.primary + "E6"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          paddingVertical: 18,
                          borderRadius: 20,
                          flexDirection: "row",
                          justifyContent: "center",
                          alignItems: "center",
                          elevation: 8,
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: "900", color: "#fff", marginRight: 8, letterSpacing: 1 }}>
                          {t("start_journey").toUpperCase()}
                        </Text>
                        <WebIcon name="navigate" size={20} color="#fff" />
                      </LinearGradient>
                    </Animated.View>
                  </TouchableOpacity>
               </View>
            ) : (
               // Expanded Details State Header
               <View style={{ width: '100%', alignItems: 'center' }}>
                  <LinearGradient
                    colors={isDark ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"] : ["#ffffff", "#f8fafc"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ 
                      width: '100%', 
                      flexDirection: "row", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      padding: 20, 
                      borderRadius: 28, 
                      borderWidth: 1, 
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,1)",
                      shadowColor: isDark ? "#000" : "#94a3b8",
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: isDark ? 0.3 : 0.15,
                      shadowRadius: 16,
                      elevation: 4
                    }}
                  >
                     <View style={{ flexDirection: "row", alignItems: "center", flex: 0.8, paddingRight: 5 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary + "15", justifyContent: "center", alignItems: "center", marginRight: 8, transform: [{ rotate: '-5deg' }] }}>
                           <WebIcon name="time" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                           <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 11, fontWeight: "900", color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Total Time</Text>
                           <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>
                             {tripDetails.travelMins + tripDetails.walkMins1 + tripDetails.walkMins2 + (tripDetails.trafficMins || 0) + (tripDetails.waitTimeMins || 0)} {t("min")}
                           </Text>
                        </View>
                     </View>
                     
                     <View style={{ width: 1, height: 40, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", marginHorizontal: 5 }} />
                     
                     <View style={{ flexDirection: "row", alignItems: "center", flex: 1.2, justifyContent: "flex-end", paddingLeft: 5 }}>
                        <View style={{ flex: 1 }}>
                           <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 11, fontWeight: "900", color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, textAlign: 'right' }}>Est. Fare</Text>
                           <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 16, fontWeight: "900", color: "#10b981", textAlign: 'right' }}>
                             {priceEstimate}
                           </Text>
                        </View>
                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#10b98115", justifyContent: "center", alignItems: "center", marginLeft: 8, transform: [{ rotate: '5deg' }] }}>
                           <WebIcon name="cash" size={20} color="#10b981" />
                        </View>
                     </View>
                  </LinearGradient>
               </View>
            )}
          </View>
        )}

        {/* Collapsed Empty State (When no route is active) */}
        {!isDetailsVisible && activeLegs.length === 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, width: "100%" }}>
            <View style={{
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderRadius: 20,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderWidth: 1.5,
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 16,
              elevation: 4
            }}>
              {/* START LOCATION ROW */}
              <TouchableOpacity 
                onPress={() => {
                   setDetailsVisibleInternal(true);
                   openSearch("origin");
                }}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 18 }}
                activeOpacity={0.7}
              >
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: START_ACCENT, marginRight: 20, marginLeft: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                    {origin || t("start_point", "Current Location")}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={{ height: 1.5, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", marginLeft: 32 }} />

              {/* DESTINATION ROW */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                   setDetailsVisibleInternal(true);
                   openSearch("destination");
                }}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 18 }}
              >
                <View style={{ width: 12, height: 12, backgroundColor: DEST_ACCENT, marginRight: 20, marginLeft: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "600", color: destination ? colors.text : colors.textSecondary }} numberOfLines={1}>
                    {destination || t("where_to", "Where to?")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isDetailsVisible && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.itineraryContainer}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 120,
            }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Detailed Time Breakdown */}
            {tripDetails && (
              <View style={{ width: '100%', marginTop: 10, paddingHorizontal: 16, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: 20, paddingVertical: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textSecondary }}>🚶 Walk to Station</Text>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>{tripDetails?.walkMins1} min</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textSecondary }}>⏳ Wait Time (Est.)</Text>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>{tripDetails?.waitTimeMins || 0} min</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textSecondary }}>{t('trotro_journey', '🚐 Trotro Journey')}</Text>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>{tripDetails?.travelMins} min</Text>
                  </View>
                  {(tripDetails?.trafficMins || 0) > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: ((tripDetails?.walkMins2 || 0) > 0 ? 10 : 0) }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#f59e0b" }}>🚦 Traffic Delay</Text>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: "#f59e0b" }}>+{tripDetails?.trafficMins} min</Text>
                      </View>
                  )}
                  {((tripDetails?.walkMins2 || 0) > 0) && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textSecondary }}>🚶 Walk to Destination</Text>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>{tripDetails?.walkMins2} min</Text>
                      </View>
                  )}
              </View>
            )}
            
            {/* Main Instruction Header for Expanded State */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, marginBottom: 8 }}>
              <View style={{ backgroundColor: colors.primary + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: "900", color: colors.primary, letterSpacing: 1.5 }}>
                  {t("follow_path").toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textSecondary, opacity: 0.9 }}>
                {t("follow_highlighted", "Follow the highlighted route")}
              </Text>
            </View>

            {/* Interactive Tip (Only show if a route is active) */}
            {activeLegs.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary + "10",
                  padding: 8,
                  borderRadius: 10,
                  marginBottom: 10,
                  gap: 6,
                  borderWidth: 1.5,
                  borderColor: colors.primary + "20",
                }}
              >
                <WebIcon name="sparkles" size={14} color={colors.primary} />
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "800",
                    color: colors.primary,
                    letterSpacing: 0.5,
                  }}
                >
                  {t('tip_tap_step', 'TIP: Tap milestones to explore steps').toUpperCase()}
                </Text>
              </View>
            )}

            {/* NEW SEARCH & SHORTCUTS SECTION (When no route is active) */}
            {!isNavigationMode && activeLegs.length === 0 && (
              <View style={{ paddingTop: 10, width: "100%" }}>
                
                {/* UNIFIED SEARCH CARD */}
                <View style={{
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderRadius: 20,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  marginBottom: 24,
                  borderWidth: 1.5,
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: isDark ? 0.3 : 0.08,
                  shadowRadius: 16,
                  elevation: 4
                }}>
                  {/* START LOCATION ROW */}
                  <TouchableOpacity 
                    onPress={() => openSearch("origin")}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 18 }}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: START_ACCENT, marginRight: 20, marginLeft: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                        {origin || t("start_point", "Current Location")}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={{ height: 1.5, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", marginLeft: 32 }} />

                  {/* DESTINATION LOCATION ROW */}
                  <TouchableOpacity 
                    onPress={() => openSearch("destination")}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 18 }}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 12, height: 12, backgroundColor: DEST_ACCENT, marginRight: 20, marginLeft: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: destination ? colors.text : colors.textSecondary }} numberOfLines={1}>
                        {destination || t("where_to", "Where to?")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* VERTICAL SHORTCUTS (LIKE BOLT RECENT PLACES) */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text, marginBottom: 16, marginLeft: 4 }}>
                    {nearbyHubs.length > 0 ? t("nearby_verified_hubs", "Nearby Verified Hubs") : t("recent_places", "Recent places")}
                  </Text>
                  
                  {(nearbyHubs.length > 0 ? nearbyHubs : QUICK_DESTINATIONS).slice(0, 4).map((t: any, index: number) => {
                    const getShortcutStyle = (name: string) => {
                      const normalized = name.toLowerCase();
                      if (normalized.includes("circle")) return { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" };
                      if (normalized.includes("mall")) return { bg: "rgba(236, 72, 153, 0.15)", color: "#ec4899" };
                      if (normalized.includes("madina")) return { bg: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" };
                      if (normalized.includes("airport")) return { bg: "rgba(20, 184, 166, 0.15)", color: "#14b8a6" };
                      if (normalized.includes("37")) return { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" };
                      if (normalized.includes("tema")) return { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981" };
                      return { bg: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.08)", color: "#3b82f6" };
                    };
                    const shortcutStyle = getShortcutStyle(t.name);

                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => onSelectShortcut?.({ name: t.name, coordinate: t.coordinate || { latitude: t.lat, longitude: t.lng }, type: "station", isVerified: true })}
                        style={{ flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: index === 3 ? 0 : 1, borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                      >
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: shortcutStyle.bg, alignItems: "center", justifyContent: "center" }}>
                           <WebIcon name={t.icon || (t.type === "station" ? "bus" : "time")} size={20} color={shortcutStyle.color} />
                        </View>
                        <View style={{ marginLeft: 16, flex: 1 }}>
                           <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 4 }}>{t.name}</Text>
                           {t.dist !== undefined ? (
                             <Text style={{ fontSize: 15, color: colors.textSecondary }}>{t.dist < 1 ? `${(t.dist * 1000).toFixed(0)}m away` : `${t.dist.toFixed(1)}km away`}</Text>
                           ) : (
                             <Text style={{ fontSize: 15, color: colors.textSecondary }}>{t.type === "station" ? "Verified Station" : "Recent destination"}</Text>
                           )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}


            {/* 2. FIRST WALK CARD */}
            {Math.round(tripDetails?.walkMins1 ?? 0) > 0 && (
              <Animated.View entering={FadeInDown.delay(50)} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={{ 
                    flexDirection: "row", 
                    alignItems: "center", 
                    paddingHorizontal: 20, 
                    paddingVertical: 18,
                    backgroundColor: isDark ? "rgba(14, 165, 233, 0.08)" : "#f0f9ff",
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "#e0f2fe"
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (walkingCoords1 && walkingCoords1.length > 0) handleStepPressInternal(walkingCoords1);
                    else if (activeLegs[0]?.coordinates) handleStepPressInternal(activeLegs[0].coordinates);
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "#bae6fd", alignItems: "center", justifyContent: "center", shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 }}>
                    <WebIcon name="walk" size={24} color="#0284c7" />
                  </View>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text, marginBottom: 4 }}>
                      Walk to {activeLegs[0]?.startStop.name || t("boarding")}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <WebIcon name="time-outline" size={14} color="#0ea5e9" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#0ea5e9" }}>
                        {tripDetails?.walkMins1 ?? 0} {t("min")} walk
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", alignItems: 'center', justifyContent: 'center' }}>
                    <WebIcon name="chevron-forward" size={18} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* 3. TRANSIT LEGS */}
            {activeLegs.map((leg, idx) => (
              <TransitLegItem
                key={`leg-${idx}`}
                leg={leg}
                idx={idx}
                isLast={idx === activeLegs.length - 1}
                onStepPress={handleStepPressInternal}
                transferWalk={transferWalkingCoords[idx]}
              />
            ))}

            {/* 4. FINAL WALK CARD */}
            {Math.round(tripDetails?.walkMins2 ?? 0) > 0 && (
              <Animated.View entering={FadeInDown.delay(100)} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={{ 
                    flexDirection: "row", 
                    alignItems: "center", 
                    paddingHorizontal: 20, 
                    paddingVertical: 18,
                    backgroundColor: isDark ? "rgba(14, 165, 233, 0.08)" : "#f0f9ff",
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "#e0f2fe"
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (walkingCoords2 && walkingCoords2.length > 0) handleStepPressInternal(walkingCoords2);
                    else if (activeLegs[activeLegs.length - 1]?.coordinates) handleStepPressInternal(activeLegs[activeLegs.length - 1].coordinates);
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "#bae6fd", alignItems: "center", justifyContent: "center", shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 }}>
                    <WebIcon name="walk" size={24} color="#0284c7" />
                  </View>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text, marginBottom: 4 }}>
                      Walk to {destination || "Destination"}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <WebIcon name="time-outline" size={14} color="#0ea5e9" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#0ea5e9" }}>
                        {tripDetails?.walkMins2 ?? 0} {t("min")} walk
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", alignItems: 'center', justifyContent: 'center' }}>
                    <WebIcon name="chevron-forward" size={18} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}

          </ScrollView>
        )}

        {isDetailsVisible && tripDetails && (
          <View
            style={[
              styles.fixedStartJourneyContainer,
              { backgroundColor: 'transparent', borderTopWidth: 0 },
            ]}
          >
            <TouchableOpacity
              onPress={isNavigationMode ? handleEndJourney : handleStartTrip}
              activeOpacity={0.8}
              style={[
                styles.startJourneyFixedButton,
                {
                  shadowColor: isNavigationMode ? "#EF4444" : colors.primary,
                  backgroundColor: isNavigationMode
                    ? "#EF4444"
                    : colors.primary,
                },
              ]}
            >
              <View style={styles.buttonContent}>
                {isNavigationMode ? (
                  <>
                    <Text style={styles.buttonText}>
                      {t("exit_navigation")}
                    </Text>
                    <WebIcon
                      name="close-circle"
                      size={22}
                      color="#fff"
                      style={{ marginLeft: 10 }}
                    />
                  </>
                ) : (
                  <>
                    <WebIcon
                      name="location-sharp"
                      size={20}
                      color="#fff"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.buttonText}>{t("start_journey")}</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {isDetailsVisible && (
          <ScrollIndicator
            isVisible={showScrollHint}
            color={colors.primary}
            style={{ bottom: 110, right: 20 }}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    paddingHorizontal: 16,
    paddingTop: 4,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.2)",
    elevation: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -15 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    margin: 0,
  },
  ribbonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  ribbonStep: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  ribbonLink: {
    height: 2,
    width: 8,
    marginHorizontal: 2,
    opacity: 0.3,
  },
  stepCardWrapper: {
    marginBottom: 10,
  },
  journeyCard: {
    flexDirection: "row",
    padding: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardSubTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  cardMainTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  cardFareRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  cardFareText: {
    fontSize: 15,
    fontWeight: "700",
  },
  transferLinkBox: {
    alignItems: "center",
    marginVertical: 4,
    flexDirection: "row",
    justifyContent: "center",
  },
  transferLine: {
    width: 2,
    height: 20,
    opacity: 0.2,
    marginHorizontal: 10,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
    maxWidth: "45%",
    alignSelf: "center",
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  transferBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  transferText: {
    fontSize: 13,
    fontWeight: "800",
  },
  grabberContainer: {
    alignItems: "center",
    paddingVertical: 6,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  innerShortcuts: { marginTop: 0 },
  innerShortcutsTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  shortcutsScroll: { gap: 8 },
  shortcutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginRight: 8,
  },
  shortcutIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  shortcutText: { fontSize: 15, fontWeight: "800" },
  divider: { height: 1, width: "100%" },
  navMiniBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 25,
    elevation: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderTopWidth: 1,
    zIndex: 100,
  },
  navBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 5,
  },
  navExitBtnCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  navMetrics: { alignItems: "center", flex: 1 },
  navTimeText: { fontSize: 22, fontWeight: "900" },
  navFareBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  navFareText: { fontSize: 15, fontWeight: "800" },
  navSubText: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  navStepsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
  },
  priceValue: { fontSize: 24, fontWeight: "900", letterSpacing: -1 },
  subtitle: { fontSize: 15, fontWeight: "600", opacity: 0.7 },
  totalTime: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  badgeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  itineraryContainer: {
    flex: 1,
  },
  itineraryStep: {
    flexDirection: "row",
    minHeight: 40,
  },
  timelineCol: {
    width: 30,
    alignItems: "center",
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
  },
  smallStopDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  transferDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  lineSegment: {
    flex: 1,
    width: 4,
    borderRadius: 2,
    marginVertical: -2,
    zIndex: 1,
  },
  timelineCap: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginTop: -2,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  stepAction: {
    fontSize: 15,
    marginTop: 2,
  },
  legFareText: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "600",
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  instructionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: "700",
  },
  boardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  legTimeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tipContainer: {
    marginHorizontal: 16,
    padding: 6,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  stopsAccordion: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingVertical: 2,
  },
  stopsSummary: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  stopsList: {
    marginTop: 10,
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0,0,0,0.05)",
  },
  stopItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  stopName: {
    fontSize: 14,
    fontWeight: "500",
  },
  searchBarTrigger: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  searchIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  searchBarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  editIcon: {
    padding: 8,
    borderRadius: 10,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  originActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  themeBoxStart: {
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  themeBoxEnd: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    marginTop: 10,
  },
  themeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  themeBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  themeIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronBtn: {
    padding: 4,
  },
  fixedStartJourneyContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  startJourneyFixedButton: {
    width: "95%",
    height: 44,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBar: {
    width: "75%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  loadingStatusText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
    textAlign: "center",
    textTransform: "uppercase",
    opacity: 0.8,
  },
  hubHint: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  hubHintText: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  shortcutHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingRight: 5,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  shortcutDist: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
    opacity: 0.7,
  },
  miniStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  miniStartText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  inlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  inlineBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 3,
  },
});
