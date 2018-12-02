/**
 * CLI-Related Tasks
 */

// Dependencies
const os = require('os');
const v8 = require('v8');
const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');
class _events extends events { };
const e = new _events();
const _data = require('./data');
const _logs = require('./logs');
const helpers = require('./helpers');


// Instantiate the CLI module
const cli = {};

// Create a vertical space
cli.verticalSpace = (lines) => {
  const _lines = typeof lines === 'number' && lines > 0 ? lines : 1;
  for (let i = 0; i < _lines; i++) {
    console.log('');
  }
};

// Create a horizontal line across the screen
cli.horizontalLine = () => {
  // Get the available sceen size
  const width = process.stdout.columns;

  let line = '';

  for (let i = 0; i < width; i++) {
    line += '-';
  }
  console.log(line);
};

// Create centered text on the string
cli.ceneterd = (str) => {
  const _str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : '';
  // Get the available screen size
  const width = process.stdout.columns;

  const leftpadding = Math.floor(width - _str.length) / 2;

  let line = '';
  for (let i = 0; i < leftpadding; i++) {
    line += ' ';
  }
  line += _str;

  console.log(line);
};

// Input handlers
e.on('man', (str) => {
  cli.responders.help();
});

e.on('help', (str) => {
  cli.responders.help();
});

e.on('exit', (str) => {
  cli.responders.exit();
});

e.on('stats', (str) => {
  cli.responders.stats();
});

e.on('list users', (str) => {
  cli.responders.listUsers();
});

e.on('more user info', (str) => {
  cli.responders.moreUserInfo(str);
});

e.on('list checks', (str) => {
  cli.responders.listChecks(str);
});

e.on('more check info', (str) => {
  cli.responders.moreCheckInfo(str);
});

e.on('list logs', (str) => {
  cli.responders.listLogs();
});

e.on('more log info', (str) => {
  cli.responders.moreLogInfo(str);
});

// Responders object
cli.responders = {};

