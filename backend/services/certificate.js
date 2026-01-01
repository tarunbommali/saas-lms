/* eslint-disable no-console */
import jsPDF from 'jspdf';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Certificate Generation Service
 * Handles certificate creation, validation, and formatting
 */

/**
 * Generate certificate data
 */
export const generateCertificateData = ({
  userId,
  courseId,
  userName,
  courseName,
  completionDate = new Date(),
  grade = null,
  score = null,
  certificateId = null,
}) => {
  // Generate unique certificate ID if not provided
  const certId = certificateId || generateCertificateId();

  return {
    certificateId: certId,
    userId,
    courseId,
    recipientName: userName,
    courseName,
    completionDate: new Date(completionDate),
    grade,
    score,
    issuerName: 'JNTU-GV NxtGen Certification',
    issuerTitle: 'Program Director',
    issuedAt: new Date(),
  };
};

/**
 * Generate unique certificate ID
 */
export const generateCertificateId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `JNTUGV-CERT-${timestamp}-${random}`;
};

/**
 * Validate certificate data
 */
export const validateCertificateData = (data) => {
  const errors = [];

  if (!data.userId) errors.push('User ID is required');
  if (!data.courseId) errors.push('Course ID is required');
  if (!data.userName || data.userName.trim().length < 2) {
    errors.push('Valid user name is required');
  }
  if (!data.courseName || data.courseName.trim().length < 3) {
    errors.push('Valid course name is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Format certificate for storage
 */
export const formatCertificateForStorage = (certificateData) => {
  return {
    id: certificateData.certificateId,
    userId: certificateData.userId,
    courseId: certificateData.courseId,
    status: 'ISSUED',
    overallScore: certificateData.score || 0,
    completionPercentage: 100,
    certificateUrl: null, // Will be updated after PDF generation
    issuedAt: certificateData.issuedAt || new Date(),
    issuedBy: 'system',
    metadata: {
      recipientName: certificateData.recipientName,
      courseName: certificateData.courseName,
      courseTitle: certificateData.courseName,
      grade: certificateData.grade,
      completionDate: certificateData.completionDate,
    },
  };
};

/**
 * Generate certificate verification URL
 */
export const generateVerificationUrl = (certificateId) => {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  return `${baseUrl}/verify-certificate/${certificateId}`;
};

/**
 * Generate certificate share text
 */
export const generateShareText = ({ recipientName, courseName, certificateId }) => {
  return `🎓 I'm proud to share that I've successfully completed "${courseName}" from JNTU-GV NxtGen Certification!\n\nCertificate ID: ${certificateId}\n\n#Learning #Certification #JNTUGV`;
};

/**
 * Create simple PDF certificate (server-side)
 */
export const createServerSidePDF = async (certificateData) => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Border
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(3);
    doc.rect(10, 10, width - 20, height - 20);

    // Title
    doc.setFontSize(40);
    doc.setFont(undefined, 'bold');
    doc.text('CERTIFICATE', width / 2, 40, { align: 'center' });

    doc.setFontSize(20);
    doc.text('OF COMPLETION', width / 2, 55, { align: 'center' });

    // Recipient
    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text('This is to certify that', width / 2, 80, { align: 'center' });

    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text(certificateData.recipientName, width / 2, 100, { align: 'center' });

    // Course
    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text('has successfully completed the course', width / 2, 115, { align: 'center' });

    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text(certificateData.courseName, width / 2, 130, { align: 'center' });

    // Date
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    const dateStr = new Date(certificateData.completionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Awarded on ${dateStr}`, width / 2, 150, { align: 'center' });

    // Certificate ID
    doc.setFontSize(10);
    doc.text(`Certificate ID: ${certificateData.certificateId}`, width / 2, 160, { align: 'center' });

    // Signature
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('JNTU-GV NxtGen Certification', width / 2, 180, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.text('Program Director', width / 2, 187, { align: 'center' });

    return doc;
  } catch (error) {
    console.error('Error creating PDF:', error);
    throw error;
  }
};

/**
 * Save PDF to file system (if needed)
 */
export const saveCertificatePDF = async (certificateData, outputPath) => {
  try {
    const doc = await createServerSidePDF(certificateData);
    const buffer = doc.output('arraybuffer');
    // In a real implementation, save to file system or cloud storage
    return {
      success: true,
      path: outputPath,
      size: buffer.byteLength,
    };
  } catch (error) {
    console.error('Error saving PDF:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  generateCertificateData,
  generateCertificateId,
  validateCertificateData,
  formatCertificateForStorage,
  generateVerificationUrl,
  generateShareText,
  createServerSidePDF,
  saveCertificatePDF,
};
