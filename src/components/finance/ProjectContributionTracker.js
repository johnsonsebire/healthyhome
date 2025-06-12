import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BudgetProgressBar from './BudgetProgressBar';
import currencyService from '../../services/currencyService';

const ProjectContributionTracker = ({ project, onPress, onContribute }) => {
  // Format dates
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    const projectDate = date.toDate ? date.toDate() : new Date(date);
    return projectDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Get icon and color based on project status
  const getStatusInfo = () => {
    const statusMap = {
      'active': {
        icon: 'play-circle-filled',
        color: '#2196F3',
        label: 'Active'
      },
      'completed': {
        icon: 'check-circle',
        color: '#4CAF50',
        label: 'Completed'
      },
      'cancelled': {
        icon: 'cancel',
        color: '#F44336',
        label: 'Cancelled'
      }
    };
    
    return statusMap[project.status] || statusMap.active;
  };
  
  const statusInfo = getStatusInfo();
  
  // Calculate progress
  const progress = project.currentAmount || 0;
  const target = project.targetAmount || 1;
  
  // Find the current user's contribution (simplified, assuming userId would be provided)
  const getUserContribution = () => {
    const userContribution = project.contributors?.find(c => c.userId === 'current_user_id');
    return userContribution?.contributionAmount || 0;
  };
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.projectName}>{project.name}</Text>
        <View style={styles.statusContainer}>
          <MaterialIcons name={statusInfo.icon} size={16} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>
      
      <Text style={styles.description}>{project.description}</Text>
      
      <BudgetProgressBar 
        current={progress} 
        target={target} 
        label="Project Progress" 
        color={statusInfo.color} 
      />
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <MaterialIcons name="calendar-today" size={16} color="#666" />
          <Text style={styles.detailText}>
            Start: {formatDate(project.startDate)}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <MaterialIcons name="event" size={16} color="#666" />
          <Text style={styles.detailText}>
            End: {formatDate(project.endDate)}
          </Text>
        </View>
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <MaterialIcons name="people" size={16} color="#666" />
          <Text style={styles.detailText}>
            {project.contributors?.length || 0} Contributors
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <MaterialIcons name="person" size={16} color="#666" />
          <Text style={styles.detailText}>
            Your contribution: {currencyService.formatCurrency(getUserContribution(), project.currency || 'GHS')}
          </Text>
        </View>
      </View>
      
      {project.status === 'active' && (
        <TouchableOpacity 
          style={styles.contributeButton}
          onPress={() => onContribute && onContribute(project)}
        >
          <MaterialIcons name="add-circle" size={16} color="white" />
          <Text style={styles.contributeButtonText}>Contribute</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  contributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  contributeButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ProjectContributionTracker;
