// src/routes/signing.js
const express = require('express');
const router = express.Router();
const DocusignSigningService = require('../services/docusignSigning');
const { validateSigningRequest } = require('../middleware/validation');

router.post('/signing/start', validateSigningRequest, async (req, res) => {
    try {
        const signingService = new DocusignSigningService(req);
        const result = await signingService.startEmbeddedSigning(req.body);

        res.status(200).json({
            success: true,
            redirectUrl: result.redirectUrl,
            envelopeId: result.envelopeId
        });
    } catch (error) {
        console.error('Signing error:', error);
        res.status(error.response?.status || 500).json({
            success: false,
            errorCode: error.response?.body?.errorCode || error.response?.data?.errorCode || 'UNKNOWN_ERROR',
            errorMessage: error.response?.body?.message || error.response?.data?.message || error.message,
        });
    }
});

router.get('/signing/status/:envelopeId', async (req, res) => {
    try {
        const signingService = new DocusignSigningService(req);
        const status = await signingService.getEnvelopeStatus(req.params.envelopeId);
        res.status(200).json(status);
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            errorMessage: error.message
        });
    }
});


router.post('/signing/complete', async (req, res) => {
    try {
        const { state, event, envelopeId } = req.body;

        // Decode the state (email) if needed
        const signerEmail = Buffer.from(state, 'base64').toString();

        // Update your database or perform any necessary actions
        const signingService = new DocusignSigningService(req);
        const status = await signingService.getEnvelopeStatus(envelopeId);

        // Send response
        res.status(200).json({
            success: true,
            status: status.status,
            message: 'Signing process completed',
            envelopeId
        });
    } catch (error) {
        console.error('Error handling signing completion:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing signing completion'
        });
    }
});

// ADD new route for handling the ping URL:
router.post('/signing/ping', async (req, res) => {
    try {
        // console.log('Received ping from DocuSign:', req.body);

        // Handle the ping event
        // You might want to update your database or trigger other actions

        res.status(200).send('OK');
    } catch (error) {
        console.error('Ping handling error:', error);
        res.status(500).send('Error processing ping');
    }
});

module.exports = router;
