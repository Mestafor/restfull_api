/**
 * Example HTTP2 server
 */

// Dependencies

const http2 = require('http2');

// Init the server
const server = http2.createServer();

// On a stream we want to send back  hello wolrd html
server.on('stream', (stream, headers) => {
  console.log(headers[':path']);
  console.log(headers[':method']);
  console.log(headers['content-type']);
  stream.respond({
    status: 200,
    'Content-type': 'text/html',
  });

  switch (headers[':path']) {
    case '/hello': {
      stream.end('<html><body><p>Hello!</p></body></html>');
      break;
    }
    default: {
      stream.end('<html><body><p>Hello world!</p></body></html>');
    }
  }
});

// Listen on 6000
server.listen(6000, () => {
  console.log('\x1b[32m%s\x1b[0m', 'Server listening on port 6000');
});
