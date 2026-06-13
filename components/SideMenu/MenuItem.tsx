import { ms } from '../../lib/metrics';
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInLeft } from "react-native-reanimated";
import { WebIcon } from "../WebIcon";
import { styles } from
"./styles";

interface MenuItemProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  index?: number;
  colors: any;
  iconElement?: React.ReactNode;
}

export const MenuItem = React.memo(({
  icon,
  label,
  onPress,
  rightElement,
  index = 0,
  colors,
  iconElement,
}: MenuItemProps) => (
  <Animated.View entering={FadeInLeft.delay(100 + index * 50).duration(400)}>
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        {iconElement ? (
          <View style={{ width: ms(24), alignItems: 'center' }}>{iconElement}</View>
        ) : (
          <WebIcon name={icon as any} size= {24} color={colors.textSecondary} />
        )}
        <Text style={[styles.menuItemText, { color: colors.text }]}>
          {label}
        </Text>
      </View>
      {rightElement ? (
        rightElement
      ) : (
        <WebIcon
          name="chevron-forward"
          size= {20}
          color={colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  </Animated.View>
));

MenuItem.displayName = "MenuItem";
