import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRelationshipCategory, FAMILY_CATEGORIES } from '../utils/familyRelationships';
import { getGenderSpecificRelationship } from '../utils/genderBasedRelationships';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';

const FamilyTreeView = ({ familyMembers, onMemberPress }) => {
  const [treeLayout, setTreeLayout] = useState([]);
  const windowWidth = Dimensions.get('window').width;
  
  useEffect(() => {
    if (familyMembers && familyMembers.length > 0) {
      generateTreeLayout();
    }
  }, [familyMembers]);

  const generateTreeLayout = () => {
    // Find self
    const self = familyMembers.find(member => member.relationship === 'Self');
    
    if (!self) {
      // If no self, arrange linearly
      const layout = familyMembers.map((member, index) => ({
        ...member,
        x: windowWidth / 2,
        y: 150 * (index + 1)  // Increased vertical spacing
      }));
      setTreeLayout(layout);
      return;
    }
    
    // Start with self at the center
    const layout = [{
      ...self,
      x: windowWidth / 2,
      y: 150  // Increased vertical spacing
    }];
    
    // Find spouse
    const spouse = familyMembers.find(member => member.relationship === 'Spouse');
    if (spouse) {
      layout.push({
        ...spouse,
        x: windowWidth / 2 + 150,  // Increased horizontal spacing
        y: 150
      });
    }
    
    // Find children
    const children = familyMembers.filter(member => member.relationship === 'Child');
    
    // Position children relative to both parents if spouse exists
    if (children.length > 0) {
      const childrenStartX = spouse 
        ? (windowWidth / 2 + 75) - (children.length * 80) / 2  // Center children between self and spouse with more space
        : windowWidth / 2 - (children.length - 1) * 80 / 2;    // Center children under self if no spouse
        
      children.forEach((child, index) => {
        layout.push({
          ...child,
          x: childrenStartX + index * 80,  // Increased spacing between children
          y: 300  // Increased vertical spacing
        });
      });
    }
    
    // Find parents
    const parents = familyMembers.filter(member => member.relationship === 'Parent');
    parents.forEach((parent, index) => {
      const parentX = windowWidth / 2 - 80 + index * 160;  // Increased spacing between parents
      layout.push({
        ...parent,
        x: parentX,
        y: 40
      });
    });
    
    // Find siblings
    const siblings = familyMembers.filter(member => member.relationship === 'Sibling');
    siblings.forEach((sibling, index) => {
      const siblingX = windowWidth / 2 - 220 - index * 110;  // Increased spacing for siblings
      layout.push({
        ...sibling,
        x: siblingX,
        y: 150
      });
    });
    
    // Position grandparents
    const grandparents = familyMembers.filter(member => member.relationship === 'Grandparent');
    grandparents.forEach((grandparent, index) => {
      const grandparentX = windowWidth / 2 - 150 + index * 100;  // Increased spacing
      layout.push({
        ...grandparent,
        x: grandparentX,
        y: -60  // More space at the top
      });
    });
    
    // Position grandchildren
    const grandchildren = familyMembers.filter(member => member.relationship === 'Grandchild');
    grandchildren.forEach((grandchild, index) => {
      const grandchildX = windowWidth / 2 - (grandchildren.length - 1) * 50 / 2 + index * 50;
      layout.push({
        ...grandchild,
        x: grandchildX,
        y: 450  // More vertical space for grandchildren
      });
    });
    
    // Position other relatives
    const others = familyMembers.filter(member => member.relationship === 'Other');
    others.forEach((other, index) => {
      const otherX = windowWidth / 2 + 220 + index * 110;  // More space for other relatives
      layout.push({
        ...other,
        x: otherX,
        y: 150
      });
    });
    
    setTreeLayout(layout);
  };

  const getNodeColor = (relationship) => {
    const category = getRelationshipCategory(relationship);
    return category === FAMILY_CATEGORIES.NUCLEAR ? '#007AFF' : '#5E5CE6';
  };

  const getConnectorLines = () => {
    const lines = [];
    
    // Find self and spouse
    const self = treeLayout.find(member => member.relationship === 'Self');
    const spouse = treeLayout.find(member => member.relationship === 'Spouse');
    
    // Connect self and spouse to children
    const children = treeLayout.filter(member => member.relationship === 'Child');
    if (self && children.length > 0) {
      // If there's a spouse, create a family unit connection
      if (spouse) {
        // Create a midpoint between self and spouse
        const familyMidpointX = (self.x + spouse.x) / 2;
        
        // Position the connector lines below the names (vertically)
        const parentLevelY = self.y + 110; // Just below the parent circles
        const connectorY = self.y + 180; // Below the name text
        const childrenTopY = children[0].y + 70; // Above the children circles
        
        // Connect self and spouse to form family unit
        lines.push(
          <Line
            key="spouse-line"
            x1={self.x}
            y1={parentLevelY}
            x2={spouse.x}
            y2={parentLevelY}
            stroke="#007AFF"
            strokeWidth="2"
          />
        );
        
        // Add vertical line down from the middle of self-spouse line
        lines.push(
          <Line
            key="family-center-line"
            x1={familyMidpointX}
            y1={parentLevelY}
            x2={familyMidpointX}
            y2={connectorY}
            stroke="#007AFF"
            strokeWidth="2"
          />
        );
        
        // Add horizontal line connecting all children
        if (children.length > 1) {
          lines.push(
            <Line
              key="children-connector"
              x1={children[0].x}
              y1={connectorY}
              x2={children[children.length - 1].x}
              y2={connectorY}
              stroke="#007AFF"
              strokeWidth="2"
            />
          );
        }
        
        // Connect each child to the horizontal line
        children.forEach((child, index) => {
          lines.push(
            <Line
              key={`child-line-${index}`}
              x1={child.x}
              y1={connectorY}
              x2={child.x}
              y2={childrenTopY}
              stroke="#007AFF"
              strokeWidth="2"
            />
          );
        });
      } else {
        // If no spouse, fallback to original implementation but with adjusted positions
        const selfBottomY = self.y + 120; // Below self circle
        const connectorY = self.y + 180; // Below name text
        const childrenTopY = children[0].y + 70; // Above children circles
        
        lines.push(
          <Line
            key="self-children-line"
            x1={self.x}
            y1={selfBottomY}
            x2={self.x}
            y2={connectorY}
            stroke="#007AFF"
            strokeWidth="2"
          />
        );
        
        if (children.length > 1) {
          lines.push(
            <Line
              key="children-connector"
              x1={children[0].x}
              y1={connectorY}
              x2={children[children.length - 1].x}
              y2={connectorY}
              stroke="#007AFF"
              strokeWidth="2"
            />
          );
        }
        
        children.forEach((child, index) => {
          lines.push(
            <Line
              key={`child-line-${index}`}
              x1={child.x}
              y1={connectorY}
              x2={child.x}
              y2={childrenTopY}
              stroke="#007AFF"
              strokeWidth="2"
            />
          );
        });
      }
    }
    
    // Connect self to parents
    const parents = treeLayout.filter(member => member.relationship === 'Parent');
    if (self && parents.length > 0) {
      const selfTopY = self.y + 70; // Above self circle
      const parentBottomY = parents[0].y + 130; // Below parent circle
      const connectorY = (selfTopY + parentBottomY) / 2; // Midpoint between self and parents
      
      lines.push(
        <Line
          key="self-parents-line"
          x1={self.x}
          y1={selfTopY}
          x2={self.x}
          y2={connectorY}
          stroke="#007AFF"
          strokeWidth="2"
        />
      );
      
      if (parents.length > 1) {
        lines.push(
          <Line
            key="parents-connector"
            x1={parents[0].x}
            y1={connectorY}
            x2={parents[parents.length - 1].x}
            y2={connectorY}
            stroke="#007AFF"
            strokeWidth="2"
          />
        );
      }
      
      parents.forEach((parent, index) => {
        lines.push(
          <Line
            key={`parent-line-${index}`}
            x1={parent.x}
            y1={connectorY}
            x2={parent.x}
            y2={parentBottomY}
            stroke="#007AFF"
            strokeWidth="2"
          />
        );
      });
    }
    
    // Connect parents to grandparents
    const grandparents = treeLayout.filter(member => member.relationship === 'Grandparent');
    if (parents.length > 0 && grandparents.length > 0) {
      if (parents[0] && grandparents[0]) {
        const parentTopY = parents[0].y + 70; // Above parent circle
        const grandparentBottomY = grandparents[0].y + 130; // Below grandparent circle
        
        lines.push(
          <Line
            key="parent-grandparent-line"
            x1={parents[0].x}
            y1={parentTopY}
            x2={grandparents[0].x}
            y2={grandparentBottomY}
            stroke="#5E5CE6"
            strokeWidth="1.5"
            strokeDasharray="5,5"
          />
        );
      }
    }
    
    // Connect children to grandchildren
    const grandchildren = treeLayout.filter(member => member.relationship === 'Grandchild');
    if (children.length > 0 && grandchildren.length > 0) {
      if (children[0] && grandchildren[0]) {
        const childBottomY = children[0].y + 130; // Below child circle
        const grandchildTopY = grandchildren[0].y + 70; // Above grandchild circle
        
        lines.push(
          <Line
            key="child-grandchild-line"
            x1={children[0].x}
            y1={childBottomY}
            x2={grandchildren[0].x}
            y2={grandchildTopY}
            stroke="#5E5CE6"
            strokeWidth="1.5"
            strokeDasharray="5,5"
          />
        );
      }
    }
    
    return lines;
  };

  if (!familyMembers || familyMembers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people" size={64} color="#DDD" />
        <Text style={styles.emptyText}>No family members to display</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal={true}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollContainer}
    >
      <ScrollView
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.verticalScrollContent}
      >
        <Svg height="800" width={Math.max(windowWidth * 2, 1200)}>
          {getConnectorLines()}
          {treeLayout.map((member, index) => (
            <React.Fragment key={member.id || index}>
              <Circle
                cx={member.x}
                cy={member.y + 100}
                r={35}  // Slightly larger circles
                fill={getNodeColor(member.relationship)}
                onPress={() => onMemberPress(member)}
              />
              <SvgText
                x={member.x}
                y={member.y + 155}  // More space between circle and name
                textAnchor="middle"
                fill="#333"
                fontSize="13"  // Slightly larger text
                fontWeight="bold"  // Make text more visible
              >
                {member.name?.split(' ')[0] || 'Unknown'}
              </SvgText>
              <SvgText
                x={member.x}
                y={member.y + 175}  // More space between name and relationship
                textAnchor="middle"
                fill="#444"  // Darker color for better visibility
                fontSize="11"  // Slightly larger text
              >
                {getGenderSpecificRelationship(member.relationship, member.gender)}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </ScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    minWidth: 1200,  // Increased to accommodate wider spacing
    alignItems: 'center',
  },
  verticalScrollContent: {
    paddingVertical: 40,  // More vertical padding
    paddingHorizontal: 30,  // More horizontal padding
    minHeight: 800,  // Increased to match SVG height
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default FamilyTreeView;