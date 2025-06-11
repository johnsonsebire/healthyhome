# Finance Module Testing

This directory contains unit and integration tests for the Finance Module of the Family Medical App.

## Test Categories

The tests are organized into the following categories:

1. **Unit Tests**
   - FinanceContext tests
   - financeService tests
   - Component tests (AccountCard, TransactionList, etc.)
   - Screen tests (WelfareAccountsScreen, WelfareAccountDetailsScreen, etc.)

2. **Integration Tests**
   - End-to-end tests for workflows (e.g., creating a welfare account, making contributions)

3. **Firebase Security Rules Tests (Placeholder)**
   - These are placeholders for testing Firestore security rules
   - Actual tests would require Firebase emulators

## Running Tests

To run all tests:

```bash
npm run test
```

To run a specific test file:

```bash
npm run test -- path/to/test.js
```

To run tests in watch mode:

```bash
npm run test:watch
```

## Test Coverage

To generate a test coverage report:

```bash
npm run test -- --coverage
```

## Mocking Strategy

The tests use the following mocking strategy:

1. **Firebase** - Firebase modules are mocked to avoid actual database calls
2. **Navigation** - React Navigation is mocked to test navigation flows
3. **Context Providers** - Context providers are mocked to provide controlled test data
4. **Offline Storage** - AsyncStorage is mocked for testing offline functionality

## Offline Testing

The tests cover offline scenarios by:
1. Mocking the network state using `networkService.isOnline()`
2. Testing the offline data synchronization mechanism
3. Verifying local storage updates during offline operations

## Test Utilities

Common test utilities are located in `/src/utils/testUtils.js`, which provides:
1. Helper functions for rendering components with required providers
2. Mock navigation objects
3. Test data factories
