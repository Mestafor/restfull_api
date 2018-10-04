/**
 * Lobrary for storing and rotating logs
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
const lib = {};

// Base directory of the logs filder
lib.baseDir = path.join(__dirname, '../.logs/');

// Append a string to a file. Create the file if it does not exist.
lib.append = (file, str, callback) => {
  // Open the file for appending
  fs.open(`${lib.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Append to the file and close it
      fs.appendFile(fileDescriptor, `${str}\n`, (appendErr) => {
        if (!appendErr) {
          fs.close(fileDescriptor, (closeErr) => {
            if (!closeErr) {
              callback(false);
            } else {
              callback('Error closing file that was being appended');
            }
          });
        } else {
          callback('Error appending to file');
        }
      });
    } else {
      callback('Could not open file for appending');
    }
  });
};

// List all the logs, and optionally include the compressed logs
lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach((fileName) => {
        // Add the .log files
        if (fileName.includes('.log')) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        }

        // Add on the .gz files
        if (fileName.includes('.gz.b64') && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }

        callback(false, trimmedFileNames);
      });
    } else {
      callback(err, data);
    }
  });
};

// Compress the contents of one .log file into a .gz.b64 whitin the same direction
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destFile = `${newFileId}.gz.b64`;

  // Read the source file
  fs.readFile(`${lib.baseDir}${sourceFile}`, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, (zipErr, buffer) => {
        if (!zipErr && buffer) {
          // Send the data to the destination file
          fs.open(`${lib.baseDir}${destFile}`, 'wx', (openErr, fileDesc) => {
            if (!openErr && fileDesc) {
              // Write to the destination file
              fs.writeFile(fileDesc, buffer.toString('base64'), (writeErr) => {
                if (!writeErr) {
                  // Close the destination file
                  fs.close(fileDesc, (closeErr) => {
                    if (!closeErr) {
                      callback(false);
                    } else {
                      callback(closeErr);
                    }
                  });
                } else {
                  callback(writeErr);
                }
              });
            } else {
              callback(openErr);
            }
          });
        } else {
          callback(zipErr);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = (fileId, callback) => {
  const fileName = `${fileId}.gz.b64`;
  fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', (err, str) => {
    if (!err && str) {
      // Decode the data
      const inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (unzipErr, outputBuffer) => {
        if (!err && outputBuffer) {
          // Callback
          const outStr = outputBuffer.toString();
          callback(false, outStr);
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// truncate a log file
lib.truncate = (logId, callback) => {
  fs.truncate(`${lib.baseDir}${logId}.log`, 0, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};

// Export the module
module.exports = lib;
