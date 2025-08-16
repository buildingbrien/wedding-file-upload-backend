const multer = require('multer');
const path = require('path');
const { validateFileType, validateFileSize } = require('../utils/fileUtils');

// File type configurations
const ALLOWED_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'text/plain'
  ]
};

// Get all allowed file types
const ALL_ALLOWED_TYPES = [...ALLOWED_TYPES.images, ...ALLOWED_TYPES.documents];

// Maximum file size (10MB by default)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

// Configure multer for memory storage (files will be uploaded directly to Supabase)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  if (!validateFileType(file.mimetype, ALL_ALLOWED_TYPES)) {
    const error = new Error(`File type ${file.mimetype} is not allowed`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
  // File is valid
  cb(null, true);
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Maximum 10 files per request
  }
});

// Middleware for handling upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: `File size exceeds the maximum limit of ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        message: 'Maximum 10 files allowed per upload'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field',
        message: 'Please use the correct file field name'
      });
    }
  }
  
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: error.message,
      allowedTypes: ALL_ALLOWED_TYPES
    });
  }
  
  // Other errors
  console.error('Upload error:', error);
  return res.status(500).json({
    success: false,
    error: 'Upload failed',
    message: 'An error occurred during file upload'
  });
};

// Middleware for validating uploaded files
const validateFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files provided',
      message: 'Please select at least one file to upload'
    });
  }
  
  // Additional validation for each file
  for (const file of req.files) {
    // Check file size again (in case multer limits were bypassed)
    if (!validateFileSize(file.size, MAX_FILE_SIZE)) {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: `File "${file.originalname}" exceeds the maximum size limit`,
        maxSize: `${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`
      });
    }
    
    // Validate file has content
    if (file.size === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty file',
        message: `File "${file.originalname}" is empty`
      });
    }
  }
  
  next();
};

// Export configured upload middleware
module.exports = {
  upload: upload.array('files', 10), // Accept up to 10 files with field name 'files'
  handleUploadError,
  validateFiles,
  ALLOWED_TYPES,
  MAX_FILE_SIZE
};

