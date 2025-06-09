import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { responsive, getLayoutConfig, isTablet } from '../utils/responsive';

// Responsive container component
export const ResponsiveContainer = ({ children, style, centerContent = false }) => {
  const layoutConfig = getLayoutConfig();
  
  const containerStyle = [
    styles.container,
    {
      paddingHorizontal: layoutConfig.containerPadding,
      maxWidth: layoutConfig.maxContentWidth,
    },
    centerContent && styles.centered,
    style
  ];

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

// Responsive grid component
export const ResponsiveGrid = ({ 
  children, 
  spacing = 16, 
  style,
  customColumns 
}) => {
  const layoutConfig = getLayoutConfig();
  const columns = customColumns || layoutConfig.gridColumns;
  
  const renderGrid = () => {
    const rows = [];
    const childrenArray = React.Children.toArray(children);
    
    for (let i = 0; i < childrenArray.length; i += columns) {
      const rowChildren = childrenArray.slice(i, i + columns);
      
      rows.push(
        <View key={i} style={[styles.row, { gap: spacing }]}>
          {rowChildren.map((child, index) => (
            <View 
              key={index} 
              style={[
                styles.gridItem, 
                { flex: 1 / columns }
              ]}
            >
              {child}
            </View>
          ))}
          {/* Fill empty spaces */}
          {rowChildren.length < columns && 
            Array.from({ length: columns - rowChildren.length }).map((_, index) => (
              <View key={`empty-${index}`} style={[styles.gridItem, { flex: 1 / columns }]} />
            ))
          }
        </View>
      );
    }
    
    return rows;
  };

  return (
    <View style={[styles.grid, { gap: spacing }, style]}>
      {renderGrid()}
    </View>
  );
};

// Responsive card component
export const ResponsiveCard = ({ children, style, elevation = 2 }) => {
  const layoutConfig = getLayoutConfig();
  
  const cardStyle = [
    styles.card,
    {
      padding: layoutConfig.containerPadding * 0.75,
      elevation: elevation,
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.1,
      shadowRadius: elevation * 2,
    },
    style
  ];

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

// Responsive list item component
export const ResponsiveListItem = ({ children, style, onPress }) => {
  const layoutConfig = getLayoutConfig();
  
  const itemStyle = [
    styles.listItem,
    {
      minHeight: layoutConfig.listItemHeight,
      paddingHorizontal: layoutConfig.containerPadding,
      paddingVertical: layoutConfig.containerPadding * 0.5,
    },
    style
  ];

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component style={itemStyle} onPress={onPress}>
      {children}
    </Component>
  );
};

// Responsive sidebar layout (for tablets)
export const ResponsiveSidebarLayout = ({ 
  sidebar, 
  content, 
  style,
  sidebarWidth 
}) => {
  if (!isTablet()) {
    // On phones, just show content
    return content;
  }

  const layoutConfig = getLayoutConfig();
  const finalSidebarWidth = sidebarWidth || layoutConfig.sidebarWidth;

  return (
    <View style={[styles.sidebarLayout, style]}>
      <View style={[styles.sidebar, { width: finalSidebarWidth }]}>
        {sidebar}
      </View>
      <View style={styles.mainContent}>
        {content}
      </View>
    </View>
  );
};

// Responsive spacing component
export const ResponsiveSpacing = ({ size = 16, horizontal = false, vertical = false }) => {
  const spacing = responsive.padding(size);
  
  return (
    <View 
      style={{
        width: horizontal ? spacing : 0,
        height: vertical ? spacing : 0,
      }} 
    />
  );
};

// Adaptive component that renders different content based on device type
export const AdaptiveComponent = ({ 
  phone, 
  tablet, 
  desktop,
  fallback 
}) => {
  const deviceType = responsive.deviceType;
  
  switch (deviceType) {
    case 'phone':
      return phone || fallback;
    case 'tablet':
      return tablet || phone || fallback;
    case 'desktop':
      return desktop || tablet || phone || fallback;
    default:
      return fallback;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  centered: {
    alignSelf: 'center',
  },
  grid: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    flex: 1,
  },
  gridItem: {
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  mainContent: {
    flex: 1,
  },
});

export default {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveCard,
  ResponsiveListItem,
  ResponsiveSidebarLayout,
  ResponsiveSpacing,
  AdaptiveComponent
};
