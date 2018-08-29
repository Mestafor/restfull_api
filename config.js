/**
 * Create and export confoguration variables
 */

// Container for all the enviroments
const environments = {};

// Staging (default) environments
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
};

// Production environments
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
};

// Detwermine wich environment was passed as a command0line argument
const currentEnvironmant = typeof process.env.NODE_ENV === 'string'
  ? process.env.NODE_ENV.toLowerCase()
  : '';

// Check that the current environment is one of the environments above, if not, default to staging
const environmentToExport = typeof environments[currentEnvironmant] === 'object'
  ? environments[currentEnvironmant]
  : environments.staging;

// Export the module
module.exports = environmentToExport;
