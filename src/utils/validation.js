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
    const fieldRules = rules[field];
    
    fieldRules.forEach(rule => {
      if (rule.type === 'required' && !validateRequired(value)) {
        errors[field] = rule.message || `${field} is required`;
      } else if (rule.type === 'email' && value && !validateEmail(value)) {
        errors[field] = rule.message || 'Invalid email format';
      } else if (rule.type === 'password' && value && !validatePassword(value)) {
        errors[field] = rule.message || 'Password must be at least 8 characters with uppercase, lowercase, and number';
      } else if (rule.type === 'phone' && value && !validatePhone(value)) {
        errors[field] = rule.message || 'Invalid phone number format';
      } else if (rule.type === 'minLength' && value && !validateMinLength(value, rule.value)) {
        errors[field] = rule.message || `Minimum length is ${rule.value}`;
      } else if (rule.type === 'maxLength' && value && !validateMaxLength(value, rule.value)) {
        errors[field] = rule.message || `Maximum length is ${rule.value}`;
      }
    });
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
