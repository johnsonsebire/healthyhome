// Family relationship utility functions
// This file contains utilities for determining family relationships and access permissions

/**
 * Family relationship types and their categories
 */
export const RELATIONSHIP_TYPES = {
  SELF: 'Self',
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  PARENT: 'Parent',
  SIBLING: 'Sibling',
  GRANDPARENT: 'Grandparent',
  GRANDCHILD: 'Grandchild',
  OTHER: 'Other'
};

/**
 * Family member categories
 */
export const FAMILY_CATEGORIES = {
  NUCLEAR: 'nuclear',
  EXTENDED: 'extended'
};

/**
 * Sharing preference types
 */
export const SHARING_PREFERENCES = {
  NONE: 'none',          // Share with no one
  NUCLEAR: 'nuclear',    // Share only with nuclear family
  ALL: 'all'             // Share with all family members
};

/**
 * Categorizes a relationship as nuclear or extended based on static rules
 * This is the original implementation and is kept for backwards compatibility
 * @param {string} relationship - The relationship type
 * @returns {string} The family category (nuclear or extended)
 * @deprecated Use getFamilyCategoryByPerspective instead
 */
export const getRelationshipCategory = (relationship) => {
  switch (relationship) {
    case RELATIONSHIP_TYPES.SELF:
    case RELATIONSHIP_TYPES.SPOUSE:
    case RELATIONSHIP_TYPES.CHILD:
    case RELATIONSHIP_TYPES.PARENT:
      return FAMILY_CATEGORIES.NUCLEAR;
    default:
      return FAMILY_CATEGORIES.EXTENDED;
  }
};

/**
 * Categorizes a family member as nuclear or extended from the perspective of the primary user
 * A Nuclear Family includes the user, their spouse, and their direct children
 * An Extended Family includes all other relatives (parents, siblings, grandparents, etc.)
 * Note: The SELF relationship is always considered part of both nuclear and extended family
 * 
 * @param {string} relationship - The relationship type of the family member to the primary user
 * @param {string} primaryUserRelationship - The relationship type of the primary user (typically 'Self')
 * @param {boolean} extendedFamilyView - When true, returns EXTENDED for SELF as well (for UI views where self should appear in both categories)
 * @returns {string} The family category (nuclear or extended)
 */
export const getFamilyCategoryByPerspective = (relationship, primaryUserRelationship = RELATIONSHIP_TYPES.SELF, extendedFamilyView = false) => {
  // If this is checking for SELF and we're in extendedFamilyView mode, return EXTENDED
  if (relationship === RELATIONSHIP_TYPES.SELF && extendedFamilyView) {
    return FAMILY_CATEGORIES.EXTENDED;
  }
  
  // If viewing from the primary user's perspective (the usual case)
  if (primaryUserRelationship === RELATIONSHIP_TYPES.SELF) {
    switch (relationship) {
      case RELATIONSHIP_TYPES.SELF:    // The user themselves
      case RELATIONSHIP_TYPES.SPOUSE:  // The user's spouse
      case RELATIONSHIP_TYPES.CHILD:   // The user's children
        return FAMILY_CATEGORIES.NUCLEAR;
      default:
        return FAMILY_CATEGORIES.EXTENDED;
    }
  }
  
  // If viewing from another family member's perspective (e.g., father's view)
  // This is for future functionality where users might want to see the tree from different perspectives
  switch (primaryUserRelationship) {
    case RELATIONSHIP_TYPES.PARENT:
      // From a parent's perspective, their nuclear family includes their spouse and children
      if (relationship === RELATIONSHIP_TYPES.PARENT ||         // The parent themselves
          relationship === RELATIONSHIP_TYPES.SPOUSE ||         // The parent's spouse
          relationship === RELATIONSHIP_TYPES.SELF ||           // The user (child of the parent)
          relationship === RELATIONSHIP_TYPES.SIBLING) {        // The user's siblings (other children of the parent)
        return FAMILY_CATEGORIES.NUCLEAR;
      }
      return FAMILY_CATEGORIES.EXTENDED;
      
    case RELATIONSHIP_TYPES.CHILD:
      // From a child's perspective, their nuclear family includes their spouse and their own children
      if (relationship === RELATIONSHIP_TYPES.CHILD ||          // The child themselves
          relationship === RELATIONSHIP_TYPES.SPOUSE ||         // The child's spouse
          relationship === RELATIONSHIP_TYPES.GRANDCHILD) {     // The child's children (user's grandchildren)
        return FAMILY_CATEGORIES.NUCLEAR;
      }
      return FAMILY_CATEGORIES.EXTENDED;
      
    default:
      // Default to the standard nuclear family definition
      return getRelationshipCategory(relationship);
  }
};

/**
 * Gets the family category name for display
 * @param {string} relationship - The relationship type
 * @param {string} primaryUserRelationship - The relationship type of the primary user (typically 'Self')
 * @returns {string} The family category name for display
 */
export const getFamilyCategory = (relationship, primaryUserRelationship = RELATIONSHIP_TYPES.SELF) => {
  const category = getFamilyCategoryByPerspective(relationship, primaryUserRelationship);
  return category === FAMILY_CATEGORIES.NUCLEAR ? 'Nuclear' : 'Extended';
};

