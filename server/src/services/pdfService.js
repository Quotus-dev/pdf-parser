const { PDFExtract, PDFExtractOptions } = require("pdf.js-extract");

const fs = require("fs");
const pdf_table_extractor = require("pdf-table-extractor");

// const pdf_table_extractor = require("pdf_table_extractor");

class PdfTextExtractor {

  constructor() {
    this.pdfExtract = new PDFExtract();
  }

  async validate(str) {
    return new Promise((resolve, reject) => {
      const status = {
        validationFailed: true,
        message: "",
      };
      const pointMatch = str.match(
        /\b([a-zA-Z])\1*\.|([A-Z])\2*\.|([0-9])\)|([IVXLCDM]+)\.|([ivx]+)\.|([a-zA-Z])\1\)|(0[1-9]|[1-9][0-9]*)\.\$/
      );

      if (pointMatch) {
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

    return new Promise((resolve, reject) => {
      this.pdfExtract.extractBuffer(buffer, options, (err, data) => {
        if (err) return reject(err);

        const result = {};

        let currentPoint = "";
        let stopMatching = false;
        let tableEncountered = false;

        for (const page of data.pages) {
          const pageContent = page.content;

          let isInsideDoubleHash = false;
          let clauseStarted = false;
          let cleanedText = "";

          for (const item of pageContent) {
            const { str } = item;

            if (str.startsWith("INTRODUCTION")) {
              clauseStarted = true;
            }

            if (str.startsWith("**End of Clauses**")) {
              clauseStarted = false;
              stopMatching = true;
              currentPoint = "";
            }

            const tableMatch = str.match(/TABLE/g);

            if (tableMatch) {
              tableEncountered = true;
            }

            if (tableEncountered) {
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

              if (pointMatch) {
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

        for (const key in result) {
          result[key] = result[key].trim();
        }

        resolve(result);
      });
    });
  }

  async extractTableFromPdf(filePath) {
    return new Promise((resolve, reject) => {
      function success(result) {
        resolve(result);
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
