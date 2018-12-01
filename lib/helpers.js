/**
 * Helpers fo various tasks
 */

// Dependecies
const path = require('path');
const fs = require('fs');
const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');
const config = require('./config');

// Container for all the helpers
const helpers = {};

/**
 *  Get static asstes
 * @param {string} fileName
 * @param {(error: boolean | strign, data: any ) => void} callback
 */
helpers.getStaticAssets = (fileName, callback) => {
  const _fileName = typeof fileName === 'string' && fileName.length > 0 ? fileName : false;
  if (_fileName) {
    const publicDir = path.join(__dirname, '/../public/');
    fs.readFile(`${publicDir}${fileName}`, (err, data) => {
      if (!err && data) {
        callback(false, data);
      } else {
        callback('No file could be found');
      }
    });
  } else {
    callback('A valid file name was not specified');
  }
};

/**
 * Get template
 * @param {string} templateName
 * @param {{}} data
 * @param {(err: boolean |  string; str: string) => void} callback
 */
helpers.getTemplate = (templateName, data, callback) => {
  const _templateName = typeof templateName === 'string' && templateName.length > 0 ? templateName : false;

  if (templateName) {
    const templateDir = path.join(__dirname, '/../templates/');
    fs.readFile(`${templateDir}${_templateName}.html`, 'utf-8', (err, str) => {
      if (!err && str && str.length > 0) {
        // To do interpolation on the string
        callback(false, helpers.interpolate(str, data));
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
};

/**
 * Add the universal header and footer to a string, and pass provided data object
 * @param {string} str
 * @param {{}} data
 * @param {(err: boolean | string, str?: string) => void} callback
 */
helpers.addUniversalTemplates = (str, data, callback) => {
  const _str = typeof str === 'string' && str.length > 0 ? str : '';
  const _data = typeof data === 'object' && data !== null ? data : {};

  // Get the header
  helpers.getTemplate('_header', _data, (err, headerString) => {
    if (!err && headerString) {
      // Get the footer
      helpers.getTemplate('_footer', data, (footerError, footerString) => {
        if (!footerError && footerString) {
          callback(false, `${headerString}${_str}${footerString}`);
        } else {
          callback('Could not find the footer template');
        }
      });
    } else {
      callback('Could not find the header template');
    }
  });
};

/**
 * Take a gives string and a data object and find/replace all the keys whithin it
 * @param {string} str
 * @param {{}} data
 * @return {string}
 */
helpers.interpolate = (str, data) => {
  let _str = typeof str === 'string' && str.length > 0 ? str : '';
  const _data = typeof data === 'object' && data !== null ? data : {};

  // Add the templateGlobals to the data object, prepending their key name with "global."
  Object.entries(config.templateGlobals)
    .forEach((item) => {
      _data[`global.${item[0]}`] = item[1];
    });

  // For each key in the data object, insert its value into the string at the correspondig placeholder
  Object.entries(_data)
    .forEach((item) => {
      const replace = item[1];
      const find = `{${item[0]}}`;
      _str = _str.replace(find, replace);
    });

  return _str;
};

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

/**
 * Create random string with possible characters
 * @param {number} strLength
 * @return {false | string}
 */
helpers.createRandomString = (strLength) => {
  const length = typeof strLength === 'number' && strLength > 0 ? strLength : false;
  if (length) {
    const possibleCharacters = 'absdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    let str = '';
    for (let i = 0; i < length; i++) {
      // Get a random charackter from the possible characters string
      const randomCharacter = possibleCharacters
        .charAt(Math.floor(Math.random() * possibleCharacters.length));
      // Append this character to the final string
      str += randomCharacter;
    }

    // Return final string
    return str;
  }

  return false;
};


// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  // Validate parameters
  const _phone = typeof phone === 'string' && phone.trim().length === 10 ? phone : false;
  const _msg = typeof msg === 'string' && msg.trim().length > 0 ? msg : false;

  if (_phone && _msg) {
    // Configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: `+1${_phone}`,
      Body: msg,
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accoundSid}:cinfig.twilio.authToken`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if the request went through
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback(`Status code returned was ${status}`);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', (e) => {
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    callback('Giving parameters where missing or invalid');
  }
};

// Export module
module.exports = helpers;
