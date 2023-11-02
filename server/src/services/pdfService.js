import fs from "fs";
import axios from "axios";

import FormData from "form-data";
import { createScheduler, createWorker } from "tesseract.js";

import model from "wink-eng-lite-web-model";
import winkNLP from "wink-nlp";
// import amqp from "amqplib"
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';

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
        // const trackProgress = (() => {
        //     const startTime = performance.now();
        //     let completedJobs = 0;
        //     const totalJobs = files.length;
        //     let processingTime = "";

        //     // Function to make API calls for return () => {
        //     completedJobs++;
        //     const progress = (completedJobs / totalJobs) * 100;
        //     console.log(
        //         `Progress: ${progress.toFixed(
        //             2
        //         )}% (${completedJobs}/${totalJobs} jobs completed)`
        //     );

        //     if (completedJobs === totalJobs) {
        //         const endTime = performance.now();
        //         processingTime = (endTime - startTime) / 1000;
        //         processingTime = processingTime / 60;
        //         console.log(
        //             "All jobs completed.",
        //             `It took ${processingTime} minute`
        //         );
        //         // process.exit(0);
        //     }
        // })();

        let currentPoint = "";
        let tableEncountered = false;
        let clauseStarted = false;
        let stopExtracting = false;
        const nonValidatedPoints = [];

        // try {

        const promises = files.map(async (file) => {
            const {
                data: { text },
            } = await this.scheduler.addJob("recognize", file);
            // trackProgress();
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

                        let separatedTokenMatch;

                        if (Object.keys(this.result).length === 1 && Object.values(this.result)[0] === 'INTRODUCTION ') {
                            separatedTokenMatch = separatedToken.match(
                                /^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/
                            );
                        } else {
                            separatedTokenMatch = separatedToken.match(/^\d+(\.\d+)+(\.)+$|\\End of Clauses\\$/)
                        }

                        // separatedTokenMatch = Object.keys(this.result).length < 2 ? separatedToken.match(/^\d+(\.\d+)+(\.)+$|\\End of Clauses\\$/) : separatedToken.match(
                        //     /^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/
                        // );


                        // console.log({ result: this.result })
                        // const separatedTokenMatch = separatedToken.match(
                        //     /^(?:\d+(\.\d+)*\.$|\*\*End of Clauses\*\*)$/
                        // );

                        // console.log({ separatedTokenMatch })

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
        try {
            

            const uuid = uuidv4();
            const jsonResponse = await sendJsonRequest({'tables':this.ClausePages,'uuid':uuid});
            return jsonResponse;
        } catch (error) {
            console.error("Error:", error);
        }
    }
}



async function sendJsonRequest(request) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://py-server:5151');

        ws.on('open', () => {
            console.log('WebSocket connection opened.');
            // Stringify the JSON request
            const jsonRequest = JSON.stringify(request);
            // Send the JSON request to the WebSocket server
            ws.send(jsonRequest);
        });

        ws.on('message', (message) => {
            console.log('Received message from WebSocket server:', message);
            // Parse the received JSON response
            const jsonResponse = JSON.parse(message);
            // Resolve the promise with the received JSON response
            resolve(jsonResponse);
            // Close the WebSocket connection after receiving a response
            ws.close();
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed.');
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);

            // Reject the promise if there's an error
            reject(error);
        });
    });
}

const pdfTextExtractor = new PdfTextExtractor();

export default pdfTextExtractor;
