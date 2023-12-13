import { AppError, catchAsync, removeNewlines } from "../libs/utils.js";
// import { NextFunction, Request, Response } from "express";
// const amqp = require('amqplib');

import Clause from "../models/data.model.js";
// import { Sequelize } from "sequelize";
import pdfTextExtractor from "../services/pdfService.js";
import Table from "../models/table.model.js";
import os from "os";
import fs from "fs";
import path from "path";
import Files from "../models/files.model.js";
import admin from "firebase-admin";




// try {
//   admin.initializeApp({
//     // Your Firebase service account credentials
//     credential: admin.credential.cert({
//       projectId: "pdf-parser-mjunction",
//       clientEmail: "firebase-adminsdk-jhy3g@pdf-parser-mjunction.iam.gserviceaccount.com",
//       privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDd6WJ1yf61pNjF\nI/ptrJiX6JRhgK0IMDcBQ2TJRRKWOUZrhUxd7EYz0cNNHQ6u4XQyQpDhcGxbUYIs\n+gaEqejeBxqgHpkJ9JKk1z5d4luSkHAjnppemTt22TeNcG+w4bpodNI2WHWFU8uT\nm8JHcQr9KQ0+K5rlM5AheWz4gA0kKeK2bwqRvI/wRiLjpmMbS0mQdklLQQ4Nwt98\nkEGCRYIaAqGeTz8AbeHDjeLwVxZAi5X20mPq5HiasmivOfeRdwm4xt5F6J9v3SHx\nEyeWdGoxe1mJ+OLBbApp5CPJ3hQh+aZAFAkHSxaxv9AJabxkzYFjARs+MskdLy7V\nyX2EeQuVAgMBAAECggEABizdg35pHCEuO1jbF/xapeo1X2JMf3DE1xV+F7RHTKqf\nF5S/XSdW2qWBS63sqEcNUDFFOHP/pUNvqpi+10o/8Guk2tWyV776lKO9A342q3qD\noBf+UiDtwiiljYHJniklpoygFGKK3EVbnbabX4/5N6T0AaexQJNNbIu2WjDAtWXv\nMba+WvQB9aFS2nZ/c9kUjZE9PrwpRcFZIf58hGk8bfpY1/MapWrZxz8TsLEMG3wk\n8XpIQwdcAdqEXYk29G+Y/mb/CuFn/MlsI0FgXA5UgXMbbB3X6DvCSUfmLyECqmY5\nJvQDlnv3gbiqo8kt3kB67UrTvs5RuVGBVLMt53A+sQKBgQDvRfLq1JJJXsMcPVph\nzywxQLoftvyKoymr8w7J/CP0BoW0gBnqm4v6+btPFWcI4UJC1td9QttROmWsvIk4\n4CpzI+tayDU6wM9n8m50VoLiSVc54HUMhieSue5QMa9Mb5ffhxeKj8A2F5oTiMRq\nvEdGGMoJCgKMFRvLSEudl5VfpwKBgQDtbLtM1NPdrXZOUztg1RYqzkRSKNOULdon\nIIYhXBKwSY/1JJ3ZzgHLZJkBkIfqX4NcEXPmeOyUGL/AeEoS6IcoBmQp4GJmGQ0l\nx5enJS0U8gpJBYiDNuW1mrD9F/pFxut6YfErbZxNqu4i0Qna0MV6AJn4tTCmkRyP\n7/rCBhRCYwKBgQDk/usHuD3xHlJZOpa/uUkwMiRvqe90t8dwG4Tx5vB54awhHeCv\n2gJURqHvhCpCI2QJGBjQdyXzTZJ1iVNDLbcyzxO2pJndCx70+t6fVRSagVqLt7gO\nLm69TFk6QvLkkoClm2L6Z62rl1cMjv58sIj+G0dw8zWQ37rkCOLlhmedTQKBgQC2\n8/N8p/++sX0ZrA90dZ8ISzvgZ69qXs7dGbXiHPYVvAnfaGDuxk0hsxooV3w0gXdS\nyewarBH5qPyRzt+dpGsJz6r9jfelHya/dwcIeKA9pKmCTW49Vl86SsKZtRFZFYi9\nHJ3fzi4Et3ObhqNmZzvU4IPFX7HmmKl+zPjY7CBOawKBgQDWiUoRoVBdwsyDOUzF\nhda7pUz8LjUXWovIB2vqn+4Y6SbE6JrnurbNsjKhXB57xEccH+EhXsNo6k0WZHBn\ns04THOy6Mj2UNXTMC3sy4XPBRhB548SUYw7mau7LNbXzeThG5vOi7dkeeU/P6luL\nEIZDnfEuaeUKBepIJqTupkqRsA==\n-----END PRIVATE KEY-----\n",
//     }),
//     storageBucket: "pdf-parser-mjunction.appspot.com"
//   });
// } catch (error) {
//   console.error(error);
// }


