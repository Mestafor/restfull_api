/**
 * Test tunner
 */

// Override the NODE_ENV variable
process.env.NODE_ENV = 'testing';

// Application logic for the test runner
_app = {};

// Container for the test
_app.tests = {};

// Add on the unit tests
_app.tests.unit = require('./unit');
// _app.tests.api = require('./api');

// Produce a test outcome report
_app.producetestreport = (limit, successes, errors) => {
  console.log('');
  console.log('---------------------------BEGIN THE REPORT--------------------------');
  console.log('');
  console.log('Total Tests: ', limit);
  console.log('Pass: ', successes);
  console.log('Fail: ', errors.length);

  // If there are errors, print them in detail
  if (errors.length > 0) {
    console.log('---------------------------BEGIN ERROR DETAILS--------------------------');
    console.log('');
    errors.forEach((error) => {
      console.log('\x1b[31m%s\x1b[0m', error.name);
      console.log(error.error);
      console.log('');
    });
    console.log('');
    console.log('---------------------------END ERROR DETAILS--------------------------');
  }

  console.log('');
  console.log('---------------------------END THE REPORT--------------------------');
  process.exit(0);
};

// Count all the test
_app.countTest = () => {
  let counter = 0;
  Object.values(_app.tests)
    .forEach((test) => {
      counter += Object.keys(test).length;
    });

  return counter;
};

// Run all the tests, collecting the errors and successes
_app.runTests = () => {
  const errors = [];
  let successes = 0;
  const limit = _app.countTest();
  let counter = 0;
  Object.entries(_app.tests).forEach(([, value]) => {
    const subTest = value;

    Object.entries(subTest).forEach(([testName, testFn]) => {
      try {
        testFn(() => {
          // If it cals back without throwing, then is successed, so log it in green
          console.log('\x1b[32m%s\x1b[0m', testName);
          counter++;
          successes++;
          if (counter === limit) {
            _app.producetestreport(limit, successes, errors);
          }
        });
      } catch (e) {
        // If it throws, then it failed, so capture the error trown and log it in read
        errors.push({
          name: testName,
          error: e,
        });
        console.log('\x1b[31m%s\x1b[0m', testName);
        counter++;
        if (counter === limit) {
          _app.producetestreport(limit, successes, errors);
        }
      }
    });
  });
};

// Run the test
_app.runTests();
