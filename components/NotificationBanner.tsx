import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming, 
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationService, Notification } from '@/lib/NotificationService';
import { WebIcon } from './WebIcon';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export function NotificationBanner() {
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (activeNotification) {
      // Delay animation slightly to let view mount properly
      setTimeout(() => {
        opacity.value = 1;
        translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      }, 50);

      // Auto dismiss after 5 seconds
      timeoutId = setTimeout(() => {
        translateY.value = withTiming(-150, { duration: 300 }, () => {
          opacity.value = 0;
          runOnJS(setActiveNotification)(null);
        });
      }, 5000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeNotification, translateY, opacity]);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((notification, deletedId, isLocalSender) => {
      // Ignore deletions
      if (!notification) return;

      // Only show banner for community/official posts
      if (notification.type !== 'community_post' && notification.type !== 'official') return;

      setActiveNotification(notification);
    });

    return () => unsubscribe();
  }, []);

  const handlePress = () => {
    // Hide banner immediately on press
    translateY.value = withTiming(-150, { duration: 200 }, () => {
      opacity.value = 0;
      runOnJS(setActiveNotification)(null);
    });
    
    // Navigate to community post tab
    router.push('/(root)/(tabs)/communitypost' as any);
  };

  const handleDismiss = () => {
    translateY.value = withTiming(-150, { duration: 200 }, () => {
      opacity.value = 0;
      runOnJS(setActiveNotification)(null);
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (!activeNotification) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        animatedStyle,
        { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : insets.top + 20 }
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={handlePress}
        style={[
          styles.banner, 
          { 
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: colors.border,
            shadowColor: isDark ? '#000' : '#64748b',
          }
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: activeNotification.color || colors.primary }]}>
          <WebIcon name={activeNotification.icon || 'notifications'} size={24} color="#ffffff" />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {activeNotification.title}
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
            {activeNotification.message}
          </Text>
        </View>

        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <WebIcon name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  }
});
