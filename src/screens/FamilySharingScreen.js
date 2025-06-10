import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamilySharing } from '../contexts/FamilySharingContext';
import { useAuth } from '../contexts/AuthContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import { SHARING_PREFERENCES, RELATIONSHIP_TYPES } from '../utils/familyRelationships';
import { validateEmail } from '../utils/validation';
import { LoadingSpinner } from '../components/LoadingSpinner';

const FamilySharingScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { 
    sharingPreferences, 
    updateSharingPreferences, 
    pendingInvitations, 
    sendFamilyInvitation,
    respondToInvitation,
    isLoading: sharingLoading 
  } = useFamilySharing();
  const { withErrorHandling, isLoading } = useError();
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');

  const handleSharingToggle = async (preference) => {
    const result = await withErrorHandling(
      async () => {
        const success = await updateSharingPreferences(preference);
        return { success };
      },
      {
        errorType: ERROR_TYPES.STORAGE,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: true,
      }
    );

    if (!result.success) {
      Alert.alert(
        'Error',
        'Failed to update sharing preferences. Please try again.'
      );
    }
  };

  const handleSendInvitation = async () => {
    // Validate email
    if (!inviteEmail || !validateEmail(inviteEmail)) {
      setInviteEmailError('Please enter a valid email address');
      return;
    }
    
    // Validate relationship
    if (!inviteRelationship) {
      Alert.alert('Error', 'Please select a relationship');
      return;
    }
    
    const result = await withErrorHandling(
      async () => {
        const success = await sendFamilyInvitation(inviteEmail, inviteRelationship);
        return { success };
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: true,
      }
    );

    if (result.success) {
      Alert.alert(
        'Invitation Sent',
        `An invitation has been sent to ${inviteEmail}`
      );
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRelationship('');
      setInviteEmailError('');
    } else {
      Alert.alert(
        'Error',
        'Failed to send invitation. Please try again.'
      );
    }
  };

  const handleRespondToInvitation = async (invitationId, accepted) => {
    const result = await withErrorHandling(
      async () => {
        const success = await respondToInvitation(invitationId, accepted);
        return { success };
      },
      {
        errorType: ERROR_TYPES.NETWORK,
        errorSeverity: ERROR_SEVERITY.MEDIUM,
        showLoading: true,
      }
    );

    if (result.success) {
      Alert.alert(
        accepted ? 'Invitation Accepted' : 'Invitation Declined',
        accepted 
          ? 'You are now connected as family members' 
          : 'The invitation has been declined'
      );
    } else {
      Alert.alert(
        'Error',
        'Failed to respond to invitation. Please try again.'
      );
    }
  };

  if (sharingLoading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Family Sharing</Text>
        <Text style={styles.subtitle}>
          Manage how your medical records are shared with family members
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sharing Preferences</Text>
          <Text style={styles.sectionSubtitle}>
            Choose how your medical records are shared with family members
          </Text>

          <View style={styles.optionCard}>
            <View style={styles.optionContent}>
              <Ionicons name="people" size={24} color="#007AFF" />
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Share with Nuclear Family</Text>
                <Text style={styles.optionDescription}>
                  Spouse, children, and parents can view your medical records
                </Text>
              </View>
            </View>
            <Switch
              value={sharingPreferences === SHARING_PREFERENCES.NUCLEAR || sharingPreferences === SHARING_PREFERENCES.ALL}
              onValueChange={(value) => 
                handleSharingToggle(value ? SHARING_PREFERENCES.NUCLEAR : SHARING_PREFERENCES.NONE)
              }
              trackColor={{ false: '#767577', true: '#cce4ff' }}
              thumbColor={sharingPreferences === SHARING_PREFERENCES.NUCLEAR || sharingPreferences === SHARING_PREFERENCES.ALL ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.optionCard}>
            <View style={styles.optionContent}>
              <Ionicons name="people-circle" size={24} color="#5E5CE6" />
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Share with Extended Family</Text>
                <Text style={styles.optionDescription}>
                  All family members can view your medical records
                </Text>
              </View>
            </View>
            <Switch
              value={sharingPreferences === SHARING_PREFERENCES.ALL}
              onValueChange={(value) => 
                handleSharingToggle(value ? SHARING_PREFERENCES.ALL : SHARING_PREFERENCES.NUCLEAR)
              }
              trackColor={{ false: '#767577', true: '#d4d1ff' }}
              thumbColor={sharingPreferences === SHARING_PREFERENCES.ALL ? '#5E5CE6' : '#f4f3f4'}
              disabled={sharingPreferences === SHARING_PREFERENCES.NONE}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Invitations</Text>
          
          {pendingInvitations && pendingInvitations.length > 0 ? (
            pendingInvitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationTitle}>
                    {invitation.senderName || invitation.senderEmail}
                  </Text>
                  <Text style={styles.invitationDescription}>
                    wants to connect as {invitation.relationship.toLowerCase()}
                  </Text>
                </View>
                <View style={styles.invitationActions}>
                  <TouchableOpacity
                    style={[styles.invitationButton, styles.acceptButton]}
                    onPress={() => handleRespondToInvitation(invitation.id, true)}
                  >
                    <Text style={styles.invitationButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.invitationButton, styles.declineButton]}
                    onPress={() => handleRespondToInvitation(invitation.id, false)}
                  >
                    <Text style={[styles.invitationButtonText, styles.declineButtonText]}>
                      Decline
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="mail-open" size={64} color="#DDD" />
              <Text style={styles.emptyStateText}>No pending invitations</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => setShowInviteModal(true)}
      >
        <Ionicons name="person-add" size={20} color="white" />
        <Text style={styles.inviteButtonText}>Invite Family Member</Text>
      </TouchableOpacity>

      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Family Member</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowInviteModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, inviteEmailError && styles.inputError]}
                  value={inviteEmail}
                  onChangeText={(text) => {
                    setInviteEmail(text);
                    if (inviteEmailError) setInviteEmailError('');
                  }}
                  placeholder="Enter family member's email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {inviteEmailError ? (
                  <Text style={styles.errorText}>{inviteEmailError}</Text>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Relationship</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.relationshipButtons}>
                    {Object.values(RELATIONSHIP_TYPES).filter(r => r !== 'Self').map((relation) => (
                      <TouchableOpacity
                        key={relation}
                        style={[
                          styles.relationshipButton,
                          inviteRelationship === relation && styles.relationshipButtonActive,
                        ]}
                        onPress={() => setInviteRelationship(relation)}
                      >
                        <Text
                          style={[
                            styles.relationshipButtonText,
                            inviteRelationship === relation && styles.relationshipButtonTextActive,
                          ]}
                        >
                          {relation}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <TouchableOpacity
                style={styles.sendInviteButton}
                onPress={handleSendInvitation}
              >
                <Text style={styles.sendInviteButtonText}>Send Invitation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  invitationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invitationInfo: {
    marginBottom: 12,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  invitationDescription: {
    fontSize: 14,
    color: '#666',
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  invitationButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  declineButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  invitationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  declineButtonText: {
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  inviteButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    marginTop: 4,
    fontSize: 14,
  },
  relationshipButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  relationshipButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  relationshipButtonActive: {
    backgroundColor: '#e1f0ff',
    borderColor: '#007AFF',
  },
  relationshipButtonText: {
    fontSize: 14,
    color: '#333',
  },
  relationshipButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sendInviteButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  sendInviteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FamilySharingScreen;
