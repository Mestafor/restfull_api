/**
 * Example TLS Server
 * Listeners to port 6000 and sends the word "pong" to client
 */

// Dependencies
const tls = require('tls');
const fs = require('fs');
const path = require('path');

// Server options
const options = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};

// Create the server
const server = tls.createServer(options, (connection) => {
  // Send the word "pong"
  const outboundMessage = 'pong';
  connection.write(outboundMessage);

  // When the client write something, log it out
  connection.on('data', (inboundMessage) => {
    const messageString = inboundMessage.toString();
    console.log(`I wrote ${outboundMessage} and they say ${messageString}`);
  });
});

server.listen(6000);
