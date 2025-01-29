const docusign = require('docusign-esign');
const DocusignAuthService = require('./docusignAuth');
const dsConfig = require('../../config/index.js').config;

class DocusignListEnvelopeRecipientService {
    constructor(req) {
        this._debug_prefix = 'DocusignListEnvelopeRecipient';
        this.req = req;
        this._debug = true;
        this.authService = new DocusignAuthService(req);
        this.minimumBufferMin = 3;
    }

    async listEnvelopeRecipients(envelopeId) {
        // Check token with minimum buffer time
        const isTokenOK = this.authService.checkToken(this.minimumBufferMin);
        if (!isTokenOK) {
            await this.authService.authenticate();
        }

        // Initialize API client
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(this.req.session.auth.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + this.req.session.auth.accessToken);
        
        // Create envelope API instance
        const envelopesApi = new docusign.EnvelopesApi(dsApiClient);

        // Get envelope information
        const results = await envelopesApi.listRecipients(
            this.req.session.auth.accountId,
            envelopeId,
            null
        );

        return results;
    }
}

module.exports = DocusignListEnvelopeRecipientService;