const { AppError, catchAsync } = require("../libs/utils");
const { NextFunction, Request, Response } = require("express");

const Clause = require("../models/data.model");
const { Sequelize } = require("sequelize");
const pdfTextExtractor = require("../services/pdfService");

// import { sequelize } from "../server";

exports.getPdfData = catchAsync(
  async (
    req,
    res,
    next
  ) => {
    const fileUrl = req.body.fileUrl;
    // let data;

    try {
      const res = await pdfTextExtractor.extractTextFromPdf(fileUrl);

      if (!Object.keys(res).length) {
        next(new AppError("Data can't be null", 400));
      }

      // console.log(res);

      // const clauses = await Clause.findAll()
      // console.log(clauses)


      const data = await Clause.create({
        data: {
          ...res,
        },
      });

      await data.save();

    } catch (err) {
      console.log("Error: ", err);
    }

    res.status(200).json({
      status: "success",
      error: false,
      message: "Data extracted successfully",
      data: {

      },
    });
  }
);
