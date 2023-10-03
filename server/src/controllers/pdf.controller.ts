import { AppError, catchAsync } from "../libs/utils";
import { NextFunction, Request, Response } from "express";

import Clause from "../models/data.model";
import { Sequelize } from "sequelize";
import { pdfTextExtractor } from "../services/pdfService";

// import { sequelize } from "../server";

const sequelize = new Sequelize(
  process.env.DB_NAME!,
  "admin",
  process.env.DB_PASSWORD,
  {
    host: "localhost",
    dialect: "postgres",
  }
);

export const getPdfData = catchAsync(
  async (
    req: Request<
      {},
      {},
      {
        fileUrl: string;
      }
    >,
    res: Response,
    next: NextFunction
  ) => {
    const fileUrl = req.body.fileUrl;
    // let data;

    try {
      const res = await pdfTextExtractor.extractTextFromPdf(fileUrl);

      if (!Object.keys(res).length) {
        next(new AppError("Data can't be null", 400));
      }

      // console.log(res);

      await Clause.create({
        data: res,
      });

      // await data.save();

      // console.log(data);

      // await clause.save();
      // await Clause.truncate();
      // await sequelize.transaction(async (t) => {
      //   for (const key in data) {
      //     console.log({
      //       key,
      //       value: data[key],
      //     });
      //   }
      //   await Clause.create({
      //     clause: parseFloat(key),
      //     value: data[key],
      //   });
      // }

      // console.log({ data });
    } catch (err) {
      console.log("Error: ", err);
    }

    res.status(200).json({
      status: "success",
      error: false,
      message: "Data extracted successfully",
      // data: {
      //   ...data,
      // },
    });
  }
);
