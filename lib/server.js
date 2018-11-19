
/**
 * Server-related tasks
 */

// Dependencies
const util = require('util');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const { StringDecoder } = require('string_decoder');
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

const debug = util.debuglog('server');

// Instantiate the server module object
const server = {};

// Define a request router
server.router = {
  '': handlers.index,
  'account/create': handlers.accoutnCreate,
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.acountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checksList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,

  ping: handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,

  'favicon.ico': handlers.favicon,
  public: handlers.public,
};

// @TODO GET EID OF THIS
// helpers.sendTwilioSms('4158375309', 'Hello', (err) => {
//   debug(`This was the error: ${err}`);
// });


// All the server logic for both the http and https rserver
server.unifiedServer = (req, res) => {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);
  // Get path
  const urlPath = parsedUrl.pathname;
  const trimmedPath = urlPath.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get HTTP Method
  const method = req.method.toLocaleLowerCase();

  // Get the headers as an object
  const { headers } = req;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', (data) => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    // Choose the handler this request should go to. If one is not found, use the notFound handler.
    let chosenHandler = (typeof server.router[trimmedPath] !== 'undefined')
      ? server.router[trimmedPath]
      : handlers.notFound;

    // If the request is within the public directory, use the publick handler instead
    chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload, contentType) => {
      // Determine the type of response (fallback to JSON)
      const _contentType = typeof contentType === 'string' ? contentType : 'json';

      // Use the status code called back by the handler, or default to 200
      const localStatusCode = typeof statusCode === 'number' ? statusCode : 200;


      // Return the payload parts that are content-specific

      let payloadString = '';

      if (_contentType === 'json') {
        // Set header to response
        res.setHeader('Content-type', 'application/json');
        // Use the payload called back by the handler, or default to an empty object
        const localPayload = typeof payload === 'object' ? payload : {};
        // Convert the payload to a string
        payloadString = JSON.stringify(localPayload);
      }

      if (_contentType === 'html') {
        // Set header to response
        res.setHeader('Content-type', 'text/html');
        // Use the payload called back by the handler, or default to an empty string
        payloadString = typeof payload === 'string' ? payload : '';
      }

      if (_contentType === 'favicon') {
        // Set header to response
        res.setHeader('Content-type', 'image/x-icon');
        // Use the payload called back by the handler, or default to an empty string
        payloadString = typeof payload !== 'undefined' ? payload : '';
      }

      if (_contentType === 'css') {
        // Set header to response
        res.setHeader('Content-type', 'text/css');
        // Use the payload called back by the handler, or default to an empty string
        payloadString = typeof payload !== 'undefined' ? payload : '';
      }

      if (_contentType === 'png') {
        // Set header to response
        res.setHeader('Content-type', 'image/png');
        // Use the payload called back by the handler, or default to an empty string
        payloadString = typeof payload !== 'undefined' ? payload : '';
      }

      if (_contentType === 'jpg') {
        // Set header to response
        res.setHeader('Content-type', 'image/jpeg');
        // Use the payload called back by the handler, or default to an empty string
        payloadString = typeof payload !== 'undefined' ? payload : '';
      }

      if (_contentType === 'plain') {
        // Set header to response
        res.setHeader('Content-type', 'text/plain');
        // Use the payload called back by the handler, or default to an empty string
        payloadString = typeof payload !== 'undefined' ? payload : '';
      }

      // Return the response-parts that are common to all content-types
      // Return the response
      res.writeHead(localStatusCode);
      // Send the response
      res.end(payloadString);

      // Log the request path
      // If the response is 200, print green, otherwise print red
      if (statusCode === 200) {
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
      } else {
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
      }
    });
  });
};

// Start the HTTP server
server.httpServer = http.createServer(server.unifiedServer);


// Start the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};
server.httpsServer = https.createServer(server.httpsServerOptions, server.unifiedServer);


// Init script
server.init = () => {
  // Start the HTTP server
  // Instantiate the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort} in ${config.envName} mode`);
  });

  // Start the HTTPS server
  // Instantiate the HTTP server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
  });
};

// Export server
module.exports = server;
