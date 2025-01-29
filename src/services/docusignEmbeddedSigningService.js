const docusign = require('docusign-esign');
const puppeteer = require('puppeteer');
const path = require('path');
const DocusignAuthService = require('./docusignAuth');
const { AuthenticationError, handleError } = require('../errors/AuthenticationError');
const { processContractWithLLM } = require('../utils/fullTest');

class DocusignEmbeddedSigningService {
    constructor(req) {
        this._debug_prefix = 'DocusignEmbeddedSigning';
        this.req = req;
        this._debug = true;
        this.authService = new DocusignAuthService(req);
        this.minimumBufferMin = 3;
    }

    async sendEnvelopeForEmbeddedSigning({ envelopeArgs }) {
        try {
            const isTokenOK = this.authService.checkToken(this.minimumBufferMin);
            if (!isTokenOK) {
                await this.authService.authenticate();
            }

            let dsApiClient = new docusign.ApiClient();
            dsApiClient.setBasePath(this.req.session.auth.basePath);
            dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + this.req.session.auth.accessToken);

            let envelopesApi = new docusign.EnvelopesApi(dsApiClient);

            const envelope = await this._makeEnvelope(envelopeArgs);
            const envelopeResults = await envelopesApi.createEnvelope(
                this.req.session.auth.accountId,
                { envelopeDefinition: envelope }
            );
            const envelopeId = envelopeResults.envelopeId;

            // Create Recipient View (potentially for first signer)
            const viewRequest = this._makeRecipientViewRequest({
                ...envelopeArgs,
                signerEmail: envelopeArgs.signer1Email,
                signerName: envelopeArgs.signer1Name,
                signerClientId: envelopeArgs.signer1ClientId
            });

            const viewResults = await envelopesApi.createRecipientView(
                this.req.session.auth.accountId,
                envelopeId,
                { recipientViewRequest: viewRequest }
            );

            return {
                envelopeId: envelopeId,
                redirectUrl: viewResults.url
            };

        } catch (error) {
            console.log("error", error);

            // Handle specific authentication errors and other errors
            handleError(error, this._debug_prefix)
        }
    }

    async _makeEnvelope(args) {
        // Signer 1
        let signer1 = docusign.Signer.constructFromObject({
            email: args.signer1Email,
            name: args.signer1Name,
            clientUserId: args.signer1ClientId,
            recipientId: '1',
            routingOrder: '1'
        });

        // Signer 1 Tabs (where they will sign)
        const signer1Tabs = docusign.Tabs.constructFromObject({
            signHereTabs: [
                docusign.SignHere.constructFromObject({
                    anchorString: '**signature_1**',
                    anchorUnits: 'pixels',
                    anchorXOffset: '20',
                    anchorYOffset: '10'
                })
            ]
        });
        signer1.tabs = signer1Tabs;

        // Signer 2
        let signer2 = docusign.Signer.constructFromObject({
            email: args.signer2Email,
            name: args.signer2Name,
            clientUserId: args.signer2ClientId,
            recipientId: '2',
            routingOrder: '2'
        });

        // Signer 2 Tabs (where they will sign)
        const signer2Tabs = docusign.Tabs.constructFromObject({
            signHereTabs: [
                docusign.SignHere.constructFromObject({
                    anchorString: '**signature_2**',
                    anchorUnits: 'pixels',
                    anchorXOffset: '20',
                    anchorYOffset: '10'
                })
            ]
        });
        signer2.tabs = signer2Tabs;

        // Carbon Copy Recipient
        let cc = docusign.CarbonCopy.constructFromObject({
            email: args.ccEmail,
            name: args.ccName,
            recipientId: '3',
            routingOrder: '3'
        });

        // Recipients
        let recipients = docusign.Recipients.constructFromObject({
            signers: [signer1, signer2],
            carbonCopies: [cc]
        });

        // Convert HTML to Base64 PDF
        let document = new docusign.Document();
        document.name = path.basename(args.docFile);
        document.documentId = '3';
        document.documentBase64 = await this._getHTMLDocument(args);
        document.fileExtension = 'pdf';

        // Envelope Definition
        let env = new docusign.EnvelopeDefinition();
        env.emailSubject = 'Please Sign the Document';
        env.documents = [document];
        env.recipients = recipients;
        env.status = args.status || 'sent';

        return env;
    }

    async _getHTMLDocument(args) {
        try {
            const html = await processContractWithLLM(args.docFile, JSON.stringify(args));
            const pdfBase64 = await this._convertHtmlToPdfBase64(html);
            return pdfBase64;
        } catch (error) {
            console.error('Error generating HTML document or PDF:', error);
            throw new Error('Unable to process HTML document');
        }


    }

    async _convertHtmlToPdfBase64(htmlContent) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        try {
            await page.setContent(htmlContent, { waitUntil: 'load' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '6mm', right: '6mm' }
            });
            
            return Buffer.from(pdfBuffer).toString('base64');
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }


    _makeRecipientViewRequest(args) {
        let viewRequest = new docusign.RecipientViewRequest();

        viewRequest.returnUrl = args.dsReturnUrl + '?state=123';
        viewRequest.authenticationMethod = 'none';
        viewRequest.email = args.signerEmail;
        viewRequest.userName = args.signerName;
        viewRequest.clientUserId = args.signerClientId;
        viewRequest.pingFrequency = args.pingFrequency || 600;
        viewRequest.pingUrl = args.dsPingUrl;

        return viewRequest;
    }
}

module.exports = DocusignEmbeddedSigningService;