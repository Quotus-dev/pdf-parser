import { PDFExtract, PDFExtractOptions } from "pdf.js-extract";

import fs from "fs";

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
        if (err) return console.log(err);

        const result: any = {};

        // console.log(JSON.stringify(data.pages))

        for (const page of data!.pages) {
          const pageContent = page.content;

          let currentPoint = "";
          let isInsideDoubleHash = false;
          let clauseStarted = false;
          let textToIgnore = "";

          for (const item of pageContent) {
            const { str } = item;

            if (str.startsWith("INTRODUCTION")) {
              clauseStarted = true;
            }

            if (str.startsWith("**End of Clauses**")) {
              clauseStarted = false;
              currentPoint = "";
            }

            // Ignore text between # and ##
            if (str.startsWith("#")) {
              textToIgnore = "";
            } else if (str.startsWith("##")) {
              textToIgnore = "";
              isInsideDoubleHash = !isInsideDoubleHash;
            } else if (isInsideDoubleHash) {
              textToIgnore += str + " ";
            } else if (!isInsideDoubleHash) {
              const pointMatch = str.match(/^\d+(\.\d+)*\.$/);

              // console.log(pointMatch)

              if (pointMatch) {
                currentPoint = pointMatch[0];
                // console.log(pointMatch[0])
                result[currentPoint] = "";
              } else if (currentPoint) {
                const cleanedText = str.replace(/\s+/g, " ").trim();
                result[currentPoint] += cleanedText + " ";
              }
            }
          }

          // Add the text to ignore to the result if clause has started
          if (clauseStarted && textToIgnore.trim() !== "") {
            result[currentPoint] += textToIgnore.trim() + " ";
          }
        }

        for (const key in result) {
          result[key] = result[key].trim();
        }

        resolve(result);
      });
    });
  }
}

export const pdfTextExtractor = new PdfTextExtractor();
