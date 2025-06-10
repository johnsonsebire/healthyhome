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
        y: 120 * (index + 1)
      }));
      setTreeLayout(layout);
      return;
    }
    
    // Start with self at the center
    const layout = [{
      ...self,
      x: windowWidth / 2,
      y: 120
    }];
    
    // Find spouse
    const spouse = familyMembers.find(member => member.relationship === 'Spouse');
    if (spouse) {
      layout.push({
        ...spouse,
        x: windowWidth / 2 + 120,
        y: 120
      });
    }
    
    // Find children
    const children = familyMembers.filter(member => member.relationship === 'Child');
    children.forEach((child, index) => {
      const childX = windowWidth / 2 - (children.length - 1) * 60 / 2 + index * 60;
      layout.push({
        ...child,
        x: childX,
        y: 240
      });
    });
    
    // Find parents
    const parents = familyMembers.filter(member => member.relationship === 'Parent');
    parents.forEach((parent, index) => {
      const parentX = windowWidth / 2 - 60 + index * 120;
      layout.push({
        ...parent,
        x: parentX,
        y: 40
      });
    });
    
    // Find siblings
    const siblings = familyMembers.filter(member => member.relationship === 'Sibling');
    siblings.forEach((sibling, index) => {
      const siblingX = windowWidth / 2 - 180 - index * 90;
      layout.push({
        ...sibling,
        x: siblingX,
        y: 120
      });
    });
    
    // Position grandparents
    const grandparents = familyMembers.filter(member => member.relationship === 'Grandparent');
    grandparents.forEach((grandparent, index) => {
      const grandparentX = windowWidth / 2 - 120 + index * 80;
      layout.push({
        ...grandparent,
        x: grandparentX,
        y: -40
      });
    });
    
    // Position grandchildren
    const grandchildren = familyMembers.filter(member => member.relationship === 'Grandchild');
    grandchildren.forEach((grandchild, index) => {
      const grandchildX = windowWidth / 2 - (grandchildren.length - 1) * 40 / 2 + index * 40;
      layout.push({
        ...grandchild,
        x: grandchildX,
        y: 360
      });
    });
    
    // Position other relatives
    const others = familyMembers.filter(member => member.relationship === 'Other');
    others.forEach((other, index) => {
      const otherX = windowWidth / 2 + 180 + index * 90;
      layout.push({
        ...other,
        x: otherX,
        y: 120
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
    
    if (self && spouse) {
      lines.push(
        <Line
          key="spouse-line"
          x1={self.x}
          y1={self.y + 100}
          x2={spouse.x}
          y2={spouse.y + 100}
          stroke="#007AFF"
          strokeWidth="2"
        />
      );
    }
    
    // Connect self to children
    const children = treeLayout.filter(member => member.relationship === 'Child');
    if (self && children.length > 0) {
      const midPointY = (self.y + children[0].y) / 2 + 100;
      
      lines.push(
        <Line
          key="self-children-line"
          x1={self.x}
          y1={self.y + 120}
          x2={self.x}
          y2={midPointY}
          stroke="#007AFF"
          strokeWidth="2"
        />
      );
      
      if (children.length > 1) {
        lines.push(
          <Line
            key="children-connector"
            x1={children[0].x}
            y1={midPointY}
            x2={children[children.length - 1].x}
            y2={midPointY}
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
            y1={midPointY}
            x2={child.x}
            y2={child.y + 80}
            stroke="#007AFF"
            strokeWidth="2"
          />
        );
      });
    }
    
    // Connect self to parents
    const parents = treeLayout.filter(member => member.relationship === 'Parent');
    if (self && parents.length > 0) {
      const midPointY = (self.y + parents[0].y) / 2 + 100;
      
      lines.push(
        <Line
          key="self-parents-line"
          x1={self.x}
          y1={self.y + 80}
          x2={self.x}
          y2={midPointY}
          stroke="#007AFF"
          strokeWidth="2"
        />
      );
      
      if (parents.length > 1) {
        lines.push(
          <Line
            key="parents-connector"
            x1={parents[0].x}
            y1={midPointY}
            x2={parents[parents.length - 1].x}
            y2={midPointY}
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
            y1={midPointY}
            x2={parent.x}
            y2={parent.y + 120}
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
        lines.push(
          <Line
            key="parent-grandparent-line"
            x1={parents[0].x}
            y1={parents[0].y + 80}
            x2={grandparents[0].x}
            y2={grandparents[0].y + 120}
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
        lines.push(
          <Line
            key="child-grandchild-line"
            x1={children[0].x}
            y1={children[0].y + 120}
            x2={grandchildren[0].x}
            y2={grandchildren[0].y + 80}
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
        <Svg height="600" width={Math.max(windowWidth * 1.5, 1000)}>
          {getConnectorLines()}
          {treeLayout.map((member, index) => (
            <React.Fragment key={member.id || index}>
              <Circle
                cx={member.x}
                cy={member.y + 100}
                r={30}
                fill={getNodeColor(member.relationship)}
                onPress={() => onMemberPress(member)}
              />
              <SvgText
                x={member.x}
                y={member.y + 150}
                textAnchor="middle"
                fill="#333"
                fontSize="12"
                fontWeight="600"
              >
                {member.name?.split(' ')[0] || 'Unknown'}
              </SvgText>
              <SvgText
                x={member.x}
                y={member.y + 165}
                textAnchor="middle"
                fill="#666"
                fontSize="10"
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
    minWidth: 1000,
    alignItems: 'center',
  },
  verticalScrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 600,
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