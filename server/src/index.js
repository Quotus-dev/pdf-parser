const express = require("express");

const { AppError } = require("./libs/utils");
const Clause = require("./models/data.model");
const { config } = require("dotenv");
const { errorHandler } = require("./middlewares/error.handler");
const fs = require("fs");
const morgan = require("morgan");
const pdfRoutes = require("./routes/pdf.routes");
const { upload } = require("./libs");
const uploadRoutes = require("./routes/upload.routes");
const { sequelize } = require("./libs/db");
const cors = require("cors")

config();

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors())

app.use(express.static("uploads"));

app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/pdf", pdfRoutes);

app.all("*", (req, _res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} path on the server`, 404));
});

app.use(errorHandler);

const { PORT } = process.env

module.exports.PORT = PORT;
module.exports.app = app

// export {PORT}

// export const { PORT, MONGO_URI } = process.env;
