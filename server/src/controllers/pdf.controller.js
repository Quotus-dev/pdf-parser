const { AppError, catchAsync } = require("../libs/utils");
const { NextFunction, Request, Response } = require("express");

const Clause = require("../models/data.model");
const { Sequelize } = require("sequelize");
const pdfTextExtractor = require("../services/pdfService");
const Table = require("../models/table.model");

exports.extractDataAndUploadToDB = catchAsync(
  async (
    req,
    res,
    next
  ) => {
    const fileUrl = req.body.fileUrl;
    // let data;
    let tables;
    let clauses;

    try {
      const res = await pdfTextExtractor.extractTextFromPdf(fileUrl);
      tables = await pdfTextExtractor.extractTableFromPdf(fileUrl)
      tables = JSON.stringify(tables).replace(/\n/g, "")
      tables = JSON.parse(tables)

      clauses = await Clause.create({
        data: {
          ...res,
        },
      });

      await clauses.save();

      tables = await Table.create({
        data: {
          id: clauses.id,
          ...tables
        }
      })

      await tables.save()

    } catch (err) {
      if (err.validationFailed) {
        return res.status(400).json({
          status: "failed",
          error: true,
          message: err?.message || "Validation Failed",
        });
      } else {
        return res.status(500).json({
          status: "failed",
          error: true,
          message: err?.message || "Some error occured, please try again later",
        })
      }
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

exports.getPDFData = catchAsync(async (req, res, next) => {

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

exports.getSinglePdfData = catchAsync(async (req, res, next) => {
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
