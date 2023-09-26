import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import {
  ValidationError as SequelizeValidationError,
  UniqueConstraintError,
} from "sequelize";

import { AppError } from "../libs/utils";

const sendDevError = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    status: err.status,
    err: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendProdError = (err: AppError, res: Response): void => {
  err.isOperational
    ? res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      })
    : res.status(500).json({
        status: "error",
        message: "Something went wrong, please try again later!",
      });
};

const handleSequelizeValidationError = (
  err: SequelizeValidationError
): AppError => {
  const errors = err.errors.map((error) => error.message);
  const message = `Invalid input data: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleUniqueConstraintError = (err: UniqueConstraintError): AppError => {
  const fields = err.fields as unknown as Array<string>; // Explicitly check if fields is defined
  const joinedFields = fields.join(", ");
  const message = `Duplicate field value(s) in ${joinedFields}, please try again with different value(s)`;
  return new AppError(message, 400);
};

export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  err.statusCode = +err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendDevError(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    if (error instanceof SequelizeValidationError) {
      error = handleSequelizeValidationError(error);
    } else if (error instanceof UniqueConstraintError) {
      error = handleUniqueConstraintError(error);
    }
    sendProdError(error, res);
  }
};
