const { AppError, catchAsync } = require("../libs/utils");
const { NextFunction, Request, Response } = require("express");

const Clause = require("../models/data.model");
const { Sequelize } = require("sequelize");
const pdfTextExtractor = require("../services/pdfService");
const Table = require("../models/table.model");

exports.getPdfData = catchAsync(
  async (
    req,
    res,
    next
  ) => {
    const fileUrl = req.body.fileUrl;
    // let data;
    let tables;

    try {
      // const res = await pdfTextExtractor.extractTextFromPdf(fileUrl);
      // tables = await pdfTextExtractor.extractTableFromPdf(fileUrl)
      // tables = JSON.stringify(tables).replace(/\n/g, "")
      // tables = JSON.parse(tables)

      // if (!Object.keys(res).length) {
      //   next(new AppError("Data can't be null", 400));
      // }

      // console.log(res);

      // const clauses = await Clause.findAll()
      // console.log(clauses)


      // const data = await Clause.create({
      //   data: {
      //     ...res,
      //   },
      // });

      // await data.save();

      // const tableData = await Table.create({
      //   data: {
      //     ...tables
      //   }
      // })

      // await tableData.save()

      const table = await Table.findAll()

      console.log(table)

    } catch (err) {
      console.log("Error: ", err);
    }

    res.status(200).json({
      status: "success",
      error: false,
      message: "Data extracted successfully",
      data: {
        // tables
      },
    });
  }
);
