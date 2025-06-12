#!/bin/zsh

echo "Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo "Verifying the deployed indexes..."
firebase firestore:indexes

echo "Done! The following indexes should now be available:"
echo "1. finance_transactions: accountId ASC, date DESC"
echo "2. finance_accounts: scope ASC, sharedWith ARRAY_CONTAINS"
echo "3. finance_accounts: owner ASC, scope ASC"
