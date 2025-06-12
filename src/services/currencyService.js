import AsyncStorage from '@react-native-async-storage/async-storage';

// Currency Service with exchange rates and conversion
class CurrencyService {
  constructor() {
    this.defaultCurrency = 'GHS'; // Default to Ghanaian Cedi
    this.exchangeRates = {};
    this.lastUpdated = null;
    this.cacheKey = 'currency_exchange_rates';
    this.settingsKey = 'user_currency_settings';
  }

  // Supported currencies with symbols and names
  getSupportedCurrencies() {
    return [
      { 
        code: 'GHS', 
        name: 'Ghanaian Cedi', 
        symbol: '₵',
        flag: '🇬🇭',
        isDefault: true
      },
      { 
        code: 'USD', 
        name: 'US Dollar', 
        symbol: '$',
        flag: '🇺🇸',
        isDefault: false
      },
      { 
        code: 'EUR', 
        name: 'Euro', 
        symbol: '€',
        flag: '🇪🇺',
        isDefault: false
      },
      { 
        code: 'GBP', 
        name: 'British Pound', 
        symbol: '£',
        flag: '🇬🇧',
        isDefault: false
      },
      { 
        code: 'NGN', 
        name: 'Nigerian Naira', 
        symbol: '₦',
        flag: '🇳🇬',
        isDefault: false
      },
      { 
        code: 'JPY', 
        name: 'Japanese Yen', 
        symbol: '¥',
        flag: '🇯🇵',
        isDefault: false
      },
      { 
        code: 'CAD', 
        name: 'Canadian Dollar', 
        symbol: 'C$',
        flag: '🇨🇦',
        isDefault: false
      },
      { 
        code: 'AUD', 
        name: 'Australian Dollar', 
        symbol: 'A$',
        flag: '🇦🇺',
        isDefault: false
      },
      { 
        code: 'ZAR', 
        name: 'South African Rand', 
        symbol: 'R',
        flag: '🇿🇦',
        isDefault: false
      },
      { 
        code: 'KES', 
        name: 'Kenyan Shilling', 
        symbol: 'KSh',
        flag: '🇰🇪',
        isDefault: false
      }
    ];
  }

  // Get currency info by code
  getCurrencyInfo(currencyCode) {
    const currencies = this.getSupportedCurrencies();
    return currencies.find(curr => curr.code === currencyCode) || currencies[0];
  }

  // Initialize exchange rates (mock data for now - in production would fetch from API)
  async initializeExchangeRates() {
    try {
      // Try to load cached rates first
      const cachedRates = await AsyncStorage.getItem(this.cacheKey);
      const cachedData = cachedRates ? JSON.parse(cachedRates) : null;
      
      // Check if cache is less than 1 hour old
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      if (cachedData && cachedData.timestamp > oneHourAgo) {
        this.exchangeRates = cachedData.rates;
        this.lastUpdated = new Date(cachedData.timestamp);
        console.log('Using cached exchange rates');
        return;
      }

      // Fetch fresh rates (mock data - replace with real API in production)
      await this.fetchExchangeRates();
    } catch (error) {
      console.error('Error initializing exchange rates:', error);
      // Fall back to default rates if fetching fails
      this.setDefaultRates();
    }
  }

