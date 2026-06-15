import { Dimensions, Platform } from 'react-native';

// Guideline sizes are based on standard ~5" screen mobile device (iPhone 11)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size: number) => {
  if (!Dimensions || !Dimensions.get) return size;
  const { width } = Dimensions.get('window') || { width: 375 };
  const MAX_WIDTH = Platform.OS === 'web' ? 320 : 375; 
  const scaleWidth = Math.min(width, MAX_WIDTH);
  return (scaleWidth / guidelineBaseWidth) * size;
};

export const verticalScale = (size: number) => {
  if (!Dimensions || !Dimensions.get) return size;
  const { height } = Dimensions.get('window') || { height: 812 };
  return (height / guidelineBaseHeight) * size;
};

// moderateScale gives a nice middle ground.
// On Web, we use a factor of 0.8 to scale down more aggressively, solving the "large text" feel on desktop browsers.
export const moderateScale = (size: number, factor = Platform.OS === 'web' ? 0.85 : 0.5) => {
  return size + (scale(size) - size) * factor;
};

// Shortcut for the most commonly used metric
export const ms = moderateScale;
