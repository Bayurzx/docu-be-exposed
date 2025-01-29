const settings = require('./appsettings.json');

const dsOauthServer = settings.production
  ? 'https://account.docusign.com'
  : 'https://account-d.docusign.com';

const config = {
  dsOauthServer,
  ...settings
};

module.exports = { config };
