import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/utilityClass.js";
import { ControllerType } from "../types/types.js";

export const errorHandler = (
  err: ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.message ||= "Some unknown error occured.";
  err.statusCode ||= 500;
  if (err.message === "CastError") err.message = "Invalid ID";
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

export const TryCatch =
  (func: ControllerType) =>
  (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(func(req, res, next)).catch(next);
  };
