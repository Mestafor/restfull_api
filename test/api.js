/**
 * API Test
 */

// Dependencies
const assert = require('assert');
const http = require('http');
const config = require('./../lib/config');
const app = require('./../index');

// Holder for the tests
const api = {};

// Helpers
const helpers = {};
helpers.makeGetRequest = (path, callback) => {
  // Configure the request details
  const requestDetails = {
    protocol: 'http:',
    hostname: 'localhost',
    port: config.httpPort,
    ethod: 'GET',
    path,
    headers: {
      'Content-type': 'application/json',
    },
  };
  // Send the request
  const req = http.request(requestDetails, (res) => {
    callback(res);
  });
  req.end();
};

// The main init() should be able to run without throwing
api['app.init should start without throwing'] = (done) => {
  assert.doesNotThrow(() => {
    app.init((err) => {
      done();
    });
  }, TypeError);
};

// make a request to /ping
api['/ping should respond to GET with 200'] = (done) => {
  helpers.makeGetRequest('/ping', (res) => {
    assert.equal(res.statusCode, 200);
    done();
  });
};

// make a request to /api/users
api['/api/users should respond to GET with 400'] = (done) => {
  helpers.makeGetRequest('/api/users', (res) => {
    assert.equal(res.statusCode, 400);
    done();
  });
};

// make a request to random path
api['/ping should respond to GET with 404'] = (done) => {
  helpers.makeGetRequest('/should/not/exist', (res) => {
    assert.equal(res.statusCode, 404);
    done();
  });
};

// Export the test to the runner
module.exports = api;
