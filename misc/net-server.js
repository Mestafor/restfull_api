/**
 * Example TCP (Net) Server
 * Listeners to port 6000 and sends the word "pong" to client
 */

// Dependencies
const net = require('net');

// Create the server
const server = net.createServer((connection) => {
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
