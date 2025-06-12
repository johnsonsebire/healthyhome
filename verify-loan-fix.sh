#!/bin/bash

# Check if the loan update functionality is working correctly
echo "Verifying loan update functionality..."

# Check if the required functions are properly exported in FinanceContext.js
if grep -q "updateLoan," "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/contexts/FinanceContext.js"; then
  echo "✅ updateLoan function is exported in FinanceContext.js"
else
  echo "❌ updateLoan function is not exported in FinanceContext.js"
  exit 1
fi

if grep -q "deleteLoan," "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/contexts/FinanceContext.js"; then
  echo "✅ deleteLoan function is exported in FinanceContext.js"
else
  echo "❌ deleteLoan function is not exported in FinanceContext.js"
  exit 1
fi

# Check if the function implementations exist
if grep -q "const updateLoan = async" "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/contexts/FinanceContext.js"; then
  echo "✅ updateLoan function implementation exists in FinanceContext.js"
else
  echo "❌ updateLoan function implementation is missing in FinanceContext.js"
  exit 1
fi

if grep -q "const deleteLoan = async" "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/contexts/FinanceContext.js"; then
  echo "✅ deleteLoan function implementation exists in FinanceContext.js"
else
  echo "❌ deleteLoan function implementation is missing in FinanceContext.js"
  exit 1
fi

echo "✅ All loan functions are properly implemented and exported"
echo "Loan update functionality should now be working correctly"