  // Fetch exchange rates from API (mock implementation)
  async fetchExchangeRates() {
    try {
      // In production, replace this with a real API call
      // For now, using mock data with reasonable exchange rates as of 2024
      const mockRates = {
        // Base currency: GHS (Ghanaian Cedi)
        'GHS': 1.0,
        'USD': 0.085,  // 1 GHS = 0.085 USD (approx 11.8 GHS = 1 USD)
        'EUR': 0.078,  // 1 GHS = 0.078 EUR
        'GBP': 0.067,  // 1 GHS = 0.067 GBP
        'NGN': 70.5,   // 1 GHS = 70.5 NGN
        'JPY': 12.8,   // 1 GHS = 12.8 JPY
        'CAD': 0.115,  // 1 GHS = 0.115 CAD
        'AUD': 0.130,  // 1 GHS = 0.130 AUD
        'ZAR': 1.55,   // 1 GHS = 1.55 ZAR
        'KES': 11.0    // 1 GHS = 11.0 KES
      };

      this.exchangeRates = mockRates;
      this.lastUpdated = new Date();

      // Cache the rates
      const cacheData = {
        rates: mockRates,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log('Exchange rates updated and cached');
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      this.setDefaultRates();
    }
  }

  // Set default exchange rates as fallback
  setDefaultRates() {
    this.exchangeRates = {
      'GHS': 1.0,
      'USD': 0.085,
      'EUR': 0.078,
      'GBP': 0.067,
      'NGN': 70.5,
      'JPY': 12.8,
      'CAD': 0.115,
      'AUD': 0.130,
      'ZAR': 1.55,
      'KES': 11.0
    };
    this.lastUpdated = new Date();
  }

  // Convert amount from one currency to another
  convertCurrency(amount, fromCurrency, toCurrency) {
    if (!amount || amount === 0) return 0;
    if (fromCurrency === toCurrency) return amount;

    const fromRate = this.exchangeRates[fromCurrency];
    const toRate = this.exchangeRates[toCurrency];

    if (!fromRate || !toRate) {
      console.warn(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
      return amount; // Return original amount if rates not available
    }

    // Convert to GHS first (base currency), then to target currency
    const ghsAmount = amount / fromRate;
    const convertedAmount = ghsAmount * toRate;

    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  }

  // Format currency for display
  formatCurrency(amount, currencyCode, options = {}) {
    const {
      showSymbol = true,
      showCode = false,
      minimumFractionDigits = 2,
      maximumFractionDigits = 2
    } = options;

    if (amount == null || isNaN(amount)) return '';

    const currencyInfo = this.getCurrencyInfo(currencyCode);
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(Math.abs(amount));

    let result = '';
    
    if (showSymbol) {
      result = `${currencyInfo.symbol}${formattedAmount}`;
    } else {
      result = formattedAmount;
    }

    if (showCode) {
      result += ` ${currencyCode}`;
    }

    // Add negative sign if amount is negative
    if (amount < 0) {
      result = `-${result}`;
    }

    return result;
  }

  // Get currency symbol by code
  getCurrencySymbol(currencyCode) {
    const currencyInfo = this.getCurrencyInfo(currencyCode);
    return currencyInfo.symbol;
  }

  // Save user currency preferences
  async saveUserCurrencySettings(userId, settings) {
    try {
      const userSettings = {
        userId,
        defaultCurrency: settings.defaultCurrency || this.defaultCurrency,
        accountCurrencies: settings.accountCurrencies || {}, // accountId -> currency mapping
        displayCurrency: settings.displayCurrency || settings.defaultCurrency || this.defaultCurrency,
        autoConvert: settings.autoConvert !== false, // Default to true
        updatedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(
        `${this.settingsKey}_${userId}`, 
        JSON.stringify(userSettings)
      );

      return userSettings;
    } catch (error) {
      console.error('Error saving currency settings:', error);
      throw error;
    }
  }

  // Load user currency preferences
  async loadUserCurrencySettings(userId) {
    try {
      const settingsData = await AsyncStorage.getItem(`${this.settingsKey}_${userId}`);
      
      if (settingsData) {
        return JSON.parse(settingsData);
      }

      // Return default settings if none exist
      return {
        userId,
        defaultCurrency: this.defaultCurrency,
        accountCurrencies: {},
        displayCurrency: this.defaultCurrency,
        autoConvert: true,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error loading currency settings:', error);
      // Return default settings on error
      return {
        userId,
        defaultCurrency: this.defaultCurrency,
        accountCurrencies: {},
        displayCurrency: this.defaultCurrency,
        autoConvert: true,
        updatedAt: new Date().toISOString()
      };
    }
  }

  // Convert account balance to display currency
  convertAccountBalance(account, displayCurrency, userSettings) {
    if (!account || !account.balance) return 0;

    const accountCurrency = account.currency || this.defaultCurrency;
    const targetCurrency = displayCurrency || this.defaultCurrency;

    // Check if auto-conversion is enabled
    if (!userSettings?.autoConvert && accountCurrency !== targetCurrency) {
      return account.balance; // Return original amount if auto-conversion is disabled
    }

    return this.convertCurrency(account.balance, accountCurrency, targetCurrency);
  }

  // Convert transaction amount for display
  convertTransactionAmount(transaction, displayCurrency, userSettings) {
    if (!transaction || !transaction.amount) return 0;

    // Get account currency (assuming transaction has account reference)
    const accountCurrency = transaction.currency || this.defaultCurrency;
    const targetCurrency = displayCurrency || this.defaultCurrency;

    if (!userSettings?.autoConvert && accountCurrency !== targetCurrency) {
      return transaction.amount;
    }

    return this.convertCurrency(transaction.amount, accountCurrency, targetCurrency);
  }

  // Get total balance across multiple accounts in display currency, including loans
  getTotalBalanceInCurrency(accounts, displayCurrency, userSettings, loans = []) {
    if ((!accounts || accounts.length === 0) && (!loans || loans.length === 0)) return 0;

    // Calculate total account balance in GHS
    const accountsInGHS = (accounts || []).reduce((total, account) => {
      const accountCurrency = account.currency || this.defaultCurrency;
      const ghsAmount = this.convertCurrency(account.balance || 0, accountCurrency, 'GHS');
      return total + ghsAmount;
    }, 0);
    
    // Calculate total loans in GHS (loans decrease the total balance)
    const loansInGHS = (loans || []).reduce((total, loan) => {
      // Only consider outstanding loans where the user is the borrower
      if (loan.status === 'active' && !loan.isLender) {
        const loanCurrency = loan.currency || this.defaultCurrency;
        const outstandingAmount = loan.amount - (loan.amountPaid || 0);
        const ghsAmount = this.convertCurrency(outstandingAmount, loanCurrency, 'GHS');
        return total + ghsAmount;
      }
      // If the user is the lender, it's already counted as an asset/account
      return total;
    }, 0);
    
    // Net balance = accounts - loans
    const netBalanceInGHS = accountsInGHS - loansInGHS;

    return this.convertCurrency(netBalanceInGHS, 'GHS', displayCurrency || this.defaultCurrency);
  }

  // Get exchange rate between two currencies
  getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;

    const fromRate = this.exchangeRates[fromCurrency];
    const toRate = this.exchangeRates[toCurrency];

    if (!fromRate || !toRate) return null;

    return toRate / fromRate;
  }

  // Check if exchange rates need updating
  needsRateUpdate() {
    if (!this.lastUpdated) return true;
    
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.lastUpdated.getTime() < oneHourAgo;
  }

  // Force refresh exchange rates
  async refreshRates() {
    await this.fetchExchangeRates();
  }

  // Get currency conversion info for UI display
  getConversionInfo(amount, fromCurrency, toCurrency) {
    const rate = this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = this.convertCurrency(amount, fromCurrency, toCurrency);
    
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      exchangeRate: rate,
      lastUpdated: this.lastUpdated
    };
  }
}

export default new CurrencyService();
