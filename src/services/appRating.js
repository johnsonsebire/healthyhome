import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const APP_RATING_KEY = 'app_rating_info';
const MIN_DAYS_BETWEEN_PROMPTS = 60; // Number of days between rating prompts
const MIN_ACTIONS_FOR_RATING = 5; // Minimum actions before showing rating prompt

/**
 * Tracks user actions to determine when to show rating prompt
 */
export const trackUserAction = async () => {
  try {
    const ratingData = await getRatingData();
    
    // Increment action count
    ratingData.actionCount = (ratingData.actionCount || 0) + 1;
    
    // Save updated data
    await AsyncStorage.setItem(APP_RATING_KEY, JSON.stringify(ratingData));
    
    return ratingData;
  } catch (error) {
    console.error('Error tracking user action:', error);
    return null;
  }
};

/**
 * Gets the current app rating data
 */
export const getRatingData = async () => {
  try {
    const ratingDataString = await AsyncStorage.getItem(APP_RATING_KEY);
    
    if (ratingDataString) {
      return JSON.parse(ratingDataString);
    }
    
    // Initialize with default values
    const initialData = {
      actionCount: 0,
      lastPromptDate: null,
      hasRated: false,
    };
    
    await AsyncStorage.setItem(APP_RATING_KEY, JSON.stringify(initialData));
    return initialData;
  } catch (error) {
    console.error('Error getting rating data:', error);
    return {
      actionCount: 0,
      lastPromptDate: null,
      hasRated: false,
    };
  }
};

/**
 * Checks if it's appropriate to show a rating prompt
 */
export const shouldShowRatingPrompt = async () => {
  try {
    // First check if the device can perform store reviews
    const canRate = await StoreReview.hasAction();
    if (!canRate) return false;
    
    const ratingData = await getRatingData();
    
    // Don't show if user has already rated
    if (ratingData.hasRated) return false;
    
    // Check if minimum actions have been performed
    if (!ratingData.actionCount || ratingData.actionCount < MIN_ACTIONS_FOR_RATING) {
      return false;
    }
    
    // Check if enough time has passed since last prompt
    if (ratingData.lastPromptDate) {
      const lastDate = new Date(ratingData.lastPromptDate);
      const currentDate = new Date();
      const daysSinceLastPrompt = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastPrompt < MIN_DAYS_BETWEEN_PROMPTS) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking if should show rating prompt:', error);
    return false;
  }
};

/**
 * Records that a rating prompt was shown
 */
export const recordRatingPromptShown = async () => {
  try {
    const ratingData = await getRatingData();
    ratingData.lastPromptDate = new Date().toISOString();
    ratingData.actionCount = 0; // Reset action count
    
    await AsyncStorage.setItem(APP_RATING_KEY, JSON.stringify(ratingData));
  } catch (error) {
    console.error('Error recording rating prompt shown:', error);
  }
};

/**
 * Records that user has rated the app
 */
export const recordAppRated = async () => {
  try {
    const ratingData = await getRatingData();
    ratingData.hasRated = true;
    
    await AsyncStorage.setItem(APP_RATING_KEY, JSON.stringify(ratingData));
  } catch (error) {
    console.error('Error recording app rated:', error);
  }
};

/**
 * Opens the appropriate store page for rating
 */
export const openStoreRating = async () => {
  try {
    // First try to use StoreReview API (stays in-app)
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
      await recordAppRated();
      return true;
    } else {
      // Fallback to opening the store URL
      let storeUrl = '';
      
      if (Platform.OS === 'ios') {
        storeUrl = 'https://apps.apple.com/app/idXXXXXXXXXX?action=write-review'; // Replace XXXXXXXXXX with your App Store ID
      } else if (Platform.OS === 'android') {
        storeUrl = 'https://play.google.com/store/apps/details?id=com.familymedicalapp'; // Replace with your app's package name
      }
      
      if (storeUrl && await Linking.canOpenURL(storeUrl)) {
        await Linking.openURL(storeUrl);
        await recordAppRated();
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error opening store rating:', error);
    return false;
  }
};
