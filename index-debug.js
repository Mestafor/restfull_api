/**
 * Primary file for the API
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');
const exampleDebugginProblems = require('./lib/exampleDebuggingProblem');

// Declare the app
const app = {};

// Init function
app.init = () => {
  // Start the server
  debugger;
  server.init();
  debugger;

  // Start the workers
  debugger;
  workers.init();
  debugger;

  // Start the CLI, but make sure it starts last
  setTimeout(() => {
    cli.init();
  }, 50);
  debugger;


  let foo = 1;
  console.log('Just assigned 1 to foo');
  debugger;

  foo++;
  console.log('Just increment foo');
  debugger;

  foo *= foo;
  console.log('Just squared foo');
  debugger;

  foo = foo.toString();
  console.log('Just converted foo to string');
  debugger;

  // Call the init script that call throw
  exampleDebugginProblems.init();
  console.log('Just called the library');
  debugger;
};

// Execute
app.init();

// Export the app
module.exports = app;
