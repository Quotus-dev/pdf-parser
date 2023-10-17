// import { PDFExtract, PDFExtractOptions } from "pdf.js-extract";

import fs from "fs";
// import pdf_table_extractor from "pdf-table-extractor";
import { removeNewlinesFromTable } from "../libs/utils.js";

// To set the document object to undefined
// document = undefined;

// import Tesseract from "tesseract.js")
import { createScheduler, createWorker } from 'tesseract.js';

import model from 'wink-eng-lite-web-model';
import winkNLP from 'wink-nlp';

class PdfTextExtractor {
  constructor() {
    // this.pdfExtract = new PDFExtract();
    this.scheduler = createScheduler()
    this.nlp = winkNLP(model, ["sbd", "pos"])
    this.result = {}
    this.clauseEnded = false;
    this.lastClausePage = "";
  }

  async validate(str, pageNumber) {
    return new Promise((resolve, reject) => {
      const status = {
        validationFailed: true,
        message: "",
      };
      const pointMatch = str.match(/^(a|A)[.)]$/);

      if (pointMatch) {
        console.log({ pointMatch }, { pageNumber });
        status.validationFailed = true;
        status.message = "Validation Failed";
      } else {
        status.validationFailed = false;
        status.message = "Validation Successful";
      }

      resolve(status);
    });
  }

  async initializeWorkers(numWorkers) {
    const workerGen = async () => {
      const worker = await createWorker('eng', 1, {
        logger: m => console.log(m),
      });
      this.scheduler.addWorker(worker);
    }

    const resArr = Array(numWorkers);
    for (let i = 0; i < numWorkers; i++) {
      resArr[i] = workerGen();
    }
    await Promise.all(resArr);
  }

  async processFiles(files) {

    const promises = files.map(async (file) => {
      const { data: { text } } = await this.scheduler.addJob('recognize', file);
      return text;
    });

    const text = await Promise.all(promises);

    text.map((t) => {
      const doc = this.nlp.readDoc(t);
      const tokens = doc.sentences().out();

      let cleanedText = '';
      let currentPoint = '';
      let tableEncountered = false;
      let clauseStarted = false;
      let stopExtracting = false;

      tokens.forEach((token) => {
        const tableMatch = token.match(/TABLE/g);

        if (token === "INTRODUCTION") {
          clauseStarted = true;
        }

        if (tableMatch) {
          tableEncountered = true;
        }

        if (tableEncountered) {
          delete this.result[currentPoint];
          currentPoint = '';
          cleanedText = '';
        }

        // console.log({ token })

        const tokenSeparated = token.split("\n");

        const pointMatch = token.match(/^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/);

        if (pointMatch && !stopExtracting) {
          if (Object.hasOwnProperty(this.result, pointMatch[0])) {
            cleanedText = pointMatch[0];
            this.result[currentPoint] += cleanedText;
          } else {
            tableEncountered = false;
            currentPoint = pointMatch[0];
            this.result[currentPoint] = '';
          }
          // console.log(currentPoint)
        } else if (tokenSeparated) {
          for (const separatedToken of tokenSeparated) {
            const separatedTokenMatch = separatedToken.match(/^\d+(\.\d+)+(\.)+$|\*\*End of Clauses\*\*$/);

            if (separatedToken === "INTRODUCTION") {
              clauseStarted = true;
            }

            if (separatedToken === "**End of Clauses**") {
              stopExtracting = true;
            }

            if (separatedTokenMatch && currentPoint != separatedTokenMatch[0] && !stopExtracting) {
              tableEncountered = false;
              currentPoint = separatedTokenMatch[0];
              this.result[currentPoint] = '';
            } else if (currentPoint && !stopExtracting) {
              cleanedText = separatedToken.replace(/\s+/g, ' ').trim();
              this.result[currentPoint] += cleanedText + ' ';

              if (!clauseStarted) {
                delete this.result[currentPoint];
                currentPoint = '';
                cleanedText = '';
              }
            }
          }
        }
      });

    });

    for (const key in this.result) {
      this.result[key] = this.result[key].trim();
    }

    await this.scheduler.terminate();
    return this.result
  }

  // async extractTextFromPdf(filePath) {
  //   const buffer = fs.readFileSync(filePath);
  //   const options = {};

  //   return new Promise(async (resolve, reject) => {
  //     this.pdfExtract.extractBuffer(buffer, options, async (err, data) => {
  //       if (err) return reject(err);

  //       const result = {};

  //       let currentPoint = "";
  //       let stopMatching = false;
  //       let tableEncountered = false;
  //       let count = 1
  //       let wordTable = ""

  //       // Define an array to store validation promises
  //       const validationPromises = [];

  //       for (const page of data.pages) {
  //         const pageContent = page.content;

  //         let isInsideDoubleHash = false;
  //         let clauseStarted = false;
  //         let cleanedText = "";

  //         for (const item of pageContent) {
  //           const { str } = item;

  //           // Push the validation promise into the array
  //           if (str.startsWith("T") && str.endsWith("T")) {
  //             wordTable += str
  //             count++
  //           }

  //           if (str.startsWith("ABLE") || str.endsWith("ABLE)") && count >= 2) {
  //             wordTable += "ABLE"
  //           }

  //           if (wordTable === "TABLE") {
  //             tableEncountered = true
  //             count = 1
  //             wordTable = ""
  //           }

  //           if (str.startsWith("INTRODUCTION")) {
  //             clauseStarted = true;
  //           }

  //           if (str.startsWith("**")) {
  //             clauseStarted = false;
  //             stopMatching = true;
  //             currentPoint = "";
  //             this.clauseEnded = true;
  //             this.lastClausePage = page.pageInfo.num;

  //             console.log({ lastpage: this.lastClausePage });
  //           }
  //           if (str.startsWith("**End of Clauses**")) {
  //             clauseStarted = false;
  //             stopMatching = true;
  //             currentPoint = "";
  //             this.clauseEnded = true;
  //             this.lastClausePage = page.pageInfo.num;

  //             console.log({ lastpage: this.lastClausePage });
  //           }

  //           const tableMatch = str.match(/TABLE/g);

  //           if (tableMatch) {
  //             tableEncountered = true;
  //           }

  //           if (tableEncountered) {
  //             // console.log(currentPoint)
  //             delete result[currentPoint];
  //             currentPoint = "";
  //             cleanedText = "";
  //           }

  //           if (str.startsWith("#")) {
  //             isInsideDoubleHash = true;
  //             if (str.endsWith("##")) {
  //               isInsideDoubleHash = false;
  //             }
  //           } else if (!isInsideDoubleHash && !stopMatching) {
  //             const pointMatch = str.match(
  //               /\b\d+(\.\d+)*\.$|\*\*End of Clauses\*\*/g
  //             );

  //             if (!tableEncountered && currentPoint) {
  //               // console.log({ tableEncountered, currentPoint })
  //               validationPromises.push(this.validate(str, page.pageInfo.num));
  //             }

  //             // console.log(pointMatch)

  //             if (pointMatch) {
  //               console.log(str)
  //               tableEncountered = false;
  //               currentPoint = pointMatch[0];
  //               result[currentPoint] = "";
  //             } else if (currentPoint) {
  //               cleanedText = str.replace(/\s+/g, " ").trim();
  //               result[currentPoint] += cleanedText + " ";
  //             }
  //           }
  //         }
  //       }

  //       // Wait for all validation promises to resolve
  //       const validationResults = await Promise.all(validationPromises);

  //       // Check if any validation failed
  //       const validationFailed = validationResults.some(
  //         (res) => res.validationFailed
  //       );

  //       // console.log({ validationFailed })

  //       if (validationFailed) {
  //         // Reject with an error message
  //         reject({ validationFailed: true, message: "Validation Failed" });
  //       } else {
  //         for (const key in result) {
  //           result[key] = result[key].trim();
  //         }

  //         resolve(result);
  //       }
  //     });
  //   });
  // }
  async extractImagesFromPdf(filePath) {
    // print(filePath,'extract_images')
    console.log(filePath, 'extract_images')
    // exportImages("file.pdf", "output/dir")
    //   .then((images) => console.log("Exported", images.length, "images"))
    //   .catch(console.error);
  }
  async extractTableFromPdf(filePath) {
    const lastPage = this.lastClausePage;
    return new Promise((resolve, reject) => {
      function success(result) {
        const data = result.pageTables.map((d) => {
          const t = removeNewlinesFromTable(d.tables);
          return { ...d, tables: t };
        });

        let stopExtracting = false;

        const d = data.map((d) => {
          if (d.page === lastPage) {
            stopExtracting = true;
          }

          if (!stopExtracting) {
            return d;
          }
        });

        resolve(d);
      }

      function error(err) {
        reject(err);
      }

      pdf_table_extractor(filePath, success, error);
    });
  }
}

const pdfTextExtractor = new PdfTextExtractor()

export default pdfTextExtractor;