// Help / Man
cli.responders.help = () => {
  const commands = {
    man: 'Show this help page',
    help: 'Aliace of the "man" command',
    exit: 'Kill the CLI (and rest of application)',
    stats: 'Get statisctic on the underlying operating system and resource utilization',
    'list users': 'Show a list ao all the registered (undeleted) users in the system',
    'more user info --{userId}': 'Show details of a specific user',
    'list checks --up --down': 'Show a list of all the active checks in the system, including their state. The "--up" and "--down" flags are both optional',
    'more check info --{checkId}': 'Show the details of a specified check',
    'list logs': 'Sho a list of the log files available to be read (compressed only)',
    'more log info --{fileName}': 'Show a details of a specified log file (compressed only)',
  };

  // Show a header for the help page that is as wide as the screen
  cli.horizontalLine();
  cli.ceneterd('CLI MANUAL');
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command, followed by its explanation. in white and yellow respectively
  Object.entries(commands)
    .forEach(([key, value]) => {
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 60 - line.length;
      for (let i = 0; i < padding; i++) {
        line += ' ';
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    });

  cli.verticalSpace(1);

  // end with another horizontal line
  cli.horizontalLine();
};

// Exit
cli.responders.exit = () => {
  process.exit(0);
};

// Stats
cli.responders.stats = () => {
  // Compile the object of stats
  const stats = {
    'Load Average': os.loadavg().join(' '),
    'CPU Count': os.cpus().length,
    'Free Memory': os.freemem(),
    'Current Malloced Memory': v8.getHeapStatistics().malloced_memory,
    'Peak Malloced Memory': v8.getHeapStatistics().peak_malloced_memory,
    'Allocated Heap Used (%)': Math.round(v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size * 100),
    'Available Heap Allocated (%)': Math.round(v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit * 100),
    Uptime: `${os.uptime()} Seconds`,
  };

  // Show a header for the stats page that is as wide as the screen
  cli.horizontalLine();
  cli.ceneterd('SYSTEM STATISTICS');
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command, followed by its explanation. in white and yellow respectively
  Object.entries(stats)
    .forEach(([key, value]) => {
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 60 - line.length;
      for (let i = 0; i < padding; i++) {
        line += ' ';
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    });

  cli.verticalSpace(1);

  // end with another horizontal line
  cli.horizontalLine();
};

// List users
cli.responders.listUsers = () => {
  _data.list('users', (err, userIds) => {
    if (!err && userIds && userIds.length > 0) {
      cli.verticalSpace();
      cli.verticalSpace();
      userIds.forEach((userId) => {
        _data.read('users', userId, (userError, userData) => {
          if (!userError && userData) {
            let line = `Name: ${userData.firstName} ${userData.lastName} Phone: ${userData.phone} Checks: `;
            const numberOfChecks = typeof userData.checks === 'object' && userData.checks instanceof Array && userData.checks.length > 0 ? userData.checks.length : 0;
            line += numberOfChecks;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// More user info
cli.responders.moreUserInfo = (str) => {
  // Get the ID from the string
  const arr = str.split('--');
  const userId = typeof arr[1] === 'string' && arr[1].trim().length > 0 ? arr[1] : false;

  if (userId) {
    // Lookup the user
    _data.read('users', userId, (err, userData) => {
      if (!err && userData) {
        // remove the hashed password
        delete userData.password;

        // Prion the JSON with text highlighting
        cli.verticalSpace();
        console.dir(userData, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

// List checks
cli.responders.listChecks = (str) => {
  _data.list('checks', (err, checksIds) => {
    if (!err && checksIds && checksIds.length > 0) {
      cli.verticalSpace();
      checksIds.forEach((checkId) => {
        _data.read('checks', checkId, (checkError, checkData) => {
          let includeCheck = false;
          const lowerString = str.toLowerCase();

          // Get the state of the state, default to down
          const state = typeof checkData.state === 'string' ? checkData.state : 'down';
          // Get the state, default to unknown
          const stateorUnknown = typeof checkData.state === 'string' ? checkData.state : 'unknown';

          // If the user the specified the state, or hasn't specified any state include the current check accordianly
          if (
            lowerString.indexOf(`--${state}`) > -1
            || (lowerString.indexOf('--down') === -1
              && lowerString.indexOf('--up') === -1)
          ) {
            let line = `ID: ${checkData.id} ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} State: ${stateorUnknown}`;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// More check info
cli.responders.moreCheckInfo = (str) => {
  // Get the ID from the string
  const arr = str.split('--');
  const checkId = typeof arr[1] === 'string' && arr[1].trim().length > 0 ? arr[1] : false;

  if (checkId) {
    // Lookup the user
    _data.read('checks', checkId, (err, checkData) => {
      if (!err && checkData) {
        // Prion the JSON with text highlighting
        cli.verticalSpace();
        console.dir(checkData, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

// List logs
cli.responders.listLogs = () => {
  _logs.list(true, (err, logsList) => {
    if (!err && logsList && logsList.length > 0) {
      cli.verticalSpace(1);
      logsList.forEach((log) => {
        if (log.indexOf('-') > -1) {
          console.log(log);
          cli.verticalSpace(1);
        }
      });
    }
  });
};

// More log info
cli.responders.moreLogInfo = (str) => {
  // Get the ID from the string
  const arr = str.split('--');
  const logFileName = typeof arr[1] === 'string' && arr[1].trim().length > 0 ? arr[1] : false;

  if (logFileName) {
    cli.verticalSpace();
    // Decompress the log
    _logs.decompress(logFileName, (err, strData) => {
      if (!err && strData) {
        // Split into lines
        const strArr = strData.split('\n');
        strArr.forEach((jsonString) => {
          const logObject = helpers.parseJsonToObject(jsonString);
          if (logObject && JSON.stringify(logObject) !== '{}') {
            console.dir(logObject, { colors: true });
          }
        });
      }
    });
  }
};

// Input processor
cli.processInput = (str) => {
  const _str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : false;

  // Only process the input if the user actually wrote something. Otherwise ignore.
  if (_str) {
    // Codify the unique strings that identify the unique questions allowed to be asked
    const uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list checks',
      'more check info',
      'list logs',
      'more log info',
    ];

    // Go throug the possible inputs, emit an event whe a match is found
    let matchFound = false;
    let counter = 0;
    uniqueInputs.some((input) => {
      if (str.toLowerCase().indexOf(input) > -1) {
        matchFound = true;
        // Emit an event matching the unique input, and include the full string given by the user
        e.emit(input, str);

        return true;
      }
    });

    // If no match is found, tell the user to try again
    if (!matchFound) {
      console.log('Sorry, try again');
    }
  }
};

// Init script
cli.init = () => {
  // Send the start message to the console, in datk blue
  console.log('\x1b[36m%s\x1b[0m', 'The CLI is running');

  // Start the interface
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>',
  });

  // Create an initial prompt
  _interface.prompt();

  // Handle each line of input separately
  _interface.on('line', (str) => {
    // Send to the input processor
    cli.processInput(str);

    // re-initilize the prompt afterwards
    _interface.prompt();
  });

  // If the user stops the CLI, kill the associated process
  _interface.on('close', () => {
    process.exit(0);
  });

};

// Export the module
module.exports = cli;
