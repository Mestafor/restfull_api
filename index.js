/**
 * Promary file for the API
 */

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Define a request router
const router = {
  ping: handlers.ping,
  users: handlers.users,
};

// All the server logic for both the http and https rserver
const unifiedServer = (req, res) => {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);
  console.log(`Parsed url: ${JSON.stringify(parsedUrl, null, 2)}`);
  // Get path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

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
    const chosenHandler = (typeof router[trimmedPath] !== 'undefined')
      ? router[trimmedPath]
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
const httpServer = http.createServer(unifiedServer);

// Instantiate the HTTP server
httpServer.listen(config.httpPort, () => {
  console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`);
});

// Start the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
};
const httpsServer = https.createServer(httpsServerOptions, unifiedServer);

// Instantiate the HTTP server
httpsServer.listen(config.httpsPort, () => {
  console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
});
