import { catchAsync, handleScript } from "../libs/utils.js";
import { exec } from "child_process";

// import fs from 'fs';
// import path from 'path';

export const handleUpload = catchAsync(async (req, res, next) => {
  // print(req.file)
  const outputDir = `output/${Math.floor(Date.now() / 1000)}`;

  exec(`mkdir -p ${outputDir}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error creating output directory: ${error}`);
    } else {
      console.log("Output directory created.");
      const pythonScript = "convert_to_images.py";
      if (req.file == undefined) {
        return res.status(404).json({
          status: "error",
          error: false,
          message: "File not found.",
          data: {

          },
        });
      }
      console.log(req.file.path, outputDir)
      handleScript(pythonScript, req.file.path, outputDir)
        .then((output) => {
          const outputArray = Object.values(output)

          res.status(200).json({
            status: "success",
            error: false,
            message: "Document uploaded successfully",
            data: {
              outputArray
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