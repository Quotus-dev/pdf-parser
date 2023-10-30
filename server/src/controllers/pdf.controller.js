import { AppError, catchAsync } from "../libs/utils.js";
// import { NextFunction, Request, Response } from "express";

import Clause from "../models/data.model.js";
// import { Sequelize } from "sequelize";
import pdfTextExtractor from "../services/pdfService.js";
import Table from "../models/table.model.js";
import os from 'os';
export const extractDataAndUploadToDB = catchAsync(

  async (
    req,
    res,
    next
  ) => {
    const files = req.body.files;
    // let data;
    let tables;
    let clauses;

    try {
      const numCPUs = os.cpus().length;
      await pdfTextExtractor.initializeWorkers(numCPUs - 1)
      clauses = await pdfTextExtractor.processFiles(files)

      tables = await pdfTextExtractor.extractTableFromPdf();
      // console.log(result, 'test_test')

      // tables = await pdfTextExtractor.extractTableFromPdf(fileUrl)
      // tables = JSON.stringify(tables).replace(/\n/g, "")
      // tables = JSON.parse(tables)


      tables = await Table.create({
        data: {
          ...tables
        }
      })

      clauses = await Clause.create({
        data: {
          ...clauses,
        },
      });

      clauses.tableId = tables.id

      console.log(tables.id)
      console.log(clauses.id)

      // clauses.setDataValue("TableId", tables.id)
      // tables.setDataValue("documentId", clauses.id)

      await clauses.save();


      await tables.save()

    } catch (err) {
      console.log(err)
      return res.status(500).json({
        status: "failed",
        error: true,
        message: err?.message || "Some error occurred, please try again later",
      })
      // }
    }

    res.status(200).json({
      status: "success",
      error: false,
      message: "Data extracted successfully",
      data: {
        clauses,
        tables
      },
    });
  }
);

export const getPDFData = catchAsync(async (req, res, next) => {

  const data = await Clause.findAll()

  const tables = await Table.findAll()

  res.status(200).json({
    message: "success",
    error: false,
    message: "Data fetched successfully",
    data,
    tables
  })
})

export const getSinglePdfData = catchAsync(async (req, res, next) => {
  const id = req.params.id
  const clauseQuery = req.query.clause

  let pdf;

  if (clauseQuery) {
    pdf = await Clause.findByPk(id)
    pdf = { [clauseQuery]: pdf.data[clauseQuery] }
  } else {
    pdf = await Clause.findByPk(id)
  }

  res.status(200).json({
    status: "Success",
    error: false,
    message: "Pdf data fetched successfully",
    pdf
  })
})
