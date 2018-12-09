/**
 * Example UDP client
 * Sending a message to a UDP server on port 6000
 */

// Dependencies
const dgram = require('dgram');

// Create the client
const client = dgram.createSocket('udp4');

// Define the message and pull it to the buffer
const messageString = 'This is a message';
const messageBuffer = Buffer.from(messageString);

// Send off a message
client.send(messageBuffer, 6000, 'localhost', (err) => {
  if (err) {
    console.log('Error:', err);
  }
  client.close();
});
