// Fix initialBalance for accounts that don't have it
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import firebaseConfig from './firebaseConfig';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * This script checks all finance accounts and adds the initialBalance field if it's missing.
 * The initialBalance will be set to the current balance if it's missing.
 */
async function fixInitialBalances() {
  try {
    console.log('Starting to fix initialBalance for accounts...');
    
    // Get all accounts
    const accountsRef = collection(db, 'finance_accounts');
    const querySnapshot = await getDocs(accountsRef);
    
    console.log(`Found ${querySnapshot.size} accounts to check`);
    
    let updatedCount = 0;
    let alreadyFixedCount = 0;
    
    // Process each account
    for (const docSnapshot of querySnapshot.docs) {
      const accountId = docSnapshot.id;
      const accountData = docSnapshot.data();
      
      // Check if initialBalance is missing
      if (accountData.initialBalance === undefined) {
        console.log(`Account ${accountId} (${accountData.name}) is missing initialBalance`);
        
        // Use current balance as initialBalance
        const initialBalance = accountData.balance || 0;
        
        // Update account
        const accountRef = doc(db, 'finance_accounts', accountId);
        await updateDoc(accountRef, {
          initialBalance: initialBalance
        });
        
        console.log(`Updated account ${accountId} with initialBalance: ${initialBalance}`);
        updatedCount++;
      } else {
        console.log(`Account ${accountId} (${accountData.name}) already has initialBalance: ${accountData.initialBalance}`);
        alreadyFixedCount++;
      }
    }
    
    console.log('\nFix Initial Balances Summary:');
    console.log(`Total accounts checked: ${querySnapshot.size}`);
    console.log(`Accounts updated: ${updatedCount}`);
    console.log(`Accounts already fixed: ${alreadyFixedCount}`);
    console.log('Done!');
  } catch (error) {
    console.error('Error fixing initialBalances:', error);
  }
}

// Run the fix
fixInitialBalances().then(() => {
  console.log('Script execution completed.');
  process.exit(0);
}).catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
