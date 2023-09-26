import { NextFunction, Request, Response } from "express";

import Clause from "../models/data.model";
import { Sequelize } from "sequelize";
import { catchAsync } from "../libs/utils";
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
    // let data: Clause;

    try {
      const res = await pdfTextExtractor.extractTextFromPdf(
        "uploads\\1695618274008-pdf-jagruti.pdf"
      );
      // console.log(res);
      // await Clause.truncate();
      // await sequelize.transaction(async (t) => {
      for (const key in res) {
        console.log({
          key,
          value: res[key],
        });
      }
      //     await Clause.create({
      //       clause: parseFloat(key),
      //       value: res[key],
      //     });
      //   }

      //   // console.log({ data });
      // });
      // console.log("JSON data inserted successfully------------");
    } catch (err) {
      console.log("Error: ", err);
    }

    // console.log(fileUrl);

    res.status(200).json({
      status: "success",
      error: false,
      message: "This is the file url " + fileUrl,
    });
  }
);
