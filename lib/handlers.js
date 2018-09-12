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
    // Get the token from the headers
    const token = typeof data.headers.token === 'string' ? data.headers.token : false;
    console.log('--headers', data.headers);
    // Verify the token number is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
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
        callback(403, { error: 'Missing required token in header, or token is invalid' });
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
      // Get the token from the headers
      const token = typeof data.headers.token === 'string' ? data.headers.token : false;
      // Verify the token number is valid for the phone number
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
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
          callback(403, { error: 'Missing required token in header, or token is invalid' });
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
    // Get the token from the headers
    const token = typeof data.headers.token === 'string' ? data.headers.token : false;
    // Verify the token number is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
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
        callback(403, { error: 'Missing required token in header, or token is invalid' });
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


// Container for all the tokens methods
handlers._tokens = {};

/**
 * Tokens - post
 * Required data: phone, password
 * Optional data: none
 * @param {*} data
 * @param {*} callback
 */
handlers._tokens.post = (data, callback) => {
  // Check for the required filed
  const { payload } = data;
  const phone = typeof payload.phone === 'string' && payload.phone.trim().length === 10
    ? payload.phone.trim()
    : false;
  const password = typeof payload.password === 'string' && payload.password.trim().length > 0
    ? payload.password.trim() : false;

  if (phone && password) {
    // Lookup for user who matches the phone number
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // hash the sent password, and compare it to the user hash password
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // If valid, create a new token with a random name/ Set expiration date 1 hour in the future
          const tokenId = helpers.createRandomString(20);

          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, (createError) => {
            if (!createError) {
              callback(200, tokenObject);
            } else {
              callback(500, { error: 'Could not create the new token' });
            }
          });
        } else {
          callback(400, { error: 'Password did not match the specified user\'s stored password' });
        }
      } else {
        callback(400, { error: 'Could not find the specified user' });
      }
    });
  } else {
    callback(400, { error: 'Missing required fields' });
  }
};

/**
 * Tokens - get
 * Required data: id
 * Optional data: none
 * @param {*} data
 * @param {*} callback
 */
handlers._tokens.get = (data, callback) => {
  const queryObject = data.queryStringObject;
  // Check for required field
  const id = typeof queryObject.id === 'string' && queryObject.id.trim().length === 20 ? queryObject.id.trim() : false;
  console.log('--id', id, data.queryStringObject);
  if (id) {
    // Lookup for id token
    _data.read('tokens', id, (err, tokenObject) => {
      if (!err && tokenObject) {
        callback(200, tokenObject);
      } else {
        callback(404, { error: 'Could not find the specified token' });
      }
    });
  } else {
    callback(400, { error: 'Missing required fields' });
  }
};

/**
 * Tokens - put
 * Required data: id, extend
 * Optional data: none
 * @param {*} data
 * @param {*} callback
 */
handlers._tokens.put = (data, callback) => {
  // Check for the required filed
  const { payload } = data;
  const id = typeof payload.id === 'string' && payload.id.trim().length === 20 ? payload.id.trim() : false;
  const extend = typeof payload.extend === 'boolean' && payload.extend === true;

  if (id && extend) {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to the make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set exparation an hour from now
          const updatedTokenData = tokenData;
          updatedTokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update('tokens', id, updatedTokenData, (updateError) => {
            if (!updateError) {
              callback(200);
            } else {
              callback(500, { error: 'Could not update the token\'s expiration' });
            }
          });
        } else {
          callback(400, { error: 'The token has already expired and cannot be extended' });
        }
      } else {
        callback(400, { error: 'Specified token does not exist' });
      }
    });
  } else {
    callback(400, { error: 'Missing required field(s) or field(s) are invalid' });
  }
};

/**
 * Tokens - delete
 * Required data: id
 * @param {*} data
 * @param {*} callback
 */
handlers._tokens.delete = (data, callback) => {
  // Check for the required filed
  const { payload } = data;
  const id = typeof payload.id === 'string' && payload.id.trim().length === 20 ? payload.id.trim() : false;

  if (id) {
    // Lookup the specified token
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        // Delete the token
        _data.delete('tokens', id, (deleteErr) => {
          if (!deleteErr) {
            callback(200);
          } else {
            callback(500, { error: 'Could not delete specified token' });
          }
        });
      } else {
        callback(400, { error: 'Specified token does not exist' });
      }
    });
  } else {
    callback(400, { error: 'Missing required field(s) or field(s) are ivalid' });
  }
};

/**
 * Verify if a given token id is currently valid for a given user
 * @param {string} id
 * @param {string} phone
 * @param {Function} callback
 */
handlers._tokens.verifyToken = (id, phone, callback) => {
  // Lookup the token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that token is for the given user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
}

// Tokens
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method)) {
    handlers._tokens[data.method](data, callback);
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
