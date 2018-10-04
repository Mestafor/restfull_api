
/**
 * Server-related tasks
 */

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const { StringDecoder } = require('string_decoder');
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

// Instantiate the server module object
const server = {};

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

// @TODO GET EID OF THIS
// helpers.sendTwilioSms('4158375309', 'Hello', (err) => {
//   console.log(`This was the error: ${err}`);
// });


// All the server logic for both the http and https rserver
server.unifiedServer = (req, res) => {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);
  console.log(`Parsed url: ${JSON.stringify(parsedUrl, null, 2)}`);
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
    const chosenHandler = (typeof server.router[trimmedPath] !== 'undefined')
      ? server.router[trimmedPath]
      : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      // Use the status code called back by the handler, or default to 200
      const localStatusCode = typeof statusCode === 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to an empty object
      const localPayload = typeof payload === 'object' ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(localPayload);

      // Set header to response
      res.setHeader('Content-type', 'application/json');

      // Return the response
      res.writeHead(localStatusCode);

      // Send the response
      res.end(payloadString);

      // Log the request path
      console.log(
        `Returning this response: ${localStatusCode}`,
      );
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
    console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`);
  });

  // Start the HTTPS server
  // Instantiate the HTTP server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
  });
};

// Export server
module.exports = server;
