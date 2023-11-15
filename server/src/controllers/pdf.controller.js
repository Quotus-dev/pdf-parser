import { AppError, catchAsync } from "../libs/utils.js";
// import { NextFunction, Request, Response } from "express";
// const amqp = require('amqplib');

import Clause from "../models/data.model.js";
// import { Sequelize } from "sequelize";
import pdfTextExtractor from "../services/pdfService.js";
import Table from "../models/table.model.js";
import os from "os";
import fs from 'fs'
import path from 'path';

export const extractDataAndUploadToDB = catchAsync(async (files, ws) => {


  let table;
  let tables;
  let clauses;

  try {
    const numCPUs = os.cpus().length;
    // await pdfTextExtractor.initializeWorkers(numCPUs - 1);
    clauses = await pdfTextExtractor.processFiles(files,ws);
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
    const response =  {
      status: "failed",
      error: true,
      message: err?.message || "Some error occurred, please try again later",
    };
    ws.send(JSON.stringify(response));
    ws.close();
    return response;
    // }
  }


  const response =  {
    status: "success",
    error: false,
    message: "Data extracted successfully",
    data: {
      clauses,
      tables,
    },
  };
  console.log(files)

  files.forEach((filePath) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file ${filePath}: ${err.message}`);
      } else {
        console.log(`File ${filePath} deleted successfully`);
      }
    });
  });

  ws.send(JSON.stringify(response));
  ws.close();
  return response;
});

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

  if (clauseQuery) {
    pdf = await Clause.findByPk(id);
    pdf = { [clauseQuery]: pdf.data[clauseQuery] };
  } else {
    pdf = await Clause.findByPk(id);
  }

  res.status(200).json({
    status: "Success",
    error: false,
    message: "Pdf data fetched successfully",
    pdf,
  });
});
