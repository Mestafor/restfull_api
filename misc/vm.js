/**
 * Example VM
 * Running some arbitrary commands
 */

// Dependencies
const vm = require('vm');

// Define the context fr this script to run in
const context = {
  foo: 25,
};

// Define the script
const script = new vm.Script(`
  foo = foo * 2;
  const bar = foo + 1;
  const bizz = 52;
`);

// Run the script
script.runInNewContext(context);

console.log(context);
