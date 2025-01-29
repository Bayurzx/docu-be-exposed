const docusign = require('docusign-esign');
const DocusignAuthService = require('./docusignAuth');
const dsConfig = require('../../config/index.js').config;

class DocusignDocumentsService {
    constructor(req) {
        this._debug_prefix = 'DocusignDocuments';
        this.req = req;
        this._debug = true;
        this.authService = new DocusignAuthService(req);
        this.minimumBufferMin = 3;
        
        // Placeholder for potential database storage
        this.storageAdapter = {
            session: this._storeInSession.bind(this),
            database: this._storeInDatabase.bind(this)
        };
    }

    async _initApiClient() {
        // Check and refresh token if needed
        const isTokenOK = this.authService.checkToken(this.minimumBufferMin);
        if (!isTokenOK) {
            await this.authService.authenticate();
        }

        // Initialize API client
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(this.req.session.auth.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + this.req.session.auth.accessToken);
        
        return new docusign.EnvelopesApi(dsApiClient);
    }

    async listDocuments(envelopeId) {
        const envelopesApi = await this._initApiClient();

        // List documents for the envelope
        const results = await envelopesApi.listDocuments(
            this.req.session.auth.accountId,
            envelopeId,
            null
        );

        return results;
    }

    async getDocument(envelopeId, documentId) {
        // Ensure envelope documents are retrieved and stored
        const storedDocuments = await this.ensureEnvelopeDocumentsStored(envelopeId);

        const envelopesApi = await this._initApiClient();

        // Retrieve the document
        const results = await envelopesApi.getDocument(
            this.req.session.auth.accountId,
            envelopeId,
            documentId,
            null
        );

        // Find document details
        const docItem = storedDocuments.documents.find(
            (item) => item.documentId === documentId
        );

        if (!docItem) {
            throw new Error('Document not found');
        }

        // Determine filename and mimetype
        let docName = docItem.name;
        let hasPDFsuffix = docName.substr(docName.length - 4).toUpperCase() === '.PDF';
        let pdfFile = hasPDFsuffix;

        // Adjust filename based on document type
        if (
            (docItem.type === 'content' || docItem.type === 'summary') &&
            !hasPDFsuffix
        ) {
            docName += '.pdf';
            pdfFile = true;
        }
        if (docItem.type === 'portfolio') {
            docName += '.pdf';
            pdfFile = true;
        }
        if (docItem.type === 'zip') {
            docName += '.zip';
        }

        // Determine mimetype
        let mimetype;
        if (pdfFile) {
            mimetype = 'application/pdf';
        } else if (docItem.type === 'zip') {
            mimetype = 'application/zip';
        } else {
            mimetype = 'application/octet-stream';
        }

        return { mimetype, docName, fileBytes: results };
    }

    async storeEnvelopeDocuments(listDocumentsResult, storageMethod = 'session') {
        // Standardize document items
        const standardDocItems = [
            {name: 'Combined', type: 'content', documentId: 'combined'},
            {name: 'Zip archive', type: 'zip', documentId: 'archive'},
            {name: 'PDF Portfolio', type: 'portfolio', documentId: 'portfolio'}
        ];

        const envelopeDocItems = listDocumentsResult.envelopeDocuments.map(doc => ({
            documentId: doc.documentId,
            name: doc.documentId === 'certificate' 
                ? 'Certificate of completion' 
                : doc.name,
            type: doc.type
        }));

        const envelopeDocuments = {
            envelopeId: this.req.params.envelopeId,
            documents: standardDocItems.concat(envelopeDocItems)
        };

        // Use selected storage method
        return this.storageAdapter[storageMethod](envelopeDocuments);
    }

    async ensureEnvelopeDocumentsStored(envelopeId) {
        // Check if envelope documents are already stored
        if (!this.req.session.envelopeDocuments || 
            this.req.session.envelopeDocuments.envelopeId !== envelopeId) {
            
            // Retrieve and store documents
            const documentsResult = await this.listDocuments(envelopeId);
            await this.storeEnvelopeDocuments(documentsResult);
        }

        return this.req.session.envelopeDocuments;
    }

    // Session storage method
    async _storeInSession(envelopeDocuments) {
        this.req.session.envelopeDocuments = envelopeDocuments;
        return envelopeDocuments;
    }

    // Placeholder for database storage method
    async _storeInDatabase(envelopeDocuments) {
        // TODO: Implement database storage logic
        // This could involve:
        // - Checking if envelope already exists
        // - Inserting or updating envelope documents
        // - Potentially using an ORM like Sequelize or Mongoose
        
        console.warn('Database storage not implemented. Using session storage.');
        return this._storeInSession(envelopeDocuments);
    }
}

module.exports = DocusignDocumentsService;