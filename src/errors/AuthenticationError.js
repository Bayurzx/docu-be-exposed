class AuthenticationError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'AuthenticationError';
        this.isAuthenticationError = true;
        this.details = details;
    }
}

function handleError(error, debugPrefix = '') {
    // Handle specific authentication errors
    if (error.isAuthenticationError) {
        throw error;
    }

    // Check for unauthorized errors from DocuSign
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        throw new AuthenticationError('DocuSign authentication failed', {
            reason: 'UNAUTHORIZED',
            originalError: error.message
        });
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
        throw new Error('Network connection failed. Please check your internet connection.');
    }

    // Handle DocuSign API-specific errors
    if (error.response) {
        // Log the full error for debugging
        console.error(`${debugPrefix} Detailed API Error:`, error.response.data);

        // Throw a more informative error based on DocuSign API response
        throw new Error(`DocuSign API Error: ${error.response.data.message || 'Unknown API error'}`);
    }

    // Catch-all for any other unexpected errors
    console.error(`${debugPrefix} Unexpected Error:`, error);
    throw error;
}

function handleRouteError(error, res) {
    // Specific handling for authentication errors
    if (error.isAuthenticationError) {
      return res.status(401).json({
        success: false,
        errorCode: error.details?.reason || 'AUTHENTICATION_ERROR',
        errorMessage: error.message,
        details: error.details
      });
    }
  
    // Handle other errors
    console.error('Service Error:', error);
  
    // Check if the error has a response status, otherwise default to 500
    const status = error.response?.status || 500;
    const errorCode = error.response?.body?.errorCode || 'UNKNOWN_ERROR';
    const errorMessage = error.response?.body?.message || error.message;
  
    return res.status(status).json({
      success: false,
      errorCode: errorCode,
      errorMessage: errorMessage
    });
  }
  

module.exports = { handleError, AuthenticationError, handleRouteError };
