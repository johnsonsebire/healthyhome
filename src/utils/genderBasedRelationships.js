/**
 * Gender-based relationship utility functions
 * This file contains utilities for determining gender-specific relationship displays
 */

/**
 * Gets the gender-specific relationship display based on the user's gender and the family member's relationship
 * @param {string} relationship - The base relationship (e.g., 'Spouse', 'Parent', 'Child')
 * @param {string} memberGender - The gender of the family member
 * @param {string} userGender - The gender of the current user (optional)
 * @returns {string} The gender-specific relationship display
 */
export const getGenderSpecificRelationship = (relationship, memberGender, userGender = null) => {
  switch (relationship) {
    case 'Spouse':
      if (memberGender === 'Male') {
        return 'Husband';
      } else if (memberGender === 'Female') {
        return 'Wife';
      }
      return 'Spouse'; // fallback for 'Other' or undefined gender

    case 'Parent':
      if (memberGender === 'Male') {
        return 'Father';
      } else if (memberGender === 'Female') {
        return 'Mother';
      }
      return 'Parent'; // fallback

    case 'Child':
      if (memberGender === 'Male') {
        return 'Son';
      } else if (memberGender === 'Female') {
        return 'Daughter';
      }
      return 'Child'; // fallback

    case 'Sibling':
      if (memberGender === 'Male') {
        return 'Brother';
      } else if (memberGender === 'Female') {
        return 'Sister';
      }
      return 'Sibling'; // fallback

    case 'Grandparent':
      if (memberGender === 'Male') {
        return 'Grandfather';
      } else if (memberGender === 'Female') {
        return 'Grandmother';
      }
      return 'Grandparent'; // fallback

    case 'Grandchild':
      if (memberGender === 'Male') {
        return 'Grandson';
      } else if (memberGender === 'Female') {
        return 'Granddaughter';
      }
      return 'Grandchild'; // fallback

    default:
      return relationship; // Return the original relationship for 'Self' and 'Other'
  }
};

/**
 * Gets the relationship emoji based on gender-specific relationship
 * @param {string} relationship - The relationship string
 * @param {string} memberGender - The gender of the family member
 * @returns {string} The appropriate emoji
 */
export const getRelationshipEmoji = (relationship, memberGender) => {
  const genderSpecific = getGenderSpecificRelationship(relationship, memberGender);
  
  switch (genderSpecific) {
    case 'Husband':
      return '👨‍❤️‍👩';
    case 'Wife':
      return '👩‍❤️‍👨';
    case 'Father':
      return '👨‍👦';
    case 'Mother':
      return '👩‍👦';
    case 'Son':
      return '👦';
    case 'Daughter':
      return '👧';
    case 'Brother':
      return '👨‍👦‍👦';
    case 'Sister':
      return '👩‍👧‍👧';
    case 'Grandfather':
      return '👴';
    case 'Grandmother':
      return '👵';
    case 'Grandson':
      return '👦';
    case 'Granddaughter':
      return '👧';
    default:
      return relationship === 'Self' ? '👤' : '👥';
  }
};
