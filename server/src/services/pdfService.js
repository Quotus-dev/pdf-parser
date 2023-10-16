const { PDFExtract, PDFExtractOptions } = require("pdf.js-extract");

const fs = require("fs");
const pdf_table_extractor = require("pdf-table-extractor");
const { removeNewlinesFromTable } = require("../libs/utils");
// const { exportImages } = require('pdf-export-images');
// const pdf_table_extractor = require("pdf_table_extractor");

class PdfTextExtractor {
  constructor() {
    this.pdfExtract = new PDFExtract();
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

  async extractTextFromPdf(filePath) {
    const buffer = fs.readFileSync(filePath);
    const options = {};

    return new Promise(async (resolve, reject) => {
      this.pdfExtract.extractBuffer(buffer, options, async (err, data) => {
        if (err) return reject(err);

        const result = {};

        let currentPoint = "";
        let stopMatching = false;
        let tableEncountered = false;
        let count = 1
        let wordTable = ""

        // Define an array to store validation promises
        const validationPromises = [];

        for (const page of data.pages) {
          const pageContent = page.content;

          let isInsideDoubleHash = false;
          let clauseStarted = false;
          let cleanedText = "";

          for (const item of pageContent) {
            const { str } = item;

            // Push the validation promise into the array
            if (str.startsWith("T") && str.endsWith("T")) {
              wordTable += str
              count++
            }

            if (str.startsWith("ABLE") || str.endsWith("ABLE)") && count >= 2) {
              wordTable += "ABLE"
            }

            if (wordTable === "TABLE") {
              tableEncountered = true
              count = 1
              wordTable = ""
            }

            if (str.startsWith("INTRODUCTION")) {
              clauseStarted = true;
            }

            if (str.startsWith("**")) {
              clauseStarted = false;
              stopMatching = true;
              currentPoint = "";
              this.clauseEnded = true;
              this.lastClausePage = page.pageInfo.num;

              console.log({ lastpage: this.lastClausePage });
            }
            if (str.startsWith("**End of Clauses**")) {
              clauseStarted = false;
              stopMatching = true;
              currentPoint = "";
              this.clauseEnded = true;
              this.lastClausePage = page.pageInfo.num;

              console.log({ lastpage: this.lastClausePage });
            }

            const tableMatch = str.match(/TABLE/g);

            if (tableMatch) {
              tableEncountered = true;
            }

            if (tableEncountered) {
              // console.log(currentPoint)
              delete result[currentPoint];
              currentPoint = "";
              cleanedText = "";
            }

            if (str.startsWith("#")) {
              isInsideDoubleHash = true;
              if (str.endsWith("##")) {
                isInsideDoubleHash = false;
              }
            } else if (!isInsideDoubleHash && !stopMatching) {
              const pointMatch = str.match(
                /\b\d+(\.\d+)*\.$|\*\*End of Clauses\*\*/g
              );

              if (!tableEncountered && currentPoint) {
                // console.log({ tableEncountered, currentPoint })
                validationPromises.push(this.validate(str, page.pageInfo.num));
              }

              // console.log(pointMatch)

              if (pointMatch) {
                console.log(str)
                tableEncountered = false;
                currentPoint = pointMatch[0];
                result[currentPoint] = "";
              } else if (currentPoint) {
                cleanedText = str.replace(/\s+/g, " ").trim();
                result[currentPoint] += cleanedText + " ";
              }
            }
          }
        }

        // Wait for all validation promises to resolve
        const validationResults = await Promise.all(validationPromises);

        // Check if any validation failed
        const validationFailed = validationResults.some(
          (res) => res.validationFailed
        );

        // console.log({ validationFailed })

        if (validationFailed) {
          // Reject with an error message
          reject({ validationFailed: true, message: "Validation Failed" });
        } else {
          for (const key in result) {
            result[key] = result[key].trim();
          }

          resolve(result);
        }
      });
    });
  }
  async extractImagesFromPdf(filePath) {
    // print(filePath,'extract_images')
    console.log(filePath,'extract_images')
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

module.exports = pdfTextExtractor;
