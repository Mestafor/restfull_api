/**
 * Example TLS client
 * Connects to port 6000 and sends the word "ping" to the server
 */

// Dependencies
const tls = require('tls');
const fs = require('fs');
const path = require('path');

// Server options
const options = {
  ca: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')), // Only required because we'are using a seld-signed sertificate
};

// Define the message to send
const outboundMessage = 'ping';

// Create the client
const client = tls.connect(6000, options, () => {
  // Dend the message
  client.write(outboundMessage);
});

// When the server wites back, log what is says then kill the client
client.on('data', (inboundMessage) => {
  const messageString = inboundMessage.toString();
  console.log(`I wrote ${outboundMessage} and they say ${messageString}`);
  client.end();
});