export const extractDataAndUploadToDB = catchAsync(async (files, ws) => {
  let table;
  let tables;
  let clauses;

  try {
    const numCPUs = os.cpus().length;
    // await pdfTextExtractor.initializeWorkers(numCPUs - 1);
    clauses = await pdfTextExtractor.processFiles(files, ws);
    table = await pdfTextExtractor.extractTableFromPdf(ws);

    clauses = await Clause.create({
      data: {
        ...clauses,
      },
      tableId: table.id,
    });

    await clauses.save();
    tables = await Table.findByPk(table.id);
    // console.log(tables, "+++++++++++++++++++++")
    tables = tables.dataValues;
  } catch (err) {
    // console.log(err);
    const response = {
      status: "failed",
      error: true,
      message: err?.message || "Some error occurred, please try again later",
    };
    ws.send(JSON.stringify(response));
    ws.close();
    return response;
    // }
  }

  const response = {
    status: "success",
    error: false,
    message: "Data extracted successfully",
    data: {
      clauses,
      tables,
    },
  };

  // files.forEach((filePath) => {
  //   fs.unlink(filePath, (err) => {
  //     if (err) {
  //       console.error(`Error deleting file ${filePath}: ${err.message}`);
  //     } else {
  //       console.log(`File ${filePath} deleted successfully`);
  //     }
  //   });
  // });

  ws.send(JSON.stringify(response));
  ws.close();
  return response;
});

export const extractDataAndUploadToDBApi = catchAsync(
  async (req, res, next) => {
    const files = req.body.files;
    // let data;
    let table;
    let tables;
    let clauses;
    let filesPath;

  

    try {
      if (!req.body || !Array.isArray(files)) {
        throw new Error("Invalid request format. Please provide a valid JSON object with a 'files' key containing an array of image paths.");
      }
  
      // const id_part = files[0].split("/")[1];
      // const files_path = await Files.findOne({
      //   where: {
      //     folder_id: id_part,
      //   },
      // });
      // // console.log(files_path?.data)
      // if(files_path?.data){
      //   filesPath = files_path?.data;
      //   const url =  await extractFileUrl(filesPath['pdf_file'])
      //   filesPath['pdf_file']  = url[0]
      //   Object.entries(filesPath).forEach((item)=>{         
      //     if(item[1].length != 0 && Array.isArray(item[1])){
      //       item[1].forEach(async (file,i)=>{
      //         const url = await extractFileUrl(file.img_filename)
      //         filesPath[item[0]][i]['img_filename'] = url[0];
      //       })
      //     }

      //   })
      // }
      
      clauses = await pdfTextExtractor.processFiles(files);
      table = await pdfTextExtractor.extractTableFromPdf();
      clauses = await Clause.create({
        data: {
          ...clauses,
        },
        tableId: table.id,
      });

      await clauses.save();
      tables = await Table.findByPk(table.id);
      tables = tables.dataValues;
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        status: "failed",
        error: true,
        message: err?.message || "Some error occurred, please try again later",
      });
      // }
    }

    res.status(200).json({
      status: "success",
      error: false,
      message: "Data extracted successfully",
      data: {
        clauses,
        tables,
      },
    });
  }
);

const extractFileUrl = async (path)=>{

  const storage = admin.storage();

  const bucket = storage.bucket();
  const file = bucket.file(path);

  const url = await file
    .getSignedUrl({
      action: "read", // Specify the desired action (e.g., read, write)
      expires: Date.now() + 12 * 60 * 60 * 1000, // Set the expiration time in milliseconds (1 hour in this example)
    })
    .then((url) => {
      // Use the signed URL in your application
       return url;
    })
    .catch((error) => {
      console.error("Error getting signed URL:", error);
    });

    return url;
}


export const getPDFData = catchAsync(async (req, res, next) => {
  const data = await Clause.findAll();

  const tables = await Table.findAll();

  res.status(200).json({
    message: "success",
    error: false,
    message: "Data fetched successfully",
    data,
    tables,
  });
});

export const getSinglePdfData = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const clauseQuery = req.query.clause;

  let pdf;
  let table;

  if (clauseQuery) {
    pdf = await Clause.findByPk(id);
    pdf = { [clauseQuery]: pdf.data[clauseQuery] };
  } else {
    pdf = await Clause.findByPk(id);
    // table = await Table.findByPk(pdf.tableId)
  }

  res.status(200).json({
    status: "Success",
    error: false,
    message: "Pdf data fetched successfully",
    pdf
  });
});

export const updatePdfData = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const query = req.query.clause;
  const content = req.body.content;
  const tableContent = req.body.tableContent;

  console.log("-------------------------------");

  // console.log({tableContent})

  // console.log(tableContent)

  console.log("==========================");

  const clauses = await Clause.findByPk(id);
  const table = await Table.findByPk(clauses.tableId);

  // console.log(table.setDataValue, "------------")

  if (content) {
    clauses.set({
      data: {
        ...clauses.data,
        [query]: content,
      },
    });
    await clauses.save();
  }

  console.log("+++++++++++++++++++++++++++++++++");

  if (tableContent) {
    const updatedTable = tableContent.map((item) => removeNewlines(item));
    table.setDataValue("data", updatedTable);
    await table.save();

    // const newTable = await Table.findByPk(clauses.tableId)

    // console.log(newTable)
  }

  res.status(200).json({
    status: "success",
    error: false,
    message: "Data updated successfully",
    data: null,
  });
});
