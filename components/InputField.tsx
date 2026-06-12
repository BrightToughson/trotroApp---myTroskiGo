import React, { ReactNode } from "react";
import {
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    TouchableWithoutFeedback,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme, LightColors } from "../context/ThemeContext";

// Extending TextInputProps allows us to use all standard props like placeholder, secureTextEntry, etc.
type InputFieldProps = TextInputProps & {
  label?: ReactNode | string | number;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  onIconPress?: () => void;
  onPress?: () => void;
};

const InputField: React.FC<InputFieldProps> = ({
  label,
  containerStyle,
  labelStyle,
  icon,
  onIconPress,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const focusAnim = useSharedValue(0);
  const labelAnim = useSharedValue(props.value ? 1 : 0);

  React.useEffect(() => {
    labelAnim.value = withTiming(props.value ? 1 : 0, { duration: 250 });
  }, [props.value, labelAnim]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnim.value,
      [0, 1],
      [isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", "#FFD700"],
    );

    const backgroundColor = interpolateColor(
      focusAnim.value,
      [0, 1],
      [
        isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.02)",
        isDark ? "rgba(255, 255, 255, 0.12)" : "#fff",
      ],
    );

    return {
      borderColor,
      backgroundColor,
      shadowColor: "#FFD700",
      shadowOpacity: withTiming(focusAnim.value * 0.3, { duration: 250 }),
      shadowRadius: withTiming(focusAnim.value * 12, { duration: 250 }),
      elevation: withTiming(focusAnim.value * 4, { duration: 250 }),
      transform: [
        { translateY: withTiming(focusAnim.value * -2, { duration: 250 }) },
        { scale: withTiming(1 + focusAnim.value * 0.01, { duration: 250 }) },
      ],
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    const translateY = interpolate(labelAnim.value, [0, 1], [0, -22]);
    const scale = interpolate(labelAnim.value, [0, 1], [1, 0.8]);
    const color = interpolateColor(
      focusAnim.value,
      [0, 1],
      [colors.textSecondary, "#FFB800"],
    );

    return {
      transform: [{ translateY }, { scale }],
      color,
    };
  });

  const handleFocus = (e: any) => {
    focusAnim.value = withTiming(1, { duration: 250 });
    labelAnim.value = withTiming(1, { duration: 250 });
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e: any) => {
    focusAnim.value = withTiming(0, { duration: 250 });
    if (!props.value) {
      labelAnim.value = withTiming(0, { duration: 250 });
    }
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={styles.inputContainer}>
        <Animated.View
          style={[
            styles.inputWrapper,
            { shadowColor: colors.primary },
            animatedContainerStyle,
          ]}
        >
          {label && (
            <View pointerEvents="none" style={{ position: "absolute", left: 16, zIndex: 1 }}>
              <Animated.Text
                style={[
                  styles.labelText,
                  labelStyle as any,
                  animatedLabelStyle,
                ]}
              >
                {label}
              </Animated.Text>
            </View>
          )}

          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!props.onPress && props.editable !== false}
            {...props}
            placeholder=""
          />
          {icon && (
            <TouchableWithoutFeedback onPress={onIconPress}>
              <View style={styles.iconContainer}>{icon}</View>
            </TouchableWithoutFeedback>
          )}
          {props.onPress && (
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              onPress={props.onPress} 
              activeOpacity={0.7} 
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: 20,
  },
  inputContainer: {
    paddingTop: 10,
  },
  labelText: {
    fontSize: 18,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 16,
    minHeight: 60,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    height: "100%",
    paddingTop: 12,
    outlineStyle: "none" as any,
  },
  iconContainer: {
    marginLeft: 12,
  },
});

export default InputField;
