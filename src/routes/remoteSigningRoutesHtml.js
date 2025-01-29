// src/routes/remoteSigningRoutes.js
const express = require('express');
const router = express.Router();
const DocusignRemoteSigningServiceHtml = require('../services/docusignRemoteSigningHtml');
const { validateRemoteSigningRequestHtml } = require('../middleware/validation');

/**
 * Route to initiate remote signing via email with HTML document
 * Sends envelope with HTML document to signers via email
 */
router.post('/signing/remote-html', validateRemoteSigningRequestHtml, async (req, res) => {
    try {
        const signingService = new DocusignRemoteSigningServiceHtml(req);
        // 
        const result = await signingService.sendEnvelopeForSigning({
            documentData: req.body, // contains all the data related to doc from FE
            documentType: req.body.contractName  // contains the docType, contract name
        });

        res.status(200).json({
            success: true,
            envelopeId: result.envelopeId,
            message: `Envelope was created and sent. EnvelopeId: ${result.envelopeId}`
        });
    } catch (error) {
        console.error('Remote signing error:', error);
        res.status(error.response?.status || 500).json({
            success: false,
            errorCode: error.response?.body?.errorCode || 'UNKNOWN_ERROR',
            errorMessage: error.response?.body?.message || error.message
        });
    }
});

module.exports = router;
