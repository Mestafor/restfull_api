/**
 * Handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');


// Define the heandlers
const handlers = {};

// Container for the users submethods
handlers._users = {};

/**
 * Users - post
 * Required data: firstName, lastName, phone, password, tosAgree
 * Optional data: none
 * @param {object} data - request object
 * @param {function} callback - callback function
 */
handlers._users.post = (data, callback) => {
  // Check that all required fields are filled out
  const { payload } = data;
  const requiredData = ['firstName', 'lastName', 'phone', 'password', 'tosAgree'];
  const checkedRequiredData = requiredData.map((item) => {
    return helpers.validateUsersData(payload[item], (property) => {
      switch (property) {
        case 'phone':
          return property.length === 10;
        default:
          return true;
      }
    });
  }).filter(item => item);

  if (checkedRequiredData.length === requiredData.length) {
    // Make sure tha the user doesnt already exist
    _data.read('users', payload.phone, (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(payload.password);

        if (hashedPassword) {
          // Create user object
          delete payload.password;
          const userObject = Object.assign({ ...payload }, { hashedPassword });

          // Store the user
          _data.create('users', payload.phone, userObject, (createError) => {
            if (createError) {
              console.log(createError);
              callback(500, { error: 'Could not create the new user' });
            } else {
              callback(200);
            }
          });
        } else {
          callback(500, { error: 'Could not hash the user\'s password' });
        }
      } else {
        callback(400, { error: 'A user with that phone number already exists' });
      }
    });
  } else {
    callback(400, { error: 'Missing required fields' });
  }
};

/**
 * User - get
 * Required data: phone
 * Optional data: none
 * @TODO Only let an authenticated user access their object. Dont't let them access anyone elses
 * @param {*} data
 * @param {*} callback
 */
handlers._users.get = (data, callback) => {
  // Check that phone number is valid
  const queryObject = data.queryStringObject;
  const phone = typeof queryObject.phone === 'string' && queryObject.phone.trim().length === 10
    ? queryObject.phone.trim()
    : false;

  if (phone) {
    // Lookup the user
    _data.read('users', phone, (err, userData) => {
      if (err) {
        callback(404);
      } else {
        // Remove the hashed password before returning it to the request
        const responseData = userData;
        delete responseData.hashedPassword;
        callback(200, userData);
      }
    });
  } else {
    callback(400, { error: 'Missing required string' });
  }
};

// Users - put
/**
 *  User - put
 * Required data - phone
 * Optional data - firstName, lastName, password (at least one must be specified
 * @TODO Only let an authenticated user update their own object. Dont let them update anyone else
 * @param {*} data
 * @param {*} callback
 */
handlers._users.put = (data, callback) => {
  // Check for the required filed
  const { payload } = data;
  const phone = typeof payload.phone === 'string' && payload.phone.trim().length === 10
    ? payload.phone.trim()
    : false;

  // Check for the optional fields
  const firstName = typeof payload.firstName === 'string' && payload.firstName.trim().length > 0
    ? payload.firstName.trim() : false;
  const lastName = typeof payload.lastName === 'string' && payload.lastName.trim().length > 0
    ? payload.lastName.trim() : false;
  const password = typeof payload.password === 'string' && payload.password.trim().length > 0
    ? payload.password.trim() : false;

  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {
      // Lookup the user
      _data.read('users', phone, (err, userData) => {
        if (!err && userData) {
          // Update the fields necessary
          const responseData = userData;
          if (firstName) {
            responseData.firstName = firstName;
          }
          if (lastName) {
            responseData.lastName = lastName;
          }
          if (password) {
            const hashedPassword = helpers.hash(password);
            if (hashedPassword) {
              responseData.hashedPassword = helpers.hash(password);
            }
          }
          _data.update('users', phone, responseData, (updateErr) => {
            if (updateErr) {
              callback(500, { error: 'Could not update the user' });
            } else {
              callback(200);
            }
          });
        } else {
          callback(400, { error: 'The specified user does not exist' });
        }
      });
    } else {
      callback(400, { error: 'Missing fields to update' });
    }
  } else {
    callback(404, { error: 'Missing required field' });
  }
};

/**
 * Users - delete
 * Required data: phone
 * Optional data: none
 * @TODO Only let an authenticated user delete their own object account. Dont let them delete anyone else
 * @TODO Clenup (delete) any other data files associated with this user
 * @param {*} data
 * @param {*} callback
 */
handlers._users.delete = (data, callback) => {
  // Check required field
  const { payload } = data;
  const phone = typeof payload.phone === 'string' && payload.phone.trim().length === 10
    ? payload.phone.trim()
    : false;

  if (phone) {
    // Lookup the user
    _data.read('users', phone, (err) => {
      if (!err) {
        _data.delete('users', phone, (deleteError) => {
          if (!deleteError) {
            callback(200);
          } else {
            callback(500, { error: 'Could not delete the specified user' });
          }
        });
      } else {
        callback(400, { error: 'Could not find the specified user' });
      }
    });
  } else {
    callback(404, { error: 'Missing required field' });
  }
};

// Users
handlers.users = (data, callback) => {

  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method)) {
    handlers._users[data.method](data, callback);
  } else {
    // 405 - method not allowed
    callback(405);
  }
};


// Sample heandler
handlers.ping = (data, callback) => {
  // Callback a http status code, and a payload object
  callback(200);
};

// Not found heandler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export module
module.exports = handlers;
