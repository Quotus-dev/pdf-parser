const { catchAsync, handleScript } = require("../libs/utils");
const { exec } = require("child_process");

const fs = require('fs');
const path = require('path');

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
      handleScript(pythonScript, req.file.path, outputDir)
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

  res.status(200).json({
    status: "success",
    error: false,
    message: "Document uploaded successfully",
    data: {
      ...req.file,
    },
  });

});