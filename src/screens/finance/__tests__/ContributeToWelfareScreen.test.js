import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ContributeToWelfareScreen from '../ContributeToWelfareScreen';
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

describe('ContributeToWelfareScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };
  
  const mockRoute = {
    params: {
      accountId: 'welfare-1'
    }
  };
  
  const mockWelfareAccount = {
    id: 'welfare-1',
    name: 'Family Emergency Fund',
    balance: 5000,
    goal: 10000,
    description: 'For family emergencies',
    contributionFrequency: 'monthly',
    contributionAmount: 200,
    familyId: 'extended-family-1',
    members: ['user1', 'user2'],
    createdAt: new Date('2023-01-01'),
    lastContribution: new Date('2023-06-01'),
  };
  
  const mockGetWelfareAccount = jest.fn(() => mockWelfareAccount);
  const mockContributeToWelfare = jest.fn(() => Promise.resolve());
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    useFinance.mockReturnValue({
      getWelfareAccount: mockGetWelfareAccount,
      contributeToWelfare: mockContributeToWelfare,
      isLoading: false,
      error: null,
      currentScope: FINANCE_SCOPE.EXTENDED,
    });
    
    useFamilySharing.mockReturnValue({
      currentUserProfile: {
        id: 'user1',
        name: 'John Doe'
      }
    });
  });

  it('renders contribution form correctly', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <ContributeToWelfareScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Check form title and account details
    expect(getByText('Contribute to Welfare Account')).toBeTruthy();
    expect(getByText('Family Emergency Fund')).toBeTruthy();
    expect(getByText('Balance: $5,000')).toBeTruthy();
    expect(getByText('Goal: $10,000')).toBeTruthy();
    
    // Check input fields are present
    expect(getByPlaceholderText('Amount')).toBeTruthy();
    expect(getByPlaceholderText('Notes (optional)')).toBeTruthy();
    
    // Check that suggested amount is displayed
    expect(getByText('Suggested amount: $200')).toBeTruthy();
    
    // Check buttons
    expect(getByText('Contribute')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText, findByText } = renderWithProviders(
      <ContributeToWelfareScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    // Submit form without filling required fields
    fireEvent.press(getByText('Contribute'));
    
    // Check validation errors
    expect(await findByText('Amount is required')).toBeTruthy();
    
    // Verify contributeToWelfare was not called
    expect(mockContributeToWelfare).not.toHaveBeenCalled();
  });

  it('validates that amount is greater than zero', async () => {
    const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
      <ContributeToWelfareScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    // Enter invalid amount
    fireEvent.changeText(getByPlaceholderText('Amount'), '0');
    
    // Submit form
    fireEvent.press(getByText('Contribute'));
    
    // Check validation errors
    expect(await findByText('Amount must be greater than 0')).toBeTruthy();
    
    // Verify contributeToWelfare was not called
    expect(mockContributeToWelfare).not.toHaveBeenCalled();
  });

  it('contributes to welfare account when form is valid', async () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <ContributeToWelfareScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    // Fill out the form
    fireEvent.changeText(getByPlaceholderText('Amount'), '500');
    fireEvent.changeText(getByPlaceholderText('Notes (optional)'), 'Monthly contribution');
    
    // Submit form
    fireEvent.press(getByText('Contribute'));
    
    // Wait for the contributeToWelfare function to be called
    await waitFor(() => {
      expect(mockContributeToWelfare).toHaveBeenCalledWith('welfare-1', {
        amount: 500,
        notes: 'Monthly contribution',
        contributorId: 'user1',
        contributorName: 'John Doe',
        date: expect.any(Date)
      });
    });
    
    // Check that navigation.goBack was called after successful contribution
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('shows loading state during contribution submission', async () => {
    // Mock loading state
    useFinance.mockReturnValue({
      getWelfareAccount: mockGetWelfareAccount,
      contributeToWelfare: jest.fn(() => new Promise(resolve => setTimeout(() => resolve(), 100))),
      isLoading: true,
      error: null,
      currentScope: FINANCE_SCOPE.EXTENDED,
    });
    
    const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
      <ContributeToWelfareScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    // Fill out the form
    fireEvent.changeText(getByPlaceholderText('Amount'), '500');
    
    // Submit form
    fireEvent.press(getByText('Contribute'));
    
    // Check that loading indicator is displayed
    expect(getByTestId('loading-indicator')).toBeTruthy();
    
    // Check that contribute button is disabled during loading
    expect(getByText('Contribute').props.disabled).toBe(true);
  });

  it('displays error message when contribution fails', async () => {
    // Mock error state
    const errorMessage = 'Failed to process contribution';
    useFinance.mockReturnValue({
      getWelfareAccount: mockGetWelfareAccount,
      contributeToWelfare: jest.fn(() => Promise.reject(new Error(errorMessage))),
      isLoading: false,
      error: errorMessage,
      currentScope: FINANCE_SCOPE.EXTENDED,
    });
    
    const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
      <ContributeToWelfareScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    // Fill out the form
    fireEvent.changeText(getByPlaceholderText('Amount'), '500');
    
    // Submit form
    fireEvent.press(getByText('Contribute'));
    
    // Check that error message is displayed
    expect(await findByText(errorMessage)).toBeTruthy();
  });

  it('uses suggested amount when preset button is pressed', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <ContributeToWelfareScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    // Press the suggested amount button
    fireEvent.press(getByText('Suggested amount: $200'));
    
    // Check that amount field is filled with suggested amount
    expect(getByPlaceholderText('Amount').props.value).toBe('200');
  });

  it('cancels contribution when cancel button is pressed', () => {
    const { getByText } = renderWithProviders(
      <ContributeToWelfareScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    // Press cancel button
    fireEvent.press(getByText('Cancel'));
    
    // Check that navigation.goBack was called
    expect(mockNavigation.goBack).toHaveBeenCalled();
    
    // Verify contributeToWelfare was not called
    expect(mockContributeToWelfare).not.toHaveBeenCalled();
  });
});
