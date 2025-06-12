// Script to verify and fix transaction display issues
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} = require('firebase/firestore');

// Import your Firebase config
const firebaseConfig = require('./firebaseConfig');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to log with timestamp
const log = (message) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
};

// Function to recalculate account balance
const recalculateAccountBalance = async (accountId) => {
  try {
    log(`Recalculating balance for account ${accountId}`);
    
    // Get the account
    const accountRef = doc(db, 'finance_accounts', accountId);
    const accountSnapshot = await getDoc(accountRef);
    
    if (!accountSnapshot.exists()) {
      log(`ERROR: Account not found: ${accountId}`);
      return false;
    }
    
    const accountData = accountSnapshot.data();
    
    // Get the initial balance with enhanced error handling
    let initialBalance = 0;
    try {
      initialBalance = typeof accountData.initialBalance === 'number' 
        ? accountData.initialBalance 
        : parseFloat(accountData.initialBalance || 0);
      
      if (isNaN(initialBalance)) {
        log(`WARNING: Invalid initial balance for account ${accountId}, using 0 instead`);
        initialBalance = 0;
      }
    } catch (error) {
      log(`ERROR: Error parsing initial balance for account ${accountId}: ${error.message}`);
      initialBalance = 0;
    }
    
    log(`Initial balance: ${initialBalance}`);
    
    // Get all transactions for this account
    const transactionsQuery = query(
      collection(db, 'finance_transactions'),
      where('accountId', '==', accountId)
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    log(`Found ${transactionsSnapshot.size} transactions for account ${accountId}`);
    
    // Calculate the new balance based on all transactions
    let newBalance = initialBalance;
    let incomeTotal = 0;
    let expenseTotal = 0;
    
    // Process each transaction with enhanced error handling
    transactionsSnapshot.forEach(doc => {
      try {
        const transaction = doc.data();
        if (!transaction) {
          log(`WARNING: Empty transaction data for document ${doc.id}, skipping`);
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
            log(`WARNING: Invalid amount in transaction ${doc.id}: ${transaction.amount}, using 0 instead`);
            transactionAmount = 0;
          }
          
          // Round to prevent floating point errors
          transactionAmount = Math.round(transactionAmount * 100) / 100;
        } catch (error) {
          log(`ERROR: Error parsing amount for transaction ${doc.id}: ${error.message}`);
          transactionAmount = 0;
        }
        
        // Process based on transaction type
        if (transaction.type === 'income') {
          newBalance += transactionAmount;
          incomeTotal += transactionAmount;
          log(`Income transaction ${doc.id}: +${transactionAmount}`);
        } else if (transaction.type === 'expense') {
          newBalance -= transactionAmount;
          expenseTotal += transactionAmount;
          log(`Expense transaction ${doc.id}: -${transactionAmount}`);
        } else {
          log(`WARNING: Unknown transaction type in ${doc.id}: ${transaction.type}, skipping`);
        }
      } catch (error) {
        log(`ERROR: Error processing transaction ${doc.id}: ${error.message}`);
      }
    });
    
    // Round to 2 decimal places to avoid floating point issues
    newBalance = Math.round(newBalance * 100) / 100;
    
    log(`Recalculation summary for account ${accountId}:`);
    log(`- Initial balance: ${initialBalance}`);
    log(`- Income total: ${incomeTotal}`);
    log(`- Expense total: ${expenseTotal}`);
    log(`- New balance: ${newBalance} (previous: ${accountData.balance || 0})`);
    
    // Update the account with the recalculated balance
    await updateDoc(accountRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });
    
    log(`Updated account ${accountId} with new balance: ${newBalance}`);
    
    return true;
  } catch (err) {
    log(`ERROR: Error recalculating account balance: ${err.message}`);
    return false;
  }
};

// Function to verify and display all accounts and their transactions
const verifyAccountsAndTransactions = async () => {
  try {
    log('Starting verification of accounts and transactions...');
    
    // Get all accounts
    const accountsSnapshot = await getDocs(collection(db, 'finance_accounts'));
    log(`Found ${accountsSnapshot.size} accounts`);
    
    if (accountsSnapshot.empty) {
      log('No accounts found. Please create at least one account first.');
      return;
    }
    
    // Process each account
    for (const accountDoc of accountsSnapshot.docs) {
      const accountId = accountDoc.id;
      const account = accountDoc.data();
      
      log(`\n----- Account: ${account.name} (${accountId}) -----`);
      log(`Type: ${account.type}`);
      log(`Balance: ${account.balance || 0}`);
      log(`Initial Balance: ${account.initialBalance || 0}`);
      log(`Currency: ${account.currency || 'USD'}`);
      
      // Get transactions for this account
      const transactionsQuery = query(
        collection(db, 'finance_transactions'),
        where('accountId', '==', accountId)
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      log(`Found ${transactionsSnapshot.size} transactions for this account`);
      
      // Display transactions
      if (transactionsSnapshot.size > 0) {
        log('\nTransactions:');
        transactionsSnapshot.forEach(transactionDoc => {
          const transaction = transactionDoc.data();
          const amount = parseFloat(transaction.amount) || 0;
          const type = transaction.type || 'unknown';
          const description = transaction.description || 'No description';
          const date = transaction.date ? new Date(transaction.date.seconds * 1000).toLocaleDateString() : 'No date';
          
          log(`- ${transactionDoc.id}: ${type.toUpperCase()} | ${amount} | ${description} | ${date}`);
        });
      }
      
      // Recalculate account balance
      log('\nRecalculating balance...');
      const success = await recalculateAccountBalance(accountId);
      
      if (success) {
        log('✅ Balance recalculated successfully');
      } else {
        log('❌ Failed to recalculate balance');
      }
    }
    
    log('\n✅ Verification and fix completed');
  } catch (error) {
    log(`ERROR: ${error.message}`);
  }
};

// Run the verification
verifyAccountsAndTransactions()
  .then(() => {
    log('Script execution completed');
    process.exit(0);
  })
  .catch(error => {
    log(`ERROR: Unhandled exception: ${error.message}`);
    process.exit(1);
  });
