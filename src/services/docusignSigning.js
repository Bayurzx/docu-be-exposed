// src/services/docusignSigning.js
const docusign = require('docusign-esign');
const path = require('path');
const fs = require('fs');
const DocusignAuthService = require('./docusignAuth');
const dsConfig = require('../../config/index.js').config;

class DocusignSigningService {
    constructor(req) {
        this._debug_prefix = 'DocusignSigning';
        this.req = req;
        this._debug = true;
        this.authService = new DocusignAuthService(req);
    }

    async startEmbeddedSigning({ signerEmail, signerName, documentPath }) {
        // Ensure user is authenticated
        if (!this.authService.checkToken()) {
            await this.authService.authenticate();
        }

        const envelopeArgs = {
            signerEmail,
            signerName,
            signerClientId: dsConfig.dsClientId,  // Use from config instead of env directly
            dsReturnUrl: dsConfig.appUrl + '/ds-return',
            dsPingUrl: dsConfig.appUrl + '/', // Url that will be pinged by the DocuSign signing via Ajax,
            docFile: documentPath || path.resolve(__dirname, '../../documents/default.pdf')
        };

        const args = {
            accessToken: this.authService.accessToken,
            basePath: this.authService.basePath,
            accountId: this.authService.accountId,
            envelopeArgs
        };

        return await this.sendEnvelopeForEmbeddedSigning(args);
    }

    async sendEnvelopeForEmbeddedSigning(args) {
        const dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);

        const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
        const envelope = this.makeEnvelope(args.envelopeArgs);

        // Create the envelope
        const createResult = await envelopesApi.createEnvelope(args.accountId, {
            envelopeDefinition: envelope
        });

        // Create the recipient view
        const viewRequest = this.makeRecipientViewRequest(args.envelopeArgs);
        const viewResult = await envelopesApi.createRecipientView(
            args.accountId,
            createResult.envelopeId,
            { recipientViewRequest: viewRequest }
        );

        return {
            envelopeId: createResult.envelopeId,
            redirectUrl: viewResult.url
        };
    }

    makeEnvelope({ signerEmail, signerName, signerClientId, docFile }) {
        // Create document object
        const docPdfBytes = fs.readFileSync(docFile);
        const doc1 = new docusign.Document();
        const doc1b64 = Buffer.from(docPdfBytes).toString('base64');

        doc1.documentBase64 = doc1b64;
        doc1.name = 'Document for Signing'; // can be different from actual file name
        doc1.fileExtension = 'pdf';
        doc1.documentId = '3';

        // Create the envelope definition
        const env = new docusign.EnvelopeDefinition();
        env.emailSubject = 'Please sign this document';
        env.documents = [doc1];

        // Create a signer recipient to sign the document
        const signer1 = docusign.Signer.constructFromObject({
            email: signerEmail,
            name: signerName,
            clientUserId: signerClientId,
            recipientId: 1
        });

        // Create signHere fields (tabs) on the documents
        const signHere1 = docusign.SignHere.constructFromObject({
            anchorString: '/sn1/',
            anchorYOffset: '10',
            anchorUnits: 'pixels',
            anchorXOffset: '20'
        });

        // Add the tabs to the signer
        const signer1Tabs = docusign.Tabs.constructFromObject({
            signHereTabs: [signHere1]
        });
        signer1.tabs = signer1Tabs;

        // Add the recipient to the envelope object
        const recipients = docusign.Recipients.constructFromObject({
            signers: [signer1]
        });
        env.recipients = recipients;

        // Request that the envelope be sent by setting status to "sent"
        env.status = 'sent';

        return env;
    }

    makeRecipientViewRequest({ signerEmail, signerName, signerClientId, dsReturnUrl, dsPingUrl }) {
        const viewRequest = new docusign.RecipientViewRequest();
    
        // Add state parameter for security
        viewRequest.returnUrl = `${dsReturnUrl}?state=${Buffer.from(signerEmail).toString('base64')}`;
        
        viewRequest.authenticationMethod = 'none';
        viewRequest.email = signerEmail;
        viewRequest.userName = signerName;
        viewRequest.clientUserId = signerClientId;
    
        // Add ping functionality
        if (dsPingUrl) {
            viewRequest.pingFrequency = 600; // seconds
            viewRequest.pingUrl = dsPingUrl; // only works with https URLs
        }
    
        return viewRequest;
    }

    async getEnvelopeStatus(envelopeId) {
        if (!this.authService.checkToken()) {
            await this.authService.authenticate();
        }

        const dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(this.authService.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + this.authService.accessToken);

        const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
        return await envelopesApi.getEnvelope(this.authService.accountId, envelopeId);
    }
}

module.exports = DocusignSigningService;
