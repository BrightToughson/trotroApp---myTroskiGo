import { ms } from '../lib/metrics';
import { WebIcon } from './WebIcon';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from
'react-native';

interface ScrollIndicatorProps {
  color?: string;
  isVisible: boolean; 
  style?: any;
}

/**
 * ScrollIndicator: A floating, animated chevron that suggests content is 
 * available below the current viewport. 
 */
export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ color = '#3b82f6', isVisible, style }) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, { toValue: 10, duration: 800, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [translateY, isVisible]);

  if (!isVisible) return null;

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.indicator,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <WebIcon name="chevron-down-outline" size= {24} color={color} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: ms(100),
    right: ms(24),
    backgroundColor: '#ffffff53',
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.4,
    shadowRadius: ms(2),
    elevation: 5,
    zIndex: 999,
  },
  indicator: {},
});