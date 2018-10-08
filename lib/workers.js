/**
 * Worker-related tasks
 */

// Dependencies
const util = require('util');
const path = require('path');
const fs = require('fs');
const url = require('url');
const https = require('https');
const http = require('http');
const _data = require('./data');
const helpers = require('./helpers');
const _logs = require('./logs');

const debug = util.debuglog('workers');

// Instantiate the worker object
const workers = {};

// Log
workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  // Form the log data
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck,
  };

  // Concert data to string
  const logString = JSON.stringify(logData);

  // Determine the name of the log dile
  const logFileName = originalCheckData.id;

  // Append the log string to the file
  _logs.append(logFileName, logString, (err) => {
    if (!err) {
      debug('Logging to file succeesed');
    } else {
      debug('Could not logging to the file');
    }
  });
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (newData) => {
  const msg = `Alert: Your check for ${newData.method} ${newData.protocol.toUpperCase()}://${newData.url} is currently ${newData.state}`;

  helpers.sendTwilioSms(newData.userPhone, msg, (err) => {
    if (!err) {
      debug('Success: User was alerted to a status change in their check, via sms');
    } else {
      debug('Error: Could not sent sms to user who had a state change in their check');
    }
  });
};

// Process the check outcome, update the check data as needded, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (dont't alrt on that one)
workers.procesCheckOutcome = (originalCheckData, checkOutcome) => {
  // Decide if the check is considered up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';

  // Decide if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state;

  // Log the outcome
  const timeOfCheck = Date.now();
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update the check data
  const newCheckData = Object.assign({}, originalCheckData);
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the update
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // Send the new check data to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        debug('Check outcome has not changed, no alert needed');
      }
    } else {
      debug('Error trying to save updates to one of the checks');
    }
  });
};

// Perform the check
workers.performCheck = (originalCheckData) => {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  // Mark that the output not been sent yet
  let outcomeSent = false;

  // Parse the hostname and and the path out the original check data
  const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
  const hostName = parsedUrl.hostname;
  const urlPath = parsedUrl.path; // using path and not 'pathname' because we want the query string

  // Construct the request
  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path: urlPath,
    timeout: originalCheckData.timeoutSeconds + 1000,
  };

  // Instantiate the request object (using either the http or https module)
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;

    // Update the checkoutcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.procesCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get the thrown
  req.on('error', (e) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: e,
    };

    if (!outcomeSent) {
      workers.procesCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout
  req.on('timeout', (e) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    };

    if (!outcomeSent) {
      workers.procesCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Sanity-check the check-data
workers.validateCheckData = (originalCheckData) => {
  const data = typeof originalCheckData === 'object' && originalCheckData !== null ? originalCheckData : {};
  data.id = typeof data.id === 'string' && data.id.trim().length > 0 ? data.id : false;
  data.userPhone = typeof data.userPhone === 'string' && data.userPhone.trim().length === 10 ? data.userPhone : false;
  data.protocol = typeof data.protocol === 'string' && ['https', 'http'].includes(data.protocol) ? data.protocol : false;
  data.url = typeof data.url === 'string' && data.url.trim().length > 0 ? data.url : false;
  data.method = typeof data.method === 'string' && ['post', 'get', 'put', 'delete'].includes(data.method) ? data.method : false;
  data.successCodes = typeof data.successCodes === 'object' && data.successCodes instanceof Array && data.successCodes.length > 0 ? data.successCodes : false;
  data.timeoutSeconds = typeof data.timeoutSeconds === 'number' && data.timeoutSeconds % 1 === 0 && data.timeoutSeconds >= 1 && data.timeoutSeconds <= 5 ? data.timeoutSeconds : false;

  // Set the keys that may not be set fit the workers have never seen this check before
  data.state = typeof data.state === 'string' && ['up', 'down'].includes(data.state) ? data.state : 'down';
  data.lastChecked = typeof data.lastChecked === 'number' && data.lastChecked > 0 ? data.lastChecked : false;

  // If all the checks pass, pass the data along to the next step in the process
  if (
    data.id
    && data.userPhone
    && data.protocol
    && data.url
    && data.method
    && data.successCodes
    && data.timeoutSeconds
  ) {
    workers.performCheck(data);
  } else {
    debug('Error: One of the checks are not properly formatted. Skupping it.');
  }
};

// Lookup all the checks, get their data, send to a validator
workers.getherAllChecks = () => {
  // Get all the checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the chec data
        _data.read('checks', check, (checkError, originalCheckData) => {
          if (!checkError && originalCheckData) {
            // Past it to the check validator, and let thet function continue or log error as needed
            workers.validateCheckData(originalCheckData);
          } else {
            debug('Error reading one of the check\'s data');
          }
        });
      });
    } else {
      debug('Error: Could not find any checks to process');
    }
  });
};

// Timer to execute the worker process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.getherAllChecks();
  }, 1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = () => {
  // List all the (non compressed) log files
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach((logName) => {
        // Compress the data to a different file
        const logId = logName.replace('.log', '');
        const newFileId = `${logId}-${Date.now()}`;
        _logs.compress(logId, newFileId, (compressErr) => {
          if (!compressErr) {
            // Truncate the log
            _logs.truncate(logId, (truncErr) => {
              if (!truncErr) {
                debug('Success truncating a log file');
              } else {
                debug('Error truncating log file');
              }
            });
          } else {
            debug('Error compressing one of the log file');
          }
        });
      });
    } else {
      debug('Error, could not find any logs to rotate');
    }
  });
};

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

// Init script
workers.init = () => {
  // Send to console, in yellow
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

  // Execute all the checks immediately
  workers.getherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop so longs will be compressed later on
  workers.logRotationLoop();
};

// Export the module
module.exports = workers;
