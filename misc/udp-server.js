/**
 * Example UDP server
 * Creating a UDP datagram server listening on 6000
 */

// Dependencies
const dgram = require('dgram');


// Creating a server
const server = dgram.createSocket('udp4');

// 
server.on('message', (messageBuffer, sender) => {
  // Do something with an incomming message or do semething with the sender
  const messageString = messageBuffer.toString();
  console.log(messageString);
});

// bind to 6000
server.bind(6000);