/**
 * Determines if a user has access to another family member's records
 * based on their relationship and sharing preferences
 * 
 * @param {Object} viewer - The user trying to view records
 * @param {Object} target - The family member whose records are being viewed
 * @param {Object} sharingPreferences - The sharing preferences of the target
 * @returns {boolean} Whether the viewer has access to the target's records
 */
export const hasAccessToRecords = (viewer, target, sharingPreferences) => {
  // Default sharing preference if not specified
  const preference = sharingPreferences || SHARING_PREFERENCES.NUCLEAR;
  
  // Always have access to your own records
  if (viewer.id === target.id) {
    return true;
  }
  
  // If sharing is disabled, no one else has access
  if (preference === SHARING_PREFERENCES.NONE) {
    return false;
  }
  
  // Check relationship category using perspective-based categorization
  const relationshipCategory = getFamilyCategoryByPerspective(target.relationship);
  
  // If sharing with all, everyone in the family has access
  if (preference === SHARING_PREFERENCES.ALL) {
    return true;
  }
  
  // If sharing with nuclear family only, only nuclear family members have access
  if (preference === SHARING_PREFERENCES.NUCLEAR) {
    return relationshipCategory === FAMILY_CATEGORIES.NUCLEAR;
  }
  
  // Self should always have access to their own records
  if (viewer.relationship === RELATIONSHIP_TYPES.SELF && target.relationship === RELATIONSHIP_TYPES.SELF) {
    return true;
  }
  
  return false;
};

/**
 * Determines if two family members have a direct relationship
 * e.g., parent-child, spouse-spouse, etc.
 * 
 * @param {Object} member1 - First family member
 * @param {Object} member2 - Second family member
 * @returns {boolean} Whether the members have a direct relationship
 */
export const areDirectlyRelated = (member1, member2) => {
  // If one is self and the other is not, they're directly related
  if (member1.relationship === RELATIONSHIP_TYPES.SELF && 
      member2.relationship !== RELATIONSHIP_TYPES.SELF) {
    return true;
  }
  
  // If one is spouse and the other is spouse or self, they're directly related
  if ((member1.relationship === RELATIONSHIP_TYPES.SPOUSE && 
       (member2.relationship === RELATIONSHIP_TYPES.SPOUSE || 
        member2.relationship === RELATIONSHIP_TYPES.SELF)) ||
      (member2.relationship === RELATIONSHIP_TYPES.SPOUSE && 
       (member1.relationship === RELATIONSHIP_TYPES.SPOUSE || 
        member1.relationship === RELATIONSHIP_TYPES.SELF))) {
    return true;
  }
  
  // If one is parent and the other is child, they're directly related
  if ((member1.relationship === RELATIONSHIP_TYPES.PARENT && 
       member2.relationship === RELATIONSHIP_TYPES.CHILD) ||
      (member2.relationship === RELATIONSHIP_TYPES.PARENT && 
       member1.relationship === RELATIONSHIP_TYPES.CHILD)) {
    return true;
  }
  
  // If one is grandparent and the other is grandchild, they're directly related
  if ((member1.relationship === RELATIONSHIP_TYPES.GRANDPARENT && 
       member2.relationship === RELATIONSHIP_TYPES.GRANDCHILD) ||
      (member2.relationship === RELATIONSHIP_TYPES.GRANDPARENT && 
       member1.relationship === RELATIONSHIP_TYPES.GRANDCHILD)) {
    return true;
  }
  
  // If both are siblings, they're directly related
  if (member1.relationship === RELATIONSHIP_TYPES.SIBLING && 
      member2.relationship === RELATIONSHIP_TYPES.SIBLING) {
    return true;
  }
  
  return false;
};

/**
 * Gets the relationship type between two family members
 * 
 * @param {Object} member1 - First family member
 * @param {Object} member2 - Second family member
 * @returns {string|null} The relationship type, or null if not related
 */
export const getRelationshipBetween = (member1, member2) => {
  if (member1.id === member2.id) {
    return 'self';
  }
  
  if (member1.relationship === RELATIONSHIP_TYPES.SPOUSE && 
      member2.relationship === RELATIONSHIP_TYPES.SPOUSE) {
    return 'spouse';
  }
  
  if (member1.relationship === RELATIONSHIP_TYPES.PARENT && 
      member2.relationship === RELATIONSHIP_TYPES.CHILD) {
    return 'parent-child';
  }
  
  if (member1.relationship === RELATIONSHIP_TYPES.CHILD && 
      member2.relationship === RELATIONSHIP_TYPES.PARENT) {
    return 'child-parent';
  }
  
  if (member1.relationship === RELATIONSHIP_TYPES.SIBLING && 
      member2.relationship === RELATIONSHIP_TYPES.SIBLING) {
    return 'sibling';
  }
  
  if (member1.relationship === RELATIONSHIP_TYPES.GRANDPARENT && 
      member2.relationship === RELATIONSHIP_TYPES.GRANDCHILD) {
    return 'grandparent-grandchild';
  }
  
  if (member1.relationship === RELATIONSHIP_TYPES.GRANDCHILD && 
      member2.relationship === RELATIONSHIP_TYPES.GRANDPARENT) {
    return 'grandchild-grandparent';
  }
  
  return null;
};
