import {
  getDeviceType,
  isTablet,
  isPhone,
  responsiveFontSize,
  responsiveSpacing,
  getContentWidth,
  getGridColumns,
  getLayoutConfig,
  DEVICE_TYPES,
} from '../responsive';

// Mock Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })), // iPhone X dimensions
  },
  PixelRatio: {
    get: jest.fn(() => 2),
  },
}));

describe('Responsive Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeviceType', () => {
    it('returns phone for small screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      
      expect(getDeviceType()).toBe(DEVICE_TYPES.PHONE);
    });

    it('returns tablet for medium screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });
      
      expect(getDeviceType()).toBe(DEVICE_TYPES.TABLET);
    });

    it('returns desktop for large screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 1200, height: 800 });
      
      expect(getDeviceType()).toBe(DEVICE_TYPES.DESKTOP);
    });
  });

  describe('isTablet', () => {
    it('returns false for phone screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      
      expect(isTablet()).toBe(false);
    });

    it('returns true for tablet screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });
      
      expect(isTablet()).toBe(true);
    });
  });

  describe('isPhone', () => {
    it('returns true for phone screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      
      expect(isPhone()).toBe(true);
    });

    it('returns false for tablet screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });
      
      expect(isPhone()).toBe(false);
    });
  });

  describe('responsiveFontSize', () => {
    it('scales font size correctly for phone', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      
      const result = responsiveFontSize(16);
      expect(result).toBeGreaterThanOrEqual(16 * 0.8);
    });

    it('scales font size larger for tablet', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });
      
      const result = responsiveFontSize(16);
      expect(result).toBeGreaterThan(16);
    });
  });

  describe('responsiveSpacing', () => {
    it('returns original spacing for phone', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      
      expect(responsiveSpacing(16)).toBe(16);
    });

    it('returns larger spacing for tablet', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });
      
      expect(responsiveSpacing(16)).toBe(24);
    });
  });

  describe('getContentWidth', () => {
    it('returns full screen width for phone', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      
      expect(getContentWidth()).toBe(375);
    });

    it('returns constrained width for tablet', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 1024, height: 768 });
      
      const result = getContentWidth();
      expect(result).toBeLessThan(1024);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('getGridColumns', () => {
    it('returns 1 column for very small screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 320, height: 568 });
      
      expect(getGridColumns()).toBe(1);
    });

    it('returns 2 columns for phone screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 480, height: 800 });
      
      expect(getGridColumns()).toBe(2);
    });

    it('returns 3 columns for tablet screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });
      
      expect(getGridColumns()).toBe(3);
    });

    it('returns 4 columns for large screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 1200, height: 800 });
      
      expect(getGridColumns()).toBe(4);
    });
  });

  describe('getLayoutConfig', () => {
    it('returns phone config for small screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      
      const config = getLayoutConfig();
      expect(config.gridColumns).toBe(1);
      expect(config.containerPadding).toBe(16);
    });

    it('returns tablet config for medium screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 768, height: 1024 });
      
      const config = getLayoutConfig();
      expect(config.gridColumns).toBe(2);
      expect(config.containerPadding).toBe(24);
    });

    it('returns desktop config for large screens', () => {
      const { Dimensions } = require('react-native');
      Dimensions.get.mockReturnValue({ width: 1200, height: 800 });
      
      const config = getLayoutConfig();
      expect(config.gridColumns).toBe(3);
      expect(config.containerPadding).toBe(32);
    });
  });
});
