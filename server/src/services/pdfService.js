import fs from "fs";
import axios from "axios";

import FormData from "form-data";
import { createScheduler, createWorker } from "tesseract.js";

import model from "wink-eng-lite-web-model";
import winkNLP from "wink-nlp";

class PdfTextExtractor {
    constructor() {
        // this.pdfExtract = new PDFExtract();
        this.scheduler = createScheduler();
        this.nlp = winkNLP(model, ["sbd", "pos"]);
        this.result = {};
        this.clauseEnded = false;
        this.lastClausePage = "";
        this.ClausePages = [];

        this.currentPoint = "";
        this.tableEncountered = false;
        this.clauseStarted = false;
        this.stopExtracting = false;
        this.nonValidatedPoints = [];
        this.isInsideDoubleHash = false
        this.cleanedText = ""
        this.ignoreToken = false

        this.files = []
    }

    validate(str) {
        return str.match(/^(?:(?:[aA]|[iI])\.|[aAiI]\))/);
    }

    async initializeWorkers(numWorkers) {
        try {
            const workerGen = async () => {
                const worker = await createWorker("eng", 1);
                if (worker) {
                    this.scheduler.addWorker(worker);
                } else {
                    throw new Error("Worker initialization failed");
                }
            };
            const resArr = Array(numWorkers).fill(null).map(workerGen);
            await Promise.all(resArr);
        } catch (err) {
            throw new Error(err?.message || "Failed to initialize workers");
        }
    }

    cleanEveryOccurrenceIfClauseIsNotStartedYet() {
        if (!this.clauseStarted) {
            delete this.result[this.currentPoint];
            this.currentPoint = "";
            this.cleanedText = "";
        }
    }

    handleCurrentPoint(pointMatch) {
        if (Object.hasOwn(this.result, pointMatch[0])) {
            this.cleanedText = pointMatch[0];
            this.result[this.currentPoint] += this.cleanedText;
        } else {
            this.tableEncountered = false;
            this.currentPoint = pointMatch[0];

            this.result[this.currentPoint] = "";
        }
    }

    handleTokensLevel2(tokenSeparated) {
        for (const separatedToken of tokenSeparated) {

            if (!this.stopExtracting && this.clauseStarted && !this.tableEncountered) {
                const validationPoints = this.validate(separatedToken);
                if (validationPoints) {
                    this.nonValidatedPoints.push(validationPoints[0]);
                }
            }

            let separatedTokenMatch;

            if (Object.keys(this.result).length === 1 && Object.values(this.result)[0] === 'INTRODUCTION ') {
                separatedTokenMatch = separatedToken.match(
                    /^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/
                );
            } else {
                separatedTokenMatch = separatedToken.match(/^\d+(\.\d+)+(\.)+$|\\End of Clauses\\$/)
            }

            // console.log({ separatedTokenMatch: separatedToken.match(/^\d+(\.\d+)+(\.)+$|\\End of Clauses\\$/) })

            if (
                separatedToken === "**End of Clauses**" ||
                separatedToken === "**End of Clauses™**" || separatedToken === "**End of Clauses™*" ||
                separatedToken === "“*End of clauses™" || separatedToken === "**¥*% End of clauses ***"
            ) {
                this.stopExtracting = true;
            }

            if (separatedToken.startsWith("##") && separatedToken.endsWith("#")) {
                this.ignoreToken = true
            }

            if (separatedToken.startsWith("H#") || separatedToken.startsWith("#H#") || separatedToken.startsWith("##")) {
                this.isInsideDoubleHash = !this.isInsideDoubleHash;
            }

            if (separatedToken.endsWith("#i#") || separatedToken.endsWith("##") || separatedToken.endsWith("#H#")) {
                this.isInsideDoubleHash = !this.isInsideDoubleHash;
                this.ignoreToken = true
            }

            if (
                separatedTokenMatch &&
                this.currentPoint != separatedTokenMatch[0] &&
                !this.stopExtracting
            ) {
                this.handleCurrentPoint(separatedTokenMatch)
            } else if (this.currentPoint && !this.stopExtracting && !this.ignoreToken && !this.isInsideDoubleHash) {
                this.cleanedText = separatedToken.replace(/\s+/g, " ").trim();
                this.result[this.currentPoint] += this.cleanedText + " ";
            }

            this.ignoreToken = false
            this.cleanEveryOccurrenceIfClauseIsNotStartedYet()
        }
    }

    skipTable(token, index, chunk) {
        const tableMatch = token.match(/TABLE/g);

        if (tableMatch) {
            this.tableEncountered = true;
        }

        if (this.tableEncountered) {
            if (this.clauseStarted && !this.stopExtracting) {
                for (const ch of chunk) {
                    const regex = /(output\/\d+\/)/;
                    const match = ch.match(regex);
                    if (match) {
                        const page = match.input
                        if (!this.ClausePages.includes(page)) {
                            this.ClausePages.push(page);
                        }
                    }
                }
            }
            delete this.result[this.currentPoint];
            this.currentPoint = "";
            this.cleanedText = "";
        }
    }

    handleTokens(tokens, index, chunk) {
        tokens.forEach((token) => {

            this.skipTable(token, index, chunk)

            const introductionMatch = token.match(/INTRODUCTION/g);

            if (introductionMatch) {
                this.clauseStarted = true;
            }

            // console.log({ token })

            // if ((token.startsWith("H#") || token.startsWith("#H#") || token.startsWith("##")) && (token.endsWith("#i#") || token.endsWith("##"))) {
            //     // console.log("++++++++++++++++++++++++++", token)
            //     this.ignoreToken = true
            //     this.isInsideDoubleHash = !this.isInsideDoubleHash;
            // }

            // if (token.endsWith("#i#") || token.endsWith("##")) {
            //     console.log("----------------------------------", token)
            //     this.isInsideDoubleHash = !this.isInsideDoubleHash;
            // }

            const tokenSeparated = token.split("\n");

            const pointMatch = token.match(
                /^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/
            );

            if (pointMatch && !this.stopExtracting && !this.isInsideDoubleHash) {
                this.handleCurrentPoint(pointMatch)
                // console.log(currentPoint)
            } else if (tokenSeparated && !this.isInsideDoubleHash) {
                this.handleTokensLevel2(tokenSeparated)
            }

            // this.ignoreToken = false
        });
    }

    processText(text, chunk) {
        text.map((t, index) => {
            const doc = this.nlp.readDoc(t);
            const tokens = doc.sentences().out();

            this.handleTokens(tokens, index, chunk)
        });
    }

    async processFiles(files) {

        // this.files = files

        const chunkSize = 4
        const chunkedFiles = []

        for (let i = 0; i < files.length; i += chunkSize) {
            chunkedFiles.push(files.slice(i, i + chunkSize))
        }

        // console.log({ chunk1, chu })

        for (const chunk of chunkedFiles) {
            const promises = chunk.map(async (file) => {
                const {
                    data: { text },
                } = await this.scheduler.addJob("recognize", file);
                // trackProgress();
                return text;
            });

            // if (!this.stopExtracting) {
            const text = await Promise.all(promises);

            console.log({ text })

            this.processText(text, chunk)
            // }
            // console.log(this.result, "=======================")
        }

        // const promises = files.map(async (file) => {
        //     const {
        //         data: { text },
        //     } = await this.scheduler.addJob("recognize", file);
        //     // trackProgress();
        //     return text;
        // });

        // const text = await Promise.all(promises);

        // this.processText(text)

        if (this.nonValidatedPoints.length) {
            throw new Error(
                `Validation error, we found some points which are not allowed i.e ${this.nonValidatedPoints.join(
                    ","
                )}`
            );
        }

        for (const key in this.result) {
            this.result[key] = this.result[key].trim();
        }

        console.log({ TablePages: this.ClausePages })
        await this.scheduler.terminate();
        return this.result;
        // } catch (err) {
        //     throw new Error(err)
        // }

    }

    async extractImagesFromPdf(filePath) {
        // print(filePath,'extract_images')
        console.log(filePath, "extract_images");
        // exportImages("file.pdf", "output/dir")
        //   .then((images) => console.log("Exported", images.length, "images"))
        //   .catch(console.error);
    }
    async extractTableFromPdf() {
        const tableData = [];
        // console.log(this.ClausePages, "---------")
        try {
            // Split your API requests into batches
            const batchSize = 1; // Number of API calls per batch
            const batches = [];
            for (let i = 0; i < this.ClausePages.length; i += batchSize) {
                const batch = this.ClausePages.slice(i, i + batchSize);
                batches.push(batch);
            }

            // Function to make API calls for a batch
            async function makeApiCallsForBatch(batch) {
                // console.log({ insideAPiCall })
                const results = [];
                for (const file of batch) {
                    const form = new FormData();
                    form.append("image", fs.createReadStream(file));
                    const apiUrl = "http://py-server:5151/extract-table";
                    try {
                        const response = await axios.post(apiUrl, form, {
                            headers: {
                                ...form.getHeaders(),
                            },
                        });
                        results.push({ data: response.data.table, page: file });
                    } catch (error) {
                        console.error("Error:", error);
                        results.push(null); // or handle the error as needed
                    }
                }
                return results;
            }

            // Execute API calls in batches using Promise.all
            const allResults = [];

            async function processBatches() {
                for (const batch of batches) {
                    const batchResults = await Promise.all(
                        batch.map((file) => makeApiCallsForBatch([file]))
                    );
                    allResults.push(...batchResults);
                }

                // console.log("All API calls completed:", allResults);
            }

            // Call the function to start processing batches
            await processBatches();
            return allResults;
        } catch (error) {
            console.error("Error:", error);
        }

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

const pdfTextExtractor = new PdfTextExtractor();

export default pdfTextExtractor;