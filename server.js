require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const uploadRoutes = require('./src/routes/upload');
const venueRoutes = require('./src/routes/venues');

// Import configuration
const { validateBuckets } = require('./src/config/supabase');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - allow all origins for development and production
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://mstidffn.manus.space',
    'https://wedding-file-upload.netlify.app',
    /\.netlify\.app$/,
    /\.manus\.space$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Wedding Venue Upload Tool API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/upload', uploadRoutes);
app.use('/api/venues', venueRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Wedding Venue Upload Tool API',
    version: '1.0.0',
    endpoints: {
      upload: {
        photos: 'POST /api/upload/photos',
        menus: 'POST /api/upload/menus',
        pricing: 'POST /api/upload/pricing',
        status: 'GET /api/upload/status'
      },
      venues: {
        list: 'GET /api/venues',
        files: 'GET /api/venues/:venueName/files',
        delete: 'DELETE /api/venues/:venueName/files/:bucket/:fileName'
      }
    },
    authentication: 'Bearer token or ?token=<access_token>',
    documentation: 'See README.md for detailed usage instructions'
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// Start server
async function startServer() {
  try {
    // Validate Supabase configuration
    console.log('Validating Supabase configuration...');
    const bucketsValid = await validateBuckets();
    
    if (!bucketsValid) {
      console.error('Supabase bucket validation failed');
      process.exit(1);
    }
    
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Wedding Venue Upload Tool API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API info: http://localhost:${PORT}/api`);
      console.log(`🔒 Authentication required for upload endpoints`);
      console.log(`🪣 Supabase buckets validated successfully`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

