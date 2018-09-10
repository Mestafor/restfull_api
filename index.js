/**
 * Promary file for the API
 */

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const config = require('./config');

// Define the heandlers
const handlers = {};

// Sample heandler
handlers.ping = (data, callback) => {
  // Callback a http status code, and a payload object
  callback(200);
};

// Not found heandler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Define a request router
const router = {
  ping: handlers.ping,
};

// All the server logic for both the http and https rserver
const unifiedServer = (req, res) => {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);
  console.log(`Parsed url: ${JSON.stringify(parsedUrl, null, 2)}`);
  // Get path
  const path = parsedUrl.pathname;
  console.log(`Path: ${path}`);
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  console.log('Trimmed path: ', trimmedPath);

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;
  console.log('Query string:', queryStringObject);

  // Get HTTP Method
  const method = req.method.toLocaleLowerCase();
  console.log('Method: ', method);

  // Get the headers as an object
  const { headers } = req;
  console.log('Request recieved with these headers:', headers);

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
      payload: buffer,
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
