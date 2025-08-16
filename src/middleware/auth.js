/**
 * Simple token-based authentication middleware
 * Validates access token from Authorization header or query parameter
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const queryToken = req.query.token;
  
  // Extract token from Authorization header (Bearer token) or query parameter
  const token = authHeader && authHeader.split(' ')[1] || queryToken;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      message: 'Please provide a valid access token'
    });
  }
  
  // Validate token against environment variable
  const validToken = process.env.ACCESS_TOKEN;
  
  if (!validToken) {
    console.error('ACCESS_TOKEN environment variable not set');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
      message: 'Authentication not properly configured'
    });
  }
  
  if (token !== validToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid access token',
      message: 'The provided access token is not valid'
    });
  }
  
  // Token is valid, proceed to next middleware
  next();
}

/**
 * Optional authentication middleware
 * Allows requests to proceed even without valid token, but sets req.authenticated
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const queryToken = req.query.token;
  const token = authHeader && authHeader.split(' ')[1] || queryToken;
  
  req.authenticated = false;
  
  if (token && token === process.env.ACCESS_TOKEN) {
    req.authenticated = true;
  }
  
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth
};

