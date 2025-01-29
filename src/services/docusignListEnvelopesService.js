// src\services\docusignListEnvelopesService.js
const docusign = require('docusign-esign');
const moment = require('moment');
const DocusignAuthService = require('./docusignAuth');
const dsConfig = require('../../config/index.js').config;

class DocusignListEnvelopesService {
    constructor(req) {
        this._debug_prefix = 'DocusignListEnvelopes';
        this.req = req;
        this._debug = true;
        this.authService = new DocusignAuthService(req);
        this.minimumBufferMin = 3;
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

    async listEnvelopes({
        fromDate = moment().subtract(30, 'days').format('YYYY-MM-DD'),
        toDate = moment().format('YYYY-MM-DD'),
        status = null,
        envelopeIds = null,
        email = null,
        userName = null,
        fromToStatus = null,
        orderBy = null,
        pageSize = 10,
        startPosition = 0
    } = {}) {
        const envelopesApi = await this._initApiClient();

        // Prepare options for listing envelopes
        const options = {
            fromDate: fromDate,
            toDate: toDate,
            pageSize: pageSize,
            startPosition: startPosition
        };

        // Add optional filters
        if (status) options.status = status;
        if (envelopeIds) options.envelopeIds = envelopeIds;
        if (email && userName) {
            options.userName = userName;
            options.email = email;
        }
        if (fromToStatus) options.fromToStatus = fromToStatus;
        if (orderBy) options.orderBy = orderBy;

        // List envelope status changes
        const results = await envelopesApi.listStatusChanges(
            this.req.session.auth.accountId, 
            options
        );

        return results;
    }

    parseEnvelopeResults(results) {
        return results.envelopes.map(envelope => ({
            envelopeId: envelope.envelopeId,
            status: envelope.status,
            createdDateTime: envelope.createdDateTime,
            sentDateTime: envelope.sentDateTime,
            completedDateTime: envelope.completedDateTime,
            recipients: envelope.recipients?.signers?.map(signer => ({
                email: signer.email,
                name: signer.name,
                status: signer.status
            }))
        }));
    }
}

module.exports = DocusignListEnvelopesService;