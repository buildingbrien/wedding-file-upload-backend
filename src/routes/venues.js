const express = require('express');
const router = express.Router();
const { supabase, BUCKETS } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

/**
 * Get list of venues that have uploaded files
 * GET /api/venues
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const venues = new Set();
    
    // Get folders from all buckets to extract venue names
    for (const bucketName of Object.values(BUCKETS)) {
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 1000,
          offset: 0
        });
      
      if (error) {
        console.error(`Error listing files in ${bucketName}:`, error);
        continue;
      }
      
      // Extract venue names from folder structure
      files.forEach(file => {
        if (file.name && !file.name.includes('.')) {
          // This is likely a folder (venue name)
          venues.add(file.name);
        }
      });
    }
    
    const venueList = Array.from(venues).sort();
    
    res.json({
      success: true,
      venues: venueList,
      count: venueList.length
    });
    
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch venues',
      message: 'Unable to retrieve venue list'
    });
  }
});

/**
 * Get files for a specific venue
 * GET /api/venues/:venueName/files
 */
router.get('/:venueName/files', authenticateToken, async (req, res) => {
  try {
    const { venueName } = req.params;
    const venueFiles = {};
    
    // Get files from all buckets for this venue
    for (const [bucketKey, bucketName] of Object.entries(BUCKETS)) {
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list(venueName, {
          limit: 1000,
          offset: 0
        });
      
      if (error) {
        console.error(`Error listing files for ${venueName} in ${bucketName}:`, error);
        venueFiles[bucketKey.toLowerCase()] = [];
        continue;
      }
      
      // Generate public URLs for files
      const filesWithUrls = files
        .filter(file => file.name && file.name.includes('.')) // Only actual files
        .map(file => {
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(`${venueName}/${file.name}`);
          
          return {
            name: file.name,
            size: file.metadata?.size || 0,
            lastModified: file.updated_at || file.created_at,
            url: urlData.publicUrl
          };
        });
      
      venueFiles[bucketKey.toLowerCase()] = filesWithUrls;
    }
    
    res.json({
      success: true,
      venue: venueName,
      files: venueFiles,
      totalFiles: Object.values(venueFiles).reduce((sum, files) => sum + files.length, 0)
    });
    
  } catch (error) {
    console.error('Error fetching venue files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch venue files',
      message: 'Unable to retrieve files for this venue'
    });
  }
});

/**
 * Delete a specific file
 * DELETE /api/venues/:venueName/files/:bucket/:fileName
 */
router.delete('/:venueName/files/:bucket/:fileName', authenticateToken, async (req, res) => {
  try {
    const { venueName, bucket, fileName } = req.params;
    
    // Validate bucket name
    if (!Object.values(BUCKETS).includes(bucket)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bucket',
        message: 'Specified bucket does not exist'
      });
    }
    
    const filePath = `${venueName}/${fileName}`;
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting file:', error);
      return res.status(500).json({
        success: false,
        error: 'Delete failed',
        message: 'Unable to delete the specified file'
      });
    }
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      deletedFile: {
        venue: venueName,
        bucket: bucket,
        fileName: fileName,
        filePath: filePath
      }
    });
    
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: 'An error occurred while deleting the file'
    });
  }
});

module.exports = router;

