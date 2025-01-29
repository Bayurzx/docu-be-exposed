const express = require('express');
const router = express.Router();
const DocusignGetEnvelopeService = require('../services/docusignGetEnvelopeService');
const { validateGetEnvelopeRequest } = require('../middleware/validation');

/**
 * Route to get envelope details
 * Returns envelope information based on envelopeId
 */
router.get('/envelope/:envelopeId', validateGetEnvelopeRequest, async (req, res) => {
    try {
        const envelopeGetService = new DocusignGetEnvelopeService(req);
        const result = await envelopeGetService.getEnvelope(req.params.envelopeId);

        res.status(200).json({
            success: true,
            envelope: result
        });
    } catch (error) {
        console.error('Get envelope error:', error);
        res.status(error.response?.status || 500).json({
            success: false,
            errorCode: error.response?.body?.errorCode || 'UNKNOWN_ERROR',
            errorMessage: error.response?.body?.message || error.message
        });
    }
});

module.exports = router;