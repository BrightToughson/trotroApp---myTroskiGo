import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Cap the width and height for Web/Tablets so the UI doesn't become gigantic
// By capping at 375, we ensure the app never scales UP (getting too big), only DOWN for small phones.
// On Web, we can even cap it at 350 to keep things nice and compact.
const MAX_WIDTH = Platform.OS === 'web' ? 350 : 375; 
const scaleWidth = Math.min(width, MAX_WIDTH);

// Guideline sizes are based on standard ~5" screen mobile device (iPhone 11)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size: number) => scaleWidth / guidelineBaseWidth * size;
export const verticalScale = (size: number) => height / guidelineBaseHeight * size;

// moderateScale gives a nice middle ground. The factor controls how aggressively it scales.
// factor = 0.5 means it will be halfway between the raw size and the fully scaled size.
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

// Shortcut for the most commonly used metric
export const ms = moderateScale;
