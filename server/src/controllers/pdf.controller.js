import { AppError, catchAsync } from "../libs/utils.js";
// import { NextFunction, Request, Response } from "express";

import Clause from "../models/data.model.js";
// import { Sequelize } from "sequelize";
import pdfTextExtractor from "../services/pdfService.js";
import Table from "../models/table.model.js";

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
      await pdfTextExtractor.initializeWorkers(50)
      const result = await pdfTextExtractor.processFiles(files)

      console.log(result)

      // tables = await pdfTextExtractor.extractTableFromPdf(fileUrl)
      // tables = JSON.stringify(tables).replace(/\n/g, "")
      // tables = JSON.parse(tables)

      // clauses = await Clause.create({
      //   data: {
      //     ...res,
      //   },
      // });

      // await clauses.save();

      // tables = await Table.create({
      //   data: {
      //     ...tables
      //   }
      // })

      // await tables.save()

    } catch (err) {
      console.log(err)
      // console.log(typeof document,'test_test_test')
      // if (err.validationFailed) {
      //   return res.status(400).json({
      //     status: "failed",
      //     error: true,
      //     message: err?.message || "Validation Failed",
      //   });
      // } else {
        return res.status(500).json({
          status: "failed",
          error: true,
          message: err?.message || "Some error occured, please try again later",
        })
      // }
    }

    res.status(200).json({
      status: "success",
      error: false,
      message: "Data extracted successfully",
      // data: {
      //   clauses,
      //   tables
      // },
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
