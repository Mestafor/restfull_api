/**
 * Library that demonstrates something throwing when it's init() is called
*/

// Container for the module
const example = {};

// Init function
example.init = () => {
  // This is an error created intentionally (bar is not defined);
  const foo = bar;
};

// Export module
module.exports = example;
