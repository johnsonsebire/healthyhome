import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
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

      // Generate HTML for the PDF report
      const html = this.generateHealthReportHTML(userData);
      
      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({ html });
      
      // Move the file to app's document directory with a better filename
      const fileName = `health_report_${this.getDateString()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: fileUri
      });
      
      return {
        success: true,
        fileUri,
        fileName
      };
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

  // Generate HTML for health report
  generateHealthReportHTML(userData) {
    const {
      userProfile,
      familyMembers = [],
      medicalRecords = [],
      appointments = [],
      insuranceInfo = {}
    } = userData;

    // Count of upcoming appointments
    const upcomingAppointments = appointments.filter(a => new Date(a.date) > new Date()).length;
    
    // Group records by type
    const recordsByType = this.groupRecordsByType(medicalRecords);
    
    // Generate medical records HTML
    let medicalRecordsHTML = '';
    if (medicalRecords.length > 0) {
      medicalRecordsHTML += '<h2>Medical Records</h2>';
      medicalRecordsHTML += '<table style="width:100%; border-collapse: collapse;">';
      medicalRecordsHTML += '<tr style="background-color: #f2f2f2;">';
      medicalRecordsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Date</th>';
      medicalRecordsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Type</th>';
      medicalRecordsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Title</th>';
      medicalRecordsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Family Member</th>';
      medicalRecordsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Doctor</th>';
      medicalRecordsHTML += '</tr>';
      
      medicalRecords.forEach(record => {
        const familyMember = familyMembers.find(m => m.id === record.familyMemberId);
        const memberName = familyMember ? familyMember.name : 'Self';
        
        medicalRecordsHTML += '<tr style="border: 1px solid #ddd;">';
        medicalRecordsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${this.formatDateForDisplay(record.date)}</td>`;
        medicalRecordsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${record.type || 'N/A'}</td>`;
        medicalRecordsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${record.title || 'N/A'}</td>`;
        medicalRecordsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${memberName}</td>`;
        medicalRecordsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${record.doctor || 'N/A'}</td>`;
        medicalRecordsHTML += '</tr>';
      });
      
      medicalRecordsHTML += '</table>';
    }
    
    // Generate family members HTML
    let familyMembersHTML = '';
    if (familyMembers.length > 0) {
      familyMembersHTML += '<h2>Family Members</h2>';
      familyMembersHTML += '<table style="width:100%; border-collapse: collapse;">';
      familyMembersHTML += '<tr style="background-color: #f2f2f2;">';
      familyMembersHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Name</th>';
      familyMembersHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Relationship</th>';
      familyMembersHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Date of Birth</th>';
      familyMembersHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Blood Type</th>';
      familyMembersHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Records</th>';
      familyMembersHTML += '</tr>';
      
      familyMembers.forEach(member => {
        const recordCount = medicalRecords.filter(r => r.familyMemberId === member.id).length;
        
        familyMembersHTML += '<tr style="border: 1px solid #ddd;">';
        familyMembersHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${member.name || 'N/A'}</td>`;
        familyMembersHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${member.relationship || 'N/A'}</td>`;
        familyMembersHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${member.dateOfBirth || 'N/A'}</td>`;
        familyMembersHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${member.bloodType || 'N/A'}</td>`;
        familyMembersHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${recordCount}</td>`;
        familyMembersHTML += '</tr>';
      });
      
      familyMembersHTML += '</table>';
    }
    
    // Generate upcoming appointments HTML
    let appointmentsHTML = '';
    const upcomingAppointmentsList = appointments
      .filter(a => new Date(a.date) > new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
      
    if (upcomingAppointmentsList.length > 0) {
      appointmentsHTML += '<h2>Upcoming Appointments</h2>';
      appointmentsHTML += '<table style="width:100%; border-collapse: collapse;">';
      appointmentsHTML += '<tr style="background-color: #f2f2f2;">';
      appointmentsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Date</th>';
      appointmentsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Time</th>';
      appointmentsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Doctor</th>';
      appointmentsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Purpose</th>';
      appointmentsHTML += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Location</th>';
      appointmentsHTML += '</tr>';
      
      upcomingAppointmentsList.forEach(appointment => {
        appointmentsHTML += '<tr style="border: 1px solid #ddd;">';
        appointmentsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${this.formatDateForDisplay(appointment.date)}</td>`;
        appointmentsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${appointment.time || 'N/A'}</td>`;
        appointmentsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${appointment.doctor || 'N/A'}</td>`;
        appointmentsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${appointment.purpose || 'N/A'}</td>`;
        appointmentsHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${appointment.location || 'N/A'}</td>`;
        appointmentsHTML += '</tr>';
      });
      
      appointmentsHTML += '</table>';
    }
    
    // Generate record types summary
    let recordTypesSummaryHTML = '<h3>Records by Type</h3><ul>';
    for (const [type, count] of Object.entries(recordsByType)) {
      recordTypesSummaryHTML += `<li>${type}: ${count}</li>`;
    }
    recordTypesSummaryHTML += '</ul>';

    // Assemble the complete HTML
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Family Health Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            h1 {
              color: #6366f1;
              text-align: center;
              margin-bottom: 30px;
            }
            h2 {
              color: #6366f1;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
              margin-top: 30px;
            }
            h3 {
              color: #6366f1;
              margin-top: 20px;
            }
            .summary-container {
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
            }
            .summary-box {
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
              flex: 1;
              min-width: 200px;
              margin-right: 15px;
            }
            .summary-title {
              font-weight: bold;
              color: #6366f1;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              margin: 10px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              padding: 8px;
              border: 1px solid #ddd;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .footer {
              text-align: center;
              margin-top: 50px;
              color: #9ca3af;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>Family Health Report</h1>
          
          <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          
          <div class="summary-container">
            <div class="summary-box">
              <div class="summary-title">Family Members</div>
              <div class="summary-value">${familyMembers.length}</div>
            </div>
            
            <div class="summary-box">
              <div class="summary-title">Medical Records</div>
              <div class="summary-value">${medicalRecords.length}</div>
            </div>
            
            <div class="summary-box">
              <div class="summary-title">Upcoming Appointments</div>
              <div class="summary-value">${upcomingAppointments}</div>
            </div>
          </div>
          
          ${recordTypesSummaryHTML}
          
          ${familyMembersHTML}
          
          ${medicalRecordsHTML}
          
          ${appointmentsHTML}
          
          <div class="footer">
            <p>This report was generated by Family Medical App</p>
          </div>
        </body>
      </html>
    `;
  }

  // Format date for display in the PDF
  formatDateForDisplay(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  }
}

export default new DataExportService();
