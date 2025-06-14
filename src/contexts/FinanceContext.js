import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
// Import Firebase config with dynamic import to avoid circular dependencies
// and ensure the Firebase instance is the same across the app
import { db } from '../../firebaseConfig';
import { useAuth } from './AuthContext';
import { useFamilySharing } from './FamilySharingContext';
import networkService from '../services/networkService';
import offlineStorageService from '../services/offlineStorage';
import currencyService from '../services/currencyService';

// Create the context
const FinanceContext = createContext();

// Custom hook to use the finance context
export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

// Define scope constants
export const FINANCE_SCOPE = {
  PERSONAL: 'personal',
  NUCLEAR: 'nuclear',
  EXTENDED: 'extended'
};

// Finance provider component
export const FinanceProvider = ({ children }) => {
  // Get authentication and family sharing data
  const authContext = useAuth();
  const familySharingContext = useFamilySharing();
  
  // Destructure user and family data after ensuring context exists
  const user = authContext?.user;
  const nuclearFamilyMembers = familySharingContext?.nuclearFamilyMembers || [];
  const extendedFamilyMembers = familySharingContext?.extendedFamilyMembers || [];
  
  // State variables
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loans, setLoans] = useState([]);
  const [welfareAccounts, setWelfareAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentScope, setCurrentScope] = useState(FINANCE_SCOPE.PERSONAL);
  
  // Initialize empty context value that will be populated if Firebase and auth are working
  const [contextValue, setContextValue] = useState({
    accounts: [],
    transactions: [],
    projects: [],
    loans: [],
    welfareAccounts: [],
    isLoading: true,
    error: null,
    currentScope: FINANCE_SCOPE.PERSONAL,
    createAccount: async () => {},
    updateAccount: async () => {},
    deleteAccount: async () => {},
    createTransaction: async () => {},
    updateTransaction: async () => {},
    deleteTransaction: async () => {},
    createProject: async () => {},
    updateProject: async () => {},
    deleteProject: async () => {},
    contributeToProject: async () => {},
    createLoan: async () => {},
    updateLoan: async () => {},
    deleteLoan: async () => {},
    recordLoanPayment: async () => {},
    createWelfareAccount: async () => {},
    updateWelfareAccount: async () => {},
    deleteWelfareAccount: async () => {},
    contributeToWelfare: async () => {},
    addWelfareMember: async () => {},
    removeWelfareMember: async () => {},
    changeScope: () => {},
    syncOfflineData: async () => {}
  });

  // Load data when user or scope changes
  useEffect(() => {
    if (user && user.uid) {
      loadAccounts();
      loadTransactions();
      loadProjects();
      loadLoans();
      loadWelfareAccounts();
    }
  }, [user, currentScope]);

  // Account management
  const loadAccounts = async () => {
    if (!user || !user.uid) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load from cache if offline
      if (!networkService.isOnline()) {
        try {
          const cachedAccounts = await offlineStorageService.getItem(`finance_accounts_${currentScope}`);
          if (cachedAccounts) {
            setAccounts(JSON.parse(cachedAccounts));
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error loading cached accounts:', err);
        }
      }
      
      let accountsQuery;
      
      switch (currentScope) {
        case FINANCE_SCOPE.PERSONAL:
          // For personal accounts, we need to handle accounts that might not have the scope field set
          // We'll perform two queries and merge the results
          
          // First query: accounts with scope explicitly set to PERSONAL
          // NOTE: This query requires a composite index on 'owner' ASC, 'scope' ASC
          // See firestore.indexes.json for the required index configuration
          const personalScopeQuery = query(
            collection(db, 'finance_accounts'),
            where('owner', '==', user.uid),
            where('scope', '==', FINANCE_SCOPE.PERSONAL)
          );
          
          // Get results from the first query
          const personalScopeSnapshot = await getDocs(personalScopeQuery);
          const personalScopeAccounts = personalScopeSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // For accounts without an explicit scope, we need a different approach
          // Get all accounts owned by the user first
          const userAccountsQuery = query(
            collection(db, 'finance_accounts'),
            where('owner', '==', user.uid)
          );
          
          const userAccountsSnapshot = await getDocs(userAccountsQuery);
          
          // Filter accounts that don't have a scope field or have it set to null
          const accountsWithNoScope = userAccountsSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              return data.scope === undefined || data.scope === null;
            })
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              // Set scope to PERSONAL since these are implicitly personal accounts
              scope: FINANCE_SCOPE.PERSONAL
            }));
          
          // Combine the results, avoiding duplicates by ID
          const combinedPersonalAccounts = [...personalScopeAccounts];
          
          // Add accounts with no scope, avoiding duplicates
          accountsWithNoScope.forEach(account => {
            if (!combinedPersonalAccounts.some(a => a.id === account.id)) {
              combinedPersonalAccounts.push(account);
            }
          });
          
          setAccounts(combinedPersonalAccounts);
          
          // Cache the results
          await offlineStorageService.setItem(
            `finance_accounts_${currentScope}`, 
            JSON.stringify(combinedPersonalAccounts)
          );
          
          setIsLoading(false);
          return;
          
        case FINANCE_SCOPE.NUCLEAR:
          // Get accounts for nuclear family (accounts owned by user or shared with user)
          accountsQuery = query(
            collection(db, 'finance_accounts'),
            where('scope', '==', FINANCE_SCOPE.NUCLEAR),
            where('sharedWith', 'array-contains', user.uid)
          );
          break;
        case FINANCE_SCOPE.EXTENDED:
          // Get accounts for extended family projects
          accountsQuery = query(
            collection(db, 'finance_accounts'),
            where('scope', '==', FINANCE_SCOPE.EXTENDED),
            where('sharedWith', 'array-contains', user.uid)
          );
          break;
      }
      
      const querySnapshot = await getDocs(accountsQuery);
      const accountsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAccounts(accountsList);
      
      // Cache the results
      await offlineStorageService.setItem(`finance_accounts_${currentScope}`, JSON.stringify(accountsList));
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async (accountData) => {
    if (!user) return null;
    
    try {
      const accountRef = collection(db, 'finance_accounts');
      
      // Parse balance with error handling
      let balance = 0;
      try {
        balance = typeof accountData.balance === 'number' 
          ? accountData.balance 
          : parseFloat(accountData.balance || 0);
        
        if (isNaN(balance)) {
          console.warn('Invalid balance provided, using 0 instead');
          balance = 0;
        }
      } catch (error) {
        console.error('Error parsing balance:', error);
        balance = 0;
      }
      
      // Prepare account data
      const newAccount = {
        ...accountData,
        owner: user.uid,
        balance: balance,
        // Store initial balance explicitly for future recalculations
        initialBalance: balance,
        sharedWith: accountData.sharedWith || [],
        // Ensure scope is always explicitly set
        scope: accountData.scope || FINANCE_SCOPE.PERSONAL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add the account to Firestore
      const docRef = await addDoc(accountRef, newAccount);
      
      // Update local state
      const createdAccount = {
        id: docRef.id,
        ...newAccount
      };
      
      setAccounts(prev => [...prev, createdAccount]);
      
      // Update cache
      const cachedAccounts = JSON.parse(await offlineStorageService.getItem(`finance_accounts_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_accounts_${currentScope}`,
        JSON.stringify([...cachedAccounts, createdAccount])
      );
      
      return createdAccount;
    } catch (err) {
      console.error('Error creating account:', err);
      setError('Failed to create account. Please try again.');
      return null;
    }
  };

  const updateAccount = async (accountId, accountData) => {
    if (!user) return false;
    
    try {
      const accountRef = doc(db, 'finance_accounts', accountId);
      const accountSnapshot = await getDoc(accountRef);
      
      if (!accountSnapshot.exists()) {
        throw new Error('Account not found');
      }
      
      const accountDoc = accountSnapshot.data();
      
      // Check if user has permission to update
      if (accountDoc.owner !== user.uid && !accountDoc.sharedWith.includes(user.uid)) {
        throw new Error('You do not have permission to update this account');
      }
      
      // Update account in Firestore
      await updateDoc(accountRef, {
        ...accountData,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setAccounts(prev => 
        prev.map(account => 
          account.id === accountId 
            ? { ...account, ...accountData, updatedAt: new Date() } 
            : account
        )
      );
      
      // Update cache
      const cachedAccounts = JSON.parse(await offlineStorageService.getItem(`finance_accounts_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_accounts_${currentScope}`,
        JSON.stringify(
          cachedAccounts.map(account => 
            account.id === accountId 
              ? { ...account, ...accountData, updatedAt: new Date() } 
              : account
          )
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error updating account:', err);
      setError('Failed to update account. Please try again.');
      return false;
    }
  };

  const deleteAccount = async (accountId) => {
    if (!user) return false;
    
    try {
      const accountRef = doc(db, 'finance_accounts', accountId);
      const accountSnapshot = await getDoc(accountRef);
      
      if (!accountSnapshot.exists()) {
        throw new Error('Account not found');
      }
      
      const accountDoc = accountSnapshot.data();
      
      // Check if user has permission to delete
      if (accountDoc.owner !== user.uid) {
        throw new Error('You do not have permission to delete this account');
      }
      
      // Delete account from Firestore
      await deleteDoc(accountRef);
      
      // Update local state
      setAccounts(prev => prev.filter(account => account.id !== accountId));
      
      // Update cache
      const cachedAccounts = JSON.parse(await offlineStorageService.getItem(`finance_accounts_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_accounts_${currentScope}`,
        JSON.stringify(cachedAccounts.filter(account => account.id !== accountId))
      );
      
      return true;
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account. Please try again.');
      return false;
    }
  };

  // Transaction management
  const loadTransactions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Loading transactions for scope: ${currentScope}`);
      
      // Get account IDs for the current scope, including accounts that might be missing the scope property
      let accountIds = [];
      
      if (currentScope === FINANCE_SCOPE.PERSONAL) {
        // For personal scope, include accounts owned by the user that either:
        // 1. Have scope explicitly set to PERSONAL, or
        // 2. Don't have a scope property set at all (assumed personal)
        accountIds = accounts
          .filter(account => 
            account.owner === user.uid && 
            (account.scope === FINANCE_SCOPE.PERSONAL || account.scope === undefined || account.scope === null)
          )
          .map(account => account.id);
      } else {
        // For other scopes, keep the existing filtering logic
        accountIds = accounts
          .filter(account => account.scope === currentScope)
          .map(account => account.id);
      }
      
      if (accountIds.length === 0) {
        console.log('No accounts found for this scope, setting empty transactions list');
        setTransactions([]);
        setIsLoading(false);
        return;
      }
      
      console.log(`Found ${accountIds.length} accounts for scope ${currentScope}`);
      
      // Try to load from cache if offline
      if (!networkService.isOnline()) {
        const cachedTransactions = await offlineStorageService.getItem(`finance_transactions_${currentScope}`);
        if (cachedTransactions) {
          const parsedTransactions = JSON.parse(cachedTransactions);
          console.log(`Loaded ${parsedTransactions.length} cached transactions for scope: ${currentScope}`);
          setTransactions(parsedTransactions);
          setIsLoading(false);
          return;
        }
      }
      
      // If we have more than 10 account IDs, batch the queries to avoid Firestore limitations
      const MAX_FIRESTORE_IN_QUERY_ITEMS = 10;
      let allTransactions = [];
      
      // Process accounts in batches if there are many
      if (accountIds.length > MAX_FIRESTORE_IN_QUERY_ITEMS) {
        const batches = [];
        for (let i = 0; i < accountIds.length; i += MAX_FIRESTORE_IN_QUERY_ITEMS) {
          batches.push(accountIds.slice(i, i + MAX_FIRESTORE_IN_QUERY_ITEMS));
        }
        
        // Execute each batch query
        for (const batchIds of batches) {
          // Query transactions for this batch of accounts
          const batchQuery = query(
            collection(db, 'finance_transactions'),
            where('accountId', 'in', batchIds),
            orderBy('date', 'desc')
          );
          
          const batchSnapshot = await getDocs(batchQuery);
          const batchTransactions = batchSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          allTransactions = [...allTransactions, ...batchTransactions];
        }
      } else {
        // If fewer accounts, use a single query
        const transactionsQuery = query(
          collection(db, 'finance_transactions'),
          where('accountId', 'in', accountIds),
          orderBy('date', 'desc')
        );
        
        const querySnapshot = await getDocs(transactionsQuery);
        allTransactions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      console.log(`Loaded ${allTransactions.length} transactions from Firestore for scope: ${currentScope}`);
      
      // Deduplicate transactions by ID to ensure no duplicates in the UI
      const uniqueTransactionsMap = new Map();
      allTransactions.forEach(transaction => {
        if (transaction && transaction.id) {
          uniqueTransactionsMap.set(transaction.id, transaction);
        }
      });
      
      const uniqueTransactions = Array.from(uniqueTransactionsMap.values());
      console.log(`After deduplication: ${uniqueTransactions.length} unique transactions`);
      
      // Sort by date (most recent first)
      uniqueTransactions.sort((a, b) => {
        const dateA = a.date && a.date.toDate ? a.date.toDate() : new Date(a.date || 0);
        const dateB = b.date && b.date.toDate ? b.date.toDate() : new Date(b.date || 0);
        return dateB - dateA;
      });
      
      setTransactions(uniqueTransactions);
      
      // Cache the results
      await offlineStorageService.setItem(`finance_transactions_${currentScope}`, JSON.stringify(uniqueTransactions));
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createTransaction = async (transactionData) => {
    if (!user) return null;
    
    try {
      const transactionRef = collection(db, 'finance_transactions');
      
      // Parse and validate amount before storing
      let validAmount = 0;
      try {
        if (typeof transactionData.amount === 'number') {
          validAmount = transactionData.amount;
        } else if (typeof transactionData.amount === 'string') {
          validAmount = parseFloat(transactionData.amount);
        } else if (transactionData.amount) {
          validAmount = parseFloat(transactionData.amount);
        }
        
        if (isNaN(validAmount)) {
          console.warn(`Invalid amount provided: ${transactionData.amount}, using 0 instead`);
          validAmount = 0;
        }
        
        // Round to 2 decimal places
        validAmount = Math.round(validAmount * 100) / 100;
      } catch (error) {
        console.error('Error parsing transaction amount:', error);
        validAmount = 0;
      }
      
      // Prepare transaction data with sanitized amount
      const newTransaction = {
        ...transactionData,
        amount: validAmount,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Verify account exists before adding transaction
      const accountRef = doc(db, 'finance_accounts', transactionData.accountId);
      const accountSnapshot = await getDoc(accountRef);
      
      if (!accountSnapshot.exists()) {
        throw new Error(`Account with ID ${transactionData.accountId} not found`);
      }
      
      // Add the transaction to Firestore
      const docRef = await addDoc(transactionRef, newTransaction);
      
      console.log(`Created new transaction ${docRef.id} for account ${transactionData.accountId} (${validAmount}, ${newTransaction.type})`);
      
      // Recalculate the account balance after adding transaction
      await recalculateAccountBalance(transactionData.accountId);
      
      // Create transaction object with ID for state update
      const createdTransaction = {
        id: docRef.id,
        ...newTransaction,
        // Replace serverTimestamp with a Date object for local state
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Update local state with deduplication to prevent duplicates
      setTransactions(prev => {
        // Create a map to deduplicate transactions by ID
        const uniqueTransactionsMap = new Map();
        
        // Add the new transaction first
        uniqueTransactionsMap.set(createdTransaction.id, createdTransaction);
        
        // Add existing transactions, skipping any with the same ID as our new one
        prev.forEach(transaction => {
          if (transaction && transaction.id) {
            uniqueTransactionsMap.set(transaction.id, transaction);
          }
        });
        
        // Convert back to array and sort by date (most recent first)
        const result = Array.from(uniqueTransactionsMap.values());
        result.sort((a, b) => {
          const dateA = a.date && a.date.toDate ? a.date.toDate() : new Date(a.date || 0);
          const dateB = b.date && b.date.toDate ? b.date.toDate() : new Date(b.date || 0);
          return dateB - dateA;
        });
        
        return result;
      });
      
      // Update cache with deduplication
      const cachedTransactions = JSON.parse(await offlineStorageService.getItem(`finance_transactions_${currentScope}`) || '[]');
      
      // Create a map to deduplicate cached transactions with the new one
      const uniqueCachedTransactionsMap = new Map();
      
      // Add the new transaction first
      uniqueCachedTransactionsMap.set(createdTransaction.id, createdTransaction);
      
      // Add existing cached transactions, skipping any with the same ID
      cachedTransactions.forEach(transaction => {
        if (transaction && transaction.id) {
          uniqueCachedTransactionsMap.set(transaction.id, transaction);
        }
      });
      
      // Convert back to array and sort by date (most recent first)
      const uniqueCachedTransactions = Array.from(uniqueCachedTransactionsMap.values());
      uniqueCachedTransactions.sort((a, b) => {
        const dateA = a.date && a.date.toDate ? a.date.toDate() : new Date(a.date || 0);
        const dateB = b.date && b.date.toDate ? b.date.toDate() : new Date(b.date || 0);
        return dateB - dateA;
      });
      
      await offlineStorageService.setItem(
        `finance_transactions_${currentScope}`,
        JSON.stringify(uniqueCachedTransactions)
      );
      
      return createdTransaction;
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError('Failed to create transaction. Please try again.');
      return null;
    }
  };

  const updateTransaction = async (transactionId, transactionData) => {
    if (!user) return false;
    
    try {
      const transactionRef = doc(db, 'finance_transactions', transactionId);
      const transactionSnapshot = await getDoc(transactionRef);
      
      if (!transactionSnapshot.exists()) {
        throw new Error('Transaction not found');
      }
      
      const originalTransaction = transactionSnapshot.data();
      
      // Check if the account exists
      const accountRef = doc(db, 'finance_accounts', originalTransaction.accountId);
      const accountSnapshot = await getDoc(accountRef);
      
      if (!accountSnapshot.exists()) {
        throw new Error('Associated account not found');
      }
      
      const accountData = accountSnapshot.data();
      
      // Check if user has permission to update this transaction
      if (accountData.owner !== user.uid && !accountData.sharedWith.includes(user.uid)) {
        throw new Error('You do not have permission to update this transaction');
      }
      
      // Parse and validate amount if provided
      let validAmount = null;
      if (transactionData.amount !== undefined) {
        try {
          if (typeof transactionData.amount === 'number') {
            validAmount = transactionData.amount;
          } else if (typeof transactionData.amount === 'string') {
            validAmount = parseFloat(transactionData.amount);
          } else if (transactionData.amount) {
            validAmount = parseFloat(transactionData.amount);
          }
          
          if (isNaN(validAmount)) {
            console.warn(`Invalid amount provided for update: ${transactionData.amount}, using original amount instead`);
            validAmount = parseFloat(originalTransaction.amount) || 0;
          }
          
          // Round to 2 decimal places
          validAmount = Math.round(validAmount * 100) / 100;
        } catch (error) {
          console.error('Error parsing updated transaction amount:', error);
          validAmount = parseFloat(originalTransaction.amount) || 0;
        }
      }
      
      // Create the update data object with validated amount
      const updateData = {
        ...transactionData,
        updatedAt: serverTimestamp()
      };
      
      // Only set amount if it was provided and is valid
      if (validAmount !== null) {
        updateData.amount = validAmount;
      }
      
      // Track if we need to update balances for specific accounts
      const isAccountChanged = updateData.accountId && updateData.accountId !== originalTransaction.accountId;
      const isAmountChanged = validAmount !== null && validAmount !== parseFloat(originalTransaction.amount || 0);
      const isTypeChanged = updateData.type && updateData.type !== originalTransaction.type;
      
      // If the account is changing, verify the new account exists
      if (isAccountChanged) {
        const newAccountRef = doc(db, 'finance_accounts', updateData.accountId);
        const newAccountSnapshot = await getDoc(newAccountRef);
        
        if (!newAccountSnapshot.exists()) {
          throw new Error(`New account with ID ${updateData.accountId} not found`);
        }
      }
      
      // Update the transaction in Firestore
      await updateDoc(transactionRef, updateData);
      
      console.log(`Updated transaction ${transactionId}`);
      
      // If balance-affecting fields changed, recalculate balances
      if (isAccountChanged || isAmountChanged || isTypeChanged) {
        // Recalculate the original account's balance
        console.log(`Recalculating balance for original account ${originalTransaction.accountId} after transaction update`);
        await recalculateAccountBalance(originalTransaction.accountId);
        
        // If account changed, also recalculate the new account's balance
        if (isAccountChanged) {
          console.log(`Recalculating balance for new account ${updateData.accountId} after transaction moved`);
          await recalculateAccountBalance(updateData.accountId);
        }
      }
      
      // Update local state with the updated transaction
      const updatedTransaction = {
        id: transactionId,
        ...originalTransaction,
        ...updateData,
        updatedAt: new Date()
      };
      
      // If account ID changed, reload transactions to ensure they appear in the correct scope
      if (isAccountChanged) {
        console.log('Account ID changed, reloading all transactions');
        await loadTransactions(); // Immediately reload transactions
      } else {
        // Just update the transaction in the local state if the account hasn't changed
        setTransactions(prev => {
          return prev.map(transaction => 
            transaction.id === transactionId 
              ? updatedTransaction
              : transaction
          );
        });
      }
      
      // Update cache
      const cachedTransactions = JSON.parse(await offlineStorageService.getItem(`finance_transactions_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_transactions_${currentScope}`,
        JSON.stringify(
          cachedTransactions.map(transaction => 
            transaction.id === transactionId 
              ? { ...transaction, ...updateData, updatedAt: new Date() } 
              : transaction
          )
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError('Failed to update transaction. Please try again.');
      return false;
    }
  };

  const deleteTransaction = async (transactionId) => {
    if (!user) return false;
    
    try {
      const transactionRef = doc(db, 'finance_transactions', transactionId);
      const transactionSnapshot = await getDoc(transactionRef);
      
      if (!transactionSnapshot.exists()) {
        throw new Error('Transaction not found');
      }
      
      const transactionData = transactionSnapshot.data();
      
      // Check if the account exists
      const accountRef = doc(db, 'finance_accounts', transactionData.accountId);
      const accountSnapshot = await getDoc(accountRef);
      
      if (!accountSnapshot.exists()) {
        throw new Error('Associated account not found');
      }
      
      const accountData = accountSnapshot.data();
      
      // Check if user has permission to delete this transaction
      if (accountData.owner !== user.uid && !accountData.sharedWith.includes(user.uid)) {
        throw new Error('You do not have permission to delete this transaction');
      }
      
      // Remember the account ID before deleting the transaction
      const affectedAccountId = transactionData.accountId;
      
      // Delete the transaction from Firestore
      await deleteDoc(transactionRef);
      console.log(`Deleted transaction ${transactionId} from Firestore`);
      
      // Recalculate the account balance
      await recalculateAccountBalance(affectedAccountId);
      
      // Update local state
      setTransactions(prev => prev.filter(transaction => transaction.id !== transactionId));
      console.log(`Deleted transaction ${transactionId} from local state`);
      
      // Update cache for the current scope
      const cachedTransactions = JSON.parse(await offlineStorageService.getItem(`finance_transactions_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_transactions_${currentScope}`,
        JSON.stringify(cachedTransactions.filter(transaction => transaction.id !== transactionId))
      );
      
      return true;
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Failed to delete transaction. Please try again.');
      return false;
    }
  };

  // Project management
  const loadProjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load from cache if offline
      if (!networkService.isOnline()) {
        const cachedProjects = await offlineStorageService.getItem(`finance_projects_${currentScope}`);
        if (cachedProjects) {
          setProjects(JSON.parse(cachedProjects));
          setIsLoading(false);
          return;
        }
      }
      
      let projectsQuery;
      
      if (currentScope === FINANCE_SCOPE.NUCLEAR) {
        // Get nuclear family projects
        projectsQuery = query(
          collection(db, 'finance_projects'),
          where('scope', '==', FINANCE_SCOPE.NUCLEAR),
          where('contributors', 'array-contains', { userId: user.uid })
        );
      } else if (currentScope === FINANCE_SCOPE.EXTENDED) {
        // Get extended family projects
        projectsQuery = query(
          collection(db, 'finance_projects'),
          where('scope', '==', FINANCE_SCOPE.EXTENDED),
          where('contributors', 'array-contains', { userId: user.uid })
        );
      } else {
        // No personal projects in this model
        setProjects([]);
        setIsLoading(false);
        return;
      }
      
      const querySnapshot = await getDocs(projectsQuery);
      const projectsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProjects(projectsList);
      
      // Cache the results
      await offlineStorageService.setItem(`finance_projects_${currentScope}`, JSON.stringify(projectsList));
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (projectData) => {
    if (!user) return null;
    
    try {
      const projectRef = collection(db, 'finance_projects');
      
      // Prepare project data
      const newProject = {
        ...projectData,
        targetAmount: parseFloat(projectData.targetAmount) || 0,
        currentAmount: 0,
        createdBy: user.uid,
        contributors: [{ userId: user.uid, contributionAmount: 0, lastContribution: null }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add the project to Firestore
      const docRef = await addDoc(projectRef, newProject);
      
      // Update local state
      const createdProject = {
        id: docRef.id,
        ...newProject
      };
      
      setProjects(prev => [...prev, createdProject]);
      
      // Update cache
      const cachedProjects = JSON.parse(await offlineStorageService.getItem(`finance_projects_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_projects_${currentScope}`,
        JSON.stringify([...cachedProjects, createdProject])
      );
      
      return createdProject;
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project. Please try again.');
      return null;
    }
  };

  const contributeToProject = async (projectId, amount) => {
    if (!user) return false;
    
    try {
      amount = parseFloat(amount) || 0;
      if (amount <= 0) throw new Error('Contribution amount must be greater than zero');
      
      const projectRef = doc(db, 'finance_projects', projectId);
      const projectSnapshot = await getDoc(projectRef);
      
      if (!projectSnapshot.exists()) {
        throw new Error('Project not found');
      }
      
      const projectData = projectSnapshot.data();
      
      // Check if user is a contributor
      const contributorIndex = projectData.contributors.findIndex(c => c.userId === user.uid);
      if (contributorIndex === -1) {
        throw new Error('You are not a contributor to this project');
      }
      
      // Update project data
      const updatedContributors = [...projectData.contributors];
      updatedContributors[contributorIndex] = {
        ...updatedContributors[contributorIndex],
        contributionAmount: (updatedContributors[contributorIndex].contributionAmount || 0) + amount,
        lastContribution: serverTimestamp()
      };
      
      const newTotalAmount = (projectData.currentAmount || 0) + amount;
      
      await updateDoc(projectRef, {
        contributors: updatedContributors,
        currentAmount: newTotalAmount,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId 
            ? { 
                ...project, 
                contributors: updatedContributors,
                currentAmount: newTotalAmount,
                updatedAt: new Date() 
              } 
            : project
        )
      );
      
      // Update cache
      const cachedProjects = JSON.parse(await offlineStorageService.getItem(`finance_projects_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_projects_${currentScope}`,
        JSON.stringify(
          cachedProjects.map(project => 
            project.id === projectId 
              ? { 
                  ...project, 
                  contributors: updatedContributors,
                  currentAmount: newTotalAmount,
                  updatedAt: new Date() 
                } 
              : project
          )
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error contributing to project:', err);
      setError('Failed to contribute to project. Please try again.');
      return false;
    }
  };

  // Loan management
  const loadLoans = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load from cache if offline
      if (!networkService.isOnline()) {
        const cachedLoans = await offlineStorageService.getItem(`finance_loans_${currentScope}`);
        if (cachedLoans) {
          setLoans(JSON.parse(cachedLoans));
          setIsLoading(false);
          return;
        }
      }
      
      // Load loans based on current scope
      let loansQuery;
      
      if (currentScope === FINANCE_SCOPE.PERSONAL) {
        loansQuery = query(
          collection(db, 'finance_loans'),
          where('userId', '==', user.uid),
          where('scope', '==', FINANCE_SCOPE.PERSONAL)
        );
      } else if (currentScope === FINANCE_SCOPE.NUCLEAR) {
        loansQuery = query(
          collection(db, 'finance_loans'),
          where('userId', '==', user.uid),
          where('scope', '==', FINANCE_SCOPE.NUCLEAR)
        );
      } else if (currentScope === FINANCE_SCOPE.EXTENDED) {
        loansQuery = query(
          collection(db, 'finance_loans'),
          where('userId', '==', user.uid),
          where('scope', '==', FINANCE_SCOPE.EXTENDED)
        );
      } else {
        setLoans([]);
        setIsLoading(false);
        return;
      }
      
      const querySnapshot = await getDocs(loansQuery);
      const loansList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLoans(loansList);
      
      // Cache the results
      await offlineStorageService.setItem(`finance_loans_${currentScope}`, JSON.stringify(loansList));
    } catch (err) {
      console.error('Error loading loans:', err);
      setError('Failed to load loans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createLoan = async (loanData) => {
    if (!user) return null;
    
    try {
      const loanRef = collection(db, 'finance_loans');
      
      // Determine the counterpartyName based on loan type
      const counterpartyName = loanData.type === 'borrowed' ? loanData.lender : loanData.borrower;
      const isLent = loanData.type === 'lent';
      
      // Prepare loan data
      const newLoan = {
        ...loanData,
        userId: user.uid,
        amount: parseFloat(loanData.amount) || 0,
        interestRate: parseFloat(loanData.interestRate) || 0,
        counterpartyName: counterpartyName, // Add counterpartyName
        isLent: isLent, // Add isLent flag for proper display
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add the loan to Firestore
      const docRef = await addDoc(loanRef, newLoan);
      
      // Update local state
      const createdLoan = {
        id: docRef.id,
        ...newLoan
      };
      
      setLoans(prev => [...prev, createdLoan]);
      
      // Update cache
      const cachedLoans = JSON.parse(await offlineStorageService.getItem(`finance_loans_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_loans_${currentScope}`,
        JSON.stringify([...cachedLoans, createdLoan])
      );
      
      return createdLoan;
    } catch (err) {
      console.error('Error creating loan:', err);
      setError('Failed to create loan. Please try again.');
      return null;
    }
  };

  const updateLoan = async (loanId, loanData) => {
    if (!user) return false;
    
    try {
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanDoc = loanSnapshot.data();
      
      // Check if user has permission to update
      if (loanDoc.userId !== user.uid) {
        throw new Error('You do not have permission to update this loan');
      }
      
      // Prepare updated data
      const updatedData = {
        ...loanData,
        updatedAt: serverTimestamp()
      };
      
      // Update counterpartyName and isLent based on type if type or relevant fields changed
      if (loanData.type || loanData.lender || loanData.borrower) {
        const type = loanData.type || loanDoc.type;
        const lender = loanData.lender || loanDoc.lender;
        const borrower = loanData.borrower || loanDoc.borrower;
        
        updatedData.isLent = type === 'lent';
        updatedData.counterpartyName = type === 'borrowed' ? lender : borrower;
      }
      
      if (loanData.amount) {
        updatedData.amount = parseFloat(loanData.amount);
      }
      
      if (loanData.interestRate) {
        updatedData.interestRate = parseFloat(loanData.interestRate);
      }
      
      // Update loan in Firestore
      await updateDoc(loanRef, updatedData);
      
      // Update local state
      setLoans(prev => 
        prev.map(loan => 
          loan.id === loanId 
            ? { ...loan, ...updatedData, updatedAt: new Date() } 
            : loan
        )
      );
      
      // Update cache
      const cachedLoans = JSON.parse(await offlineStorageService.getItem(`finance_loans_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_loans_${currentScope}`,
        JSON.stringify(
          cachedLoans.map(loan => 
            loan.id === loanId 
              ? { ...loan, ...updatedData, updatedAt: new Date() } 
              : loan
          )
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error updating loan:', err);
      setError('Failed to update loan. Please try again.');
      return false;
    }
  };

  const recordLoanPayment = async (loanId, paymentData) => {
    if (!user) return false;
    
    try {
      console.log(`Recording payment for loan ${loanId}...`);
      
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanData = loanSnapshot.data();
      
      // Check if user owns the loan
      if (loanData.userId !== user.uid) {
        throw new Error('You do not have permission to update this loan');
      }
      
      // Validate payment amount
      const paymentAmount = parseFloat(paymentData.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      // Calculate current total payments
      const currentPayments = loanData.payments || [];
      const totalPaid = currentPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const remainingAmount = parseFloat(loanData.amount) - totalPaid;
      
      // Validate payment doesn't exceed remaining amount
      if (paymentAmount > remainingAmount) {
        throw new Error('Payment amount exceeds remaining loan balance');
      }
      
      // Create new payment record
      const newPayment = {
        id: Date.now().toString(), // Simple ID generation
        amount: paymentAmount,
        date: paymentData.date || new Date(),
        note: paymentData.note || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add payment to the loan's payments array
      const updatedPayments = [...currentPayments, newPayment];
      const newTotalPaid = totalPaid + paymentAmount;
      
      // Determine new loan status
      let newStatus = loanData.status;
      if (newTotalPaid >= parseFloat(loanData.amount)) {
        newStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newStatus = 'active'; // Ensure it's active if payments have been made
      }
      
      // Update the loan document
      await updateDoc(loanRef, {
        payments: updatedPayments,
        totalPaid: newTotalPaid,
        status: newStatus,
        updatedAt: new Date()
      });
      
      console.log(`Payment recorded successfully. New total paid: ${newTotalPaid}`);
      
      // Reload loans to reflect changes
      await loadLoans();
      
      return true;
    } catch (err) {
      console.error('Error recording loan payment:', err);
      setError(err.message || 'Failed to record payment. Please try again.');
      return false;
    }
  };
  
  // Enhanced loan payment management functions
  
  // Record a partial payment against a loan (new approach)
  const recordPartialLoanPayment = async (loanId, paymentData) => {
    if (!user) return false;
    
    try {
      console.log(`Recording partial payment for loan ${loanId}...`);
      
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanData = loanSnapshot.data();
      
      // Check if user owns the loan
      if (loanData.userId !== user.uid) {
        throw new Error('You do not have permission to update this loan');
      }
      
      // Validate payment amount
      const paymentAmount = parseFloat(paymentData.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      // Calculate current total payments
      const currentPayments = loanData.payments || [];
      const totalPaid = currentPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const remainingAmount = parseFloat(loanData.amount) - totalPaid;
      
      // Validate payment doesn't exceed remaining amount
      if (paymentAmount > remainingAmount) {
        throw new Error('Payment amount exceeds remaining loan balance');
      }
      
      // Create new payment record
      const newPayment = {
        id: Date.now().toString(), // Simple ID generation
        amount: paymentAmount,
        date: paymentData.date || new Date(),
        note: paymentData.note || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add payment to the loan's payments array
      const updatedPayments = [...currentPayments, newPayment];
      const newTotalPaid = totalPaid + paymentAmount;
      
      // Determine new loan status
      let newStatus = loanData.status;
      if (newTotalPaid >= parseFloat(loanData.amount)) {
        newStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newStatus = 'active'; // Ensure it's active if payments have been made
      }
      
      // Update the loan document
      await updateDoc(loanRef, {
        payments: updatedPayments,
        totalPaid: newTotalPaid,
        status: newStatus,
        updatedAt: new Date()
      });
      
      console.log(`Payment recorded successfully. New total paid: ${newTotalPaid}`);
      
      // Reload loans to reflect changes
      await loadLoans();
      
      return true;
    } catch (err) {
      console.error('Error recording partial loan payment:', err);
      setError(err.message || 'Failed to record payment. Please try again.');
      return false;
    }
  };
  
  // Update an existing loan payment
  const updateLoanPayment = async (loanId, paymentId, updatedPaymentData) => {
    if (!user) return false;
    
    try {
      console.log(`Updating payment ${paymentId} for loan ${loanId}...`);
      
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanData = loanSnapshot.data();
      
      // Check if user owns the loan
      if (loanData.userId !== user.uid) {
        throw new Error('You do not have permission to update this loan');
      }
      
      const payments = loanData.payments || [];
      const paymentIndex = payments.findIndex(payment => payment.id === paymentId);
      
      if (paymentIndex === -1) {
        throw new Error('Payment not found');
      }
      
      // Validate updated payment amount
      const newAmount = parseFloat(updatedPaymentData.amount);
      if (isNaN(newAmount) || newAmount <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      // Calculate total without this payment
      const otherPaymentsTotal = payments
        .filter(payment => payment.id !== paymentId)
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      
      // Check if new amount would exceed loan amount
      if (otherPaymentsTotal + newAmount > parseFloat(loanData.amount)) {
        throw new Error('Updated payment amount would exceed loan balance');
      }
      
      // Update the payment
      const updatedPayments = [...payments];
      updatedPayments[paymentIndex] = {
        ...updatedPayments[paymentIndex],
        ...updatedPaymentData,
        amount: newAmount,
        updatedAt: new Date()
      };
      
      const newTotalPaid = otherPaymentsTotal + newAmount;
      
      // Determine new loan status
      let newStatus = loanData.status;
      if (newTotalPaid >= parseFloat(loanData.amount)) {
        newStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newStatus = 'active';
      } else {
        newStatus = 'active'; // Default status
      }
      
      // Update the loan document
      await updateDoc(loanRef, {
        payments: updatedPayments,
        totalPaid: newTotalPaid,
        status: newStatus,
        updatedAt: new Date()
      });
      
      console.log(`Payment updated successfully. New total paid: ${newTotalPaid}`);
      
      // Reload loans to reflect changes
      await loadLoans();
      
      return true;
    } catch (err) {
      console.error('Error updating loan payment:', err);
      setError(err.message || 'Failed to update payment. Please try again.');
      return false;
    }
  };
  
  // Delete a loan payment
  const deleteLoanPayment = async (loanId, paymentId) => {
    if (!user) return false;
    
    try {
      console.log(`Deleting payment ${paymentId} for loan ${loanId}...`);
      
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanData = loanSnapshot.data();
      
      // Check if user owns the loan
      if (loanData.userId !== user.uid) {
        throw new Error('You do not have permission to update this loan');
      }
      
      const payments = loanData.payments || [];
      const updatedPayments = payments.filter(payment => payment.id !== paymentId);
      
      if (payments.length === updatedPayments.length) {
        throw new Error('Payment not found');
      }
      
      const newTotalPaid = updatedPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      
      // Determine new loan status
      let newStatus = loanData.status;
      if (newTotalPaid >= parseFloat(loanData.amount)) {
        newStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newStatus = 'active';
      } else {
        newStatus = 'active'; // Default status
      }
      
      // Update the loan document
      await updateDoc(loanRef, {
        payments: updatedPayments,
        totalPaid: newTotalPaid,
        status: newStatus,
        updatedAt: new Date()
      });
      
      console.log(`Payment deleted successfully. New total paid: ${newTotalPaid}`);
      
      // Reload loans to reflect changes
      await loadLoans();
      
      return true;
    } catch (err) {
      console.error('Error deleting loan payment:', err);
      setError(err.message || 'Failed to delete payment. Please try again.');
      return false;
    }
  };
  
  // Mark loan as fully paid (quick action)
  const markLoanAsPaid = async (loanId) => {
    if (!user) return false;
    
    try {
      console.log(`Marking loan ${loanId} as paid...`);
      
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanData = loanSnapshot.data();
      
      // Check if user owns the loan
      if (loanData.userId !== user.uid) {
        throw new Error('You do not have permission to update this loan');
      }
      
      const currentPayments = loanData.payments || [];
      const totalPaid = currentPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const remainingAmount = parseFloat(loanData.amount) - totalPaid;
      
      if (remainingAmount <= 0) {
        // Already fully paid
        return true;
      }
      
      // Create final payment for remaining amount
      const finalPayment = {
        id: Date.now().toString(),
        amount: remainingAmount,
        date: new Date(),
        note: 'Final payment - marked as paid',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const updatedPayments = [...currentPayments, finalPayment];
      
      // Update the loan document
      await updateDoc(loanRef, {
        payments: updatedPayments,
        totalPaid: parseFloat(loanData.amount),
        status: 'paid',
        updatedAt: new Date()
      });
      
      console.log(`Loan marked as paid with final payment of ${remainingAmount}`);
      
      // Reload loans to reflect changes
      await loadLoans();
      
      return true;
    } catch (err) {
      console.error('Error marking loan as paid:', err);
      setError(err.message || 'Failed to mark loan as paid. Please try again.');
      return false;
    }
  };
  
  // Mark loan as unpaid (reverse all payments)
  const markLoanAsUnpaid = async (loanId) => {
    if (!user) return false;
    
    try {
      console.log(`Marking loan ${loanId} as unpaid...`);
      
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanData = loanSnapshot.data();
      
      // Check if user owns the loan
      if (loanData.userId !== user.uid) {
        throw new Error('You do not have permission to update this loan');
      }
      
      // Clear all payments
      await updateDoc(loanRef, {
        payments: [],
        totalPaid: 0,
        status: 'active',
        updatedAt: new Date()
      });
      
      console.log(`Loan marked as unpaid - all payments removed`);
      
      // Reload loans to reflect changes
      await loadLoans();
      
      return true;
    } catch (err) {
      console.error('Error marking loan as unpaid:', err);
      setError(err.message || 'Failed to mark loan as unpaid. Please try again.');
      return false;
    }
  };
  
  // Delete a loan
  const deleteLoan = async (loanId) => {
    if (!user) return false;
    
    try {
      console.log(`Deleting loan ${loanId}...`);
      
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanData = loanSnapshot.data();
      
      // Check if user owns the loan
      if (loanData.userId !== user.uid) {
        throw new Error('You do not have permission to delete this loan');
      }
      
      // Delete the loan from Firestore
      await deleteDoc(loanRef);
      
      console.log(`Loan ${loanId} deleted successfully`);
      
      // Update local state
      setLoans(prev => prev.filter(loan => loan.id !== loanId));
      
      // Update cache
      const cachedLoans = JSON.parse(await offlineStorageService.getItem(`finance_loans_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_loans_${currentScope}`,
        JSON.stringify(cachedLoans.filter(loan => loan.id !== loanId))
      );
      
      return true;
    } catch (err) {
      console.error('Error deleting loan:', err);
      setError(err.message || 'Failed to delete loan. Please try again.');
      return false;
    }
  };
  
  // Welfare account management
  const loadWelfareAccounts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load from cache if offline
      if (!networkService.isOnline()) {
        const cachedWelfareAccounts = await offlineStorageService.getItem(`finance_welfare_accounts_${currentScope}`);
        if (cachedWelfareAccounts) {
          setWelfareAccounts(JSON.parse(cachedWelfareAccounts));
          setIsLoading(false);
          return;
        }
      }
      
      // Only load extended family welfare accounts
      if (currentScope !== FINANCE_SCOPE.EXTENDED) {
        setWelfareAccounts([]);
        setIsLoading(false);
        return;
      }
      
      const welfareQuery = query(
        collection(db, 'finance_welfare_accounts'),
        where('members', 'array-contains', { userId: user.uid })
      );
      
      const querySnapshot = await getDocs(welfareQuery);
      const welfareList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setWelfareAccounts(welfareList);
      
      // Cache the results
      await offlineStorageService.setItem(`finance_welfare_accounts_${currentScope}`, JSON.stringify(welfareList));
    } catch (err) {
      console.error('Error loading welfare accounts:', err);
      setError('Failed to load welfare accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createWelfareAccount = async (welfareData) => {
    if (!user) return null;
    
    try {
      const welfareRef = collection(db, 'finance_welfare_accounts');
      
      // Prepare welfare account data
      const newWelfare = {
        ...welfareData,
        monthlyContributionAmount: parseFloat(welfareData.monthlyContributionAmount) || 0,
        balance: 0,
        members: [{ 
          userId: user.uid, 
          status: 'active',
          contributionHistory: []
        }],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add the welfare account to Firestore
      const docRef = await addDoc(welfareRef, newWelfare);
      
      // Update local state
      const createdWelfare = {
        id: docRef.id,
        ...newWelfare
      };
      
      setWelfareAccounts(prev => [...prev, createdWelfare]);
      
      // Update cache
      const cachedWelfareAccounts = JSON.parse(await offlineStorageService.getItem(`finance_welfare_accounts_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_welfare_accounts_${currentScope}`,
        JSON.stringify([...cachedWelfareAccounts, createdWelfare])
      );
      
      return createdWelfare;
    } catch (err) {
      console.error('Error creating welfare account:', err);
      setError('Failed to create welfare account. Please try again.');
      return null;
    }
  };

  const contributeToWelfare = async (welfareId, amount, month) => {
    if (!user) return false;
    
    try {
      amount = parseFloat(amount) || 0;
      if (amount <= 0) throw new Error('Contribution amount must be greater than zero');
      
      const welfareRef = doc(db, 'finance_welfare_accounts', welfareId);
      const welfareSnapshot = await getDoc(welfareRef);
      
      if (!welfareSnapshot.exists()) {
        throw new Error('Welfare account not found');
      }
      
      const welfareData = welfareSnapshot.data();
      
      // Check if user is a member
      const memberIndex = welfareData.members.findIndex(m => m.userId === user.uid);
      if (memberIndex === -1) {
        throw new Error('You are not a member of this welfare account');
      }
      
      // Update member contribution history
      const updatedMembers = [...welfareData.members];
      const memberData = updatedMembers[memberIndex];
      
      // Check if month already exists in history
      const contributionIndex = memberData.contributionHistory.findIndex(c => c.month === month);
      
      if (contributionIndex !== -1) {
        // Update existing contribution
        memberData.contributionHistory[contributionIndex] = {
          ...memberData.contributionHistory[contributionIndex],
          paid: true,
          amount: amount,
          date: serverTimestamp()
        };
      } else {
        // Add new contribution
        memberData.contributionHistory.push({
          month: month,
          paid: true,
          amount: amount,
          date: serverTimestamp()
        });
      }
      
      updatedMembers[memberIndex] = memberData;
      
      // Update balance
      const newBalance = (welfareData.balance || 0) + amount;
      
      await updateDoc(welfareRef, {
        members: updatedMembers,
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setWelfareAccounts(prev => 
        prev.map(welfare => 
          welfare.id === welfareId 
            ? { 
                ...welfare, 
                members: updatedMembers,
                balance: newBalance,
                updatedAt: new Date() 
              } 
            : welfare
        )
      );
      
      // Update cache
      const cachedWelfareAccounts = JSON.parse(await offlineStorageService.getItem(`finance_welfare_accounts_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_welfare_accounts_${currentScope}`,
        JSON.stringify(
          cachedWelfareAccounts.map(welfare => 
            welfare.id === welfareId 
              ? { 
                  ...welfare, 
                  members: updatedMembers,
                  balance: newBalance,
                  updatedAt: new Date() 
                } 
              : welfare
          )
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error contributing to welfare account:', err);
      setError('Failed to contribute to welfare account. Please try again.');
      return false;
    }
  };

  const updateWelfareAccount = async (welfareId, updatedData) => {
    if (!user) return false;
    
    try {
      const welfareRef = doc(db, 'finance_welfare_accounts', welfareId);
      const welfareSnapshot = await getDoc(welfareRef);
      
      if (!welfareSnapshot.exists()) {
        throw new Error('Welfare account not found');
      }
      
      // Update the welfare account in Firestore
      await updateDoc(welfareRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setWelfareAccounts(prev => 
        prev.map(welfare => 
          welfare.id === welfareId 
            ? { ...welfare, ...updatedData, updatedAt: new Date() } 
            : welfare
        )
      );
      
      // Update cache
      const cachedWelfareAccounts = JSON.parse(await offlineStorageService.getItem(`finance_welfare_accounts_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_welfare_accounts_${currentScope}`,
        JSON.stringify(
          cachedWelfareAccounts.map(welfare => 
            welfare.id === welfareId 
              ? { ...welfare, ...updatedData, updatedAt: new Date() } 
              : welfare
          )
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error updating welfare account:', err);
      setError('Failed to update welfare account. Please try again.');
      return false;
    }
  };

  // Financial reports
  const generateIncomeExpenseReport = (startDate, endDate, accountIds = []) => {
    // Filter transactions based on date range and account IDs
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date);
      const inDateRange = transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
      const inAccounts = accountIds.length === 0 || accountIds.includes(transaction.accountId);
      return inDateRange && inAccounts;
    });
    
    // Calculate totals
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      
    // Calculate by category
    const incomeByCategory = {};
    const expenseByCategory = {};
    
    filteredTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        incomeByCategory[transaction.category] = (incomeByCategory[transaction.category] || 0) + (parseFloat(transaction.amount) || 0);
      } else if (transaction.type === 'expense') {
        expenseByCategory[transaction.category] = (expenseByCategory[transaction.category] || 0) + (parseFloat(transaction.amount) || 0);
      }
    });
    
    return {
      startDate,
      endDate,
      totalIncome: income,
      totalExpense: expense,
      netIncome: income - expense,
      incomeByCategory,
      expenseByCategory,
      transactions: filteredTransactions
    };
  };

  // Member management for welfare accounts
  const addWelfareMember = async (welfareId, memberUserId) => {
    if (!user) return false;
    
    try {
      const welfareRef = doc(db, 'finance_welfare_accounts', welfareId);
      const welfareSnapshot = await getDoc(welfareRef);
      
      if (!welfareSnapshot.exists()) {
        throw new Error('Welfare account not found');
      }
      
      const welfareData = welfareSnapshot.data();
      
      // Check if user is already a member
      if (welfareData.members.some(m => m.userId === memberUserId)) {
        throw new Error('User is already a member of this welfare account');
      }
      
      // Add new member
      const updatedMembers = [...welfareData.members, {
        userId: memberUserId,
        status: 'active',
        contributionHistory: []
      }];
      
      await updateDoc(welfareRef, {
        members: updatedMembers,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setWelfareAccounts(prev => 
        prev.map(welfare => 
          welfare.id === welfareId 
            ? { 
                ...welfare, 
                members: updatedMembers,
                updatedAt: new Date() 
              } 
            : welfare
        )
      );
      
      // Update cache
      const cachedWelfareAccounts = JSON.parse(await offlineStorageService.getItem(`finance_welfare_accounts_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_welfare_accounts_${currentScope}`,
        JSON.stringify(
          cachedWelfareAccounts.map(welfare => 
            welfare.id === welfareId 
              ? { 
                  ...welfare, 
                  members: updatedMembers,
                  updatedAt: new Date() 
                } 
              : welfare
          )
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error adding welfare member:', err);
      setError('Failed to add member to welfare account. Please try again.');
      return false;
    }
  };

  const removeWelfareMember = async (welfareId, memberUserId) => {
    if (!user) return false;
    
    try {
      const welfareRef = doc(db, 'finance_welfare_accounts', welfareId);
      const welfareSnapshot = await getDoc(welfareRef);
      
      if (!welfareSnapshot.exists()) {
        throw new Error('Welfare account not found');
      }
      
      const welfareData = welfareSnapshot.data();
      
      // Check if user is a member
      if (!welfareData.members.some(m => m.userId === memberUserId)) {
        throw new Error('User is not a member of this welfare account');
      }
      
      // Cannot remove the creator
      if (welfareData.createdBy === memberUserId) {
        throw new Error('Cannot remove the creator of the welfare account');
      }
      
      // Remove member
      const updatedMembers = welfareData.members.filter(m => m.userId !== memberUserId);
      
      await updateDoc(welfareRef, {
        members: updatedMembers,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setWelfareAccounts(prev => 
        prev.map(welfare => 
          welfare.id === welfareId 
            ? { 
                ...welfare, 
                members: updatedMembers,
                updatedAt: new Date() 
              } 
            : welfare
        )
      );
      
      // Update cache
      const cachedWelfareAccounts = JSON.parse(await offlineStorageService.getItem(`finance_welfare_accounts_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_welfare_accounts_${currentScope}`,
        JSON.stringify(
          cachedWelfareAccounts.map(welfare => 
            welfare.id === welfareId 
              ? { 
                  ...welfare, 
                  members: updatedMembers,
                  updatedAt: new Date() 
                } 
              : welfare
          )
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error removing welfare member:', err);
      setError('Failed to remove member from welfare account. Please try again.');
      return false;
    }
  };

  // Change current scope
  const changeScope = (scope) => {
    if (Object.values(FINANCE_SCOPE).includes(scope)) {
      setCurrentScope(scope);
    }
  };

  // Sync offline data with Firebase when online
  const syncOfflineData = async () => {
    if (!user || !networkService.isOnline()) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Sync accounts
      const offlineAccounts = JSON.parse(await offlineStorageService.getItem('finance_accounts_offline') || '[]');
      if (offlineAccounts.length > 0) {
        for (const account of offlineAccounts) {
          if (account._offlineAction === 'create') {
            // Create account in Firestore
            const { _offlineId, _offlineAction, ...accountData } = account;
            await createAccount(accountData);
          } else if (account._offlineAction === 'update') {
            // Update account in Firestore
            const { _offlineId, _offlineAction, id, ...accountData } = account;
            await updateAccount(id, accountData);
          } else if (account._offlineAction === 'delete') {
            // Delete account in Firestore
            await deleteAccount(account.id);
          }
        }
        
        // Clear offline accounts
        await offlineStorageService.removeItem('finance_accounts_offline');
      }
      
      // Sync transactions
      const offlineTransactions = JSON.parse(await offlineStorageService.getItem('finance_transactions_offline') || '[]');
      if (offlineTransactions.length > 0) {
        for (const transaction of offlineTransactions) {
          if (transaction._offlineAction === 'create') {
            // Create transaction in Firestore
            const { _offlineId, _offlineAction, ...transactionData } = transaction;
            await createTransaction(transactionData);
          } else if (transaction._offlineAction === 'update') {
            // Update transaction in Firestore
            const { _offlineId, _offlineAction, id, ...transactionData } = transaction;
            await updateTransaction(id, transactionData);
          } else if (transaction._offlineAction === 'delete') {
            // Delete transaction in Firestore
            await deleteTransaction(transaction.id);
          }
        }
        
        // Clear offline transactions
        await offlineStorageService.removeItem('finance_transactions_offline');
      }
      
      // Reload data from Firestore
      await loadAccounts();
      await loadTransactions();
      await loadProjects();
      await loadLoans();
      await loadWelfareAccounts();
      
      return true;
    } catch (err) {
      console.error('Error syncing offline data:', err);
      setError('Failed to sync offline data. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Currency management functions
  const formatCurrency = (amount, currency = 'GHS') => {
    return currencyService.formatCurrency(amount, currency);
  };

  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    return currencyService.convertCurrency(amount, fromCurrency, toCurrency);
  };

  const getTotalBalance = (accountsList = accounts, displayCurrency = 'GHS') => {
    return currencyService.getTotalBalanceInCurrency(accountsList, displayCurrency);
  };

  const getScopedBalance = (scope, displayCurrency = 'GHS') => {
    const scopedAccounts = accounts.filter(account => account.scope === scope);
    return getTotalBalance(scopedAccounts, displayCurrency);
  };

  // Update context value whenever state changes
  useEffect(() => {
    setContextValue({
      // State
      accounts,
      transactions,
      projects,
      loans,
      welfareAccounts,
      isLoading,
      error,
      currentScope,
      
      // Actions
      changeScope,
      loadTransactions,
      loadAccounts,
      
      // Account management
      createAccount,
      updateAccount,
      deleteAccount,
      recalculateAccountBalance,
      recalculateAllAccountBalances,
      
      // Transaction management
      createTransaction,
      updateTransaction,
      deleteTransaction,
      
      // Project management
      createProject,
      contributeToProject,
      
      // Loan management
      createLoan,
      updateLoan,
      deleteLoan,
      recordLoanPayment,
      recordPartialLoanPayment,
      updateLoanPayment,
      deleteLoanPayment,
      markLoanAsPaid,
      markLoanAsUnpaid,
      
      // Welfare management
      createWelfareAccount,
      contributeToWelfare,
      updateWelfareAccount,
      addWelfareMember,
      removeWelfareMember,
      
      // Reports
      generateIncomeExpenseReport,
      
      // Currency functions
      formatCurrency,
      convertCurrency,
      getTotalBalance,
      getScopedBalance,
      
      // Offline sync
      syncOfflineData
    });
  }, [
    accounts, 
    transactions, 
    projects, 
    loans, 
    welfareAccounts, 
    isLoading, 
    error, 
    currentScope
    // We're removing function dependencies to avoid circular dependencies
    // Functions are stable and don't need to be in the dependency array
  ]);

  // Recalculate and fix an account's balance based on all its transactions
  const recalculateAccountBalance = async (accountId) => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Recalculating balance for account ${accountId}`);
      
      // Get the account
      const accountRef = doc(db, 'finance_accounts', accountId);
      const accountSnapshot = await getDoc(accountRef);
      
      if (!accountSnapshot.exists()) {
        console.error('Account not found:', accountId);
        throw new Error('Account not found');
      }
      
      const accountData = accountSnapshot.data();
      
      // Check permissions
      if (accountData.owner !== user.uid && !accountData.sharedWith?.includes(user.uid)) {
        console.error('Permission denied for account:', accountId);
        throw new Error('You do not have permission to recalculate this account');
      }
      
      // Get the initial balance (when account was created)
      let initialBalance = 0;
      try {
        initialBalance = typeof accountData.initialBalance === 'number' 
          ? accountData.initialBalance 
          : parseFloat(accountData.initialBalance || 0);
        
        // Safety check for NaN
        if (isNaN(initialBalance)) {
          console.warn(`Invalid initial balance for account ${accountId}, using 0 instead`);
          initialBalance = 0;
        }
      } catch (error) {
        console.error(`Error parsing initial balance for account ${accountId}:`, error);
        initialBalance = 0;
      }
      
      console.log(`Initial balance: ${initialBalance}`);
      
      // Get all transactions for this account
      const transactionsQuery = query(
        collection(db, 'finance_transactions'),
        where('accountId', '==', accountId)
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      console.log(`Found ${transactionsSnapshot.size} transactions for account ${accountId}`);
      
      // Calculate the new balance based on all transactions
      let newBalance = initialBalance;
      let incomeTotal = 0;
      let expenseTotal = 0;
      let transactionCount = 0;
      let errorCount = 0;
      
      // Process each transaction with enhanced error handling
      transactionsSnapshot.forEach(doc => {
        try {
          const transaction = doc.data();
          if (!transaction) {
            console.warn(`Empty transaction data for document ${doc.id}, skipping`);
            errorCount++;
            return;
          }
          
          // Ensure we have a valid amount
          let transactionAmount = 0;
          try {
            if (typeof transaction.amount === 'number') {
              transactionAmount = transaction.amount;
            } else if (typeof transaction.amount === 'string') {
              transactionAmount = parseFloat(transaction.amount);
            } else if (transaction.amount) {
              transactionAmount = parseFloat(transaction.amount);
            }
            
            // Safety check for NaN
            if (isNaN(transactionAmount)) {
              console.warn(`Invalid amount in transaction ${doc.id}: ${transaction.amount}, using 0 instead`);
              transactionAmount = 0;
            }
            
            // Round to prevent floating point errors
            transactionAmount = Math.round(transactionAmount * 100) / 100;
          } catch (error) {
            console.error(`Error parsing amount for transaction ${doc.id}:`, error);
            transactionAmount = 0;
            errorCount++;
          }
          
          // Process based on transaction type
          if (transaction.type === 'income') {
            newBalance += transactionAmount;
            incomeTotal += transactionAmount;
            console.log(`Income transaction ${doc.id}: +${transactionAmount}`);
          } else if (transaction.type === 'expense') {
            newBalance -= transactionAmount;
            expenseTotal += transactionAmount;
            console.log(`Expense transaction ${doc.id}: -${transactionAmount}`);
          } else {
            console.warn(`Unknown transaction type in ${doc.id}: ${transaction.type}, skipping`);
            errorCount++;
            return;
          }
          
          transactionCount++;
        } catch (error) {
          console.error(`Error processing transaction ${doc.id}:`, error);
          errorCount++;
        }
      });
      
      // Round to 2 decimal places to avoid floating point issues
      newBalance = Math.round(newBalance * 100) / 100;
      
      console.log(`Recalculation summary for account ${accountId}:`);
      console.log(`- Initial balance: ${initialBalance}`);
      console.log(`- Income total: ${incomeTotal}`);
      console.log(`- Expense total: ${expenseTotal}`);
      console.log(`- Processed transactions: ${transactionCount} (errors: ${errorCount})`);
      console.log(`- New balance: ${newBalance} (previous: ${accountData.balance || 0})`);
      
      // Update the account with the recalculated balance
      await updateDoc(accountRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // Update the account in the local state
      setAccounts(prev => 
        prev.map(account => 
          account.id === accountId 
            ? { ...account, balance: newBalance, updatedAt: new Date() } 
            : account
        )
      );
      
      // Also update any cached versions
      const accountScopes = [FINANCE_SCOPE.PERSONAL, FINANCE_SCOPE.NUCLEAR, FINANCE_SCOPE.EXTENDED];
      for (const scope of accountScopes) {
        try {
          const cachedAccounts = JSON.parse(await offlineStorageService.getItem(`finance_accounts_${scope}`) || '[]');
          const updatedCachedAccounts = cachedAccounts.map(acc => {
            if (acc.id === accountId) {
              return { ...acc, balance: newBalance, updatedAt: new Date() };
                       }
            return acc;
          });
          
          await offlineStorageService.setItem(`finance_accounts_${scope}`, JSON.stringify(updatedCachedAccounts));
        } catch (err) {
          console.error(`Error updating cached accounts for scope ${scope}:`, err);
        }
      }
      
      // Reload transactions to ensure consistency with the recalculated balance
      await loadTransactions();
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error recalculating account balance:', err);
      setError('Failed to recalculate account balance. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  // New function to recalculate all account balances
  const recalculateAllAccountBalances = async () => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Recalculating balances for all accounts');
      
      // Get all accounts
      const userAccounts = [...accounts];
      console.log(`Found ${userAccounts.length} accounts to process`);
      
      // Track success/failure
      let allSucceeded = true;
      let processedCount = 0;
      let errorCount = 0;
      
      // Process each account
      for (const account of userAccounts) {
        try {
          console.log(`Processing account: ${account.id} (${account.name})`);
          
          // Get the initial balance with enhanced error handling
          let initialBalance = 0;
          try {
            initialBalance = typeof account.initialBalance === 'number' 
              ? account.initialBalance 
              : parseFloat(account.initialBalance || 0);
            
            if (isNaN(initialBalance)) {
              console.warn(`Invalid initial balance for account ${account.id}, using 0 instead`);
              initialBalance = 0;
            }
          } catch (error) {
            console.error(`Error parsing initial balance for account ${account.id}:`, error);
            initialBalance = 0;
          }
          
          // Get all transactions for this account
          const transactionsQuery = query(
            collection(db, 'finance_transactions'),
            where('accountId', '==', account.id)
          );
          
          const transactionsSnapshot = await getDocs(transactionsQuery);
          console.log(`Found ${transactionsSnapshot.size} transactions for account ${account.id}`);
          
          // Calculate the new balance based on all transactions
          let newBalance = initialBalance;
          let incomeTotal = 0;
          let expenseTotal = 0;
          let transactionCount = 0;
          let transactionErrors = 0;
          
          // Process each transaction with enhanced error handling
          transactionsSnapshot.forEach(doc => {
            try {
              const transaction = doc.data();
              if (!transaction) {
                console.warn(`Empty transaction data for document ${doc.id}, skipping`);
                transactionErrors++;
                return;
              }
              
              // Ensure we have a valid amount
              let transactionAmount = 0;
              try {
                if (typeof transaction.amount === 'number') {
                  transactionAmount = transaction.amount;
                } else if (typeof transaction.amount === 'string') {
                  transactionAmount = parseFloat(transaction.amount);
                } else if (transaction.amount) {
                  transactionAmount = parseFloat(transaction.amount);
                }
                
                // Safety check for NaN
                if (isNaN(transactionAmount)) {
                  console.warn(`Invalid amount in transaction ${doc.id}: ${transaction.amount}, using 0 instead`);
                  transactionAmount = 0;
                }
                
                // Round to prevent floating point errors
                transactionAmount = Math.round(transactionAmount * 100) / 100;
              } catch (error) {
                console.error(`Error parsing amount for transaction ${doc.id}:`, error);
                transactionAmount = 0;
                transactionErrors++;
              }
              
              // Process based on transaction type
              if (transaction.type === 'income') {
                newBalance += transactionAmount;
                incomeTotal += transactionAmount;
              } else if (transaction.type === 'expense') {
                newBalance -= transactionAmount;
                expenseTotal += transactionAmount;
              } else {
                console.warn(`Unknown transaction type in ${doc.id}: ${transaction.type}, skipping`);
                transactionErrors++;
                return;
              }
              
              transactionCount++;
            } catch (error) {
              console.error(`Error processing transaction ${doc.id}:`, error);
              transactionErrors++;
            }
          });
          
          // Round to 2 decimal places to avoid floating point issues
          newBalance = Math.round(newBalance * 100) / 100;
          
          console.log(`Recalculation summary for account ${account.id}:`);
          console.log(`- Initial balance: ${initialBalance}`);
          console.log(`- Income total: ${incomeTotal}`);
          console.log(`- Expense total: ${expenseTotal}`);
          console.log(`- Processed transactions: ${transactionCount} (errors: ${transactionErrors})`);
          console.log(`- New balance: ${newBalance} (previous: ${account.balance || 0})`);
          
          // Get the current balance from the account
          let currentBalance = 0;
          try {
            currentBalance = typeof account.balance === 'number' 
              ? account.balance 
              : parseFloat(account.balance || 0);
            
            if (isNaN(currentBalance)) {
              console.warn(`Invalid current balance for account ${account.id}, treating as 0`);
              currentBalance = 0;
            }
          } catch (error) {
            console.error(`Error parsing current balance for account ${account.id}:`, error);
            currentBalance = 0;
          }
          
          // Update if the recalculated balance differs from the current balance
          // Use a small epsilon value to account for potential floating point comparison issues
          const epsilon = 0.001;
          if (Math.abs(newBalance - currentBalance) > epsilon) {
            // Update the account with the recalculated balance
            const accountRef = doc(db, 'finance_accounts', account.id);
            await updateDoc(accountRef, {
              balance: newBalance,
              updatedAt: serverTimestamp()
            });
            
            console.log(`Updated account ${account.id} with new balance: ${newBalance} (was: ${currentBalance})`);
          } else {
            console.log(`No change needed for account ${account.id} (balance already correct)`);
          }
          
          processedCount++;
        } catch (err) {
          console.error(`Error recalculating balance for account ${account.id}:`, err);
          allSucceeded = false;
          errorCount++;
        }
      }
      
      console.log(`Recalculation complete for ${processedCount} accounts with ${errorCount} errors`);
      
      // Reload accounts to reflect changes
      await loadAccounts();
      
      // Also reload transactions to ensure consistency
      await loadTransactions();
      
      setIsLoading(false);
      return allSucceeded;
    } catch (err) {
      console.error('Error recalculating all account balances:', err);
      setError('Failed to recalculate account balances. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
};
