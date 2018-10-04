/**
 * Handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

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
  const checkedRequiredData = requiredData.map(
    item => helpers.validateUsersData(payload[item], (property) => {
      switch (property) {
        case 'phone':
          return property.length === 10;
        default:
          return true;
      }
    }),
  ).filter(item => item);

  if (checkedRequiredData.length === requiredData.length) {
    // Make sure tha the user doesnt already exist
    _data.read('users', payload.phone, (err) => {
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
        _data.read('users', phone, (err, userData) => {
          if (!err) {
            _data.delete('users', phone, (deleteError) => {
              if (!deleteError) {
                // Delete each of the checks associated with the user
                const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : [];
                if (userChecks.length > 0) {
                  let errorCount = 0;
                  userChecks.forEach((check) => {
                    _data.delete('checks', check, (deleteCheckError) => {
                      if (deleteCheckError) {
                        errorCount += 1;
                      }
                    });
                  });
                  if (!errorCount) {
                    callback(200);
                  } else {
                    callback(500, { error: 'Errors encountered while attempting to delete all of the users checks. All checks may not have been deleted from the system successfully' })
                  }
                } else {
                  callback(200);
                }
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
          // If valid, create a new token with a random name.
          // Set expiration date 1 hour in the future
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
};

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


// Container for all the checks methods
handlers._checks = {};

/**
 * Check - post
 * Required data: protocol, url, method, successCodes, timeoutSeconds
 * optional data: none
 * @param {*} data
 * @param {*} callback
 */
handlers._checks.post = (data, callback) => {
  // Validate inputs
  const { payload } = data;
  const protocol = typeof payload.protocol === 'string' && ['http', 'https'].includes(payload.protocol) ? payload.protocol : false;
  const url = typeof payload.url === 'string' && payload.url.trim().length > 0 ? payload.url : false;
  const method = typeof payload.method === 'string' && ['post', 'get', 'put', 'delete'].includes(payload.method) ? payload.method : false;
  const successCodes = typeof payload.successCodes === 'object' && payload.successCodes instanceof Array && payload.successCodes.length > 0 ? payload.successCodes : false;
  const timeoutSeconds = typeof payload.timeoutSeconds === 'number' && payload.timeoutSeconds % 1 === 0 && payload.timeoutSeconds >= 1 && payload.timeoutSeconds <= 5 ? payload.timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the headers
    const token = typeof data.headers.token === 'string' ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;

        // Lookup the user data
        _data.read('users', userPhone, (userErr, userData) => {
          if (!userErr && userData) {
            const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : [];
            // Verify that user has less than the number of max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = helpers.createRandomString(20);

              // Create the check object, and include the user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds,
              };

              // Save the object
              _data.create('checks', checkId, checkObject, (checksErr) => {
                if (!checksErr) {
                  // Add the check id to the user's object
                  const newUserData = userData;
                  newUserData.checks = userChecks;

                  newUserData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users', userPhone, newUserData, (updateUserErr) => {
                    if (!updateUserErr) {
                      // Return the data about the new check
                      callback(200, checkObject);
                    } else {
                      callback(500, { error: 'Could not update the user with the new check' });
                    }
                  });
                } else {
                  callback(500, { error: 'Could not create the new check' });
                }
              });
            } else {
              callback(400, { error: `The user already has the maximum number of checks (${config.maxChecks})` });
            }
          } else {
            callback(500, { error: 'Could not find the user' });
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { error: 'Missing reqired filed(s) or field(s) are invalid' });
  }
};


/**
 * Check - get
 * Require data: id
 * Optional data: none
 * @param {*} data
 * @param {*} callback
 */
handlers._checks.get = (data, callback) => {

  const queryObject = data.queryStringObject;
  // Check for required field
  const id = typeof queryObject.id === 'string' && queryObject.id.trim().length === 20 ? queryObject.id.trim() : false;
  if (id) {
    // Lookup for id token
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers
        const token = typeof data.headers.token === 'string' ? data.headers.token : false;

        // Verify that the given token is valid and belong to the user who create the check
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            // Return the check data
            callback(200, checkData);
          } else {
            callback(403, { error: 'Missing required token in header, or token is invalid' });
          }
        });
      } else {
        callback(404, { error: 'Could not find the specified check' });
      }
    });
  } else {
    callback(400, { error: 'Missing required field(s) or field(s) are invalid' });
  }
};

