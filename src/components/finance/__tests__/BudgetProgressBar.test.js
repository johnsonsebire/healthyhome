import React from 'react';
import { render } from '@testing-library/react-native';
import BudgetProgressBar from '../BudgetProgressBar';

describe('BudgetProgressBar', () => {
  it('renders correctly with default props', () => {
    const { getByTestId, getByText } = render(
      <BudgetProgressBar current={500} target={1000} />
    );
    
    // Check if progress bar is rendered
    const progressBar = getByTestId('budget-progress-bar');
    expect(progressBar).toBeTruthy();
    
    // Check if progress width is 50%
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '50%' })
      ])
    );
    
    // Check if percentage text is displayed
    expect(getByText('50%')).toBeTruthy();
  });
  
  it('renders with custom colors', () => {
    const { getByTestId } = render(
      <BudgetProgressBar 
        current={500} 
        target={1000} 
        barColor="#FF0000" 
        backgroundColor="#EEEEEE" 
      />
    );
    
    // Check if progress bar has custom color
    const progressBar = getByTestId('budget-progress-bar');
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#FF0000' })
      ])
    );
    
    // Check if background has custom color
    const progressContainer = getByTestId('progress-container');
    expect(progressContainer.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#EEEEEE' })
      ])
    );
  });
  
  it('handles zero target correctly', () => {
    const { getByTestId, getByText } = render(
      <BudgetProgressBar current={500} target={0} />
    );
    
    // Check if progress bar is at 100%
    const progressBar = getByTestId('budget-progress-bar');
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '100%' })
      ])
    );
    
    // Check if percentage text shows 100%
    expect(getByText('100%')).toBeTruthy();
  });
  
  it('handles current greater than target correctly', () => {
    const { getByTestId, getByText } = render(
      <BudgetProgressBar current={1500} target={1000} />
    );
    
    // Check if progress bar is capped at 100%
    const progressBar = getByTestId('budget-progress-bar');
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '100%' })
      ])
    );
    
    // Check if percentage text shows appropriate value
    expect(getByText('150%')).toBeTruthy();
  });
  
  it('displays custom text when provided', () => {
    const { getByText, queryByText } = render(
      <BudgetProgressBar 
        current={500} 
        target={1000} 
        text="$500 of $1,000"
        showPercentage={false}
      />
    );
    
    // Check if custom text is displayed
    expect(getByText('$500 of $1,000')).toBeTruthy();
    
    // Check that percentage is not displayed
    expect(queryByText('50%')).toBeNull();
  });
  
  it('shows both percentage and custom text when both are enabled', () => {
    const { getByText } = render(
      <BudgetProgressBar 
        current={500} 
        target={1000} 
        text="$500 of $1,000"
        showPercentage={true}
      />
    );
    
    // Check if both texts are displayed
    expect(getByText('50%')).toBeTruthy();
    expect(getByText('$500 of $1,000')).toBeTruthy();
  });
  
  it('applies different colors based on threshold', () => {
    // Test when below warning threshold
    const { getByTestId, rerender } = render(
      <BudgetProgressBar 
        current={100} 
        target={1000} 
        barColor="#00FF00"
        warningColor="#FFFF00"
        criticalColor="#FF0000"
        warningThreshold={0.3}
        criticalThreshold={0.7}
      />
    );
    
    // Check color is green when below warning threshold
    let progressBar = getByTestId('budget-progress-bar');
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#00FF00' })
      ])
    );
    
    // Test when between warning and critical threshold
    rerender(
      <BudgetProgressBar 
        current={500} 
        target={1000} 
        barColor="#00FF00"
        warningColor="#FFFF00"
        criticalColor="#FF0000"
        warningThreshold={0.3}
        criticalThreshold={0.7}
      />
    );
    
    // Check color is yellow when between thresholds
    progressBar = getByTestId('budget-progress-bar');
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#FFFF00' })
      ])
    );
    
    // Test when above critical threshold
    rerender(
      <BudgetProgressBar 
        current={800} 
        target={1000} 
        barColor="#00FF00"
        warningColor="#FFFF00"
        criticalColor="#FF0000"
        warningThreshold={0.3}
        criticalThreshold={0.7}
      />
    );
    
    // Check color is red when above critical threshold
    progressBar = getByTestId('budget-progress-bar');
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#FF0000' })
      ])
    );
  });
  
  it('handles negative current value correctly', () => {
    const { getByTestId, getByText } = render(
      <BudgetProgressBar current={-200} target={1000} />
    );
    
    // Check if progress bar is at 0%
    const progressBar = getByTestId('budget-progress-bar');
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '0%' })
      ])
    );
    
    // Check if percentage text shows appropriate negative value
    expect(getByText('-20%')).toBeTruthy();
  });
});
