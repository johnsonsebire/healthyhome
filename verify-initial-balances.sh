#!/bin/bash

# Verify Initial Balances and Balance Recalculation
# This script verifies that:
# 1. All accounts have initialBalance set
# 2. Balance recalculation works correctly

echo "=============================================="
echo "ACCOUNT INITIAL BALANCE VERIFICATION"
echo "=============================================="

# Run the fix-initial-balances.js script
echo "First, making sure all accounts have initialBalance set..."
npx node fix-initial-balances.js

echo ""
echo "=============================================="
echo "TRANSACTION-ACCOUNT BALANCE VERIFICATION"
echo "=============================================="

# Run the verify-transaction-account-fix.sh script
echo "Verifying balance recalculation..."
./verify-transaction-account-fix.sh

echo ""
echo "=============================================="
echo "VERIFICATION COMPLETE"
echo "=============================================="
echo "All accounts should now have initialBalance set and balance recalculation should work correctly."
echo ""
echo "NEXT STEPS:"
echo "1. Restart your app to see the changes"
echo "2. Edit an account to verify initialBalance appears in the form"
echo "3. Create a new account and check that initialBalance works"
echo "4. Use the 'Recalculate Balance' function on an account to test balance recalculation"
echo "=============================================="
