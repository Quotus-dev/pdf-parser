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

    async processFiles(files) {
        const tractProgress = (() => {
            const startTime = performance.now();
            let completedJobs = 0;
            const totalJobs = files.length;
            let processingTime = "";

            // Function to make API calls for return () => {
            completedJobs++;
            const progress = (completedJobs / totalJobs) * 100;
            console.log(
                `Progress: ${progress.toFixed(
                    2
                )}% (${completedJobs}/${totalJobs} jobs completed)`
            );

            if (completedJobs === totalJobs) {
                const endTime = performance.now();
                processingTime = (endTime - startTime) / 1000;
                processingTime = processingTime / 60;
                console.log(
                    "All jobs completed.",
                    `It took ${processingTime} minute`
                );
                // process.exit(0);
            }
        })();

        let currentPoint = "";
        let tableEncountered = false;
        let clauseStarted = false;
        let stopExtracting = false;
        const nonValidatedPoints = [];

        try {

            const promises = files.map(async (file) => {
                const {
                    data: { text },
                } = await this.scheduler.addJob("recognize", file);
                tractProgress();
                return text;
            });

            const text = await Promise.all(promises);
            text.map((t, i) => {
                const doc = this.nlp.readDoc(t);
                const tokens = doc.sentences().out();

                let cleanedText = "";
                let isInsideDoubleHash = false;

                tokens.forEach((token) => {
                    const tableMatch = token.match(/TABLE/g);
                    const introductionMatch = token.match(/INTRODUCTION/g);

                    if (introductionMatch) {
                        clauseStarted = true;
                    }

                    if (token.startsWith("##") && token.endsWith("#")) {
                        isInsideDoubleHash = !isInsideDoubleHash;
                    }

                    if (tableMatch) {
                        tableEncountered = true;
                    }

                    if (tableEncountered) {
                        if (clauseStarted && !stopExtracting) {
                            const regex = /(output\/\d+\/)/;
                            const match = files[0].match(regex);
                            const extractedText = match[1];
                            const page = `${extractedText}page_${i + 1}.png`;
                            if (!this.ClausePages.includes(page)) {
                                this.ClausePages.push(page);
                            }
                        }
                        delete this.result[currentPoint];
                        currentPoint = "";
                        cleanedText = "";
                    }

                    // console.log({ token })

                    const tokenSeparated = token.split("\n");

                    // console.log(tokenSeparated)

                    const pointMatch = token.match(
                        /^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/
                    );

                    if (pointMatch && !stopExtracting && !isInsideDoubleHash) {
                        if (Object.hasOwn(this.result, pointMatch[0])) {
                            cleanedText = pointMatch[0];
                            this.result[currentPoint] += cleanedText;
                        } else {
                            tableEncountered = false;
                            currentPoint = pointMatch[0];

                            this.result[currentPoint] = "";
                        }
                        // console.log(currentPoint)
                    } else if (tokenSeparated && !isInsideDoubleHash) {
                        for (const separatedToken of tokenSeparated) {
                            if (!stopExtracting && clauseStarted && !tableEncountered) {
                                const validationPoints = this.validate(separatedToken);
                                if (validationPoints) {
                                    // console.log({ validationPoints, separatedToken })
                                    nonValidatedPoints.push(validationPoints[0]);
                                }
                            }

                            const separatedTokenMatch = separatedToken.match(/^\d+(\.\d+)+(\.)+$|\\End of Clauses\\$/)
                            // const separatedTokenMatch = separatedToken.match(
                            //     /^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/
                            // );

                            if (
                                separatedToken === "**End of Clauses**" ||
                                separatedToken === "**End of Clauses™**" || separatedToken === "**End of Clauses™*"
                            ) {
                                stopExtracting = true;
                            }

                            if (
                                separatedTokenMatch &&
                                currentPoint != separatedTokenMatch[0] &&
                                !stopExtracting
                            ) {
                                tableEncountered = false;
                                currentPoint = separatedTokenMatch[0];
                                this.result[currentPoint] = "";
                            } else if (currentPoint && !stopExtracting) {
                                cleanedText = separatedToken.replace(/\s+/g, " ").trim();
                                this.result[currentPoint] += cleanedText + " ";
                            }
                            // if (clauseStarted) {
                            //     const regex = /(output\/\d+\/)/;
                            //     const match = files[0].match(regex);
                            //     const extractedText = match[1];
                            //     const page = `${extractedText}page_${i + 1}.png`;
                            //     if (!this.ClausePages.includes(page)) {
                            //         this.ClausePages.push(page);
                            //     }
                            // }
                            if (!clauseStarted) {
                                delete this.result[currentPoint];
                                currentPoint = "";
                                cleanedText = "";
                            }
                        }
                    }
                });
            });

            if (nonValidatedPoints.length) {
                throw new Error(
                    `Validation error, we found some points which are not allowed i.e ${nonValidatedPoints.join(
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
        } catch (err) {
            throw new Error(err)
        }

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
        try {
            // Split your API requests into batches
            const batchSize = 8; // Number of API calls per batch
            const batches = [];
            for (let i = 0; i < this.ClausePages.length; i += batchSize) {
                const batch = this.ClausePages.slice(i, i + batchSize);
                batches.push(batch);
            }

            // Function to make API calls for a batch
            async function makeApiCallsForBatch(batch) {
                const results = [];
                for (const file of batch) {
                    const form = new FormData();
                    form.append("image", fs.createReadStream(file));
                    const apiUrl = "http://py-server:5000/extract-table";
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
