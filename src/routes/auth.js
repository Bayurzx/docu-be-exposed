// src\routes\auth.js

const express = require('express');
const router = express.Router();
const DocusignAuthService = require('../services/docusignAuth');

/**
 * Route to initiate DocuSign JWT authentication
 * Redirects to DocuSign consent page if needed
 */
router.get('/docusign/auth', async (req, res, next) => {
    try {
        const authService = new DocusignAuthService(req);
        const authResult = await authService.authenticate();
        
        res.status(200).json({ 
            message: 'Authentication successful',
            ...authResult
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ 
            error: 'Authentication failed',
            message: error.message 
        });
    }
});

/**
 * Callback route for DocuSign OAuth consent
 * Handles the response after user grants consent
 */
router.get('/docusign/callback', async (req, res, next) => {
    try {
        const authService = new DocusignAuthService(req);
        await authService.handleCallback();
        res.redirect('/'); // Redirect to home page after successful callback
    } catch (error) {
        next(error);
    }
});

/**
 * Route to check authentication status
 * Returns current token status and account information
 */
router.get('/docusign/status', async (req, res) => {
    try {
        const authService = new DocusignAuthService(req);
        const status = await authService.checkAuthStatus();
        res.status(200).json(status);
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ 
            error: 'Status check failed',
            message: error.message 
        });
    }
});

/**
 * Route to logout from DocuSign
 * Clears all authentication tokens and session data
 */
router.get('/docusign/logout', (req, res, next) => {
    try {
        const authService = new DocusignAuthService(req);
        const logoutResult = authService.logout(req, res);
        
        res.status(200).json(logoutResult);
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout',
            error: error.message
        });
    }
});

// This debug route, To test if the session is working correctly
router.get('/docusign/session-check', (req, res) => {
    res.json({
        hasSession: !!req.session,
        sessionData: req.session
    });
});

router.get('/docusign/debug', (req, res) => {
    res.json({
        hasSession: !!req.session,
        sessionData: req.session,
        authData: req.session.auth
    });
});


module.exports = router;