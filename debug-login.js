// Quick login debugging test
const { validateForm, getFieldError, hasFieldError } = require('./src/utils/validation.js');

console.log('=== Testing Login Validation ===');

// Test 1: Empty fields
console.log('\n1. Testing empty fields:');
const emptyData = { email: '', password: '' };
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

const emptyResult = validateForm(emptyData, loginRules);
console.log('Empty validation result:', emptyResult);
console.log('Email error:', getFieldError('email', emptyResult.errors));
console.log('Has email error:', hasFieldError('email', emptyResult.errors));

// Test 2: Invalid email
console.log('\n2. Testing invalid email:');
const invalidEmailData = { email: 'invalid-email', password: 'password123' };
const invalidEmailResult = validateForm(invalidEmailData, loginRules);
console.log('Invalid email result:', invalidEmailResult);

// Test 3: Short password
console.log('\n3. Testing short password:');
const shortPasswordData = { email: 'test@test.com', password: '123' };
const shortPasswordResult = validateForm(shortPasswordData, loginRules);
console.log('Short password result:', shortPasswordResult);

// Test 4: Valid data
console.log('\n4. Testing valid data:');
const validData = { email: 'test@test.com', password: 'password123' };
const validResult = validateForm(validData, loginRules);
console.log('Valid data result:', validResult);

console.log('\n=== Testing Legacy String Rules ===');

// Test legacy format (the one that was causing issues)
const legacyRules = {
  email: ['required', 'email'],
  password: ['required', { minLength: 6 }]
};

const legacyResult = validateForm(emptyData, legacyRules);
console.log('Legacy rules result:', legacyResult);

console.log('\n=== All Tests Complete ===');
