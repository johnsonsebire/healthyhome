// Validation utilities

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validatePhone = (phone) => {
  // US phone number format
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
};

export const validateDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0;
};

export const validateMinLength = (value, minLength) => {
  return value && value.toString().length >= minLength;
};

export const validateMaxLength = (value, maxLength) => {
  return !value || value.toString().length <= maxLength;
};

// Form validation helper
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = Array.isArray(rules[field]) ? rules[field] : [rules[field]];
    
    fieldRules.forEach(rule => {
      // Skip validation if field already has error
      if (errors[field]) return;
      
      // Handle string rules (legacy format)
      if (typeof rule === 'string') {
        if (rule === 'required' && !validateRequired(value)) {
          errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        } else if (rule === 'email' && value && !validateEmail(value)) {
          errors[field] = 'Invalid email format';
        } else if (rule === 'password' && value && !validatePassword(value)) {
          errors[field] = 'Password must be at least 8 characters with uppercase, lowercase, and number';
        } else if (rule === 'phone' && value && !validatePhone(value)) {
          errors[field] = 'Invalid phone number format';
        }
        return;
      }
      
      // Handle object rules (new format)
      if (rule.required && !validateRequired(value)) {
        errors[field] = rule.message || `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      } else if (rule.email && value && !validateEmail(value)) {
        errors[field] = rule.message || 'Invalid email format';
      } else if (rule.password && value && !validatePassword(value)) {
        errors[field] = rule.message || 'Password must be at least 8 characters with uppercase, lowercase, and number';
      } else if (rule.phone && value && !validatePhone(value)) {
        errors[field] = rule.message || 'Invalid phone number format';
      } else if (rule.minLength && value && !validateMinLength(value, rule.minLength)) {
        errors[field] = rule.message || `Minimum length is ${rule.minLength} characters`;
      } else if (rule.maxLength && value && !validateMaxLength(value, rule.maxLength)) {
        errors[field] = rule.message || `Maximum length is ${rule.maxLength} characters`;
      } else if (rule.date && value && !validateDate(value)) {
        errors[field] = rule.message || 'Invalid date format';
      } else if (rule.match && value !== data[rule.match]) {
        errors[field] = rule.message || 'Fields do not match';
      }
    });
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Helper to get field-specific error message
export const getFieldError = (fieldName, validationErrors) => {
  return validationErrors[fieldName] || null;
};

// Helper to check if field has error
export const hasFieldError = (fieldName, validationErrors) => {
  return Boolean(validationErrors[fieldName]);
};
