const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

/**
 * Sanitize venue name for use in file paths
 * @param {string} venueName - Raw venue name
 * @returns {string} Sanitized venue name
 */
function sanitizeVenueName(venueName) {
  return venueName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate unique filename with venue and timestamp
 * @param {string} venueName - Venue name
 * @param {string} originalName - Original filename
 * @param {string} category - File category (optional)
 * @returns {string} Generated filename
 */
function generateFileName(venueName, originalName, category = '') {
  const sanitizedVenue = sanitizeVenueName(venueName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = path.extname(originalName).toLowerCase();
  const uniqueId = uuidv4().slice(0, 8);
  
  let fileName = `${sanitizedVenue}_${timestamp}_${uniqueId}`;
  
  if (category) {
    const sanitizedCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '');
    fileName = `${sanitizedVenue}_${sanitizedCategory}_${timestamp}_${uniqueId}`;
  }
  
  return fileName + extension;
}

/**
 * Generate folder path for file organization
 * @param {string} venueName - Venue name
 * @param {string} category - File category (optional)
 * @returns {string} Folder path
 */
function generateFolderPath(venueName, category = '') {
  const sanitizedVenue = sanitizeVenueName(venueName);
  
  if (category) {
    const sanitizedCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${sanitizedVenue}/${sanitizedCategory}`;
  }
  
  return sanitizedVenue;
}

/**
 * Validate file type against allowed types
 * @param {string} mimeType - File MIME type
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean} Whether file type is allowed
 */
function validateFileType(mimeType, allowedTypes) {
  return allowedTypes.includes(mimeType);
}

/**
 * Validate file size against maximum allowed size
 * @param {number} fileSize - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} Whether file size is acceptable
 */
function validateFileSize(fileSize, maxSize) {
  return fileSize <= maxSize;
}

/**
 * Get file type category based on MIME type
 * @param {string} mimeType - File MIME type
 * @returns {string} File category (image, document, etc.)
 */
function getFileCategory(mimeType) {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType === 'application/pdf' || 
             mimeType.includes('document') || 
             mimeType.includes('word')) {
    return 'document';
  }
  return 'other';
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract file extension from filename
 * @param {string} filename - Original filename
 * @returns {string} File extension
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Check if file is an image based on MIME type
 * @param {string} mimeType - File MIME type
 * @returns {boolean} Whether file is an image
 */
function isImageFile(mimeType) {
  return mimeType.startsWith('image/');
}

/**
 * Check if file is a document based on MIME type
 * @param {string} mimeType - File MIME type
 * @returns {boolean} Whether file is a document
 */
function isDocumentFile(mimeType) {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'text/plain'
  ];
  return documentTypes.includes(mimeType);
}

module.exports = {
  sanitizeVenueName,
  generateFileName,
  generateFolderPath,
  validateFileType,
  validateFileSize,
  getFileCategory,
  formatFileSize,
  getFileExtension,
  isImageFile,
  isDocumentFile
};

