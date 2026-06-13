import { ms } from '../lib/metrics';
import * as Haptics from "expo-haptics";
import React from "react";
import {
    ActivityIndicator,
    Platform,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useTheme, LightColors } from
"../context/ThemeContext";

interface CustomButtonProps {
  onPress: () => void;
  title: string;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  loading?: boolean;
  // Function that returns a React element (the icon)
  IconLeft?: () => React.ReactElement | null;
  IconRight?: () => React.ReactElement | null;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
  textVariant?: "primary" | "secondary" | "danger" | "default";
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  onPress,
  title,
  containerStyle,
  textStyle,
  disabled = false,
  loading = false,
  IconLeft,
  IconRight,
  bgVariant = "primary",
  textVariant = "default",
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  // Variant Logic
  const getBackgroundColor = () => {
    if (bgVariant === "secondary") return colors.surfaceSecondary;
    if (bgVariant === "danger") return "#EF4444";
    if (bgVariant === "outline") return "transparent";
    if (bgVariant === "success") return "#10B981";
    return colors.primary;
  };

  const getTextColor = () => {
    if (textVariant === "primary") return colors.primary;
    if (textVariant === "secondary") return colors.textSecondary;
    if (textVariant === "danger") return "#EF4444";
    return "#fff";
  };

  const finalContainerStyle = [
    styles.baseContainer,
    {
      backgroundColor: getBackgroundColor(),
      shadowColor: colors.primary, // Using theme color safely
      shadowOffset: { width: 0, height: ms(4) },
      shadowOpacity: 0.15,
      shadowRadius: ms(8),
    },
    bgVariant === "outline" && { borderWidth: 1, borderColor: colors.border },
    disabled && styles.disabledContainer,
    containerStyle,
  ];

  // Flatten containerStyle to safely access its properties
  // const flattenedContainerStyle = StyleSheet.flatten(containerStyle); // Removed unused variable

  // Determine spinner color based on background
  const spinnerColor = bgVariant === "outline" ? colors.primary : "#fff";

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={finalContainerStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.7}
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
      >
        {loading ? (
          // Show Activity Indicator when loading
          <ActivityIndicator color={spinnerColor} size= "small" />
        ) : (
          // Wrapper View for horizontal layout of icon and text
          <View style={styles.contentContainer}>
            {/* Render the Icon if provided */}
            {IconLeft && IconLeft()}

            {/* Render the Text, wrapped in <Text> component */}
            <Text
              style={[styles.baseText, { color: getTextColor() }, textStyle]}
            >
              {title}
            </Text>

            {/* Render the Right Icon if provided */}
            {IconRight && IconRight()}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    borderRadius: ms(30),
    height: ms(56),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ms(20),
    elevation: 2,
    minWidth: ms(150),
  },
  // Layout container for icon and text
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledContainer: {
    opacity: 0.5,
  },
  baseText: {
    color: "#fff",
    fontSize: ms(20),
    fontWeight: "bold",
  },
});
