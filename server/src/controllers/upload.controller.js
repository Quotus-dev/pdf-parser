const { NextFunction, Request, Response } = require("express");

const { catchAsync } = require("../libs/utils");

exports.handleUpload = catchAsync(
  async (req, res, next) => {
    res.status(200).json({
      status: "success",
      error: false,
      message: "Document uploaded successfully",
      data: {
        ...req.file,
      },
    });
  }
);
