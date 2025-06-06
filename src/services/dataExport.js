import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

class DataExportService {
  // Export medical records to CSV
  async exportMedicalRecordsToCSV(records, familyMembers = []) {
    try {
      const csvHeader = [
        'Date',
        'Type',
        'Title',
        'Description',
        'Family Member',
        'Doctor',
        'Hospital',
        'Notes',
        'Files Count'
      ].join(',');

      const csvRows = records.map(record => {
        const familyMember = familyMembers.find(m => m.id === record.familyMemberId);
        const memberName = familyMember ? familyMember.name : 'Self';
        
        return [
          this.formatDateForCSV(record.date),
          record.type || '',
          this.escapeCSV(record.title || ''),
          this.escapeCSV(record.description || ''),
          this.escapeCSV(memberName),
          this.escapeCSV(record.doctor || ''),
          this.escapeCSV(record.hospital || ''),
          this.escapeCSV(record.notes || ''),
          record.files ? record.files.length : 0
        ].join(',');
      });

      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      const fileName = `medical_records_${this.getDateString()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      return {
        success: true,
        fileUri,
        fileName,
        recordCount: records.length
      };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Export data to JSON format
  async exportToJSON(data, fileName = 'medical_data') {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const fullFileName = `${fileName}_${this.getDateString()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fullFileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonContent);
      
      return {
        success: true,
        fileUri,
        fileName: fullFileName
      };
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Export appointment schedule
  async exportAppointmentsToCSV(appointments) {
    try {
      const csvHeader = [
        'Date',
        'Time',
        'Doctor',
        'Specialty',
        'Hospital/Clinic',
        'Purpose',
        'Status',
        'Notes'
      ].join(',');

      const csvRows = appointments.map(appointment => [
        this.formatDateForCSV(appointment.date),
        appointment.time || '',
        this.escapeCSV(appointment.doctor || ''),
        this.escapeCSV(appointment.specialty || ''),
        this.escapeCSV(appointment.location || ''),
        this.escapeCSV(appointment.purpose || ''),
        appointment.status || '',
        this.escapeCSV(appointment.notes || '')
      ].join(','));

      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      const fileName = `appointments_${this.getDateString()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      return {
        success: true,
        fileUri,
        fileName,
        appointmentCount: appointments.length
      };
    } catch (error) {
      console.error('Error exporting appointments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create comprehensive health report
  async createHealthReport(userData) {
    try {
      const {
        userProfile,
        familyMembers = [],
        medicalRecords = [],
        appointments = [],
        insuranceInfo = {}
      } = userData;

      const report = {
        generatedOn: new Date().toISOString(),
        reportType: 'Family Health Report',
        
        summary: {
          totalFamilyMembers: familyMembers.length,
          totalMedicalRecords: medicalRecords.length,
          upcomingAppointments: appointments.filter(a => new Date(a.date) > new Date()).length,
          recordsByType: this.groupRecordsByType(medicalRecords),
        },

        userProfile: {
          name: userProfile?.name || 'N/A',
          email: userProfile?.email || 'N/A',
          phone: userProfile?.phone || 'N/A',
        },

        familyMembers: familyMembers.map(member => ({
          name: member.name,
          relationship: member.relationship,
          dateOfBirth: member.dateOfBirth,
          bloodType: member.bloodType,
          allergies: member.allergies,
          emergencyContact: member.emergencyContact,
          recordCount: medicalRecords.filter(r => r.familyMemberId === member.id).length
        })),

        medicalRecords: medicalRecords.map(record => ({
          date: record.date,
          type: record.type,
          title: record.title,
          description: record.description,
          doctor: record.doctor,
          hospital: record.hospital,
          familyMember: familyMembers.find(m => m.id === record.familyMemberId)?.name || 'Self',
          hasFiles: !!(record.files && record.files.length > 0)
        })),

        upcomingAppointments: appointments
          .filter(a => new Date(a.date) > new Date())
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map(appointment => ({
            date: appointment.date,
            time: appointment.time,
            doctor: appointment.doctor,
            purpose: appointment.purpose,
            location: appointment.location
          })),

        insuranceInfo: {
          provider: insuranceInfo.provider || 'N/A',
          memberId: insuranceInfo.memberId || 'N/A',
          groupNumber: insuranceInfo.groupNumber || 'N/A',
          primaryCarePhysician: insuranceInfo.primaryCarePhysician || 'N/A'
        }
      };

      return this.exportToJSON(report, 'health_report');
    } catch (error) {
      console.error('Error creating health report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Share exported file
  async shareFile(fileUri, message = 'Sharing medical data') {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return false;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: this.getMimeType(fileUri),
        dialogTitle: message,
      });

      return true;
    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert('Error', 'Failed to share file');
      return false;
    }
  }

  // Helper methods
  escapeCSV(str) {
    if (!str) return '';
    const stringified = str.toString();
    if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
      return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
  }

  formatDateForCSV(date) {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date.toString();
    }
  }

  getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  getMimeType(fileUri) {
    const extension = fileUri.split('.').pop().toLowerCase();
    const mimeTypes = {
      'csv': 'text/csv',
      'json': 'application/json',
      'pdf': 'application/pdf',
      'txt': 'text/plain'
    };
    return mimeTypes[extension] || 'text/plain';
  }

  groupRecordsByType(records) {
    return records.reduce((acc, record) => {
      const type = record.type || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  // Delete exported file after sharing
  async deleteFile(fileUri) {
    try {
      await FileSystem.deleteAsync(fileUri);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Get available storage space
  async getAvailableSpace() {
    try {
      const info = await FileSystem.getFreeDiskStorageAsync();
      return {
        available: info,
        formatted: this.formatBytes(info)
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new DataExportService();
