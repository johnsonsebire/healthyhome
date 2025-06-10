import React, { useState, useEffect } from 'react';
import { Image, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import photoStorage from '../services/photoStorage';
import { getRelationshipEmoji } from '../utils/genderBasedRelationships';

/**
 * CachedPhoto component that handles offline photo display
 * Shows cached photo if available, otherwise shows placeholder
 */
const CachedPhoto = ({ 
  photoUri, 
  userId, 
  memberId, 
  relationship, 
  gender, 
  style, 
  placeholderStyle,
  showEmoji = true,
  fallbackIcon = "person",
  placeholderText
}) => {
  const [displayUri, setDisplayUri] = useState(photoUri);
  const [loading, setLoading] = useState(!!photoUri);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadCachedPhoto();
  }, [photoUri, userId, memberId]);

  const loadCachedPhoto = async () => {
    if (!photoUri || !userId || !memberId) {
      console.log('Missing required props for photo caching:', { photoUri, userId, memberId });
      setLoading(false);
      return;
    }

    try {
      console.log('Loading cached photo for:', { photoUri, userId, memberId });
      const cachedUri = await photoStorage.getCachedPhoto(photoUri, userId, memberId);
      
      if (cachedUri && cachedUri !== photoUri) {
        console.log('Using cached photo:', cachedUri);
        setDisplayUri(cachedUri);
        setFailed(false);
      } else if (cachedUri === photoUri) {
        console.log('Using original photo URI (no caching needed):', photoUri);
        setDisplayUri(photoUri);
        setFailed(false);
      } else {
        console.log('No cached photo available, using original:', photoUri);
        setDisplayUri(photoUri);
        setFailed(false);
      }
    } catch (error) {
      console.error('Error loading cached photo:', error);
      console.log('Falling back to original photo URI:', photoUri);
      setDisplayUri(photoUri);
      setFailed(false); // Don't fail completely, just use original
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = () => {
    console.log('Image failed to load:', displayUri);
    setFailed(true);
    setLoading(false);
  };

  const handleImageLoad = () => {
    setFailed(false);
    setLoading(false);
  };

  // Show placeholder if no photo or failed to load
  if (!displayUri || failed || loading) {
    return (
      <View style={[style, placeholderStyle]}>
        {placeholderText ? (
          <Text style={{ fontSize: style?.width ? style.width * 0.4 : 24 }}>
            {placeholderText}
          </Text>
        ) : showEmoji && relationship && gender ? (
          <Text style={{ fontSize: style?.width ? style.width * 0.4 : 24 }}>
            {getRelationshipEmoji(relationship, gender)}
          </Text>
        ) : (
          <Text style={{ textAlign: 'center' }}>
            <Ionicons 
              name={fallbackIcon} 
              size={style?.width ? style.width * 0.6 : 30} 
              color="#666" 
            />
          </Text>
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: displayUri }}
      style={style}
      onError={handleImageError}
      onLoad={handleImageLoad}
      onLoadEnd={handleImageLoad}
    />
  );
};

export default CachedPhoto;
