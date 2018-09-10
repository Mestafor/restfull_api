/**
 * library for storing and editing data
 */
//Dependencies
const fs = require('fs');
const path = require('path');

// Container for the module (to be exported)
var lib = {};

// Define base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

/**
 * Write data to a file
 * @param {string} dir - directory name
 * @param {string} file - file name
 * @param {object} data - object of data 
 * @param {Function} callback  - callback function
 */
lib.create = (dir, file, data, callback) => {
  // Open the file to writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData, err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing new file');
            }
          })
        } else {
          callback('Error writing to new file');
        }
      })
    } else {
      callback('Could not create new file, it may already exist');
    }
  });
};

/**
 * Read data from a file
 * @param {string} dir - directory name
 * @param {string} file - file name
 * @param {Function} callback  - callback function
 */
lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf-8', (err, data) => {
    callback(err, data);
  });
};

/**
 * Update date inside a file
 * @param {string} dir - directory name
 * @param {string} file - file name
 * @param {object} data - object of data 
 * @param {Function} callback  - callback function
 */
lib.update = (dir, file, data, callback) => {
  // Open a file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Truncate the file
      fs.ftruncate(fileDescriptor, err => {
        console.log('fileDescriptor: ', fileDescriptor);
        if (!err) {
          // Write to the file and close it
          fs.writeFile(fileDescriptor, stringData, err => {
            if (!err) {
              fs.close(fileDescriptor, err => {
                if (!err) {
                  callback(false);
                } else {
                  callback('Error closing existing file');
                }
              })
            } else {
              callback('Error writing to existion file')
            }
          });
        } else {
          callback('Error truncating file');
        }
      })

    } else {
      callback('Could not open file to updating, it may not exist yet');
    }
  })
};

/**
 * Delete a file
 * @param {string} dir - directory name
 * @param {string} file - file name
 * @param {Function} callback  - callback function
 */
lib.delete = (dir, file, callback) => {
  // Unlinkthe file
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, err => {
    if(!err) {
      callback(false);
    } else {
      callback('Errro deleting file');
    }
  });
};

// Exort the module
module.exports = lib;