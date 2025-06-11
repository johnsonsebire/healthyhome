import { db } from '../../firebaseConfig';
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
  limit,
  serverTimestamp
} from 'firebase/firestore';
import offlineStorageService from './offlineStorage';
import networkService from './networkService';

// Finance scopes
const FINANCE_SCOPE = {
  PERSONAL: 'personal',
  NUCLEAR: 'nuclear',
  EXTENDED: 'extended'
};

const financeService = {
  // Accounts
  async getAccounts(userId, scope) {
    try {
      // Try to get from cache first if offline
      if (!networkService.isOnline()) {
        const cachedData = await offlineStorageService.getItem(`finance_accounts_${scope}`);
        if (cachedData) return JSON.parse(cachedData);
      }
      
      let accountsQuery;
      
      switch (scope) {
        case FINANCE_SCOPE.PERSONAL:
          accountsQuery = query(
            collection(db, 'finance_accounts'),
            where('owner', '==', userId),
            where('scope', '==', FINANCE_SCOPE.PERSONAL)
          );
          break;
        case FINANCE_SCOPE.NUCLEAR:
          accountsQuery = query(
            collection(db, 'finance_accounts'),
            where('scope', '==', FINANCE_SCOPE.NUCLEAR),
            where('sharedWith', 'array-contains', userId)
          );
          break;
        case FINANCE_SCOPE.EXTENDED:
          accountsQuery = query(
            collection(db, 'finance_accounts'),
            where('scope', '==', FINANCE_SCOPE.EXTENDED),
            where('sharedWith', 'array-contains', userId)
          );
          break;
        default:
          throw new Error('Invalid scope');
      }
      
      const querySnapshot = await getDocs(accountsQuery);
      const accounts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Cache the result
      await offlineStorageService.setItem(`finance_accounts_${scope}`, JSON.stringify(accounts));
      
      return accounts;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  },
  
  async createAccount(accountData) {
    try {
      // Check if online or offline
      if (!networkService.isOnline()) {
        // Handle offline creation
        console.log('Creating account offline...');
        
        // Generate a temporary ID
        const tempId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Store in offline storage
        const offlineAccounts = JSON.parse(await offlineStorageService.getItem('finance_accounts_offline') || '[]');
        
        const offlineAccount = {
          ...accountData,
          id: tempId,
          _offlineId: tempId,
          _offlineAction: 'create',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await offlineStorageService.setItem(
          'finance_accounts_offline', 
          JSON.stringify([...offlineAccounts, offlineAccount])
        );
        
        // Also add to cached accounts
        const cachedAccounts = JSON.parse(await offlineStorageService.getItem(`finance_accounts_${accountData.scope}`) || '[]');
        await offlineStorageService.setItem(
          `finance_accounts_${accountData.scope}`,
          JSON.stringify([...cachedAccounts, offlineAccount])
        );
        
        return offlineAccount;
      }
      
      // Online creation
      const accountRef = collection(db, 'finance_accounts');
      const docRef = await addDoc(accountRef, {
        ...accountData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...accountData
      };
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  },
  
  async updateAccount(accountId, accountData) {
    try {
      // Check if online or offline
      if (!networkService.isOnline()) {
        // Handle offline update
        console.log('Updating account offline...');
        
        // Store in offline storage
        const offlineAccounts = JSON.parse(await offlineStorageService.getItem('finance_accounts_offline') || '[]');
        
        // Check if this account is already in offline storage
        const existingIndex = offlineAccounts.findIndex(a => a.id === accountId);
        
        const offlineAccount = {
          ...accountData,
          id: accountId,
          _offlineAction: 'update',
          updatedAt: new Date()
        };
        
        if (existingIndex !== -1) {
          // Update existing entry
          offlineAccounts[existingIndex] = offlineAccount;
        } else {
          // Add new entry
          offlineAccounts.push(offlineAccount);
        }
        
        await offlineStorageService.setItem(
          'finance_accounts_offline', 
          JSON.stringify(offlineAccounts)
        );
        
        // Also update cached accounts
        const cachedAccounts = JSON.parse(await offlineStorageService.getItem(`finance_accounts_${accountData.scope}`) || '[]');
        const cacheIndex = cachedAccounts.findIndex(a => a.id === accountId);
        
        if (cacheIndex !== -1) {
          cachedAccounts[cacheIndex] = {
            ...cachedAccounts[cacheIndex],
            ...accountData,
            updatedAt: new Date()
          };
          
          await offlineStorageService.setItem(
            `finance_accounts_${accountData.scope}`,
            JSON.stringify(cachedAccounts)
          );
        }
        
        return true;
      }
      
      // Online update
      const accountRef = doc(db, 'finance_accounts', accountId);
      await updateDoc(accountRef, {
        ...accountData,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  },
  
  async deleteAccount(accountId) {
    try {
      // Check if online or offline
      if (!networkService.isOnline()) {
        // Handle offline deletion
        console.log('Deleting account offline...');
        
        // Store in offline storage
        const offlineAccounts = JSON.parse(await offlineStorageService.getItem('finance_accounts_offline') || '[]');
        
        // Check if this is an offline-created account
        const existingIndex = offlineAccounts.findIndex(a => a.id === accountId && a._offlineAction === 'create');
        
        if (existingIndex !== -1) {
          // This was created offline and not synced yet, just remove it
          offlineAccounts.splice(existingIndex, 1);
        } else {
          // Add deletion marker
          offlineAccounts.push({
            id: accountId,
            _offlineAction: 'delete',
            updatedAt: new Date()
          });
        }
        
        await offlineStorageService.setItem(
          'finance_accounts_offline', 
          JSON.stringify(offlineAccounts)
        );
        
        // Also remove from cached accounts
        const scopes = [FINANCE_SCOPE.PERSONAL, FINANCE_SCOPE.NUCLEAR, FINANCE_SCOPE.EXTENDED];
        
        for (const scope of scopes) {
          const cachedAccounts = JSON.parse(await offlineStorageService.getItem(`finance_accounts_${scope}`) || '[]');
          const filteredAccounts = cachedAccounts.filter(a => a.id !== accountId);
          
          if (filteredAccounts.length !== cachedAccounts.length) {
            await offlineStorageService.setItem(
              `finance_accounts_${scope}`,
              JSON.stringify(filteredAccounts)
            );
          }
        }
        
        return true;
      }
      
      // Online deletion
      const accountRef = doc(db, 'finance_accounts', accountId);
      await deleteDoc(accountRef);
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },
  
  // Transactions
  async getTransactions(accountIds, startDate = null, endDate = null, category = null) {
    try {
      // Check if we have an array of account IDs
      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        throw new Error('Invalid account IDs');
      }
      
      // Try to get from cache first if offline
      if (!networkService.isOnline()) {
        const cachedData = await offlineStorageService.getItem('finance_transactions');
        if (cachedData) {
          const allTransactions = JSON.parse(cachedData);
          
          // Filter based on parameters
          return allTransactions.filter(transaction => {
            const inAccounts = accountIds.includes(transaction.accountId);
            const transactionDate = new Date(transaction.date);
            
            let inDateRange = true;
            if (startDate && endDate) {
              inDateRange = transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
            }
            
            let matchesCategory = true;
            if (category) {
              matchesCategory = transaction.category === category;
            }
            
            return inAccounts && inDateRange && matchesCategory;
          });
        }
      }
      
      // Base query
      let transactionsQuery = query(
        collection(db, 'finance_transactions'),
        where('accountId', 'in', accountIds),
        orderBy('date', 'desc')
      );
      
      // Add date filters if provided
      if (startDate && endDate) {
        transactionsQuery = query(
          transactionsQuery,
          where('date', '>=', new Date(startDate)),
          where('date', '<=', new Date(endDate))
        );
      }
      
      // Add category filter if provided
      if (category) {
        transactionsQuery = query(
          transactionsQuery,
          where('category', '==', category)
        );
      }
      
      const querySnapshot = await getDocs(transactionsQuery);
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Cache the results
      const existingCache = await offlineStorageService.getItem('finance_transactions') || '[]';
      const existingTransactions = JSON.parse(existingCache);
      
      // Merge and deduplicate
      const allTransactionIds = new Set(existingTransactions.map(t => t.id));
      const newTransactions = transactions.filter(t => !allTransactionIds.has(t.id));
      
      await offlineStorageService.setItem(
        'finance_transactions',
        JSON.stringify([...existingTransactions, ...newTransactions])
      );
      
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },
  
  async createTransaction(transactionData) {
    try {
      // Check if online or offline
      if (!networkService.isOnline()) {
        // Handle offline creation
        console.log('Creating transaction offline...');
        
        // Generate a temporary ID
        const tempId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Store in offline storage
        const offlineTransactions = JSON.parse(await offlineStorageService.getItem('finance_transactions_offline') || '[]');
        
        const offlineTransaction = {
          ...transactionData,
          id: tempId,
          _offlineId: tempId,
          _offlineAction: 'create',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await offlineStorageService.setItem(
          'finance_transactions_offline', 
          JSON.stringify([...offlineTransactions, offlineTransaction])
        );
        
        // Also add to cached transactions
        const cachedTransactions = JSON.parse(await offlineStorageService.getItem('finance_transactions') || '[]');
        await offlineStorageService.setItem(
          'finance_transactions',
          JSON.stringify([...cachedTransactions, offlineTransaction])
        );
        
        // Update account balance in cache
        try {
          // Get the account from cache
          const accountScopes = [FINANCE_SCOPE.PERSONAL, FINANCE_SCOPE.NUCLEAR, FINANCE_SCOPE.EXTENDED];
          let accountData = null;
          let accountScope = null;
          
          for (const scope of accountScopes) {
            const cachedAccounts = JSON.parse(await offlineStorageService.getItem(`finance_accounts_${scope}`) || '[]');
            const account = cachedAccounts.find(a => a.id === transactionData.accountId);
            
            if (account) {
              accountData = account;
              accountScope = scope;
              break;
            }
          }
          
          if (accountData && accountScope) {
            // Update the account balance
            let newBalance = accountData.balance;
            
            if (transactionData.type === 'income') {
              newBalance += parseFloat(transactionData.amount);
            } else if (transactionData.type === 'expense') {
              newBalance -= parseFloat(transactionData.amount);
            }
            
            // Save updated balance
            const cachedAccounts = JSON.parse(await offlineStorageService.getItem(`finance_accounts_${accountScope}`) || '[]');
            const updatedAccounts = cachedAccounts.map(acc => {
              if (acc.id === accountData.id) {
                return {
                  ...acc,
                  balance: newBalance,
                  updatedAt: new Date()
                };
              }
              return acc;
            });
            
            await offlineStorageService.setItem(
              `finance_accounts_${accountScope}`,
              JSON.stringify(updatedAccounts)
            );
            
            // Also update in offline accounts
            const offlineAccounts = JSON.parse(await offlineStorageService.getItem('finance_accounts_offline') || '[]');
            const existingIndex = offlineAccounts.findIndex(a => a.id === accountData.id);
            
            if (existingIndex !== -1) {
              offlineAccounts[existingIndex].balance = newBalance;
              offlineAccounts[existingIndex].updatedAt = new Date();
            } else {
              offlineAccounts.push({
                ...accountData,
                balance: newBalance,
                _offlineAction: 'update',
                updatedAt: new Date()
              });
            }
            
            await offlineStorageService.setItem(
              'finance_accounts_offline',
              JSON.stringify(offlineAccounts)
            );
          }
        } catch (err) {
          console.error('Error updating account balance in cache:', err);
        }
        
        return offlineTransaction;
      }
      
      // Online creation
      // Create the transaction
      const transactionRef = collection(db, 'finance_transactions');
      const docRef = await addDoc(transactionRef, {
        ...transactionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
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
      }
      
      return {
        id: docRef.id,
        ...transactionData
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  },
  
  // Projects
  async getProjects(userId, scope) {
    try {
      // Try to get from cache first if offline
      if (!networkService.isOnline()) {
        const cachedData = await offlineStorageService.getItem(`finance_projects_${scope}`);
        if (cachedData) return JSON.parse(cachedData);
      }
      
      // Only nuclear and extended family have projects
      if (scope === FINANCE_SCOPE.PERSONAL) {
        return [];
      }
      
      const projectsQuery = query(
        collection(db, 'finance_projects'),
        where('scope', '==', scope),
        where('contributors', 'array-contains', { userId })
      );
      
      const querySnapshot = await getDocs(projectsQuery);
      const projects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Cache the result
      await offlineStorageService.setItem(`finance_projects_${scope}`, JSON.stringify(projects));
      
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },
  
  async createProject(projectData) {
    try {
      const projectRef = collection(db, 'finance_projects');
      const docRef = await addDoc(projectRef, {
        ...projectData,
        currentAmount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...projectData
      };
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },
  
  async contributeToProject(projectId, userId, amount) {
    try {
      // Get the project
      const projectRef = doc(db, 'finance_projects', projectId);
      const projectSnapshot = await getDoc(projectRef);
      
      if (!projectSnapshot.exists()) {
        throw new Error('Project not found');
      }
      
      const projectData = projectSnapshot.data();
      
      // Find the contributor
      const contributorIndex = projectData.contributors.findIndex(c => c.userId === userId);
      
      if (contributorIndex === -1) {
        throw new Error('User is not a contributor to this project');
      }
      
      // Update the contributor's amount
      const updatedContributors = [...projectData.contributors];
      updatedContributors[contributorIndex] = {
        ...updatedContributors[contributorIndex],
        contributionAmount: (updatedContributors[contributorIndex].contributionAmount || 0) + parseFloat(amount),
        lastContribution: serverTimestamp()
      };
      
      // Update the project's total amount
      const newAmount = (projectData.currentAmount || 0) + parseFloat(amount);
      
      // Update the project
      await updateDoc(projectRef, {
        contributors: updatedContributors,
        currentAmount: newAmount,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        newAmount,
        contributorAmount: updatedContributors[contributorIndex].contributionAmount
      };
    } catch (error) {
      console.error('Error contributing to project:', error);
      throw error;
    }
  },
  
  // Loans
  async getLoans(userId) {
    try {
      // Try to get from cache first if offline
      if (!networkService.isOnline()) {
        const cachedData = await offlineStorageService.getItem('finance_loans');
        if (cachedData) return JSON.parse(cachedData);
      }
      
      const loansQuery = query(
        collection(db, 'finance_loans'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(loansQuery);
      const loans = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Cache the result
      await offlineStorageService.setItem('finance_loans', JSON.stringify(loans));
      
      return loans;
    } catch (error) {
      console.error('Error fetching loans:', error);
      throw error;
    }
  },
  
  async createLoan(loanData) {
    try {
      const loanRef = collection(db, 'finance_loans');
      const docRef = await addDoc(loanRef, {
        ...loanData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...loanData
      };
    } catch (error) {
      console.error('Error creating loan:', error);
      throw error;
    }
  },
  
  async updateLoanPayment(loanId, paymentIndex, paymentData) {
    try {
      // Get the loan
      const loanRef = doc(db, 'finance_loans', loanId);
      const loanSnapshot = await getDoc(loanRef);
      
      if (!loanSnapshot.exists()) {
        throw new Error('Loan not found');
      }
      
      const loanData = loanSnapshot.data();
      
      // Update the payment schedule
      const updatedSchedule = [...loanData.paymentSchedule];
      
      if (paymentIndex < 0 || paymentIndex >= updatedSchedule.length) {
        throw new Error('Invalid payment index');
      }
      
      updatedSchedule[paymentIndex] = {
        ...updatedSchedule[paymentIndex],
        ...paymentData
      };
      
      // Check if all payments are completed
      const allPaid = updatedSchedule.every(payment => payment.status === 'paid');
      
      // Update the loan
      await updateDoc(loanRef, {
        paymentSchedule: updatedSchedule,
        status: allPaid ? 'paid' : 'active',
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        newStatus: allPaid ? 'paid' : 'active'
      };
    } catch (error) {
      console.error('Error updating loan payment:', error);
      throw error;
    }
  },
  
  // Welfare accounts
  async getWelfareAccounts(userId) {
    try {
      // Try to get from cache first if offline
      if (!networkService.isOnline()) {
        const cachedData = await offlineStorageService.getItem('finance_welfare_accounts');
        if (cachedData) return JSON.parse(cachedData);
      }
      
      const welfareQuery = query(
        collection(db, 'finance_welfare_accounts'),
        where('members', 'array-contains', { userId })
      );
      
      const querySnapshot = await getDocs(welfareQuery);
      const welfareAccounts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Cache the result
      await offlineStorageService.setItem('finance_welfare_accounts', JSON.stringify(welfareAccounts));
      
      return welfareAccounts;
    } catch (error) {
      console.error('Error fetching welfare accounts:', error);
      throw error;
    }
  },
  
  async createWelfareAccount(welfareData) {
    try {
      const welfareRef = collection(db, 'finance_welfare_accounts');
      const docRef = await addDoc(welfareRef, {
        ...welfareData,
        balance: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...welfareData
      };
    } catch (error) {
      console.error('Error creating welfare account:', error);
      throw error;
    }
  },
  
  async contributeToWelfare(welfareId, userId, amount, month) {
    try {
      // Check if online or offline
      if (!networkService.isOnline()) {
        // Handle offline contribution
        console.log('Contributing to welfare account offline...');
        
        // Store in offline storage
        const offlineContributions = JSON.parse(await offlineStorageService.getItem('finance_welfare_contributions_offline') || '[]');
        
        const offlineContribution = {
          welfareId,
          userId,
          amount: parseFloat(amount),
          month,
          _offlineAction: 'create',
          createdAt: new Date()
        };
        
        await offlineStorageService.setItem(
          'finance_welfare_contributions_offline', 
          JSON.stringify([...offlineContributions, offlineContribution])
        );
        
        // Update welfare account in cache
        try {
          const cachedWelfareAccounts = JSON.parse(await offlineStorageService.getItem('finance_welfare_accounts') || '[]');
          const welfareIndex = cachedWelfareAccounts.findIndex(w => w.id === welfareId);
          
          if (welfareIndex !== -1) {
            const welfareAccount = cachedWelfareAccounts[welfareIndex];
            
            // Update balance
            welfareAccount.balance = (welfareAccount.balance || 0) + parseFloat(amount);
            
            // Update member contribution history
            const memberIndex = welfareAccount.members.findIndex(m => m.userId === userId);
            
            if (memberIndex !== -1) {
              if (!welfareAccount.members[memberIndex].contributionHistory) {
                welfareAccount.members[memberIndex].contributionHistory = [];
              }
              
              const contributionIndex = welfareAccount.members[memberIndex].contributionHistory.findIndex(c => c.month === month);
              
              if (contributionIndex !== -1) {
                welfareAccount.members[memberIndex].contributionHistory[contributionIndex] = {
                  ...welfareAccount.members[memberIndex].contributionHistory[contributionIndex],
                  paid: true,
                  amount: parseFloat(amount),
                  date: new Date()
                };
              } else {
                welfareAccount.members[memberIndex].contributionHistory.push({
                  month,
                  paid: true,
                  amount: parseFloat(amount),
                  date: new Date()
                });
              }
            }
            
            welfareAccount.updatedAt = new Date();
            
            // Save updated welfare account
            cachedWelfareAccounts[welfareIndex] = welfareAccount;
            await offlineStorageService.setItem(
              'finance_welfare_accounts',
              JSON.stringify(cachedWelfareAccounts)
            );
          }
        } catch (err) {
          console.error('Error updating welfare account in cache:', err);
        }
        
        return {
          success: true,
          newBalance: null // Can't know the exact balance without the server
        };
      }
      
      // Online contribution
      // Get the welfare account
      const welfareRef = doc(db, 'finance_welfare_accounts', welfareId);
      const welfareSnapshot = await getDoc(welfareRef);
      
      if (!welfareSnapshot.exists()) {
        throw new Error('Welfare account not found');
      }
      
      const welfareData = welfareSnapshot.data();
      
      // Find the member
      const memberIndex = welfareData.members.findIndex(m => m.userId === userId);
      
      if (memberIndex === -1) {
        throw new Error('User is not a member of this welfare account');
      }
      
      // Update the member's contribution history
      const updatedMembers = [...welfareData.members];
      const memberData = { ...updatedMembers[memberIndex] };
      
      if (!memberData.contributionHistory) {
        memberData.contributionHistory = [];
      }
      
      const contributionIndex = memberData.contributionHistory.findIndex(c => c.month === month);
      
      if (contributionIndex !== -1) {
        // Update existing contribution
        memberData.contributionHistory[contributionIndex] = {
          ...memberData.contributionHistory[contributionIndex],
          paid: true,
          amount: parseFloat(amount),
          date: serverTimestamp()
        };
      } else {
        // Add new contribution
        memberData.contributionHistory.push({
          month,
          paid: true,
          amount: parseFloat(amount),
          date: serverTimestamp()
        });
      }
      
      updatedMembers[memberIndex] = memberData;
      
      // Update the welfare account's balance
      const newBalance = (welfareData.balance || 0) + parseFloat(amount);
      
      // Update the welfare account
      await updateDoc(welfareRef, {
        members: updatedMembers,
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        newBalance
      };
    } catch (error) {
      console.error('Error contributing to welfare account:', error);
      throw error;
    }
  },
  
  async updateWelfareAccount(welfareId, welfareData) {
    try {
      const welfareRef = doc(db, 'finance_welfare_accounts', welfareId);
      await updateDoc(welfareRef, {
        ...welfareData,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating welfare account:', error);
      throw error;
    }
  },
  
  // Financial reporting
  async generateFinancialReport(userId, startDate, endDate, accountIds = [], type = 'all') {
    try {
      // Get transactions for the specified accounts and date range
      let transactions = [];
      
      if (accountIds.length > 0) {
        transactions = await this.getTransactions(accountIds, startDate, endDate);
      } else {
        // Get all accounts for the user
        const personalAccounts = await this.getAccounts(userId, FINANCE_SCOPE.PERSONAL);
        const nuclearAccounts = await this.getAccounts(userId, FINANCE_SCOPE.NUCLEAR);
        const extendedAccounts = await this.getAccounts(userId, FINANCE_SCOPE.EXTENDED);
        
        const allAccountIds = [
          ...personalAccounts.map(a => a.id),
          ...nuclearAccounts.map(a => a.id),
          ...extendedAccounts.map(a => a.id)
        ];
        
        if (allAccountIds.length > 0) {
          transactions = await this.getTransactions(allAccountIds, startDate, endDate);
        }
      }
      
      // Filter by type if specified
      if (type !== 'all') {
        transactions = transactions.filter(t => t.type === type);
      }
      
      // Calculate totals
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
      const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
      // Group by category
      const incomeByCategory = {};
      const expenseByCategory = {};
      
      transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          const category = transaction.category || 'Uncategorized';
          incomeByCategory[category] = (incomeByCategory[category] || 0) + parseFloat(transaction.amount || 0);
        } else if (transaction.type === 'expense') {
          const category = transaction.category || 'Uncategorized';
          expenseByCategory[category] = (expenseByCategory[category] || 0) + parseFloat(transaction.amount || 0);
        }
      });
      
      // Group by day for time series
      const transactionsByDate = {};
      
      transactions.forEach(transaction => {
        const date = transaction.date.toDate ? 
          transaction.date.toDate().toISOString().split('T')[0] : 
          new Date(transaction.date).toISOString().split('T')[0];
        
        if (!transactionsByDate[date]) {
          transactionsByDate[date] = {
            income: 0,
            expense: 0
          };
        }
        
        if (transaction.type === 'income') {
          transactionsByDate[date].income += parseFloat(transaction.amount || 0);
        } else if (transaction.type === 'expense') {
          transactionsByDate[date].expense += parseFloat(transaction.amount || 0);
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
        transactionsByDate,
        transactions
      };
    } catch (error) {
      console.error('Error generating financial report:', error);
      throw error;
    }
  },
  
  // Data synchronization for offline support
  async syncOfflineData() {
    try {
      // Check if we're back online
      if (!networkService.isOnline()) {
        console.log('Still offline, cannot sync data');
        return false;
      }
      
      console.log('Starting finance data synchronization...');
      
      // Sync accounts
      const offlineAccounts = JSON.parse(await offlineStorageService.getItem('finance_accounts_offline') || '[]');
      for (const account of offlineAccounts) {
        if (account._offlineAction === 'create') {
          // Create account online
          delete account._offlineAction;
          delete account._offlineId;
          await this.createAccount(account);
        } else if (account._offlineAction === 'update') {
          // Update account online
          const accountId = account.id;
          delete account._offlineAction;
          delete account._offlineId;
          delete account.id;
          await this.updateAccount(accountId, account);
        } else if (account._offlineAction === 'delete') {
          // Delete account online
          await this.deleteAccount(account.id);
        }
      }
      
      // Clear offline accounts
      await offlineStorageService.setItem('finance_accounts_offline', '[]');
      
      // Sync transactions
      const offlineTransactions = JSON.parse(await offlineStorageService.getItem('finance_transactions_offline') || '[]');
      for (const transaction of offlineTransactions) {
        if (transaction._offlineAction === 'create') {
          // Create transaction online
          delete transaction._offlineAction;
          delete transaction._offlineId;
          await this.createTransaction(transaction);
        } else if (transaction._offlineAction === 'update') {
          // Transaction updates are not implemented yet
          console.log('Transaction update not implemented');
        } else if (transaction._offlineAction === 'delete') {
          // Transaction deletion is not implemented yet
          console.log('Transaction deletion not implemented');
        }
      }
      
      // Clear offline transactions
      await offlineStorageService.setItem('finance_transactions_offline', '[]');
      
      // Sync welfare contributions
      const offlineContributions = JSON.parse(await offlineStorageService.getItem('finance_welfare_contributions_offline') || '[]');
      for (const contribution of offlineContributions) {
        if (contribution._offlineAction === 'create') {
          // Contribute to welfare online
          delete contribution._offlineAction;
          await this.contributeToWelfare(
            contribution.welfareId,
            contribution.userId,
            contribution.amount,
            contribution.month
          );
        }
      }
      
      // Clear offline contributions
      await offlineStorageService.setItem('finance_welfare_contributions_offline', '[]');
      
      console.log('Finance data synchronization completed successfully');
      return true;
    } catch (error) {
      console.error('Error syncing offline finance data:', error);
      return false;
    }
  }
};

export default financeService;
