import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRelationshipCategory, getFamilyCategoryByPerspective, FAMILY_CATEGORIES } from '../utils/familyRelationships';
import { getGenderSpecificRelationship } from '../utils/genderBasedRelationships';
import Svg, { Line, Circle, Text as SvgText, Path } from 'react-native-svg';

const FamilyTreeView = ({ familyMembers, onMemberPress }) => {
  const [treeLayout, setTreeLayout] = useState([]);
  const [scrollReady, setScrollReady] = useState(false);
  const horizontalScrollViewRef = useRef(null);
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  
  useEffect(() => {
    if (familyMembers && familyMembers.length > 0) {
      generateTreeLayout();
    }
  }, [familyMembers]);
  
  // Effect to center the tree after layout is calculated
  useEffect(() => {
    if (treeLayout.length > 0 && horizontalScrollViewRef.current) {
      // Find the self node to center on
      const self = treeLayout.find(member => member.relationship === 'Self');
      
      if (self) {
        // Calculate center position - we want self to be centered on screen
        // Add a slight delay to ensure the scroll view is fully rendered
        setTimeout(() => {
          const scrollToX = Math.max(0, self.x - (windowWidth / 2) + 100); // 100px offset for better centering
          
          horizontalScrollViewRef.current.scrollTo({
            x: scrollToX,
            y: 0,
            animated: false // Initial position without animation
          });
          setScrollReady(true);
        }, 100);
      }
    }
  }, [treeLayout]);

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
    
    // Position self in a more centered position
    const layout = [{
      ...self,
      x: windowWidth * 1.5, // Position more towards the center of the available space
      y: 150  // Increased vertical spacing
    }];
    
    // Find spouse
    const spouse = familyMembers.find(member => member.relationship === 'Spouse');
    if (spouse) {
      layout.push({
        ...spouse,
        x: layout[0].x + 150,  // Position relative to updated self position
        y: 150
      });
    }
    
    // Find children
    const children = familyMembers.filter(member => member.relationship === 'Child');
    
    // Position children relative to both parents if spouse exists
    if (children.length > 0) {
      const childrenStartX = spouse 
        ? (layout[0].x + 75) - (children.length * 80) / 2  // Center children between self and spouse with more space
        : layout[0].x - (children.length - 1) * 80 / 2;    // Center children under self if no spouse
        
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
      // If there's only one parent, center it above self
      // Otherwise, space them apart evenly
      const parentX = parents.length === 1 
        ? layout[0].x  // Center the single parent above updated self position
        : layout[0].x - 80 + index * 160;  // Increased spacing between parents
      
      layout.push({
        ...parent,
        x: parentX,
        y: 40
      });
    });
    
    // Find siblings
    const siblings = familyMembers.filter(member => member.relationship === 'Sibling');
    
    // Position siblings to the left of self with proper spacing
    siblings.forEach((sibling, index) => {
      // Position siblings with less space to stay within container
      const siblingX = layout[0].x - (250 + (index * 150)); // Reduced spacing to keep within container
      layout.push({
        ...sibling,
        x: siblingX,
        y: 150
      });
    });
    
    // Position grandparents
    const grandparents = familyMembers.filter(member => member.relationship === 'Grandparent');
    
    // Group grandparents by pairs (assuming each parent has two grandparents)
    const groupedGrandparents = [];
    for (let i = 0; i < grandparents.length; i += 2) {
      const pair = grandparents.slice(i, i + 2);
      groupedGrandparents.push(pair);
    }
    
    // Determine how many parents we have
    const parentCount = parents.length;
    
    // Position each grandparent relative to their child (parent)
    let grandparentIndex = 0;
    groupedGrandparents.forEach((pair, groupIndex) => {
      // Position relative to a parent if possible
      const parentX = groupIndex < parentCount 
        ? parents[groupIndex].x 
        : windowWidth / 2;
        
      pair.forEach((grandparent, pairIndex) => {
        // Offset to left or right of the parent
        const offsetX = pairIndex === 0 ? -70 : 70;
        
        layout.push({
          ...grandparent,
          x: parentX + offsetX,
          y: -60  // More space at the top
        });
        
        grandparentIndex++;
      });
    });
    
    // Position grandchildren
    const grandchildren = familyMembers.filter(member => member.relationship === 'Grandchild');
    
    // Group grandchildren by pairs (assuming each child has two grandchildren)
    const groupedGrandchildren = [];
    for (let i = 0; i < grandchildren.length; i += 2) {
      const pair = grandchildren.slice(i, i + 2);
      groupedGrandchildren.push(pair);
    }
    
    // Determine how many children we have
    const childCount = children.length;
    
    // Position each grandchild relative to their parent (child)
    let grandchildIndex = 0;
    groupedGrandchildren.forEach((pair, groupIndex) => {
      // Position relative to a child if possible
      const childX = groupIndex < childCount 
        ? children[groupIndex].x 
        : windowWidth / 2;
        
      pair.forEach((grandchild, pairIndex) => {
        // Offset to left or right of the child
        const offsetX = pairIndex === 0 ? -40 : 40;
        
        layout.push({
          ...grandchild,
          x: childX + offsetX,
          y: 450  // More vertical space for grandchildren
        });
        
        grandchildIndex++;
      });
    });
    
    // Position other relatives
    const others = familyMembers.filter(member => member.relationship === 'Other');
    others.forEach((other, index) => {
      const otherX = layout[0].x + 220 + index * 110;  // Position relative to self instead of window
      layout.push({
        ...other,
        x: otherX,
        y: 150
      });
    });
    
    setTreeLayout(layout);
  };

  const getNodeColor = (relationship) => {
    const category = getFamilyCategoryByPerspective(relationship);
    return category === FAMILY_CATEGORIES.NUCLEAR ? '#007AFF' : '#5E5CE6';
  };

  const getLineColor = (relationship1, relationship2) => {
    // If both relationships are nuclear, use nuclear color
    const isNuclear1 = getFamilyCategoryByPerspective(relationship1) === FAMILY_CATEGORIES.NUCLEAR;
    const isNuclear2 = relationship2 ? 
      getFamilyCategoryByPerspective(relationship2) === FAMILY_CATEGORIES.NUCLEAR : 
      false;
    
    // If both are nuclear or we're only checking one relationship that is nuclear
    if ((relationship2 && isNuclear1 && isNuclear2) || (!relationship2 && isNuclear1)) {
      return '#007AFF'; // Nuclear family line color
    }
    
    // For extended family connections
    return '#5E5CE6';
  };

  const getLineStyle = (relationship1, relationship2) => {
    // Handle parent connections specifically - always dashed from self to parent
    if (relationship1 === 'Self' && relationship2 === 'Parent') {
      return { strokeDasharray: "5,5" };
    }
    
    // Handle parent connections specifically - always dashed from parent to self
    if (relationship1 === 'Parent' && relationship2 === 'Self') {
      return { strokeDasharray: "5,5" };
    }
    
    // If both relationships are nuclear, use solid line
    const isNuclear1 = getFamilyCategoryByPerspective(relationship1) === FAMILY_CATEGORIES.NUCLEAR;
    const isNuclear2 = relationship2 ? 
      getFamilyCategoryByPerspective(relationship2) === FAMILY_CATEGORIES.NUCLEAR : 
      false;
    
    // If both are nuclear or we're only checking one relationship that is nuclear
    if ((relationship2 && isNuclear1 && isNuclear2) || (!relationship2 && isNuclear1)) {
      return {}; // No dashed line for nuclear family
    }
    
    // For extended family connections, use dashed lines
    return { strokeDasharray: "5,5" };
  };
  
  // Create a curved path for a single-parent connection
  const createCurvedPath = (x1, y1, x2, y2) => {
    // Control point for the curve - halfway between the two points horizontally
    const cpX = (x1 + x2) / 2;
    
    // Create path data for an SVG path element
    return `M${x1},${y1} C${cpX},${y1} ${cpX},${y2} ${x2},${y2}`;
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
            stroke={getLineColor(self.relationship, spouse.relationship)}
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
            stroke={getLineColor(self.relationship, spouse.relationship)}
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
              stroke={getLineColor(self.relationship, spouse.relationship)}
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
              stroke={getLineColor(self.relationship, spouse.relationship)}
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
            stroke={getLineColor(self.relationship)}
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
              stroke={getLineColor(self.relationship)}
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
              stroke={getLineColor(self.relationship)}
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
      
      if (parents.length === 1) {
        // When there's only one parent, draw a direct line
        const pathData = createCurvedPath(self.x, selfTopY, parents[0].x, parentBottomY);
        
        lines.push(
          <Path
            key="single-parent-path"
            d={pathData}
            fill="none"
            stroke={getLineColor(self.relationship, parents[0].relationship)}
            strokeWidth="2"
            {...getLineStyle(self.relationship, parents[0].relationship)}
          />
        );
      } else {
        // When there are multiple parents, use the standard tree structure
        lines.push(
          <Line
            key="self-parents-line"
            x1={self.x}
            y1={selfTopY}
            x2={self.x}
            y2={connectorY}
            stroke={getLineColor(self.relationship, parents[0].relationship)}
            strokeWidth="2"
            {...getLineStyle(self.relationship, parents[0].relationship)}
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
              stroke={getLineColor(parents[0].relationship, parents[parents.length - 1].relationship)}
              strokeWidth="2"
              {...getLineStyle(self.relationship, parents[0].relationship)}
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
              stroke={getLineColor(self.relationship, parent.relationship)}
              strokeWidth="2"
              {...getLineStyle(self.relationship, parent.relationship)}
            />
          );
        });
      }
    }
    
    // Connect parents to grandparents
    const grandparents = treeLayout.filter(member => member.relationship === 'Grandparent');
    if (parents.length > 0 && grandparents.length > 0) {
      // For simplicity, we'll match parents to grandparents based on their index
      // In a real app, you might want to use a more sophisticated matching based on specific relationships
      parents.forEach((parent, pIndex) => {
        // Match at most one grandparent per parent
        const matchedGrandparents = grandparents.filter((gp, gpIndex) => {
          // Simple algorithm: first parent connects to first and second grandparent
          // second parent connects to third and fourth grandparent, etc.
          return Math.floor(gpIndex / 2) === pIndex;
        });
        
        if (matchedGrandparents.length > 0) {
          matchedGrandparents.forEach(grandparent => {
            const parentTopY = parent.y + 70; // Above parent circle
            const grandparentBottomY = grandparent.y + 130; // Below grandparent circle
            const pathData = createCurvedPath(parent.x, parentTopY, grandparent.x, grandparentBottomY);
            
            lines.push(
              <Path
                key={`parent-${parent.id}-grandparent-${grandparent.id}-path`}
                d={pathData}
                fill="none"
                stroke={getLineColor(parent.relationship, grandparent.relationship)}
                strokeWidth="1.5"
                {...getLineStyle(parent.relationship, grandparent.relationship)}
              />
            );
          });
        }
      });
    }
    
    // Connect children to grandchildren
    const grandchildren = treeLayout.filter(member => member.relationship === 'Grandchild');
    if (children.length > 0 && grandchildren.length > 0) {
      // Similar to parents-grandparents, match children to grandchildren
      children.forEach((child, cIndex) => {
        // Match at most one grandchild per child
        const matchedGrandchildren = grandchildren.filter((gc, gcIndex) => {
          // Simple algorithm: first child connects to first and second grandchild
          // second child connects to third and fourth grandchild, etc.
          return Math.floor(gcIndex / 2) === cIndex;
        });
        
        if (matchedGrandchildren.length > 0) {
          matchedGrandchildren.forEach(grandchild => {
            const childBottomY = child.y + 130; // Below child circle
            const grandchildTopY = grandchild.y + 70; // Above grandchild circle
            const pathData = createCurvedPath(child.x, childBottomY, grandchild.x, grandchildTopY);
            
            lines.push(
              <Path
                key={`child-${child.id}-grandchild-${grandchild.id}-path`}
                d={pathData}
                fill="none"
                stroke={getLineColor(child.relationship, grandchild.relationship)}
                strokeWidth="1.5"
                {...getLineStyle(child.relationship, grandchild.relationship)}
              />
            );
          });
        }
      });
    }
    
    // Connect self to siblings (if any)
    const siblings = treeLayout.filter(member => member.relationship === 'Sibling');
    if (self && siblings.length > 0) {
      // Position to start connecting siblings
      const selfMiddleY = self.y + 100; // Middle of self circle
      
      siblings.forEach((sibling) => {
        const siblingMiddleY = sibling.y + 100; // Middle of sibling circle
        const pathData = createCurvedPath(self.x, selfMiddleY, sibling.x, siblingMiddleY);
        
        lines.push(
          <Path
            key={`self-sibling-${sibling.id}-path`}
            d={pathData}
            fill="none"
            stroke={getLineColor(self.relationship, sibling.relationship)}
            strokeWidth="1.5"
            {...getLineStyle(self.relationship, sibling.relationship)}
          />
        );
      });
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
      ref={horizontalScrollViewRef}
      horizontal={true}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollContainer}
      onLayout={() => setScrollReady(true)}
    >
      <ScrollView
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.verticalScrollContent}
      >
        <Svg height="800" width="2400">
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
                {member.title ? 
                  `${member.title} ${member.name?.split(' ')[0] || 'Unknown'}` : 
                  member.name?.split(' ')[0] || 'Unknown'}
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
              {member.relationship !== 'Self' && (
                <SvgText
                  x={member.x}
                  y={member.y + 190}  // Below relationship text
                  textAnchor="middle"
                  fill={getFamilyCategoryByPerspective(member.relationship) === FAMILY_CATEGORIES.NUCLEAR ? "#007AFF" : "#5E5CE6"}
                  fontSize="9"
                  fontWeight="500"
                >
                  {getFamilyCategoryByPerspective(member.relationship) === FAMILY_CATEGORIES.NUCLEAR ? "Nuclear" : "Extended"}
                </SvgText>
              )}
              {/* No text label for sharing status in the tree view */}
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
    maxHeight: '100%',
    overflow: 'hidden', // Contain content within the container
  },
  scrollContent: {
    minWidth: 2400, // Reduced to match SVG width
    alignItems: 'center',
    paddingHorizontal: 20, // Reduced horizontal padding
  },
  verticalScrollContent: {
    paddingVertical: 20, // Reduced vertical padding
    minHeight: 800, // Match SVG height
    justifyContent: 'center',
    overflow: 'hidden', // Contain content within the container
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