/**
 * Create and export confoguration variables
 */

const NODE_ENV = 'NODE_ENV';
const STAGING_PORT = 'STAGING_PORT';
const PRODUCTION_PORT = 'PRODUCTION_PORT';

/**
 * Return enviroment varible value by the name
 * @param {string} variableName
 * @param {string | number} defaultValue
 * @param {string} type
 * @return {string | number}
 */
function getEnvVariable(variableName, defaultValue, type = 'string') {
  const value = typeof process.env[variableName] === 'string'
    ? process.env[variableName]
    : defaultValue;

  switch (type) {
    case 'number':
      return parseInt(value, 10);
    default:
      return value.toLowerCase();
  }
}

// Container for all the enviroments
const environments = {};

const stagingPort = getEnvVariable(STAGING_PORT, 3000, 'number');
// Staging (default) environments
environments.staging = {
  httpPort: stagingPort,
  httpsPort: stagingPort + 1,
  envName: 'staging',
  hashingSecret: 'thisIsSecret',
  maxChecks: 5,
  twilio: {
    accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken: '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone: '+15005550006',
  },
};

const productionPort = getEnvVariable(PRODUCTION_PORT, 5000, 'number');
// Production environments
environments.production = {
  httpPort: productionPort,
  httpsPort: productionPort + 1,
  envName: 'production',
  hashingSecret: 'thisIsAlsoSecret',
  maxChecks: 5,
};

// Detwermine wich environment was passed as a command0line argument
const currentEnvironmant = getEnvVariable(NODE_ENV, '');

// Check that the current environment is one of the environments above, if not, default to staging
const environmentToExport = typeof environments[currentEnvironmant] === 'object'
  ? environments[currentEnvironmant]
  : environments.staging;

// Export the module
module.exports = environmentToExport;
