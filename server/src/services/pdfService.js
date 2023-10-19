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

  validate(str) {
    
    return str.match(/^(?:(?:[aA]|[iI])\.|[aAiI]\))/)

  }

  async initializeWorkers(numWorkers) {
    const workerGen = async () => {
      const worker = await createWorker('eng', 1);
      this.scheduler.addWorker(worker);
    }

    const resArr = Array(numWorkers).fill(null).map(workerGen)
    await Promise.all(resArr);

  }

  async processFiles(files) {

    const tractProgress = (() => {
      const startTime = performance.now()
      let completedJobs = 0
      const totalJobs = files.length
      let processingTime = ''
  
      return () => {
          completedJobs++
          const progress = (completedJobs / totalJobs) * 100
          console.log(`Progress: ${progress.toFixed(2)}% (${completedJobs}/${totalJobs} jobs completed)`)
  
          if (completedJobs === totalJobs) {
              const endTime = performance.now()
              processingTime = (endTime - startTime) / 1000;
              processingTime = processingTime / 60
              console.log('All jobs completed.', `It took ${processingTime} minute`);
              // process.exit(0);
          }
      }
  })()

      const result = {}
    let currentPoint = ''
    let tableEncountered = false
    let clauseStarted = false
    let stopExtracting = false
    const nonValidatatedPoints = []

    const promises = files.map(async (file) => {
        const { data: { text } } = await this.scheduler.addJob('recognize', file)
        tractProgress()
        return text
    })

    const text = await Promise.all(promises)

    text.map((t) => {
        const doc = this.nlp.readDoc(t)
        const tokens = doc.sentences().out()

        let cleanedText = ''
        let isInsideDoubleHash = false

        tokens.forEach((token) => {
            const tableMatch = token.match(/TABLE/g)

            // console.log({ token })

            if (token === "INTODUCTION") {
                clauseStarted = true
            }

            if (token.startsWith("##") && token.endsWith("#")) {
                isInsideDoubleHash = !isInsideDoubleHash
            }

            if (tableMatch) {
                tableEncountered = true
            }

            if (tableEncountered) {
                delete this.result[currentPoint]
                currentPoint = ''
                cleanedText = ''
            }

            // console.log({ token })

            const tokenSeparated = token.split("\n")

            // console.log(tokenSeparated)

            const pointMatch = token.match(/^(?:\d+(\.\d+)\.$|\\End of Clauses\\*)$/)

            if (pointMatch && !stopExtracting && !isInsideDoubleHash) {
                if (Object.hasOwn(this.result, pointMatch[0])) {
                    cleanedText = pointMatch[0]
                    this.result[currentPoint] += cleanedText;
                } else {
                    tableEncountered = false
                    currentPoint = pointMatch[0]

                    this.result[currentPoint] = ''
                }
                // console.log(currentPoint)
            } else if (tokenSeparated && !isInsideDoubleHash) {
                for (const separatedToken of tokenSeparated) {

                    if (!stopExtracting) {
                        const validationPoints = this.validate(separatedToken)
                        if (validationPoints) {
                            nonValidatatedPoints.push(validationPoints[0])
                        }
                    }

                    const separetedTokenMatch = separatedToken.match(/^\d+(\.\d+)+(\.)+$|\\*End of Clauses\\*$/)

                    if (separatedToken === "INTRODUCTION") {
                        clauseStarted = true
                    }

                    if (separatedToken === "*End of Clauses*") {
                        stopExtracting = true
                    }

                    if (separetedTokenMatch && currentPoint != separetedTokenMatch[0] && !stopExtracting) {
                        tableEncountered = false
                        currentPoint = separetedTokenMatch[0]
                        this.result[currentPoint] = ''
                    } else if (currentPoint && !stopExtracting) {
                        cleanedText = separatedToken.replace(/\s+/g, ' ').trim();
                        this.result[currentPoint] += cleanedText + ' ';

                        if (!clauseStarted) {
                            delete this.result[currentPoint]
                            currentPoint = ''
                            cleanedText = ''
                        }
                    }
                }

            }
        })

    })

    if (nonValidatatedPoints.length) {
        throw new Error(`Validation error, we found some points which are not allowed i.e ${nonValidatatedPoints.join(",")}`)
    }

    for (const key in this.result) {
        this.result[key] = this.result[key].trim();
    }

    
    await scheduler.terminate();
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
    // const lastPage = this.lastClausePage;
    // return new Promise((resolve, reject) => {
    //   function success(result) {
    //     const data = result.pageTables.map((d) => {
    //       const t = removeNewlinesFromTable(d.tables);
    //       return { ...d, tables: t };
    //     });

    //     let stopExtracting = false;

    //     const d = data.map((d) => {
    //       if (d.page === lastPage) {
    //         stopExtracting = true;
    //       }

    //       if (!stopExtracting) {
    //         return d;
    //       }
    //     });

    //     resolve(d);
    //   }

    //   function error(err) {
    //     reject(err);
    //   }

      // pdf_table_extractor(filePath, success, error);
    // });
  }
}

const pdfTextExtractor = new PdfTextExtractor()

export default pdfTextExtractor;
