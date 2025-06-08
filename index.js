import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

console.log('🔄 Starting Family Medical App');

// Only ignore non-critical warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Setting a timer',
    'AsyncStorage has been extracted from react-native core',
    'Warning: componentWillReceiveProps has been renamed',
    'Warning: componentWillMount has been renamed',
    'Non-serializable values were found in the navigation state',
  ]);
}

// Register the app component with Expo
registerRootComponent(App);