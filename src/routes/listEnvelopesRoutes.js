// src\routes\listEnvelopesRoutes.js
const express = require('express');
const router = express.Router();
const DocusignListEnvelopesService = require('../services/docusignListEnvelopesService');
const { validateListEnvelopesRequest } = require('../middleware/validation');
const { extractEnvelopeIds } = require('../utils/extractData');

/**
 * Route to list envelopes with flexible filtering options
 */
router.get('/envelopes', validateListEnvelopesRequest, async (req, res) => {
    try {
        const envelopesService = new DocusignListEnvelopesService(req);

        // Extract query parameters with defaults
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

        const results = await envelopesService.listEnvelopes(queryParams);
        
        const allEnvelopeIds = extractEnvelopeIds(results.envelopes);

        res.status(200).json({
            success: true,
            totalResultSetSize: results.resultSetSize,
            resultSetSize: results.resultSetSize,
            allEnvelopeIds: allEnvelopeIds,
            envelopes: results.envelopes,
            nextUri: results.nextUri,
            previousUri: results.previousUri
        });
    } catch (error) {
        console.error('List envelopes error:', error);
        res.status(error.response?.status || 500).json({
            success: false,
            errorCode: error.response?.body?.errorCode || 'UNKNOWN_ERROR',
            errorMessage: error.response?.body?.message || error.message
        });
    }
});

// {{BASE_URL}}/envelopes?fromDate=2024-01-01&status=sent&pageSize=20&startPosition=0&fromTo=bayurzx@gmail.com
// GET /envelopes?fromDate=2025-01-01&toDate=2025-01-15&pageSize=20
// GET /envelopes?status=completed,sent&fromDate=2025-01-01
// GET /envelopes?email=user@example.com&userName=JohnDoe
// GET /envelopes?envelopeIds=12345,67890
// GET /envelopes?orderBy=last_modified&fromDate=2025-01-01
// GET /envelopes?fromToStatus=sent&fromDate=2025-01-01


module.exports = router;