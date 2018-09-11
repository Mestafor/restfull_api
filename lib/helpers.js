/**
 * Helpers fo various tasks
 */

// Dependecies
const crypto = require('crypto');
const config = require('./config');

// Container for all the helpers
const helpers = {};

/**
 * Validate users payload properties
 * @param {any} property - some property
 * @param {function} validFn - function to extra validate property
 */
helpers.validateUsersData = (property, validFn = () => true) => {
  const type = typeof property;
  let result = false;
  if (type === 'string') {
    const trimedProperty = property.trim();
    result = trimedProperty.length > 0 && validFn(trimedProperty)
      ? trimedProperty
      : false;
  } else if (type === 'boolean') {
    result = property && validFn(property);
  }

  return result;
};

/**
 * Create the SHA256 hash
 * @param {*} str
 */
helpers.hash = (str) => {
  if (typeof str === 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
  }

  return false;
};

/**
 * Parse a JSON string to an object in all cases, without throwing
 * @param {string} str
 */
helpers.parseJsonToObject = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
};

// Export module
module.exports = helpers;
