const express = require('express');
const path = require('path');
const router = express.Router();
const DocusignEmbeddedSigningService = require('../services/docusignEmbeddedSigningService');
const { validateResponsiveSigningRequest } = require('../middleware/validation');
const { handleRouteError } = require('../errors/AuthenticationError.js');
const demoDocsPath = path.resolve(__dirname, '../../htmlDoc');
const dsConfig = require('../../config/index.js').config;
const dsReturnUrl = dsConfig.appUrl + '/ds-return';
const dsPingUrl = dsConfig.appUrl + '/'; // Url that will be pinged by the DocuSign signing via Ajax


router.post('/signing/embedded', validateResponsiveSigningRequest, async (req, res) => {
  try {
    const signingService = new DocusignEmbeddedSigningService(req);
    
    const envelopeArgs = {
      ...req.body, // Merge all keys from req.body
      signer1Email: req.body.signer1Email,
      signer1Name: req.body.signer1Name,
      signer1ClientId: req.body.signer1Email,
      
      signer2Email: req.body.signer2Email,
      signer2Name: req.body.signer2Name,
      signer2ClientId: req.body.signer2Email,
      
      // ccEmail: req.body.ccEmail,
      // ccName: req.body.ccName,
      ccEmail: "docusign_test@iglumtech.com",
      ccName: "Docusign Test",
      
      dsReturnUrl: dsReturnUrl,
      dsPingUrl: dsPingUrl,
      
      docFile: path.resolve(demoDocsPath, req.body.contractName), // Use demoDocsPath constant
      status: 'sent',
    };
    

    const results = await signingService.sendEnvelopeForEmbeddedSigning({
      envelopeArgs: envelopeArgs
    });

    res.status(200).json({
      success: true,
      envelopeId: results.envelopeId,
      redirectUrl: results.redirectUrl,
      message: 'Envelope created and ready for signing'
    });

} catch (error) {
    // Specific handling for authentication errors and Handle other errors
    handleRouteError(error, res);
  }
});

module.exports = router;