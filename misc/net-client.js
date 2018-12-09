/**
 * Example TCP (Net) client
 * Connects to port 6000 and sends the word "ping" to the server
 */

// Dependencies
const net = require('net');

// Define the message to send
const outboundMessage = 'ping';

// Create the client
const client = net.createConnection({ port: 6000 }, () => {
  // Dend the message
  client.write(outboundMessage);
});

// When the server wites back, log what is says then kill the client
client.on('data', (inboundMessage) => {
  const messageString = inboundMessage.toString();
  console.log(`I wrote ${outboundMessage} and they say ${messageString}`);
  client.end();
});
