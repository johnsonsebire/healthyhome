import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import AddWelfareAccountScreen from '../AddWelfareAccountScreen';
import { useFinance, FINANCE_SCOPE } from '../../../contexts/FinanceContext';
import { useFamilySharing } from '../../../contexts/FamilySharingContext';
import { renderWithProviders } from '../../../utils/testUtils';

// Mock the hooks
jest.mock('../../../contexts/FinanceContext', () => ({
  useFinance: jest.fn(),
  FINANCE_SCOPE: {
    PERSONAL: 'personal',
    NUCLEAR: 'nuclear',
    EXTENDED: 'extended'
  }
}));

jest.mock('../../../contexts/FamilySharingContext', () => ({
  useFamilySharing: jest.fn()
}));

describe('AddWelfareAccountScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };
  
  const mockCreateWelfareAccount = jest.fn(() => Promise.resolve({ id: 'new-welfare-id' }));
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    useFinance.mockReturnValue({
      createWelfareAccount: mockCreateWelfareAccount,
      isLoading: false,
      error: null,
      currentScope: FINANCE_SCOPE.EXTENDED,
    });
    
    useFamilySharing.mockReturnValue({
      extendedFamilyId: 'extended-family-1',
      extendedFamilyMembers: [
        { id: 'user1', name: 'John Doe' },
        { id: 'user2', name: 'Jane Doe' },
      ],
      currentUserProfile: {
        id: 'user1',
        name: 'John Doe'
      }
    });
  });

  it('renders form correctly', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <AddWelfareAccountScreen navigation={mockNavigation} />
    );

    // Check form title
    expect(getByText('Create Welfare Account')).toBeTruthy();
    
    // Check input fields are present
    expect(getByPlaceholderText('Account Name')).toBeTruthy();
    expect(getByPlaceholderText('Description')).toBeTruthy();
    expect(getByPlaceholderText('Initial Balance')).toBeTruthy();
    expect(getByPlaceholderText('Goal Amount')).toBeTruthy();
    expect(getByPlaceholderText('Contribution Amount')).toBeTruthy();
    
    // Check buttons
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText, findByText } = renderWithProviders(
      <AddWelfareAccountScreen navigation={mockNavigation} />
    );
    
    // Submit form without filling required fields
    fireEvent.press(getByText('Create Account'));
    
    // Check validation errors
    expect(await findByText('Account name is required')).toBeTruthy();
    expect(await findByText('Goal amount is required')).toBeTruthy();
    
    // Verify createWelfareAccount was not called
    expect(mockCreateWelfareAccount).not.toHaveBeenCalled();
  });

  it('creates welfare account when form is valid', async () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <AddWelfareAccountScreen navigation={mockNavigation} />
    );
    
    // Fill out the form
    fireEvent.changeText(getByPlaceholderText('Account Name'), 'Emergency Fund');
    fireEvent.changeText(getByPlaceholderText('Description'), 'For family emergencies');
    fireEvent.changeText(getByPlaceholderText('Initial Balance'), '1000');
    fireEvent.changeText(getByPlaceholderText('Goal Amount'), '10000');
    fireEvent.changeText(getByPlaceholderText('Contribution Amount'), '200');
    
    // Submit form
    fireEvent.press(getByText('Create Account'));
    
    // Wait for the createWelfareAccount function to be called
    await waitFor(() => {
      expect(mockCreateWelfareAccount).toHaveBeenCalledWith({
        name: 'Emergency Fund',
        description: 'For family emergencies',
        balance: 1000,
        goal: 10000,
        contributionFrequency: 'monthly', // Default value
        contributionAmount: 200,
        familyId: 'extended-family-1',
        members: ['user1'], // Current user is added by default
        createdBy: 'user1',
        createdAt: expect.any(Date),
      });
    });
    
    // Check that navigation.goBack was called after successful creation
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('shows loading state during account creation', async () => {
    // Mock loading state
    useFinance.mockReturnValue({
      createWelfareAccount: jest.fn(() => new Promise(resolve => setTimeout(() => resolve({ id: 'new-id' }), 100))),
      isLoading: true,
      error: null,
      currentScope: FINANCE_SCOPE.EXTENDED,
    });
    
    const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
      <AddWelfareAccountScreen navigation={mockNavigation} />
    );
    
    // Fill out the form
    fireEvent.changeText(getByPlaceholderText('Account Name'), 'Emergency Fund');
    fireEvent.changeText(getByPlaceholderText('Goal Amount'), '10000');
    
    // Submit form
    fireEvent.press(getByText('Create Account'));
    
    // Check that loading indicator is displayed
    expect(getByTestId('loading-indicator')).toBeTruthy();
    
    // Check that create button is disabled during loading
    expect(getByText('Create Account').props.disabled).toBe(true);
  });

  it('displays error message when account creation fails', async () => {
    // Mock error state
    const errorMessage = 'Failed to create welfare account';
    useFinance.mockReturnValue({
      createWelfareAccount: jest.fn(() => Promise.reject(new Error(errorMessage))),
      isLoading: false,
      error: errorMessage,
      currentScope: FINANCE_SCOPE.EXTENDED,
    });
    
    const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
      <AddWelfareAccountScreen navigation={mockNavigation} />
    );
    
    // Fill out the form
    fireEvent.changeText(getByPlaceholderText('Account Name'), 'Emergency Fund');
    fireEvent.changeText(getByPlaceholderText('Goal Amount'), '10000');
    
    // Submit form
    fireEvent.press(getByText('Create Account'));
    
    // Check that error message is displayed
    expect(await findByText(errorMessage)).toBeTruthy();
  });

  it('cancels account creation when cancel button is pressed', () => {
    const { getByText } = renderWithProviders(
      <AddWelfareAccountScreen navigation={mockNavigation} />
    );
    
    // Press cancel button
    fireEvent.press(getByText('Cancel'));
    
    // Check that navigation.goBack was called
    expect(mockNavigation.goBack).toHaveBeenCalled();
    
    // Verify createWelfareAccount was not called
    expect(mockCreateWelfareAccount).not.toHaveBeenCalled();
  });
});
