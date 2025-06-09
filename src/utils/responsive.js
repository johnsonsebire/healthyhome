import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Device type constants
export const DEVICE_TYPES = {
  PHONE: 'phone',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
};

// Breakpoints based on common device sizes
export const BREAKPOINTS = {
  SMALL: 480,
  MEDIUM: 768,
  LARGE: 1024,
  EXTRA_LARGE: 1200
};

// Get current device type
export const getDeviceType = () => {
  if (SCREEN_WIDTH < BREAKPOINTS.MEDIUM) {
    return DEVICE_TYPES.PHONE;
  } else if (SCREEN_WIDTH < BREAKPOINTS.LARGE) {
    return DEVICE_TYPES.TABLET;
  } else {
    return DEVICE_TYPES.DESKTOP;
  }
};

// Check if device is tablet or larger
export const isTablet = () => {
  return SCREEN_WIDTH >= BREAKPOINTS.MEDIUM;
};

// Check if device is phone
export const isPhone = () => {
  return SCREEN_WIDTH < BREAKPOINTS.MEDIUM;
};

// Get responsive dimensions
export const getDimensions = () => ({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isLandscape: SCREEN_WIDTH > SCREEN_HEIGHT,
  isPortrait: SCREEN_HEIGHT > SCREEN_WIDTH
});

// Responsive font scaling
export const responsiveFontSize = (size) => {
  const scale = SCREEN_WIDTH / 375; // Based on iPhone X width
  const newSize = size * scale;
  
  if (isTablet()) {
    return Math.max(newSize * 1.1, size); // Slightly larger on tablets
  }
  
  return Math.max(newSize, size * 0.8); // Minimum size for very small screens
};

// Responsive spacing
export const responsiveSpacing = (spacing) => {
  if (isTablet()) {
    return spacing * 1.5; // More generous spacing on tablets
  }
  return spacing;
};

// Responsive width for content containers
export const getContentWidth = () => {
  if (isTablet()) {
    return Math.min(SCREEN_WIDTH * 0.8, 800); // Max 800px on tablets
  }
  return SCREEN_WIDTH;
};

// Responsive grid columns
export const getGridColumns = () => {
  if (SCREEN_WIDTH >= BREAKPOINTS.LARGE) {
    return 4;
  } else if (SCREEN_WIDTH >= BREAKPOINTS.MEDIUM) {
    return 3;
  } else if (SCREEN_WIDTH >= BREAKPOINTS.SMALL) {
    return 2;
  } else {
    return 1;
  }
};

// Responsive card dimensions
export const getCardDimensions = () => {
  const columns = getGridColumns();
  const spacing = responsiveSpacing(16);
  const availableWidth = getContentWidth() - (spacing * (columns + 1));
  const cardWidth = availableWidth / columns;
  
  return {
    width: cardWidth,
    height: isTablet() ? cardWidth * 0.8 : cardWidth * 1.2
  };
};

// Create responsive styles helper
export const createResponsiveStyles = (phoneStyles, tabletStyles = {}) => {
  if (isTablet()) {
    return { ...phoneStyles, ...tabletStyles };
  }
  return phoneStyles;
};

// Responsive padding/margin helper
export const responsive = {
  padding: (size) => responsiveSpacing(size),
  margin: (size) => responsiveSpacing(size),
  fontSize: (size) => responsiveFontSize(size),
  width: getContentWidth,
  height: SCREEN_HEIGHT,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isTablet: isTablet(),
  isPhone: isPhone(),
  deviceType: getDeviceType(),
  columns: getGridColumns()
};

// Layout configurations for different screen sizes
export const LAYOUT_CONFIG = {
  [DEVICE_TYPES.PHONE]: {
    containerPadding: 16,
    cardSpacing: 12,
    headerHeight: 60,
    tabBarHeight: 80,
    maxContentWidth: '100%',
    sidebarWidth: 0,
    gridColumns: 1,
    listItemHeight: 80
  },
  [DEVICE_TYPES.TABLET]: {
    containerPadding: 24,
    cardSpacing: 16,
    headerHeight: 70,
    tabBarHeight: 90,
    maxContentWidth: 800,
    sidebarWidth: 280,
    gridColumns: 2,
    listItemHeight: 100
  },
  [DEVICE_TYPES.DESKTOP]: {
    containerPadding: 32,
    cardSpacing: 20,
    headerHeight: 80,
    tabBarHeight: 100,
    maxContentWidth: 1200,
    sidebarWidth: 320,
    gridColumns: 3,
    listItemHeight: 120
  }
};

// Get current layout configuration
export const getLayoutConfig = () => {
  return LAYOUT_CONFIG[getDeviceType()];
};

export default {
  getDeviceType,
  isTablet,
  isPhone,
  getDimensions,
  responsiveFontSize,
  responsiveSpacing,
  getContentWidth,
  getGridColumns,
  getCardDimensions,
  createResponsiveStyles,
  responsive,
  getLayoutConfig,
  DEVICE_TYPES,
  BREAKPOINTS,
  LAYOUT_CONFIG
};
