import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from './AuthContext';
import { SHARING_PREFERENCES } from '../utils/familyRelationships';
import networkService from '../services/networkService';
import offlineStorageService from '../services/offlineStorage';

const FamilySharingContext = createContext();

export const useFamilySharing = () => {
  const context = useContext(FamilySharingContext);
  if (!context) {
    throw new Error('useFamilySharing must be used within a FamilySharingProvider');
  }
  return context;
};

export const FamilySharingProvider = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [sharingPreferences, setSharingPreferences] = useState(SHARING_PREFERENCES.NUCLEAR);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSharingPreferences();
      loadPendingInvitations();
    }
  }, [user]);

  const loadSharingPreferences = async () => {
    try {
      // Try cache first if offline
      if (!networkService.isOnline()) {
        const cachedPreferences = await offlineStorageService.getCachedSharingPreferences();
        if (cachedPreferences) {
          setSharingPreferences(cachedPreferences);
          setIsLoading(false);
          return;
        }
      }

      // Load from Firebase
      const prefDoc = await getDoc(doc(db, 'userPreferences', user.uid));
      if (prefDoc.exists()) {
        const data = prefDoc.data();
        setSharingPreferences(data.sharingPreference || SHARING_PREFERENCES.NUCLEAR);
        
        // Cache the data
        await offlineStorageService.cacheSharingPreferences(data.sharingPreference || SHARING_PREFERENCES.NUCLEAR);
      } else {
        // If not exists, create default preferences
        await setDoc(doc(db, 'userPreferences', user.uid), {
          sharingPreference: SHARING_PREFERENCES.NUCLEAR,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        setSharingPreferences(SHARING_PREFERENCES.NUCLEAR);
        
        // Cache the default data
        await offlineStorageService.cacheSharingPreferences(SHARING_PREFERENCES.NUCLEAR);
      }
    } catch (error) {
      console.error('Error loading sharing preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSharingPreferences = async (preference) => {
    try {
      setSharingPreferences(preference);
      
      // Save to cache for offline access
      await offlineStorageService.cacheSharingPreferences(preference);
      
      if (networkService.isOnline()) {
        // Update Firebase
        await setDoc(doc(db, 'userPreferences', user.uid), 
          { 
            sharingPreference: preference,
            updatedAt: new Date()
          }, 
          { merge: true }
        );
      } else {
        // Add to sync queue for later update
        await offlineStorageService.addToSyncQueue({
          type: 'UPDATE_SHARING_PREFERENCES',
          data: { sharingPreference: preference }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating sharing preferences:', error);
      return false;
    }
  };

  const loadPendingInvitations = async () => {
    try {
      // Try cache first if offline
      if (!networkService.isOnline()) {
        const cachedInvitations = await offlineStorageService.getCachedFamilyInvitations();
        if (cachedInvitations) {
          setPendingInvitations(cachedInvitations);
          return;
        }
      }

      // Load from Firebase - both sent to user's email and sent by user
      const invitationsRef = collection(db, 'familyInvitations');
      const q1 = query(invitationsRef, where('recipientEmail', '==', user.email), where('status', '==', 'pending'));
      const q2 = query(invitationsRef, where('senderId', '==', user.uid), where('status', '==', 'pending'));
      
      const [receivedSnapshot, sentSnapshot] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      const receivedInvitations = [];
      receivedSnapshot.forEach((doc) => {
        receivedInvitations.push({ 
          id: doc.id, 
          ...doc.data(), 
          type: 'received' 
        });
      });
      
      const sentInvitations = [];
      sentSnapshot.forEach((doc) => {
        sentInvitations.push({ 
          id: doc.id, 
          ...doc.data(), 
          type: 'sent' 
        });
      });
      
      const allInvitations = [...receivedInvitations, ...sentInvitations];
      setPendingInvitations(allInvitations);
      
      // Cache the invitations
      await offlineStorageService.cacheFamilyInvitations(allInvitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  const sendFamilyInvitation = async (email, relationship) => {
    try {
      if (!networkService.isOnline()) {
        // Add to sync queue for later
        await offlineStorageService.addToSyncQueue({
          type: 'SEND_FAMILY_INVITATION',
          data: { 
            recipientEmail: email, 
            relationship 
          }
        });
        
        // Return success for UI feedback
        return true;
      }
      
      // Check if invitation already exists
      const invitationsRef = collection(db, 'familyInvitations');
      const q = query(
        invitationsRef, 
        where('senderId', '==', user.uid),
        where('recipientEmail', '==', email),
        where('status', '==', 'pending')
      );
      
      const existingSnapshot = await getDocs(q);
      if (!existingSnapshot.empty) {
        // Invitation already exists
        return false;
      }
      
      // Create new invitation
      const invitationData = {
        senderId: user.uid,
        senderEmail: user.email,
        senderName: userProfile?.displayName || user.email,
        recipientEmail: email,
        relationship,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'familyInvitations'), invitationData);
      
      // Reload invitations
      await loadPendingInvitations();
      
      return true;
    } catch (error) {
      console.error('Error sending family invitation:', error);
      return false;
    }
  };

  const respondToInvitation = async (invitationId, accepted) => {
    try {
      if (!networkService.isOnline()) {
        // Add to sync queue for later
        await offlineStorageService.addToSyncQueue({
          type: 'RESPOND_TO_INVITATION',
          data: { 
            invitationId, 
            accepted 
          }
        });
        
        // Update UI optimistically
        setPendingInvitations(prev => 
          prev.filter(invitation => invitation.id !== invitationId)
        );
        
        return true;
      }
      
      // Get the invitation
      const invitationDoc = await getDoc(doc(db, 'familyInvitations', invitationId));
      if (!invitationDoc.exists()) {
        return false;
      }
      
      const invitationData = invitationDoc.data();
      
      // Update the invitation status
      await updateDoc(doc(db, 'familyInvitations', invitationId), {
        status: accepted ? 'accepted' : 'declined',
        updatedAt: new Date()
      });
      
      // If accepted, create family relationship records
      if (accepted) {
        // Create record for the recipient (current user)
        const recipientFamilyMemberData = {
          userId: user.uid,
          name: invitationData.senderName || 'Unknown',
          relationship: getCounterRelationship(invitationData.relationship),
          email: invitationData.senderEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
          isConnected: true,
          connectedUserId: invitationData.senderId
        };
        
        await addDoc(collection(db, 'familyMembers'), recipientFamilyMemberData);
        
        // Create record for the sender if not already exists
        const senderQuery = query(
          collection(db, 'familyMembers'),
          where('userId', '==', invitationData.senderId),
          where('email', '==', user.email)
        );
        
        const senderSnapshot = await getDocs(senderQuery);
        if (senderSnapshot.empty) {
          const senderFamilyMemberData = {
            userId: invitationData.senderId,
            name: userProfile?.displayName || user.email,
            relationship: invitationData.relationship,
            email: user.email,
            createdAt: new Date(),
            updatedAt: new Date(),
            isConnected: true,
            connectedUserId: user.uid
          };
          
          await addDoc(collection(db, 'familyMembers'), senderFamilyMemberData);
        }
      }
      
      // Reload invitations
      await loadPendingInvitations();
      
      return true;
    } catch (error) {
      console.error('Error responding to invitation:', error);
      return false;
    }
  };
  
  // Helper function to get the counter relationship (e.g., if I'm someone's parent, they're my child)
  const getCounterRelationship = (relationship) => {
    switch (relationship) {
      case 'Parent': return 'Child';
      case 'Child': return 'Parent';
      case 'Spouse': return 'Spouse';
      case 'Sibling': return 'Sibling';
      case 'Grandparent': return 'Grandchild';
      case 'Grandchild': return 'Grandparent';
      default: return 'Other';
    }
  };

  const value = {
    sharingPreferences,
    updateSharingPreferences,
    pendingInvitations,
    sendFamilyInvitation,
    respondToInvitation,
    isLoading
  };

  return (
    <FamilySharingContext.Provider value={value}>
      {children}
    </FamilySharingContext.Provider>
  );
};

export default FamilySharingProvider;
