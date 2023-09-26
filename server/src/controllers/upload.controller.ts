import { NextFunction, Request, Response } from "express";

import { catchAsync } from "../libs/utils";

export const upload = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
      status: "success",
      error: false,
      message: "Data uploaded successfully",
      data: {
        ...req.file,
      },
    });
  }
);
