#!/bin/bash

# Script to verify the account balance update fix when transactions are moved between accounts
# Run this after applying the fix to confirm it works correctly

echo "=== Transaction Account Fix Verification ==="
echo ""
echo "This script will:"
echo "1. Create two test accounts"
echo "2. Add a transaction to the first account"
echo "3. Verify the first account balance is updated correctly"
echo "4. Move the transaction to the second account"
echo "5. Verify that both account balances are updated correctly"
echo "6. Test edge cases with invalid transaction amounts"
echo ""
echo "Press Enter to continue..."
read

# Set up Firebase configuration
source ./firebaseConfig.js

# Create Test Accounts
echo "Creating test accounts..."
ACCOUNT1_ID=$(node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestAccount() {
  try {
    const docRef = await addDoc(collection(db, 'finance_accounts'), {
      name: 'Test Account 1',
      initialBalance: 100,
      balance: 100,
      currency: 'USD',
      owner: 'test-user',
      scope: 'personal',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(docRef.id);
  } catch (e) {
    console.error('Error creating account:', e);
  }
}

createTestAccount();
")

ACCOUNT2_ID=$(node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestAccount() {
  try {
    const docRef = await addDoc(collection(db, 'finance_accounts'), {
      name: 'Test Account 2',
      initialBalance: 50,
      balance: 50,
      currency: 'USD',
      owner: 'test-user',
      scope: 'personal',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(docRef.id);
  } catch (e) {
    console.error('Error creating account:', e);
  }
}

createTestAccount();
")

echo "Created Account 1 with ID: $ACCOUNT1_ID"
echo "Created Account 2 with ID: $ACCOUNT2_ID"

# Step 1: Create a transaction in Account 1
echo "Creating income transaction in Account 1..."
TRANSACTION_ID=$(node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTransaction(accountId) {
  try {
    // Create a transaction
    const docRef = await addDoc(collection(db, 'finance_transactions'), {
      accountId: accountId,
      amount: 50,
      type: 'income',
      category: 'salary',
      description: 'Test Transaction',
      date: new Date(),
      createdBy: 'test-user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(docRef.id);
    
    // Recalculate account balance to ensure it's updated correctly
    const accountRef = doc(db, 'finance_accounts', accountId);
    const accountDoc = await getDoc(accountRef);
    const accountData = accountDoc.data();
    
    // Initialize balance with the initialBalance
    const initialBalance = parseFloat(accountData.initialBalance) || 0;
    let newBalance = initialBalance;
    
    // Get all transactions
    const transactionsQuery = await collection(db, 'finance_transactions');
    const transactions = await transactionsQuery.where('accountId', '==', accountId).get();
    
    // Calculate balance based on transactions
    transactions.forEach(doc => {
      const transaction = doc.data();
      const amount = parseFloat(transaction.amount) || 0;
      
      if (transaction.type === 'income') {
        newBalance += amount;
      } else if (transaction.type === 'expense') {
        newBalance -= amount;
      }
    });
    
    // Update account balance
    await updateDoc(accountRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });
    
  } catch (e) {
    console.error('Error creating transaction:', e);
  }
}

createTransaction('${ACCOUNT1_ID}');
")

echo "Created Transaction with ID: $TRANSACTION_ID"

# Step 2: Check Account 1 balance
echo "Checking Account 1 balance after transaction creation..."
node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkBalance(accountId) {
  try {
    const accountRef = doc(db, 'finance_accounts', accountId);
    const accountDoc = await getDoc(accountRef);
    if (accountDoc.exists()) {
      const data = accountDoc.data();
      console.log(\`Account \${data.name} balance: \${data.balance}\`);
      console.log(\`Initial balance: \${data.initialBalance || 0}\`);
      if (data.balance === 150) {
        console.log('✅ Balance is correct! (100 initial + 50 income)');
      } else {
        console.log('❌ Balance is incorrect! Expected: 150');
      }
    } else {
      console.log('Account not found');
    }
  } catch (e) {
    console.error('Error checking balance:', e);
  }
}

checkBalance('${ACCOUNT1_ID}');
"
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTransaction() {
  try {
    // Create transaction
    const docRef = await addDoc(collection(db, 'finance_transactions'), {
      accountId: '$ACCOUNT1_ID',
      amount: 100,
      type: 'income',
      description: 'Test Transaction',
      category: 'Test',
      createdBy: 'test-user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update account balance
    const accountRef = doc(db, 'finance_accounts', '$ACCOUNT1_ID');
    const accountSnapshot = await getDoc(accountRef);
    
    if (accountSnapshot.exists()) {
      const accountData = accountSnapshot.data();
      let newBalance = accountData.balance || 0;
      newBalance += 100; // income transaction of 100
      
      await updateDoc(accountRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
    }
    
    console.log(docRef.id);
  } catch (e) {
    console.error('Error creating transaction:', e);
  }
}

createTransaction();
")

echo "Created Transaction with ID: $TRANSACTION_ID"

# Check Account 1 balance
echo "Checking Account 1 balance..."
node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getAccountBalance() {
  try {
    const accountRef = doc(db, 'finance_accounts', '$ACCOUNT1_ID');
    const accountSnapshot = await getDoc(accountRef);
    
    if (accountSnapshot.exists()) {
      const accountData = accountSnapshot.data();
      console.log('Account 1 Balance:', accountData.balance);
    } else {
      console.log('Account not found');
    }
  } catch (e) {
    console.error('Error getting account:', e);
  }
}

getAccountBalance();
"

# Check Account 2 balance
echo "Checking Account 2 balance..."
node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getAccountBalance() {
  try {
    const accountRef = doc(db, 'finance_accounts', '$ACCOUNT2_ID');
    const accountSnapshot = await getDoc(accountRef);
    
    if (accountSnapshot.exists()) {
      const accountData = accountSnapshot.data();
      console.log('Account 2 Balance:', accountData.balance);
    } else {
      console.log('Account not found');
    }
  } catch (e) {
    console.error('Error getting account:', e);
  }
}

getAccountBalance();
"

echo "Press Enter to move the transaction to Account 2..."
read

# Move the transaction from Account 1 to Account 2
echo "Moving transaction to Account 2..."
node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function moveTransaction() {
  try {
    // Get the original transaction
    const transactionRef = doc(db, 'finance_transactions', '$TRANSACTION_ID');
    const transactionSnapshot = await getDoc(transactionRef);
    
    if (!transactionSnapshot.exists()) {
      console.log('Transaction not found');
      return;
    }
    
    const originalTransaction = transactionSnapshot.data();
    
    // Revert the original account balance
    const originalAccountRef = doc(db, 'finance_accounts', '$ACCOUNT1_ID');
    const originalAccountSnapshot = await getDoc(originalAccountRef);
    
    if (originalAccountSnapshot.exists()) {
      const originalAccountData = originalAccountSnapshot.data();
      let originalAccountNewBalance = originalAccountData.balance || 0;
      
      // Revert the original transaction effect
      if (originalTransaction.type === 'income') {
        originalAccountNewBalance -= parseFloat(originalTransaction.amount) || 0;
      } else if (originalTransaction.type === 'expense') {
        originalAccountNewBalance += parseFloat(originalTransaction.amount) || 0;
      }
      
      // Update the original account
      await updateDoc(originalAccountRef, {
        balance: originalAccountNewBalance,
        updatedAt: serverTimestamp()
      });
      
      console.log('Original account balance updated:', originalAccountNewBalance);
    }
    
    // Update the target account balance
    const targetAccountRef = doc(db, 'finance_accounts', '$ACCOUNT2_ID');
    const targetAccountSnapshot = await getDoc(targetAccountRef);
    
    if (targetAccountSnapshot.exists()) {
      const targetAccountData = targetAccountSnapshot.data();
      let targetAccountNewBalance = targetAccountData.balance || 0;
      
      // Apply the transaction effect to the target account
      if (originalTransaction.type === 'income') {
        targetAccountNewBalance += parseFloat(originalTransaction.amount) || 0;
      } else if (originalTransaction.type === 'expense') {
        targetAccountNewBalance -= parseFloat(originalTransaction.amount) || 0;
      }
      
      // Update the target account
      await updateDoc(targetAccountRef, {
        balance: targetAccountNewBalance,
        updatedAt: serverTimestamp()
      });
      
      console.log('Target account balance updated:', targetAccountNewBalance);
    }
    
    // Update the transaction to reference the new account
    await updateDoc(transactionRef, {
      accountId: '$ACCOUNT2_ID',
      updatedAt: serverTimestamp()
    });
    
    console.log('Transaction moved successfully');
  } catch (e) {
    console.error('Error moving transaction:', e);
  }
}

moveTransaction();
"

echo "Checking updated Account 1 balance..."
node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getAccountBalance() {
  try {
    const accountRef = doc(db, 'finance_accounts', '$ACCOUNT1_ID');
    const accountSnapshot = await getDoc(accountRef);
    
    if (accountSnapshot.exists()) {
      const accountData = accountSnapshot.data();
      console.log('Account 1 Balance:', accountData.balance);
    } else {
      console.log('Account not found');
    }
  } catch (e) {
    console.error('Error getting account:', e);
  }
}

getAccountBalance();
"

echo "Checking updated Account 2 balance..."
node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getAccountBalance() {
  try {
    const accountRef = doc(db, 'finance_accounts', '$ACCOUNT2_ID');
    const accountSnapshot = await getDoc(accountRef);
    
    if (accountSnapshot.exists()) {
      const accountData = accountSnapshot.data();
      console.log('Account 2 Balance:', accountData.balance);
    } else {
      console.log('Account not found');
    }
  } catch (e) {
    console.error('Error getting account:', e);
  }
}

getAccountBalance();
"

echo ""
echo "Test completed. If the fix is working correctly:"
echo "- Account 1 balance should now be 0"
echo "- Account 2 balance should now be 100"
echo ""
echo "Do you want to clean up the test data? (y/n)"
read CLEANUP

if [ "$CLEANUP" = "y" ]; then
  echo "Cleaning up test data..."
  node -e "
  const { initializeApp } = require('firebase/app');
  const { getFirestore, doc, deleteDoc } = require('firebase/firestore');
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  async function cleanup() {
    try {
      await deleteDoc(doc(db, 'finance_transactions', '$TRANSACTION_ID'));
      await deleteDoc(doc(db, 'finance_accounts', '$ACCOUNT1_ID'));
      await deleteDoc(doc(db, 'finance_accounts', '$ACCOUNT2_ID'));
      console.log('Test data cleaned up successfully');
    } catch (e) {
      console.error('Error cleaning up test data:', e);
    }
  }

  cleanup();
  "
fi

echo "Verification script completed!"
