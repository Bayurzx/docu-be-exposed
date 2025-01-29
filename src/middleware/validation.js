// src/middleware/validation.js

const { body, validationResult } = require('express-validator');

const validateSigningRequest = [
    body('signerEmail').isEmail().normalizeEmail(),
    body('signerName').trim().notEmpty(),
    // body('signerClientId').trim().notEmpty(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateRemoteSigningRequest = (req, res, next) => {
    const { signerEmail, signerName, ccEmail, ccName, documentPath } = req.body;

    if (!signerEmail || !signerName || !ccEmail || !ccName || !documentPath) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }

    next();
};

const validateRemoteSigningRequestHtml = (req, res, next) => {

    const { signer1Email, signer1Name, signer2Email, signer2Name, contractName } = req.body;

    if (!signer1Email || !signer1Name || !signer2Email || !signer2Name || !contractName) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }

    next();
};


const validateGetEnvelopeRequest = (req, res, next) => {

    const { envelopeId } = req.params;

    if (!envelopeId) {
        return res.status(400).json({
            success: false,
            error: 'Missing envelopeId parameter'
        });
    }

    next();
};

const validateDocumentsRequest = (req, res, next) => {
    const { envelopeId } = req.params;

    if (!envelopeId) {
        return res.status(400).json({
            success: false,
            error: 'Missing envelopeId parameter'
        });
    }

    next();
};

const validateDocumentsDownloadRequest = (req, res, next) => {
    const { envelopeId, documentId } = req.params;

    if (!envelopeId) {
        return res.status(400).json({
            success: false,
            error: 'Missing envelopeId parameter'
        });
    }

    if (!documentId) {
        return res.status(400).json({
            success: false,
            error: 'Missing documentId parameter, you could use 1, combined, archive, portfolio'
        });
    }

    next();
};

const validateListEnvelopesRequest = (req, res, next) => {
    // Optional: Add any specific validation for query parameters
    const queryParams = {
        fromDate: req.query.fromDate, // Optional: YYYY-MM-DD format
        toDate: req.query.toDate, // Optional: stop looking for changes at this date
        status: req.query.status, // Optional: envelope status (comma-separated list)
        envelopeIds: req.query.envelopeIds?.split(','), // Optional: comma-separated list of envelope IDs
        email: req.query.email, // Optional: email filter (requires user_name)
        userName: req.query.userName, // Optional: user_name filter (requires email)
        fromToStatus: req.query.fromToStatus, // Optional: status for from/to email filter
        orderBy: req.query.orderBy, // Optional: sort results by a specific property
        pageSize: parseInt(req.query.pageSize) || 10, // Default page size
        startPosition: parseInt(req.query.startPosition) || 0 // Default start position
    };

    // Validate email and user_name dependency
    if ((queryParams.email && !queryParams.userName) || (queryParams.userName && !queryParams.email)) {
        return res.status(400).json({
            success: false,
            message: '`email` and `userName` must both be provided and refer to an existing account user.'
        });
    }

    next();
};

const validateResponsiveSigningRequest = (req, res, next) => {
    const { 
      signer1Email, 
      signer1Name, 
      signer2Email, 
      signer2Name, 
      contractName,
    } = req.body;
  
    const requiredFields = [
      signer1Email, 
      signer1Name, 
      signer2Email, 
      signer2Name, 
      contractName,
    ];
  
    if (requiredFields.some(field => !field)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields for responsive signing'
      });
    }
  
    next();
  };

module.exports = {
    validateSigningRequest,
    validateRemoteSigningRequest,
    validateRemoteSigningRequestHtml,
    validateGetEnvelopeRequest,
    validateDocumentsRequest,
    validateDocumentsDownloadRequest,
    validateListEnvelopesRequest,
    validateResponsiveSigningRequest,
};
