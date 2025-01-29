const moment = require('moment');
const fs = require('fs');
const docusign = require('docusign-esign');
const dsConfig = require('../../config/index.js').config;

class DocusignAuthService {
    constructor(req) {
        this._debug_prefix = 'DocusignAuth';
        this.req = req;
        this._debug = true;

        // Initialize from session if it exists
        if (req.session && req.session.auth) {
            this.accessToken = req.session.auth.accessToken;
            this.accountId = req.session.auth.accountId;
            this.accountName = req.session.auth.accountName;
            this.basePath = req.session.auth.basePath;
            this._tokenExpiration = req.session.auth.tokenExpirationTimestamp;
        }

        this.scopes = 'signature impersonation';

        if (!req.session) {
            throw new Error('Session middleware is not properly initialized');
        }
    }

    /**
     * Main authentication method
     * Checks token and initiates JWT authentication if needed
     */
    async authenticate() {
        try {
            if (!this.checkToken()) {
                const authData = await this.getToken();
                const userInfo = await this.getUserInfo();

                // Store authentication data in session
                this.req.session.auth = {
                    accountId: userInfo.accountId,
                    accountName: userInfo.accountName,
                    basePath: userInfo.basePath,
                    accessToken: authData.accessToken,
                    tokenExpirationTimestamp: authData.tokenExpirationTimestamp
                };

                // Update instance properties
                this.accountId = userInfo.accountId;
                this.accountName = userInfo.accountName;
                this.basePath = userInfo.basePath;
                this.accessToken = authData.accessToken;
                this._tokenExpiration = authData.tokenExpirationTimestamp;

                if (this._debug) {
                    console.log('Authentication completed:', {
                        hasToken: !!this.accessToken,
                        accountId: this.accountId,
                        sessionAuth: this.req.session.auth
                    });
                }
            }

            return {
                accountId: this.accountId,
                accountName: this.accountName,
                basePath: this.basePath
            };
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    /**
     * Check if current token is valid
     */
    checkToken(bufferMin = 30) {
        if (this._debug) {
            console.log('Current token state:', {
                hasToken: !!this.accessToken,
                expiration: this._tokenExpiration,
                sessionAuth: this.req.session.auth
            });
        }

        let noToken = !this.accessToken || !this._tokenExpiration;
        if (noToken) {
            if (this._debug) console.log('No token found');
            return false;
        }

        let now = moment();
        let tokenExpiration = moment(this._tokenExpiration);
        let needToken = tokenExpiration.subtract(bufferMin, 'm').isBefore(now);

        if (this._debug) {
            console.log('Token check:', {
                now: now.format(),
                expiration: tokenExpiration.format(),
                needToken
            });
        }

        return !needToken;
    }

    /**
     * Get new JWT token from DocuSign
     */
    async getToken() {
        const jwtLifeSec = 10 * 60;
        const dsApi = new docusign.ApiClient();
        const rsaKey = fs.readFileSync(dsConfig.privateKeyLocation);

        dsApi.setOAuthBasePath(dsConfig.dsOauthServer.replace('https://', ''));

        const results = await dsApi.requestJWTUserToken(
            dsConfig.dsJWTClientId,
            dsConfig.impersonatedUserGuid,
            this.scopes,
            rsaKey,
            jwtLifeSec
        );

        const expiresAt = moment().add(results.body.expires_in, 's').subtract(10, 'm');
        this.accessToken = results.body.access_token;
        this._tokenExpiration = expiresAt;

        return {
            accessToken: results.body.access_token,
            tokenExpirationTimestamp: expiresAt
        };
    }

    /**
     * Get user information from DocuSign
     */
    async getUserInfo() {
        const dsApi = new docusign.ApiClient();
        const targetAccountId = dsConfig.targetAccountId;

        dsApi.setOAuthBasePath(dsConfig.dsOauthServer.replace('https://', ''));
        const results = await dsApi.getUserInfo(this.accessToken);

        let accountInfo;
        if (!targetAccountId) {
            accountInfo = results.accounts.find(account => account.isDefault === 'true');
        } else {
            accountInfo = results.accounts.find(account => account.accountId === targetAccountId);
        }

        if (!accountInfo) {
            throw new Error(`Target account ${targetAccountId} not found!`);
        }

        this.accountId = accountInfo.accountId;
        this.accountName = accountInfo.accountName;
        this.basePath = accountInfo.baseUri + '/restapi';

        return {
            accountId: this.accountId,
            accountName: this.accountName,
            basePath: this.basePath
        };
    }

    /**
     * Handle OAuth callback after consent
     */
    async handleCallback() {
        try {
            const authData = await this.getToken();
            const userInfo = await this.getUserInfo();

            // Ensure session exists and initialize if needed
            if (!this.req.session) {
                this.req.session = {};
            }

            // Store authentication data in session
            this.req.session.auth = {
                accountId: userInfo.accountId,
                accountName: userInfo.accountName,
                basePath: userInfo.basePath,
                accessToken: authData.accessToken,
                tokenExpirationTimestamp: authData.tokenExpirationTimestamp
            };
        } catch (error) {
            console.error('Callback handling error:', error);
            throw error;
        }
    }

    /**
     * Check current authentication status
     */
    async checkAuthStatus() {
        const isAuthenticated = this.checkToken();

        if (this._debug) {
            console.log('Auth status check:', {
                isAuthenticated,
                sessionAuth: this.req.session.auth,
                currentToken: this.accessToken,
                expiration: this._tokenExpiration
            });
        }

        return {
            isAuthenticated,
            accountId: this.accountId,
            accountName: this.accountName,
            basePath: this.basePath,
            tokenExpiration: this._tokenExpiration
        };
    }

    /**
     * Logout and clear all authentication data
     */
    /**
     * Logout and clear all authentication data
     * @returns {Object} Status of the logout operation
     */
    logout(req, res) {
        if (req.session) {
            req.session.auth = null;
        }

        this.accessToken = null;
        this._tokenExpiration = null;
        this.accountId = null;
        this.accountName = null;
        this.basePath = null;

        if (this._debug) {
            console.log('Logout completed, session cleared');
        }

        return {
            success: true,
            message: 'Successfully logged out',
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = DocusignAuthService;