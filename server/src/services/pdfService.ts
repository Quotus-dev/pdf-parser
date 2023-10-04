import { PDFExtract, PDFExtractOptions } from "pdf.js-extract";

import fs from "fs";
import pdf_table_extractor from "pdf_table_extractor";

// const pdf_table_extractor = require("pdf_table_extractor");

class PdfTextExtractor {
  private pdfExtract: PDFExtract;
  // private validationFailed: boolean;

  constructor() {
    this.pdfExtract = new PDFExtract();
  }

  public async validate(
    str: string
  ): Promise<{ validationFailed: boolean; message?: string }> {
    return new Promise((resolve, reject) => {
      const status: {
        validationFailed: boolean;
        message?: string;
      } = {
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
        status.message = "Validation Successfull";
      }

      resolve(status);
    });
  }

  public async extractTextFromPdf(
    filePath: string
  ): Promise<Record<string, string>> {
    const buffer = fs.readFileSync(filePath);

    const options: PDFExtractOptions = {};

    return new Promise<Record<string, string>>((resolve, reject) => {
      this.pdfExtract.extractBuffer(buffer, options, (err, data) => {
        if (err) return reject(err);

        const result: any = {};

        let currentPoint = "";
        let stopMatching = false;
        let tableEncountered = false;

        for (const page of data!.pages) {
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
              // const pointMatch = str.match(/\b([a-zA-Z])\1*\.|([A-Z])\2*\.|([0-9])\)|([IVXLCDM]+)\.|([ivx]+)\.|([a-zA-Z])\1\)|(0[1-9]|[1-9][0-9]*)\.\$/);

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

  public async extractTableFromPdf(filePath: string) {
    return new Promise((resolve, reject) => {
      function success(result: any) {
        resolve(result);
      }

      function error(err: any) {
        reject(err);
      }

      tableExtractor(filePath, success, error);
    });
  }
}

export const pdfTextExtractor = new PdfTextExtractor();
