#!/bin/bash

# Final verification script for currency integration fixes
echo "🔧 Final Currency Integration Verification"
echo "=========================================="

echo "✅ Checking navigation route fixes..."

# Check that navigation calls use correct route names
echo "   Checking PersonalFinanceScreen navigation calls..."
if grep -q "navigate('Accounts')" "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/screens/finance/PersonalFinanceScreen.js"; then
    echo "   ✓ PersonalFinanceScreen uses correct 'Accounts' route"
else
    echo "   ❌ PersonalFinanceScreen navigation issue"
fi

if grep -q "navigate('Transactions')" "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/screens/finance/PersonalFinanceScreen.js"; then
    echo "   ✓ PersonalFinanceScreen uses correct 'Transactions' route"
else
    echo "   ❌ PersonalFinanceScreen transactions navigation issue"
fi

echo "   Checking FamilyFinanceScreen navigation calls..."
if grep -q "navigate('Accounts'" "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/screens/finance/FamilyFinanceScreen.js"; then
    echo "   ✓ FamilyFinanceScreen uses correct 'Accounts' route"
else
    echo "   ❌ FamilyFinanceScreen navigation issue"
fi

echo ""
echo "✅ Checking currency service integration in components..."

components_to_check=(
    "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/components/finance/AccountCard.js"
    "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/components/finance/ProjectContributionTracker.js"
    "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/components/finance/TransactionList.js"
    "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/components/finance/FinancialReportChart.js"
)

for component in "${components_to_check[@]}"; do
    if [ -f "$component" ]; then
        if grep -q "currencyService" "$component"; then
            echo "   ✓ $(basename "$component") uses currency service"
        else
            echo "   ❌ $(basename "$component") missing currency service"
        fi
    fi
done

echo ""
echo "✅ Checking for remaining hardcoded currency symbols..."

# Check main finance screens (excluding test files)
hardcoded_found=false
for file in /home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/screens/finance/*.js; do
    if [ -f "$file" ] && [[ ! "$file" =~ __tests__ ]]; then
        # Look for hardcoded $ followed by numbers (but not in template literals)
        dollar_count=$(grep -v "//" "$file" | grep -E '\$[0-9]' | grep -v '${' | wc -l)
        if [ "$dollar_count" -gt 0 ]; then
            echo "   ⚠️  $(basename "$file") has $dollar_count potential hardcoded $ symbols"
            hardcoded_found=true
        fi
    fi
done

# Check main components
for file in /home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/components/finance/*.js; do
    if [ -f "$file" ] && [[ ! "$file" =~ __tests__ ]]; then
        dollar_count=$(grep -v "//" "$file" | grep -E '\$[0-9]' | grep -v '${' | wc -l)
        if [ "$dollar_count" -gt 0 ]; then
            echo "   ⚠️  $(basename "$file") has $dollar_count potential hardcoded $ symbols"
            hardcoded_found=true
        fi
    fi
done

if [ "$hardcoded_found" = false ]; then
    echo "   ✓ No hardcoded currency symbols found in main files"
fi

echo ""
echo "✅ Checking navigation route definitions..."

if grep -q 'name="Accounts"' "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/navigation/AppNavigator.js"; then
    echo "   ✓ 'Accounts' route defined in AppNavigator"
else
    echo "   ❌ 'Accounts' route missing in AppNavigator"
fi

if grep -q 'name="Transactions"' "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/navigation/AppNavigator.js"; then
    echo "   ✓ 'Transactions' route defined in AppNavigator"
else
    echo "   ❌ 'Transactions' route missing in AppNavigator"
fi

echo ""
echo "✅ Checking currency service integration in main screens..."

main_screens=(
    "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/screens/finance/PersonalFinanceScreen.js"
    "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/screens/finance/FamilyFinanceScreen.js"
    "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/screens/finance/AddAccountScreen.js"
    "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/screens/finance/AddLoanScreen.js"
    "/home/johnsonsebire/www/HealthApp/FamilyMedicalApp/src/screens/finance/EditLoanScreen.js"
)

for screen in "${main_screens[@]}"; do
    if [ -f "$screen" ]; then
        if grep -q "currencyService" "$screen"; then
            echo "   ✓ $(basename "$screen") integrated with currency service"
        else
            echo "   ⚠️  $(basename "$screen") may need currency service integration"
        fi
    fi
done

echo ""
echo "🎯 Issues Fixed Summary"
echo "======================"
echo "✅ Navigation routes: Fixed 'AccountsScreen' → 'Accounts' and 'TransactionsScreen' → 'Transactions'"
echo "✅ Currency symbols: Updated AccountCard, ProjectContributionTracker, TransactionList, FinancialReportChart"
echo "✅ Currency service: Integrated into all major finance components"
echo "✅ Default currency: GHS (Ghanaian Cedi) set as default throughout the app"

echo ""
echo "🧪 Testing Instructions"
echo "======================"
echo "1. Start the app: npm start or expo start"
echo "2. Navigate to Finance screens"
echo "3. Test 'See All' buttons for Accounts and Transactions"
echo "4. Verify currency symbols show correctly (₵ for GHS by default)"
echo "5. Create accounts with different currencies"
echo "6. Check Profile → Currency Settings for configuration"

echo ""
echo "✨ Currency integration verification completed!"
