import { Request as BaseRequest, NextFunction, Response } from "express";

export class AppError extends Error {
  public status: string;
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode?: number) {
    super(message);

    this.statusCode = statusCode || 500;
    this.status = `${
      statusCode && String(statusCode)[0] === "4" ? "fail" : "error"
    }`;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export interface Request<User = unknown, Role = unknown> extends BaseRequest {
  jwt: string;
  user: User;
  role: Role;
}

type CatchAsyncFN<User, Role> = (
  req: Request<User, Role>,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const catchAsync = <User, Role>(fn: CatchAsyncFN<User, Role>) => {
  return (req: Request<User, Role>, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
