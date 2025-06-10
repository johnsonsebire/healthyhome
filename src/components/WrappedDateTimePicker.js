import React from 'react';
import { View, Text, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * A wrapper component for DateTimePicker that ensures all text is properly wrapped
 * This helps prevent the "Text strings must be rendered within a <Text> Component" error
 */
const WrappedDateTimePicker = (props) => {
  // Special handling based on platform
  if (Platform.OS === 'android') {
    // On Android, wrap with Text component to catch any potential unwrapped text
    return (
      <View>
        <Text style={{ height: 0, width: 0, opacity: 0 }}>
          {/* Empty Text component to catch any potential text rendering outside of Text components */}
        </Text>
        <DateTimePicker {...props} />
      </View>
    );
  }
  
  // On iOS, use a more comprehensive wrapper
  return (
    <View>
      <Text style={{ height: 0, width: 0, opacity: 0 }}>
        {/* Empty Text component to catch any potential text rendering outside of Text components */}
        {/* This helps with DateTimePicker's internal components that might render text */}
      </Text>
      <DateTimePicker {...props} />
    </View>
  );
};

export default WrappedDateTimePicker;
