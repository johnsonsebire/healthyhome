import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProjectContributionTracker from '../ProjectContributionTracker';

describe('ProjectContributionTracker', () => {
  const mockProject = {
    id: 'project-1',
    name: 'Family House Project',
    description: 'Building a new family house',
    targetAmount: 50000,
    currentAmount: 35000,
    deadline: new Date('2025-12-31'),
    startDate: new Date('2023-01-01'),
    status: 'in-progress',
    familyId: 'extended-family-1',
    contributions: [
      {
        id: 'contrib-1',
        userId: 'user-1',
        userName: 'John Doe',
        amount: 10000,
        date: new Date('2023-03-15'),
      },
      {
        id: 'contrib-2',
        userId: 'user-2',
        userName: 'Jane Doe',
        amount: 15000,
        date: new Date('2023-06-20'),
      },
      {
        id: 'contrib-3',
        userId: 'user-3',
        userName: 'Mike Smith',
        amount: 10000,
        date: new Date('2023-09-10'),
      },
    ],
    createdBy: 'user-1',
    createdAt: new Date('2023-01-01'),
  };
  
  const mockOnContribute = jest.fn();
  const mockOnViewDetails = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders project details correctly', () => {
    const { getByText } = render(
      <ProjectContributionTracker 
        project={mockProject}
        onContribute={mockOnContribute}
        onViewDetails={mockOnViewDetails}
      />
    );
    
    // Check if project name and description are displayed
    expect(getByText('Family House Project')).toBeTruthy();
    expect(getByText('Building a new family house')).toBeTruthy();
    
    // Check if financial details are displayed
    expect(getByText('$35,000 of $50,000')).toBeTruthy();
    expect(getByText('70% funded')).toBeTruthy();
    
    // Check if deadline is displayed
    expect(getByText('Deadline: Dec 31, 2025')).toBeTruthy();
    
    // Check if status is displayed
    expect(getByText('Status: In Progress')).toBeTruthy();
  });
  
  it('calls onContribute when contribute button is pressed', () => {
    const { getByText } = render(
      <ProjectContributionTracker 
        project={mockProject}
        onContribute={mockOnContribute}
        onViewDetails={mockOnViewDetails}
      />
    );
    
    // Find and press the contribute button
    fireEvent.press(getByText('Contribute'));
    
    // Check if onContribute callback was called with correct project
    expect(mockOnContribute).toHaveBeenCalledWith(mockProject);
  });
  
  it('calls onViewDetails when view details button is pressed', () => {
    const { getByText } = render(
      <ProjectContributionTracker 
        project={mockProject}
        onContribute={mockOnContribute}
        onViewDetails={mockOnViewDetails}
      />
    );
    
    // Find and press the view details button
    fireEvent.press(getByText('View Details'));
    
    // Check if onViewDetails callback was called with correct project
    expect(mockOnViewDetails).toHaveBeenCalledWith(mockProject);
  });
  
  it('displays recent contributors', () => {
    const { getByText } = render(
      <ProjectContributionTracker 
        project={mockProject}
        onContribute={mockOnContribute}
        onViewDetails={mockOnViewDetails}
        showContributors={true}
      />
    );
    
    // Check if contributors section title is displayed
    expect(getByText('Recent Contributors')).toBeTruthy();
    
    // Check if contributor names and amounts are displayed
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('$10,000')).toBeTruthy();
    expect(getByText('Jane Doe')).toBeTruthy();
    expect(getByText('$15,000')).toBeTruthy();
    expect(getByText('Mike Smith')).toBeTruthy();
  });
  
  it('hides contributors when showContributors is false', () => {
    const { queryByText } = render(
      <ProjectContributionTracker 
        project={mockProject}
        onContribute={mockOnContribute}
        onViewDetails={mockOnViewDetails}
        showContributors={false}
      />
    );
    
    // Check that contributors section is not displayed
    expect(queryByText('Recent Contributors')).toBeNull();
  });
  
  it('displays time remaining correctly', () => {
    const currentDate = new Date('2023-12-31');
    // Mock Date.now to return a fixed date for testing
    const originalNow = Date.now;
    Date.now = jest.fn(() => currentDate.getTime());
    
    const { getByText } = render(
      <ProjectContributionTracker 
        project={mockProject}
        onContribute={mockOnContribute}
        onViewDetails={mockOnViewDetails}
      />
    );
    
    // Check if time remaining is displayed correctly (2 years from mock current date)
    expect(getByText('Time remaining: 2 years')).toBeTruthy();
    
    // Restore original Date.now
    Date.now = originalNow;
  });
  
  it('displays project as completed when status is completed', () => {
    const completedProject = {
      ...mockProject,
      status: 'completed',
      currentAmount: 50000, // Fully funded
    };
    
    const { getByText, queryByText } = render(
      <ProjectContributionTracker 
        project={completedProject}
        onContribute={mockOnContribute}
        onViewDetails={mockOnViewDetails}
      />
    );
    
    // Check if status is displayed as completed
    expect(getByText('Status: Completed')).toBeTruthy();
    
    // Check if progress shows as 100%
    expect(getByText('100% funded')).toBeTruthy();
    
    // Check that contribute button is not displayed for completed projects
    expect(queryByText('Contribute')).toBeNull();
  });
  
  it('displays project as overdue when deadline has passed', () => {
    const overdueProject = {
      ...mockProject,
      deadline: new Date('2023-01-01'), // Past deadline
      currentAmount: 35000, // Not fully funded
    };
    
    const currentDate = new Date('2023-12-31');
    // Mock Date.now to return a fixed date for testing
    const originalNow = Date.now;
    Date.now = jest.fn(() => currentDate.getTime());
    
    const { getByText } = render(
      <ProjectContributionTracker 
        project={overdueProject}
        onContribute={mockOnContribute}
        onViewDetails={mockOnViewDetails}
      />
    );
    
    // Check if status indicates overdue
    expect(getByText('Status: Overdue')).toBeTruthy();
    
    // Check if deadline is displayed with overdue indicator
    expect(getByText('Deadline: Jan 1, 2023 (Overdue)')).toBeTruthy();
    
    // Restore original Date.now
    Date.now = originalNow;
  });
  
  it('applies custom styles when provided', () => {
    const { getByTestId } = render(
      <ProjectContributionTracker 
        project={mockProject}
        onContribute={mockOnContribute}
        onViewDetails={mockOnViewDetails}
        containerStyle={{ borderColor: '#FF0000', borderWidth: 2 }}
      />
    );
    
    // Check if container has custom styles
    const container = getByTestId('project-tracker-container');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 
          borderColor: '#FF0000',
          borderWidth: 2 
        })
      ])
    );
  });
});
