import express, { NextFunction, Request, Response } from "express";

import { AppError } from "./libs/utils";
import Clause from "./models/data.model";
import { config } from "dotenv";
import { errorHandler } from "./middlewares/error.handler";
import fs from "fs";
import morgan from "morgan";
import pdfRoutes from "./routes/pdf.routes";
import { upload } from "./libs";
import uploadRoutes from "./routes/upload.routes";

// import { pool } from "./server";

config();

export const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("uploads"));

app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/pdf", pdfRoutes);

// app.post(
//   "/upload",
//   upload.single("file"),
//   async (req: Request, res: Response, next: NextFunction) => {
//     console.log(req.file?.path);

//     res.json({
//       file: req.file,
//     });
//   }
// );

// app.get("/", async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const data = await Clause.create({
//       clause: 1.1,
//     });
//     await data.save();
//     // const data = await Clause.findAll();
//     res.status(200).json(data);
//     // });
//   } catch (err) {
//     res.status(400).json(err);
//   }
// });

app.all("*", (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} path on the server`, 404));
});

app.use(errorHandler);

export const { PORT, MONGO_URI } = process.env;
