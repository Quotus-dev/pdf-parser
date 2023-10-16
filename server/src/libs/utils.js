const { exec } = require("child_process");
const fs = require('fs');
const path = require('path');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode || 500;
    this.status =
      (statusCode && String(statusCode)[0] === "4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.removeNewlinesFromTable = (tables) => {
  // Iterate through the outer array (tables)
  for (let i = 0; i < tables.length; i++) {
    // Iterate through the inner subarray
    for (let j = 0; j < tables[i].length; j++) {
      // Replace newline characters ("\n") with an empty string
      tables[i][j] = tables[i][j].replace(/\n/g, '');
    }
  }
  return tables;
}

exports.handleScript = (pythonScript, pdfFile, outputDir) => {
  return new Promise((resolve, reject) => {
    exec(
      `python3 ${pythonScript} "${pdfFile}" "${outputDir}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`Stderr: ${stderr}`);
          reject(new Error(`Python script exited with an error: ${stderr}`));
          return;
        }
        console.log(`Python script output: ${stdout} ${outputDir}`);

        fs.readdir(outputDir, (err, files) => {
          if (err) {
            console.error('Error reading folder:', err);
            return;
          }

          const fileNames = files.filter(file => {
            const filePath = path.join(outputDir, file);
            return fs.statSync(filePath).isFile();
          });

          console.log('Files in the folder:');
          file_names = fileNames.map((file) => outputDir + '/' + file)
          console.log(file_names);
          // extractInformation
          // extractInformation(file_names)

        });

        resolve(stdout);
      }
    );
  });
}

module.exports.AppError = AppError
module.exports.catchAsync = catchAsync