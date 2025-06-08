// Quick validation test
const { validateForm, getFieldError, hasFieldError } = require('./src/utils/validation.js');

// Test FamilyMemberScreen validation rules
console.log('=== Testing FamilyMemberScreen Validation ===');

const familyMemberData = {
  name: '',
  relationship: '',
  emergencyContact: '123'
};

const familyMemberRules = {
  name: [
    { required: true, message: 'Name is required' },
    { minLength: 2, message: 'Name must be at least 2 characters' }
  ],
  relationship: { required: true, message: 'Please select a relationship' },
  emergencyContact: { phone: true, message: 'Please enter a valid phone number' }
};

const familyResult = validateForm(familyMemberData, familyMemberRules);
console.log('Family Member Validation:', familyResult);
console.log('Name Error:', getFieldError('name', familyResult.errors));
console.log('Has Name Error:', hasFieldError('name', familyResult.errors));

// Test LoginScreen validation rules
console.log('\n=== Testing LoginScreen Validation ===');

const loginData = {
  email: 'invalid-email',
  password: '123'
};

const loginRules = {
  email: [
    { required: true, message: 'Email is required' },
    { email: true, message: 'Please enter a valid email' }
  ],
  password: [
    { required: true, message: 'Password is required' },
    { minLength: 6, message: 'Password must be at least 6 characters' }
  ]
};

const loginResult = validateForm(loginData, loginRules);
console.log('Login Validation:', loginResult);

// Test RegisterScreen validation rules
console.log('\n=== Testing RegisterScreen Validation ===');

const registerData = {
  firstName: 'J',
  lastName: '',
  email: 'test@test.com',
  password: 'password123',
  confirmPassword: 'different'
};

const registerRules = {
  firstName: [
    { required: true, message: 'First name is required' },
    { minLength: 2, message: 'First name must be at least 2 characters' }
  ],
  lastName: [
    { required: true, message: 'Last name is required' },
    { minLength: 2, message: 'Last name must be at least 2 characters' }
  ],
  email: [
    { required: true, message: 'Email is required' },
    { email: true, message: 'Please enter a valid email' }
  ],
  password: [
    { required: true, message: 'Password is required' },
    { minLength: 6, message: 'Password must be at least 6 characters' }
  ],
  confirmPassword: [
    { required: true, message: 'Please confirm your password' },
    { match: 'password', message: 'Passwords do not match' }
  ]
};

const registerResult = validateForm(registerData, registerRules);
console.log('Register Validation:', registerResult);

console.log('\n=== All Tests Complete ===');
