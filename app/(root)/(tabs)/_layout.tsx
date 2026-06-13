import { ms } from '../../../lib/metrics';
import { Tabs } from "expo-router";
import { StyleSheet, TouchableOpacity, View, useWindowDimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import React, { useState, useEffect } from "react";
import { NotificationService } from "@/lib/NotificationService";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { TabIcon } from "@/components/TabIcon";
import { useTranslation } from
"react-i18next";

/**
 * CustomTabBar: A low-profile, animated floating navigation bar.
 * Features a sliding pill indicator and spring-loaded micro-interactions.
 */
function CustomTabBar({ state, descriptors, navigation, unreadCount }: any) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Calculate responsive sizes
  const MAX_WEB_WIDTH = ms(340);
  const TAB_BAR_WIDTH = Platform.OS === 'web' 
    ? Math.min(width - ms(40), MAX_WEB_WIDTH)
    : width - ms(48);
    
  // Account for 1.5px border on each side (3px total)
  const INNER_WIDTH = TAB_BAR_WIDTH - ms(3); 
  const TAB_WIDTH = INNER_WIDTH / 4;
  const PILL_WIDTH = TAB_WIDTH - ms(16);
  
  const calculateTranslateX = (index: number) => {
    // Perfect center math: (start of tab) + (half of tab) - (half of pill)
    return (index * TAB_WIDTH) + (TAB_WIDTH / 2) - (PILL_WIDTH / 2);
  };
  
  const translateX = useSharedValue(calculateTranslateX(state.index));

  // Animate the sliding background pill (made smoother)
  useEffect(() => {
    translateX.value = withSpring(calculateTranslateX(state.index), {
      damping: 16,
      stiffness: 250,
      mass: 0.5,
    });
  }, [state.index, TAB_WIDTH]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: PILL_WIDTH,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: ms(8) },
    shadowOpacity: 0.4,
    shadowRadius: ms(12),
  }));

  return (
    <View style={[styles.tabBarContainer, { 
      backgroundColor: isDark ? "rgba(30, 41, 59, 0.65)" : "rgba(255, 255, 255, 0.65)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
      bottom: Math.max(insets.bottom, 24) + (Platform.OS === 'web' ? 8 : 0),
      width: TAB_BAR_WIDTH,
      ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {})
    } as any]}>
      {/* Sliding Active Indicator (The Pill) */}
      <Animated.View 
        style={[
          styles.pill, 
          animatedPillStyle, 
        ]} 
      />

      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Map icons
        let iconName = "home-outline";
        if (route.name === "home") iconName = isFocused ? "home" : "home-outline";
        if (route.name === "history") iconName = isFocused ? "time" : "time-outline";
        if (route.name === "communitypost") iconName = isFocused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline";
        if (route.name === "contribution") iconName = isFocused ? "heart" : "heart-outline";

        // Logic fix: Hide badge instantly if we are ALREADY on the communitypost screen
        const displayBadge = route.name === "communitypost" && !isFocused ? unreadCount : undefined;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <TabIcon 
              name={iconName} 
              color={isFocused ? "#FFFFFF" : colors.textSecondary} 
              focused={isFocused}
              badgeCount={displayBadge}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const count = await NotificationService.getUnreadCountByCategory('community');
      setUnreadCount(count);
    };

    updateCount();
    const unsubscribe = NotificationService.subscribe(updateCount);
    return unsubscribe;
  }, []);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} unreadCount={unreadCount} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { position: 'absolute' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('home', "Home") }} />
      <Tabs.Screen name="history" options={{ title: t('history', "History") }} />
      <Tabs.Screen name="communitypost" options={{ title: t('community', "Community") }} />
      <Tabs.Screen name="contribution" options={{ title: t('contribution', "Contribute") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    position: "absolute",
    alignSelf: "center",
    height: ms(64),
    borderRadius: ms(32),
    alignItems: "center",
    borderWidth: ms(1.5),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: ms(20) },
    shadowOpacity: 0.2,
    shadowRadius: ms(30),
    elevation: 15,
    overflow: 'hidden',
  },
  pill: {
    position: "absolute",
    height: ms(48),
    borderRadius: ms(24),
    top: ms(6.5), // Center vertically (64 container - 3 borders - 48 pill) / 2 = 6.5
  },
  tabItem: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  }
});
