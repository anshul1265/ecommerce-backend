import { User } from "../models/user.js";
import ErrorHandler from "../utils/utilityClass.js";
import { TryCatch } from "./errorHandler.js";

// middleware to make sure that only admin is allowed.
export const adminOnly = TryCatch(async (req, res, next) => {
  // /api/v1/user?key=13032
  const { id } = req.query;
  if (!id) return next(new ErrorHandler("Please do Login", 401));
  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("User doesn't exist.", 401));
  if (user.role !== "admin")
    return next(
      new ErrorHandler("You are not authorized to perform this action", 401)
    );
  next();
});
