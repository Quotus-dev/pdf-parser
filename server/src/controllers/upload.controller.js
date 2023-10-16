const { NextFunction, Request, Response } = require("express");

const { catchAsync } = require("../libs/utils");
const { exec } = require("child_process");

// import { createScheduler, createWorker } from 'tesseract.js'

// import model from 'wink-eng-lite-web-model'
// import winkNLP from 'wink-nlp'

const fs = require('fs');
const path = require('path');

const { createScheduler, createWorker } = require('tesseract.js');
const model = require('wink-eng-lite-web-model');
const winkNLP = require('wink-nlp');

const nlp = winkNLP(model, ['sbd', 'pos'])

const scheduler = createScheduler()
const numWorkers = 50


const workerGen = async () => {
  const worker = await createWorker('eng', 1, {
      logger: m => console.log(m)
  });
  scheduler.addWorker(worker);
}

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
            file_names = fileNames.map((file)=>outputDir+'/'+file)
           
            // extractInformation
            // extractInformation(file_names)
            // Sort the array based on the custom sorting function
            file_names.sort((a,b)=>{
              const pageA = parseInt(a.match(/page_(\d+)/)[1]);
              const pageB = parseInt(b.match(/page_(\d+)/)[1]);
              return pageA - pageB;
            });
            console.log(file_names);
          });

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



async function  extractInformation(files) {
  const resArr = Array(numWorkers);
  for (let i = 0; i < numWorkers; i++) {
      resArr[i] = workerGen();
  }
  await Promise.all(resArr);

  const result = {}
  let currentPoint = ''
  let tableEncountered = false

  const promises = files.map(async (file) => {
      const { data: { text } } = await scheduler.addJob('recognize', file)

      return text
  })

  const text = await Promise.all(promises)

  console.log(text)

  text.map((t) => {
      const doc = nlp.readDoc(t)
      let cleanedText = ''

      const tokens = doc.sentences().out()

      tokens.map((token) => {
          const tableMatch = token.match(/TABLE/g)

          if (tableMatch) {
              tableEncountered = true
          }

          if (tableEncountered) {
              delete result[currentPoint]
              currentPoint = ''
              cleanedText = ''
          }

          const tokenSeparated = token.split("\n")

          const pointMatch = token.match(/^(?:\d+(\.\d+)\.$|\\End of Clauses\\*)$/)

          if (pointMatch) {
              if (Object.hasOwn(result, pointMatch[0])) {
                  cleanedText = pointMatch[0]
                  result[currentPoint] += cleanedText;
              } else {
                  tableEncountered = false
                  currentPoint = pointMatch[0]

                  result[currentPoint] = ''
              }
              // console.log(currentPoint)
          } else if (tokenSeparated) {
              for (let i = 0; i < tokenSeparated.length; i++) {
                  const separetedTokenMatch = tokenSeparated[i].match(/^\d+(\.\d+)+(\.)+$|\\*End of Clauses\\*$/)

                  if (separetedTokenMatch && currentPoint != separetedTokenMatch[0]) {
                      tableEncountered = false
                      currentPoint = separetedTokenMatch[0]
                      result[currentPoint] = ''
                  } else if (currentPoint) {
                      cleanedText = tokenSeparated[i].replace(/\s+/g, ' ').trim();
                      result[currentPoint] += cleanedText + ' ';
                  }
              }

          }
      })

  })

  for (const key in result) {
      result[key] = result[key].trim();
  }

  // console.log(result)

  await scheduler.terminate();
}