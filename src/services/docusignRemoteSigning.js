const docusign = require('docusign-esign');
const path = require('path');
const fs = require('fs');
const DocusignAuthService = require('./docusignAuth');
const dsConfig = require('../../config/index.js').config;

class DocusignRemoteSigningService {
    constructor(req) {
        this._debug_prefix = 'DocusignRemoteSigning';
        this.req = req;
        this._debug = true;
        this.authService = new DocusignAuthService(req);
    }

    async sendEnvelopeForSigning({ signer1Email, signer1Name, signer2Email, signer2Name, ccEmail, ccName, documentPath }) {
        // Ensure user is authenticated
        if (!this.authService.checkToken()) {
            await this.authService.authenticate();
        }

        // Create envelope definition
        const envelopeDefinition = await this._createEnvelopeDefinition({
            signer1Email,
            signer1Name,
            signer2Email,
            signer2Name,
            ccEmail,
            ccName,
            documentPath,
            status: 'sent' // Send immediately
        });

        // Initialize API client
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(this.req.session.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + this.req.session.accessToken);
        
        // Create envelope
        const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
        const results = await envelopesApi.createEnvelope(this.req.session.accountId, {
            envelopeDefinition: envelopeDefinition
        });

        return { envelopeId: results.envelopeId };
    }

    async _createEnvelopeDefinition({ signer1Email, signer1Name, signer2Email, signer2Name, ccEmail, ccName, documentPath, status }) {
        // Read document file
        const documentBuffer = await fs.promises.readFile(documentPath);
        const documentBase64 = Buffer.from(documentBuffer).toString('base64');

        // Create document object
        const document = docusign.Document.constructFromObject({
            documentBase64: documentBase64,
            name: path.basename(documentPath), // Use filename as document name
            fileExtension: path.extname(documentPath).substring(1),
            documentId: '1'
        });

        // Create signer 1
        const signer1 = docusign.Signer.constructFromObject({
            email: signer1Email,
            name: signer1Name,
            recipientId: '1',
            routingOrder: '1'
        });

        // Create signer 2
        const signer2 = docusign.Signer.constructFromObject({
            email: signer2Email,
            name: signer2Name,
            recipientId: '2',
            routingOrder: '2'
        });

        // Create CC recipient
        const cc = docusign.CarbonCopy.constructFromObject({
            email: ccEmail,
            name: ccName,
            recipientId: '3',
            routingOrder: '3'
        });

        // Create signature fields (tabs) for signer 1
        const signHere1 = docusign.SignHere.constructFromObject({
            anchorString: '/sn1/',
            anchorYOffset: '10',
            anchorUnits: 'pixels',
            anchorXOffset: '20'
        });

        // Create signature fields (tabs) for signer 2
        const signHere2 = docusign.SignHere.constructFromObject({
            anchorString: '/sn2/',
            anchorYOffset: '10',
            anchorUnits: 'pixels',
            anchorXOffset: '20'
        });

        // Add signature fields to signers
        const signer1Tabs = docusign.Tabs.constructFromObject({
            signHereTabs: [signHere1]
        });
        signer1.tabs = signer1Tabs;

        const signer2Tabs = docusign.Tabs.constructFromObject({
            signHereTabs: [signHere2]
        });
        signer2.tabs = signer2Tabs;

        // Create envelope definition
        const envelopeDefinition = new docusign.EnvelopeDefinition();
        envelopeDefinition.emailSubject = 'Please sign this document';
        envelopeDefinition.documents = [document];
        envelopeDefinition.recipients = docusign.Recipients.constructFromObject({
            signers: [signer1, signer2],
            carbonCopies: [cc]
        });
        envelopeDefinition.status = status;

        return envelopeDefinition;
    }
}

module.exports = DocusignRemoteSigningService;