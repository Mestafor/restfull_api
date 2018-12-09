/**
 * Example HTTP2 client
 */

// Dependencies
const http2 = require('http2');

// Create client
const client = http2.connect('http://localhost:6000');

// Client on error occured
client.on('error', (e) => {
  console.error(e);
});

// Create the request
const req = client.request({
  ':path': '/',
  ':method': 'POST',
  'content-type': 'application/json',
});

// When a message is received, add the pieces of it together until you reach the end
let str = '';
req.on('data', (chunk) => {
  str += chunk;
});

// When the message ends, log it out
req.on('end', () => {
  console.log(str);

  client.close();
});

// End the request
req.end();
