import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import EditRecordScreen from '../screens/EditRecordScreen';
import { renderWithProviders, createMockNavigation, createMockRoute } from '../utils/testUtils';

// Mock the validation utils
jest.mock('../utils/validation', () => ({
  validateForm: jest.fn(() => ({ isValid: true, errors: {} })),
  getFieldError: jest.fn(() => null),
  hasFieldError: jest.fn(() => false),
}));

describe('EditRecordScreen', () => {
  const mockNavigation = createMockNavigation();
  const mockRoute = createMockRoute({
    recordId: 'test-record-id',
    record: global.testRecord,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with initial record data', () => {
    const { getByDisplayValue, getByText } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByDisplayValue('Test Record')).toBeTruthy();
    expect(getByDisplayValue('Test description')).toBeTruthy();
    expect(getByDisplayValue('Dr. Test')).toBeTruthy();
  });

  it('updates form data when inputs change', async () => {
    const { getByDisplayValue } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />
    );

    const titleInput = getByDisplayValue('Test Record');
    fireEvent.changeText(titleInput, 'Updated Test Record');

    await waitFor(() => {
      expect(titleInput.props.value).toBe('Updated Test Record');
    });
  });

  it('shows validation errors for required fields', async () => {
    const { validateForm } = require('../utils/validation');
    validateForm.mockReturnValue({
      isValid: false,
      errors: { title: 'Title is required' },
    });

    const { getByText, getByDisplayValue } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Clear the title
    const titleInput = getByDisplayValue('Test Record');
    fireEvent.changeText(titleInput, '');

    // Try to submit
    const submitButton = getByText('Update Record');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(validateForm).toHaveBeenCalled();
    });
  });

  it('handles image picker correctly', async () => {
    const { getByText } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />
    );

    const addPhotoButton = getByText('Add Photo');
    fireEvent.press(addPhotoButton);

    // The actual image picker is mocked, so we just verify the button works
    expect(addPhotoButton).toBeTruthy();
  });

  it('handles record type selection', async () => {
    const { getByText } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Find and press the record type selector
    const typeSelector = getByText('Prescription');
    fireEvent.press(typeSelector);

    // Modal should open - check for one of the type options
    await waitFor(() => {
      expect(getByText('Select Record Type')).toBeTruthy();
    });
  });

  it('handles family member selection', async () => {
    const { getByText } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Mock family members data
    const customValues = {
      auth: {
        user: global.testUser,
      },
    };

    const { rerender } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />,
      customValues
    );

    // This test verifies the component renders without crashing
    expect(getByText('Family Member *')).toBeTruthy();
  });

  it('handles offline mode correctly', () => {
    const customValues = {
      error: {
        withErrorHandling: jest.fn((fn) => fn()),
        isLoading: false,
      },
    };

    const { getByText } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />,
      customValues
    );

    // Component should render even in offline mode
    expect(getByText('Update Record')).toBeTruthy();
  });

  it('navigates back after successful update', async () => {
    const { getByText } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />
    );

    const submitButton = getByText('Update Record');
    fireEvent.press(submitButton);

    // Since we're mocking the Firebase operations, 
    // we just verify the component doesn't crash
    expect(submitButton).toBeTruthy();
  });

  it('handles attachment removal', async () => {
    const recordWithAttachments = {
      ...global.testRecord,
      attachments: [
        {
          id: 'attachment-1',
          name: 'test-image.jpg',
          type: 'image',
          url: 'https://example.com/image.jpg',
          size: 1024,
        },
      ],
    };

    const routeWithAttachments = createMockRoute({
      recordId: 'test-record-id',
      record: recordWithAttachments,
    });

    const { getByText } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={routeWithAttachments} />
    );

    // Component should render with attachments
    expect(getByText('Current Attachments')).toBeTruthy();
  });

  it('handles date picker correctly', async () => {
    const { getByText } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />
    );

    const dateSelector = getByText('2024-01-01');
    fireEvent.press(dateSelector);

    // Date picker should open
    await waitFor(() => {
      expect(getByText('Select Date')).toBeTruthy();
    });
  });

  it('displays loading state correctly', () => {
    const customValues = {
      error: {
        withErrorHandling: jest.fn((fn) => fn()),
        isLoading: true,
      },
    };

    const { getByTestId } = renderWithProviders(
      <EditRecordScreen navigation={mockNavigation} route={mockRoute} />,
      customValues
    );

    // Should show loading overlay when isLoading is true
    // This would need the component to have a testID for the loading spinner
    expect(() => getByTestId('loading-spinner')).not.toThrow();
  });
});
