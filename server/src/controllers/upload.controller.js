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
      const pythonScript = "convert_to_images.py";
      handleScript(pythonScript, req.file.path, outputDir)
        .then((output) => {
          console.log(`Output is: `, output)
          res.status(200).json({
            status: "success",
            error: false,
            message: "Document uploaded successfully",
            data: {
              ...output,
            },
          });
        })
        .catch((error) => {
          res.status(400).json({
            status: 'failed',
            error: true,
            message: {
              ...error
            }
          })
        });
    }
  });
});