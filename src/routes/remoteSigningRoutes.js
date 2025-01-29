// src/routes/remoteSigningRoutes.js
const express = require('express');
const router = express.Router();
const DocusignRemoteSigningService = require('../services/docusignRemoteSigning');
const { validateRemoteSigningRequest } = require('../middleware/validation');

/**
 * Route to initiate remote signing via email for two signers
 * Sends envelope with documents to signers via email
 */
router.post('/signing/remote', validateRemoteSigningRequest, async (req, res) => {
    try {
        const signingService = new DocusignRemoteSigningService(req);
        const result = await signingService.sendEnvelopeForSigning({
            signer1Email: req.body.signer1Email,
            signer1Name: req.body.signer1Name,
            signer2Email: req.body.signer2Email,
            signer2Name: req.body.signer2Name,
            ccEmail: req.body.ccEmail,
            ccName: req.body.ccName,
            documentPath: req.body.documentPath
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

// call {{BASE_URL}}/signing/remote
// use body
// {
    // "signer1Email": "signer1@example.com",
    // "signer1Name": "John Doe",
    // "signer2Email": "signer2@example.com",
    // "signer2Name": "Jane Doe",
    // "ccEmail": "cc@example.com",
    // "ccName": "CC Person",
//     "documentPath": "./path/to/document.pdf"
// }
// Document path will be dynamic since we will run a function that generate the doc from LLM

module.exports = router;