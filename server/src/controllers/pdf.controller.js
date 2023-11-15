import { AppError, catchAsync, removeNewlines } from "../libs/utils.js";
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

export const deleteAllData = catchAsync(async (req, res, next) => {

  await Promise.all([
    Clause.truncate(),
    Table.truncate()
  ])

  res.status(200).json({
    message: "success",
    error: false,
    message: "Data deleted successfully",
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
    table = await Table.findByPk(pdf.tableId)
  }

  res.status(200).json({
    status: "Success",
    error: false,
    message: "Pdf data fetched successfully",
    pdf,
    table
  });
});

export const updatePdfData = catchAsync(async (req, res, next) => {
  const id = req.params.id
  const query = req.query.clause
  const content = req.body.content
  const tableContent = req.body.tableContent

  // console.log(tableContent)

  const updatedTable = tableContent.map((item) => removeNewlines(item))

  const clauses = await Clause.findByPk(id);
  const table = await Table.findByPk(clauses.tableId)

  // console.log(table.setDataValue, "------------")

  if (content) {
    clauses.set({
      data: {
        ...clauses.data,
        [query]: content
      }
    })
    await clauses.save()
  }

  if (tableContent) {
    table.setDataValue('data', updatedTable)
    await table.save()

    // const newTable = await Table.findByPk(clauses.tableId)

    // console.log(newTable)
  }

  res.status(200).json({
    status: "success",
    error: false,
    message: "Data updated successfully",
    data: null
  })
})
