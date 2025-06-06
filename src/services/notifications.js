import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }
    
    // For Android, set up notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    return true;
  }
  
  return false;
};

export const scheduleNotification = async (title, body, trigger) => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger,
    });
    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

export const scheduleAppointmentReminder = async (appointment) => {
  const appointmentDate = new Date(appointment.date);
  const reminderDate = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
  
  if (reminderDate > new Date()) {
    return await scheduleNotification(
      'Appointment Reminder',
      `You have an appointment with ${appointment.doctor} tomorrow at ${appointment.time}`,
      { date: reminderDate }
    );
  }
  
  return null;
};

export const scheduleMedicationReminder = async (medication) => {
  const reminders = [];
  
  // Schedule daily reminders based on frequency
  for (let i = 0; i < medication.frequency; i++) {
    const hour = 8 + (i * 8); // 8 AM, 4 PM, 12 AM for 3 times a day
    
    const id = await scheduleNotification(
      'Medication Reminder',
      `Time to take your ${medication.name}`,
      {
        hour,
        minute: 0,
        repeats: true,
      }
    );
    
    if (id) reminders.push(id);
  }
  
  return reminders;
};

export const cancelNotification = async (notificationId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return true;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
};

export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    return false;
  }
};

export const getNotificationPermissionStatus = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
};
