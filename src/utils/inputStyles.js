// Shared input styling for consistent appearance across all forms
import { StyleSheet } from 'react-native';

export const placeholderTextColor = '#9ca3af';

export const getStandardInputStyle = (hasError = false) => {
  return [
    styles.input,
    hasError && styles.inputError
  ];
};

// Helper function to add standard props to all TextInputs
export const getStandardTextInputProps = () => {
  return {
    placeholderTextColor: placeholderTextColor,
    selectionColor: '#6366f1',
    autoCorrect: false
  };
};

const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
});

export default {
  placeholderTextColor,
  getStandardInputStyle,
  getStandardTextInputProps,
  styles
};
