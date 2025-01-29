const express = require('express');
const router = express.Router();
const DocusignDocumentsService = require('../services/docusignDocumentsService');
const { validateDocumentsRequest, validateDocumentsDownloadRequest } = require('../middleware/validation');
const { extractDocumentIds } = require('../utils/extractData');
/**
 * Route to list documents for a specific envelope
 */
router.get('/envelope/:envelopeId/documents', validateDocumentsRequest, async (req, res) => {
    try {
        const documentsService = new DocusignDocumentsService(req);
        const result = await documentsService.listDocuments(req.params.envelopeId);

        // Option to store envelope documents in session or potential future database
        await documentsService.storeEnvelopeDocuments(result);

        const documentIdList1 = extractDocumentIds(result.envelopeDocuments)
        const documentIdList2 = ['combined', 'archive', 'portfolio']
        const documentIdList = Array.from(new Set([...documentIdList1, ...documentIdList2]));

        res.status(200).json({
            success: true,
            envelopeId: req.params.envelopeId,
            documents: result.envelopeDocuments,
            documentIdList: documentIdList,
            standardDocuments: [
                {name: 'Combined', type: 'content', documentId: 'combined'},
                {name: 'Zip archive', type: 'zip', documentId: 'archive'},
                {name: 'PDF Portfolio', type: 'portfolio', documentId: 'portfolio'}
            ]
        });
    } catch (error) {
        console.error('List documents error:', error);
        res.status(error.response?.status || 500).json({
            success: false,
            errorCode: error.response?.body?.errorCode || 'UNKNOWN_ERROR',
            errorMessage: error.response?.body?.message || error.message
        });
    }
});

/**
 * Route to download a specific document from an envelope
 */
router.get('/envelope/:envelopeId/documents/:documentId', validateDocumentsDownloadRequest, async (req, res) => {
    try {
        const documentsService = new DocusignDocumentsService(req);
        
        // Retrieve envelope documents if not already stored
        await documentsService.ensureEnvelopeDocumentsStored(req.params.envelopeId);

        const result = await documentsService.getDocument(
            req.params.envelopeId, 
            req.params.documentId
        );

        // Send the document as a downloadable file
        res.writeHead(200, {
            'Content-Type': result.mimetype,
            'Content-disposition': `inline;filename=${result.docName}`,
            'Content-Length': result.fileBytes.length
        });
        res.end(result.fileBytes, 'binary');
    } catch (error) {
        console.error('Get document error:', error);
        res.status(error.response?.status || 500).json({
            success: false,
            errorCode: error.response?.body?.errorCode || 'UNKNOWN_ERROR',
            errorMessage: error.response?.body?.message || error.message
        });
    }
});

module.exports = router;