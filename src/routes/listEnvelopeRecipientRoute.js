const express = require('express');
const router = express.Router();
const DocusignListEnvelopeRecipientService = require('../services/docusignListEnvelopeRecipientService');
const { validateGetEnvelopeRequest } = require('../middleware/validation');

/**
 * Route to list envelope recipients details
 * Returns envelope information based on envelopeId
 */
router.get('/listEnvelopeRecipients/:envelopeId', validateGetEnvelopeRequest, async (req, res) => {
    try {
        const envelopeListRecipientService = new DocusignListEnvelopeRecipientService(req);
        const result = await envelopeListRecipientService.listEnvelopeRecipients(req.params.envelopeId);

        res.status(200).json({
            success: true,
            envelope: result
        });
    } catch (error) {
        console.error('List envelope Recipients error:', error);
        res.status(error.response?.status || 500).json({
            success: false,
            errorCode: error.response?.body?.errorCode || 'UNKNOWN_ERROR',
            errorMessage: error.response?.body?.message || error.message
        });
    }
});

module.exports = router;