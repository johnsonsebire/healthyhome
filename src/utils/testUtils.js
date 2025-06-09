import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../contexts/AuthContext';
import { SubscriptionContext } from '../contexts/SubscriptionContext';
import { ErrorContext } from '../contexts/ErrorContext';

// Test providers wrapper
export const createTestProviders = (customValues = {}) => {
  const defaultAuthValue = {
    user: global.testUser,
    userProfile: { name: 'Test User', email: 'test@example.com' },
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    loading: false,
    ...customValues.auth,
  };

  const defaultSubscriptionValue = {
    currentPlan: { id: 'free', name: 'Free Plan' },
    plans: [
      { id: 'free', name: 'Free Plan' },
      { id: 'premium', name: 'Premium Plan' },
    ],
    canUploadFile: jest.fn(() => true),
    upgradeSubscription: jest.fn(),
    ...customValues.subscription,
  };

  const defaultErrorValue = {
    withErrorHandling: jest.fn((fn) => fn()),
    isLoading: false,
    ...customValues.error,
  };

  return ({ children }) => (
    <NavigationContainer>
      <AuthContext.Provider value={defaultAuthValue}>
        <SubscriptionContext.Provider value={defaultSubscriptionValue}>
          <ErrorContext.Provider value={defaultErrorValue}>
            {children}
          </ErrorContext.Provider>
        </SubscriptionContext.Provider>
      </AuthContext.Provider>
    </NavigationContainer>
  );
};

// Enhanced render function with providers
export const renderWithProviders = (component, customValues = {}) => {
  const TestProviders = createTestProviders(customValues);
  return render(component, { wrapper: TestProviders });
};

// Navigation mock helpers
export const createMockNavigation = (overrides = {}) => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  reset: jest.fn(),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
  ...overrides,
});

export const createMockRoute = (params = {}) => ({
  key: 'test-route',
  name: 'TestScreen',
  params,
});

// Firebase mock helpers
export const createMockFirebaseDoc = (data) => ({
  id: 'mock-doc-id',
  data: () => data,
  exists: () => true,
});

export const createMockFirebaseQuery = (docs) => ({
  docs: docs.map(doc => createMockFirebaseDoc(doc)),
  size: docs.length,
  empty: docs.length === 0,
});

// Form testing helpers
export const fillForm = (getByTestId, formData) => {
  Object.entries(formData).forEach(([field, value]) => {
    const input = getByTestId(`${field}-input`);
    fireEvent.changeText(input, value);
  });
};

export const submitForm = (getByTestId) => {
  const submitButton = getByTestId('submit-button');
  fireEvent.press(submitButton);
};

// Async testing helpers
export const waitForAsyncOperation = async (fn, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Async operation timed out after ${timeout}ms`));
    }, timeout);

    fn().then((result) => {
      clearTimeout(timeoutId);
      resolve(result);
    }).catch((error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
};

// Mock data generators
export const generateMockRecord = (overrides = {}) => ({
  ...global.testRecord,
  id: `record-${Date.now()}`,
  ...overrides,
});

export const generateMockFamilyMember = (overrides = {}) => ({
  ...global.testFamilyMember,
  id: `member-${Date.now()}`,
  ...overrides,
});

export const generateMockRecords = (count = 5) => {
  return Array.from({ length: count }, (_, index) =>
    generateMockRecord({
      id: `record-${index}`,
      title: `Record ${index + 1}`,
    })
  );
};

// Error simulation helpers
export const simulateNetworkError = () => {
  throw new Error('Network request failed');
};

export const simulateValidationError = (field) => {
  return { [field]: 'This field is required' };
};

// Performance testing helpers
export const measureRenderTime = (renderFn) => {
  const start = performance.now();
  const result = renderFn();
  const end = performance.now();
  
  return {
    result,
    renderTime: end - start,
  };
};

// Accessibility testing helpers
export const checkAccessibility = (component) => {
  const { getByRole, getAllByRole } = render(component);
  
  return {
    hasButtons: () => getAllByRole('button').length > 0,
    hasInputs: () => getAllByRole('textbox').length > 0,
    hasImages: () => getAllByRole('image').length > 0,
    getAccessibilityInfo: (testId) => {
      try {
        const element = getByTestId(testId);
        return {
          accessible: element.props.accessible,
          accessibilityLabel: element.props.accessibilityLabel,
          accessibilityHint: element.props.accessibilityHint,
          accessibilityRole: element.props.accessibilityRole,
        };
      } catch {
        return null;
      }
    },
  };
};

// Snapshot testing helpers
export const createSnapshot = (component, name) => {
  const tree = render(component).toJSON();
  expect(tree).toMatchSnapshot(name);
};

// Custom matchers
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass,
    };
  },
  
  toBeValidDate(received) {
    const date = new Date(received);
    const pass = date instanceof Date && !isNaN(date);
    
    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid date`,
      pass,
    };
  },
});

export default {
  createTestProviders,
  renderWithProviders,
  createMockNavigation,
  createMockRoute,
  createMockFirebaseDoc,
  createMockFirebaseQuery,
  fillForm,
  submitForm,
  waitForAsyncOperation,
  generateMockRecord,
  generateMockFamilyMember,
  generateMockRecords,
  simulateNetworkError,
  simulateValidationError,
  measureRenderTime,
  checkAccessibility,
  createSnapshot,
};
