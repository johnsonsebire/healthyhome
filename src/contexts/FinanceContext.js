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
      
      // Prepare account data
      const newAccount = {
        ...accountData,
        owner: user.uid,
        balance: parseFloat(accountData.balance) || 0,
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
      // Try to load from cache if offline
      if (!networkService.isOnline()) {
        const cachedTransactions = await offlineStorageService.getItem(`finance_transactions_${currentScope}`);
        if (cachedTransactions) {
          setTransactions(JSON.parse(cachedTransactions));
          setIsLoading(false);
          return;
        }
      }
      
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
        setTransactions([]);
        setIsLoading(false);
        return;
      }
      
      // Query transactions for the accounts
      // NOTE: This query requires a composite index on 'accountId' ASC, 'date' DESC
      // See firestore.indexes.json for the required index configuration
      const transactionsQuery = query(
        collection(db, 'finance_transactions'),
        where('accountId', 'in', accountIds),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(transactionsQuery);
      const transactionsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTransactions(transactionsList);
      
      // Cache the results
      await offlineStorageService.setItem(`finance_transactions_${currentScope}`, JSON.stringify(transactionsList));
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
      
      // Prepare transaction data
      const newTransaction = {
        ...transactionData,
        amount: parseFloat(transactionData.amount) || 0,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add the transaction to Firestore
      const docRef = await addDoc(transactionRef, newTransaction);
      
      // Update account balance
      const accountRef = doc(db, 'finance_accounts', transactionData.accountId);
      const accountSnapshot = await getDoc(accountRef);
      
      if (accountSnapshot.exists()) {
        const accountData = accountSnapshot.data();
        let newBalance = accountData.balance;
        
        if (transactionData.type === 'income') {
          newBalance += parseFloat(transactionData.amount);
        } else if (transactionData.type === 'expense') {
          newBalance -= parseFloat(transactionData.amount);
        }
        
        await updateDoc(accountRef, {
          balance: newBalance,
          updatedAt: serverTimestamp()
        });
        
        // Update accounts in state
        setAccounts(prev => 
          prev.map(account => 
            account.id === transactionData.accountId 
              ? { ...account, balance: newBalance, updatedAt: new Date() } 
              : account
          )
        );
      }
      
      // Update local state
      const createdTransaction = {
        id: docRef.id,
        ...newTransaction
      };
      
      setTransactions(prev => [createdTransaction, ...prev]);
      
      // Update cache
      const cachedTransactions = JSON.parse(await offlineStorageService.getItem(`finance_transactions_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_transactions_${currentScope}`,
        JSON.stringify([createdTransaction, ...cachedTransactions])
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
      
      // Update the transaction in Firestore
      await updateDoc(transactionRef, {
        ...transactionData,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setTransactions(prev => 
        prev.map(transaction => 
          transaction.id === transactionId 
            ? { ...transaction, ...transactionData, updatedAt: new Date() } 
            : transaction
        )
      );
      
      // Update cache
      const cachedTransactions = JSON.parse(await offlineStorageService.getItem(`finance_transactions_${currentScope}`) || '[]');
      await offlineStorageService.setItem(
        `finance_transactions_${currentScope}`,
        JSON.stringify(
          cachedTransactions.map(transaction => 
            transaction.id === transactionId 
              ? { ...transaction, ...transactionData, updatedAt: new Date() } 
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
      
      // Update account balance
      let newBalance = accountData.balance;
      
      if (transactionData.type === 'income') {
        newBalance -= parseFloat(transactionData.amount);
      } else if (transactionData.type === 'expense') {
        newBalance += parseFloat(transactionData.amount);
      }
      
      await updateDoc(accountRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // Update accounts in state
      setAccounts(prev => 
        prev.map(account => 
          account.id === transactionData.accountId 
            ? { ...account, balance: newBalance, updatedAt: new Date() } 
            : account
        )
      );
      
      // Delete the transaction from Firestore
      await deleteDoc(transactionRef);
      
      // Update local state
      setTransactions(prev => prev.filter(transaction => transaction.id !== transactionId));
      
      // Update cache
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
      
      // Find the payment in the schedule
      const paymentIndex = loanData.paymentSchedule.findIndex(
        payment => payment.dueDate.toDate().getTime() === new Date(paymentData.dueDate).getTime()
      );
      
      if (paymentIndex === -1) {
        throw new Error('Payment not found in schedule');
      }
      
      // Update payment status
      const updatedSchedule = [...loanData.paymentSchedule];
      updatedSchedule[paymentIndex] = {
        ...updatedSchedule[paymentIndex],
        status: 'paid'
      };
      
      // Check if all payments are made
      const allPaid = updatedSchedule.every(payment => payment.status === 'paid');
      
      await updateDoc(loanRef, {
        paymentSchedule: updatedSchedule,
        status: allPaid ? 'paid' : 'active',
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setLoans(prev => 
        prev.map(loan => 
          loan.id === loanId 
            ? { 
                ...loan, 
                paymentSchedule: updatedSchedule,
                status: allPaid ? 'paid' : 'active',
                updatedAt: new Date() 
              } 
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
              ? { 
                  ...loan, 
                  paymentSchedule: updatedSchedule,
                  status: allPaid ? 'paid' : 'active',
                  updatedAt: new Date() 
                } 
              : loan
          )
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error recording loan payment:', err);
      setError('Failed to record loan payment. Please try again.');
      return false;
    }
  };

  const deleteLoan = async (loanId) => {
    if (!user) return false;
    
    try {
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanDoc = loanSnapshot.data();
      
      // Check if user has permission to delete
      if (loanDoc.userId !== user.uid) {
        throw new Error('You do not have permission to delete this loan');
      }
      
      // Delete loan from Firestore
      await deleteDoc(loanRef);
      
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
      setError('Failed to delete loan. Please try again.');
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
      
      // Account management
      createAccount,
      updateAccount,
      deleteAccount,
      
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

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
};
