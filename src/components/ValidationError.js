import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ValidationError = ({ error, style }) => {
  if (!error) return null;

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="alert-circle" size={16} color="#ef4444" />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 6,
    flex: 1,
  },
});

export default ValidationError;
