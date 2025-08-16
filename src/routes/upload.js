const express = require('express');
const router = express.Router();
const { supabase, BUCKETS } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { upload, handleUploadError, validateFiles } = require('../middleware/upload');
const { 
  generateFileName, 
  generateFolderPath, 
  formatFileSize,
  getFileCategory 
} = require('../utils/fileUtils');

/**
 * Upload files to photos bucket
 * POST /api/upload/photos
 */
router.post('/photos', authenticateToken, upload, handleUploadError, validateFiles, async (req, res) => {
  try {
    const { venueName, category } = req.body;
    
    if (!venueName) {
      return res.status(400).json({
        success: false,
        error: 'Venue name required',
        message: 'Please provide a venue name'
      });
    }
    
    const uploadResults = await uploadFilesToBucket(
      req.files, 
      BUCKETS.PHOTOS, 
      venueName, 
      category
    );
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadResults.length} file(s) to photos bucket`,
      uploads: uploadResults,
      bucket: BUCKETS.PHOTOS,
      venue: venueName,
      category: category || 'general'
    });
    
  } catch (error) {
    console.error('Photos upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: 'Failed to upload files to photos bucket'
    });
  }
});

/**
 * Upload files to menus bucket
 * POST /api/upload/menus
 */
router.post('/menus', authenticateToken, upload, handleUploadError, validateFiles, async (req, res) => {
  try {
    const { venueName } = req.body;
    
    if (!venueName) {
      return res.status(400).json({
        success: false,
        error: 'Venue name required',
        message: 'Please provide a venue name'
      });
    }
    
    const uploadResults = await uploadFilesToBucket(
      req.files, 
      BUCKETS.MENUS, 
      venueName
    );
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadResults.length} file(s) to menus bucket`,
      uploads: uploadResults,
      bucket: BUCKETS.MENUS,
      venue: venueName
    });
    
  } catch (error) {
    console.error('Menus upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: 'Failed to upload files to menus bucket'
    });
  }
});

/**
 * Upload files to pricing bucket
 * POST /api/upload/pricing
 */
router.post('/pricing', authenticateToken, upload, handleUploadError, validateFiles, async (req, res) => {
  try {
    const { venueName } = req.body;
    
    if (!venueName) {
      return res.status(400).json({
        success: false,
        error: 'Venue name required',
        message: 'Please provide a venue name'
      });
    }
    
    const uploadResults = await uploadFilesToBucket(
      req.files, 
      BUCKETS.PRICING, 
      venueName
    );
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadResults.length} file(s) to pricing bucket`,
      uploads: uploadResults,
      bucket: BUCKETS.PRICING,
      venue: venueName
    });
    
  } catch (error) {
    console.error('Pricing upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: 'Failed to upload files to pricing bucket'
    });
  }
});

/**
 * Helper function to upload files to a specific bucket
 * @param {Array} files - Array of file objects from multer
 * @param {string} bucketName - Target bucket name
 * @param {string} venueName - Venue name for organization
 * @param {string} category - Optional category for photos
 * @returns {Array} Array of upload results
 */
async function uploadFilesToBucket(files, bucketName, venueName, category = '') {
  const uploadResults = [];
  
  for (const file of files) {
    try {
      // Generate file path and name
      const folderPath = generateFolderPath(venueName, category);
      const fileName = generateFileName(venueName, file.originalname, category);
      const filePath = `${folderPath}/${fileName}`;
      
      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          duplex: 'half'
        });
      
      if (error) {
        console.error(`Upload error for ${file.originalname}:`, error);
        uploadResults.push({
          originalName: file.originalname,
          success: false,
          error: error.message
        });
        continue;
      }
      
      // Generate public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      uploadResults.push({
        originalName: file.originalname,
        fileName: fileName,
        filePath: filePath,
        url: urlData.publicUrl,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        mimeType: file.mimetype,
        category: getFileCategory(file.mimetype),
        success: true,
        uploadedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Unexpected error uploading ${file.originalname}:`, error);
      uploadResults.push({
        originalName: file.originalname,
        success: false,
        error: 'Unexpected upload error'
      });
    }
  }
  
  return uploadResults;
}

/**
 * Get upload status and recent uploads
 * GET /api/upload/status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Get bucket information
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw error;
    }
    
    const bucketInfo = {};
    for (const bucket of buckets) {
      if (Object.values(BUCKETS).includes(bucket.name)) {
        bucketInfo[bucket.name] = {
          name: bucket.name,
          id: bucket.id,
          public: bucket.public,
          createdAt: bucket.created_at,
          updatedAt: bucket.updated_at
        };
      }
    }
    
    res.json({
      success: true,
      buckets: bucketInfo,
      allowedBuckets: BUCKETS,
      serverTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: 'Unable to retrieve upload status'
    });
  }
});

module.exports = router;

