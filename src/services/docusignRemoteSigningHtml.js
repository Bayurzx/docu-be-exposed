// src\services\docusignRemoteSigningHtml.js
const docusign = require('docusign-esign');
const DocusignAuthService = require('./docusignAuth');
const dsConfig = require('../../config/index.js').config;
const extractHtmlFromFile = require('../utils/extractHtml'); // Adjust the path if necessary
const { processContractWithLLM, concateDocPath, userData, } = require('../utils/fullTest.js');

class DocusignRemoteSigningServiceHtml {
    constructor(req) {
        this._debug_prefix = 'DocusignRemoteSigningHtml';
        this.req = req;
        this._debug = true;
        this.authService = new DocusignAuthService(req);
    }

    async sendEnvelopeForSigning({ documentData, documentType }) {
        // Ensure user is authenticated
        if (!this.authService.checkToken()) {
            await this.authService.authenticate();
        }

        // Create envelope definition
        const envelopeDefinition = await this._createEnvelopeDefinition({
            documentData,
            documentType,
            status: 'sent' // Send immediately
        });

        // Initialize API client
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(this.req.session.auth.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + this.req.session.auth.accessToken);

        // Create envelope
        const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
        const results = await envelopesApi.createEnvelope(this.req.session.auth.accountId, {
            envelopeDefinition: envelopeDefinition
        });

        return { envelopeId: results.envelopeId };
    }

    async _createDocument({documentData, documentType}) {
        // const html = `
        //     <!DOCTYPE html>
        //     <html>
        //         <head>
        //             <meta charset="UTF-8">
        //         </head>
        //         <body style="font-family: sans-serif;">
        //             <h1 style="color: navy;">Agreement</h1>

        //             <p>This agreement is made on ${new Date().toLocaleDateString()} between:</p>

        //             <div style="margin: 20px 0;">
        //                 <h3>First Party:</h3>
        //                 <p>Name: ${documentData.signer1Name}<br>
        //                 Signature: <span style="color:white;">**signature_1**</span></p>
        //             </div>

        //             <div style="margin: 20px 0;">
        //                 <h3>Second Party:</h3>
        //                 <p>Name: ${documentData.signer2Name}<br>
        //                 Signature: <span style="color:white;">**signature_2**</span></p>
        //             </div>

        //             <div style="margin: 20px 0;">
        //                 <h2>Terms and Conditions</h2>
        //                 <p>${documentData.terms || 'Default terms and conditions text here.'}</p>
        //             </div>

        //             <div style="margin: 20px 0;">
        //                 <p>Date: ${new Date().toLocaleDateString()}</p>
        //             </div>
        //         </body>
        //     </html>`;

        // ************************* separate ************************* 
        // const html = processFile(1);  // not using this. implementing llm directly
        // ************************* separate *************************
        
        // concateDocPath is where I stored all doc. documentName is where I stored all the files
        // documentData is recieved from the request body

        const contractPath = concateDocPath + documentType // Name of the contract is documentType 
        
        const html = await processContractWithLLM(contractPath, JSON.stringify(documentData))
        // console.log('html', html)


        return html;
    }

    async _createEnvelopeDefinition({ documentData, documentType, status }) {
        // signer1Email, signer1Name, signer2Email, signer2Name, ccEmail, ccName, documentData

        let signer1Email = documentData.signer1Email;
        let signer2Email = documentData.signer2Email;
        let signer1Name = documentData.signer1Name;
        let signer2Name = documentData.signer2Name;
        // Create HTML document
        const htmlDocument = await this._createDocument({
            signer1Name,
            signer2Name,
            documentType,
            documentData
        });

        // Create document object
        const document = docusign.Document.constructFromObject({
            documentBase64: Buffer.from(htmlDocument).toString('base64'),
            name: documentType, // this is the contract name
            fileExtension: 'html',
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
        // This was hardcoded for testing purposes
        const cc = docusign.CarbonCopy.constructFromObject({
            email: "docutest@iglumtech.com",
            name: "DocuTest",
            recipientId: '3',
            routingOrder: '3'
        });

        // Create signature fields (tabs) for signer 1
        const signHere1 = docusign.SignHere.constructFromObject({
            anchorString: '**signature_1**',
            anchorYOffset: '10',
            anchorUnits: 'pixels',
            anchorXOffset: '20'
        });

        // Create signature fields (tabs) for signer 2
        const signHere2 = docusign.SignHere.constructFromObject({
            anchorString: '**signature_2**',
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


async function processFile(userInput = 1) {
    try {
        const textContent = await extractHtmlFromFile(userInput); // Get the text content
        console.log('Extracted text from the file:');
        console.log(textContent);  // Output the extracted text
    } catch (err) {
        console.error('Error:', err.message);
    }
}



module.exports = DocusignRemoteSigningServiceHtml;