import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatDate } from '../../utils/format';

/**
 * Unified Certificate Template Component
 * Supports multiple certificate styles and formats
 */
const UnifiedCertificateTemplate = React.forwardRef((
  { 
    certificateData,
    style = 'modern', // 'modern', 'classic', 'minimal'
    showLogo = true,
    showSignature = true,
  }, 
  ref
) => {
  const {
    recipientName,
    courseName,
    completionDate,
    certificateId,
    issuerName = 'JNTU-GV NxtGen Certification',
    issuerTitle = 'Program Director',
    logo,
    signature,
    grade,
    score,
  } = certificateData || {};

  const styles = {
    modern: {
      container: 'bg-gradient-to-br from-blue-50 via-white to-indigo-50',
      border: 'border-8 border-blue-600',
      title: 'text-blue-800',
      accent: 'text-blue-600',
    },
    classic: {
      container: 'bg-gradient-to-br from-amber-50 via-white to-yellow-50',
      border: 'border-8 border-amber-700',
      title: 'text-amber-900',
      accent: 'text-amber-700',
    },
    minimal: {
      container: 'bg-white',
      border: 'border-4 border-gray-800',
      title: 'text-gray-900',
      accent: 'text-gray-700',
    },
  };

  const currentStyle = styles[style] || styles.modern;

  return (
    <div
      ref={ref}
      className={`relative w-[1056px] h-[816px] ${currentStyle.container} ${currentStyle.border} p-16 font-serif`}
      style={{ aspectRatio: '1.294' }}
    >
      {/* Decorative Corner Elements */}
      <div className="absolute top-12 left-12 w-24 h-24 border-t-4 border-l-4 border-current opacity-20" />
      <div className="absolute top-12 right-12 w-24 h-24 border-t-4 border-r-4 border-current opacity-20" />
      <div className="absolute bottom-12 left-12 w-24 h-24 border-b-4 border-l-4 border-current opacity-20" />
      <div className="absolute bottom-12 right-12 w-24 h-24 border-b-4 border-r-4 border-current opacity-20" />

      {/* Logo */}
      {showLogo && (
        <div className="flex justify-center mb-8">
          {logo ? (
            <img src={logo} alt="Logo" className="h-20 object-contain" />
          ) : (
            <div className={`text-4xl font-bold ${currentStyle.title}`}>
              JNTU-GV
            </div>
          )}
        </div>
      )}

      {/* Certificate Title */}
      <div className="text-center mb-12">
        <h1 className={`text-5xl font-bold ${currentStyle.title} mb-4 tracking-wide`}>
          CERTIFICATE
        </h1>
        <p className={`text-2xl ${currentStyle.accent} tracking-widest`}>
          OF COMPLETION
        </p>
      </div>

      {/* Recipient Section */}
      <div className="text-center mb-8">
        <p className="text-xl text-gray-600 mb-4">This is to certify that</p>
        <h2 className={`text-4xl font-bold ${currentStyle.title} mb-4 border-b-2 border-current inline-block px-8 pb-2`}>
          {recipientName || 'Recipient Name'}
        </h2>
      </div>

      {/* Course Info */}
      <div className="text-center mb-8">
        <p className="text-xl text-gray-600 mb-3">
          has successfully completed the course
        </p>
        <h3 className={`text-3xl font-semibold ${currentStyle.accent} mb-6`}>
          {courseName || 'Course Name'}
        </h3>
        
        {/* Grade/Score */}
        {(grade || score) && (
          <div className="flex justify-center gap-8 mb-6">
            {grade && (
              <div className="text-center">
                <p className="text-gray-600 text-sm">Grade</p>
                <p className={`text-2xl font-bold ${currentStyle.accent}`}>{grade}</p>
              </div>
            )}
            {score && (
              <div className="text-center">
                <p className="text-gray-600 text-sm">Score</p>
                <p className={`text-2xl font-bold ${currentStyle.accent}`}>{score}%</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date and Certificate ID */}
      <div className="text-center mb-12">
        <p className="text-lg text-gray-700">
          Awarded on {formatDate(completionDate || new Date(), 'long')}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Certificate ID: {certificateId || 'CERT-XXXX-XXXX'}
        </p>
      </div>

      {/* Signature Section */}
      {showSignature && (
        <div className="flex justify-center mt-auto">
          <div className="text-center">
            {signature && (
              <img 
                src={signature} 
                alt="Signature" 
                className="h-16 mx-auto mb-2"
              />
            )}
            <div className={`border-t-2 ${currentStyle.border} pt-2 px-12`}>
              <p className={`font-semibold ${currentStyle.title} text-lg`}>
                {issuerName}
              </p>
              <p className="text-gray-600 text-sm">{issuerTitle}</p>
            </div>
          </div>
        </div>
      )}

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <div className={`text-9xl font-bold ${currentStyle.title} rotate-[-45deg]`}>
          CERTIFIED
        </div>
      </div>
    </div>
  );
});

UnifiedCertificateTemplate.displayName = 'UnifiedCertificateTemplate';

/**
 * Generate PDF from certificate
 */
export const generateCertificatePDF = async (certificateRef, filename = 'certificate.pdf') => {
  if (!certificateRef?.current) {
    throw new Error('Certificate reference is required');
  }

  try {
    // Capture the certificate as canvas
    const canvas = await html2canvas(certificateRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Convert to image
    const imgData = canvas.toDataURL('image/png');

    // Create PDF (A4 landscape)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Save PDF
    pdf.save(filename);

    return { success: true, message: 'Certificate downloaded successfully' };
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    return { success: false, message: 'Failed to generate certificate PDF' };
  }
};

/**
 * Generate shareable image
 */
export const generateCertificateImage = async (certificateRef) => {
  if (!certificateRef?.current) {
    throw new Error('Certificate reference is required');
  }

  try {
    const canvas = await html2canvas(certificateRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating certificate image:', error);
    throw error;
  }
};

/**
 * Share certificate
 */
export const shareCertificate = async (certificateData) => {
  if (!navigator.share) {
    return { success: false, message: 'Sharing not supported on this browser' };
  }

  try {
    await navigator.share({
      title: `Certificate - ${certificateData.courseName}`,
      text: `I've completed ${certificateData.courseName}!`,
      url: window.location.href,
    });

    return { success: true, message: 'Certificate shared successfully' };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, message: 'Share cancelled' };
    }
    return { success: false, message: 'Failed to share certificate' };
  }
};

export default UnifiedCertificateTemplate;
