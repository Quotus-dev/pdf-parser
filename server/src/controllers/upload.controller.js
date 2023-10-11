const { NextFunction, Request, Response } = require("express");

const { catchAsync } = require("../libs/utils");
const { exec } = require("child_process");

exports.handleUpload = catchAsync(async (req, res, next) => {
  // print(req.file)
  const outputDir = `output/${Math.floor(Date.now() / 1000)}`;

  exec(`mkdir -p ${outputDir}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error creating output directory: ${error}`);
    } else {
      console.log("Output directory created.");
      // convertPdfToImages(req.file.path, outputDir);
      const pythonScript = "convert_to_images.py";
      runPythonScript(pythonScript, req.file.path, outputDir)
        .then((output) => {
          // The Python script has completed
          console.log("Python script completed with output:", output);
          // You can add any further code you want to execute after completion here.
        })
        .catch((error) => {
          console.error("Error running Python script:", error);
        });
      console.log(outputDir);
    }
  });



  function runPythonScript(pythonScript, pdfFile, outputDir) {
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
          console.log(`Python script output: ${stdout}`);
          resolve(stdout);
        }
      );
    });
  }

  res.status(200).json({
    status: "success",
    error: false,
    message: "Document uploaded successfully",
    data: {
      ...req.file,
    },
  });

});