/**
 * Checks - put
 * Required data: id
 * Optional data: url, method, protocol, successCodes, timeoutSecconds
 * @param {*} data
 * @param {*} callback
 */
handlers._checks.put = (data, callback) => {
  const { payload } = data;
  // Check for the reqired data
  const id = typeof payload.id === 'string' && payload.id.trim().length === 20 ? payload.id : false;

  // Check for the optional data
  const url = typeof payload.url === 'string' && payload.url.trim().length > 0 ? payload.url : false;
  const method = typeof payload.method === 'string' && ['post', 'get', 'put', 'delete'].includes(payload.method) ? payload.method : false;
  const protocol = typeof payload.protocol === 'string' && ['http', 'https'].includes(payload.protocol) ? payload.protocol : false;
  const successCodes = typeof payload.successCodes === 'object' && payload.successCodes instanceof Array && payload.successCodes.length > 0 ? payload.successCodes : false;
  const timeoutSeconds = typeof payload.timeoutSeconds === 'number' && payload.timeoutSeconds % 1 === 0 && payload.timeoutSeconds >= 1 && payload.timeoutSeconds <= 5 ? payload.timeoutSeconds : false;

  if (id) {
    if (url || method || protocol || successCodes || timeoutSeconds) {
      // Lookup for the id
      _data.read('checks', id, (err, checksData) => {
        if (!err) {
          // Get token from headers
          const token = typeof data.headers.token === 'string' && data.headers.token.length > 0 ? data.headers.token : false;
          // Verify token with user
          handlers._tokens.verifyToken(token, checksData.userPhone, (isValid) => {
            if (isValid) {
              const newChecksData = Object.assign({}, checksData);
              if (url) {
                newChecksData.url = url;
              }
              if (method) {
                newChecksData.method = method;
              }

              if (protocol) {
                newChecksData.protocol = protocol;
              }

              if (successCodes) {
                newChecksData.successCodes = successCodes;
              }

              if (timeoutSeconds) {
                newChecksData.timeoutSeconds = timeoutSeconds;
              }

              _data.update('checks', checksData.id, newChecksData, (checksError) => {
                if (!checksError) {
                  callback(200);
                } else {
                  callback(500, { error: 'Could not update the specified check' });
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400, { error: 'Could not find the specified check' });
        }
      });
    } else {
      callback(400, { error: 'Nothing to update' });
    }
  } else {
    callback(400, { error: 'Missing require field(s) or field(s) are invalid' });
  }
};

/**
 * Check - put
 * Required data: id
 * Optional data: none
 * @param {*} data
 * @param {*} callback
 */
handlers._checks.delete = (data, callback) => {
  // Check required data
  const { payload } = data;
  const id = typeof payload.id === 'string' && payload.id.trim().length === 20 ? payload.id : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers, and check that token is valid
        const token = typeof data.headers.token === 'string' && data.headers.token.trim().length > 0 ? data.headers.token.trim() : false;
        handlers._tokens.verifyToken(token, checkData.userPhone, (isValid) => {
          if (isValid) {
            _data.delete('checks', id, (deleteErr) => {
              if (!deleteErr) {
                // Lookup the user
                _data.read('users', checkData.userPhone, (readError, userData) => {
                  if (!readError && userData) {
                    const newUserData = Object.assign({}, userData);
                    // Remove check id from user checks
                    const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : [];
                    newUserData.checks = userChecks.filter(check => check !== id);

                    // Update the user data
                    _data.update('users', userData.phone, newUserData, (updateError) => {
                      if (!updateError) {
                        callback(200);
                      } else {
                        callback(500, { error: 'Could not update the user data' });
                      }
                    });
                  } else {
                    callback(500, { error: 'Could not find the user, who created the check, so could not remove the check from the list of checks' });
                  }
                });
              } else {
                callback(500, { error: 'Could not delete the specified check, or the check does nt exist' });
              }
            });
          } else {
            callback(400, { error: 'Missing required token in headers, or token is invalid' });
          }
        });
      } else {
        callback(400, { error: 'Could not find the specified check, or the check does not exist' });
      }
    });
  } else {
    callback(400, { error: 'Missing require field(s) or field(s) are invalid' });
  }
};

// Check
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.includes(data.method)) {
    handlers._checks[data.method](data, callback);
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
