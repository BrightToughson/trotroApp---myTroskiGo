import { ms } from '../lib/metrics';
import { WebIcon } from "./WebIcon";
import React, { useEffect } from "react";
import { View, StyleSheet, Text } from
"react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface TabIconProps {
  name: any;
  color: string;
  focused: boolean;
  badgeCount?: number;
}

/**
 * TabIcon: An animated component for the bottom navigation bar.
 * Scales up and down with spring physics when selected/deselected.
 */
export const TabIcon = ({ name, color, focused, badgeCount }: TabIconProps) => {
  const scale = useSharedValue(1);

  // Animated scaling effect
  useEffect(() => {
    if (focused) {
      // Snappy bounce only when moving TO the tab
      scale.value = withSpring(1.15, {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      });
    } else {
      // Instant settle when moving AWAY (no wobble)
      scale.value = withTiming(1, { duration: 150 });
    }
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
        <WebIcon 
          name={name || "help-outline"} 
          size= {28} 
          color={color || "#ccc"} 
        />
      </Animated.View>
      
      {/* Badge Indicator */}
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 9 ? "9+" : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: ms(-8),
    top: ms(-4),
    backgroundColor: "#FF5252",
    borderRadius: ms(10),
    minWidth: ms(18),
    height: ms(18),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: ms(1.5),
    borderColor: "white",
  },
  badgeText: {
    color: "white",
    fontSize: ms(12),
    fontWeight: "800",
  },
});
