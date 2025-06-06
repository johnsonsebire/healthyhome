import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Card = ({ 
  title, 
  subtitle, 
  icon, 
  iconColor = '#007AFF', 
  onPress, 
  rightComponent,
  style,
  children 
}) => {
  const CardContent = () => (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
              <Ionicons name={icon} size={20} color={iconColor} />
            </View>
          )}
          <View style={styles.titleContainer}>
            {title && <Text style={styles.cardTitle}>{title}</Text>}
            {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {rightComponent && (
          <View style={styles.rightComponent}>
            {rightComponent}
          </View>
        )}
      </View>
      {children && (
        <View style={styles.cardContent}>
          {children}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  rightComponent: {
    marginLeft: 12,
  },
  cardContent: {
    marginTop: 16,
  },
});

export default Card;
