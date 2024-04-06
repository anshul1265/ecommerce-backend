import { myCache, stripe } from "../app.js";
import { TryCatch } from "../middlewares/errorHandler.js";
import { Coupon } from "../models/coupon.js";
import ErrorHandler from "../utils/utilityClass.js";

export const newCoupon = TryCatch(async (req, res, next) => {
  const { code, amount } = req.body;
  if (!code || !amount)
    return next(new ErrorHandler("Please enter both fields", 400));
  await Coupon.create({ code, amount });
  myCache.del("all-coupons");
  return res.status(201).json({
    success: true,
    message: `Coupon ${code} created successfully.`,
  });
});

export const applyDiscount = TryCatch(async (req, res, next) => {
  const { code } = req.query;
  const discount = await Coupon.findOne({ code });
  if (!discount)
    return next(new ErrorHandler("Please enter a valid coupon code.", 400));
  return res.status(200).json({
    success: true,
    discount: discount.amount,
  });
});

export const allCoupons = TryCatch(async (req, res, next) => {
  let coupons;
  if (myCache.has("all-coupons"))
    coupons = JSON.parse(myCache.get("all-coupons")!);
  else {
    coupons = await Coupon.find({});
    myCache.set("all-coupons", JSON.stringify(coupons));
  }
  return res.status(200).json({
    success: true,
    coupons,
  });
});

export const deleteCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) return next(new ErrorHandler("Coupon does not exist", 400));
  myCache.del("all-coupons");
  return res.status(200).json({
    success: true,
    message: "Coupon deleted successfully.",
  });
});

export const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount) return next(new ErrorHandler("Please enter the amount", 400));
  const defaultCustomerName = "Default Name";
  const defaultAddress = {
    address: "123 Street",
    city: "City",
    state: "state",
    pinCode: "12345",
    country: "India",
  };
  const customer = await stripe.customers.create({
    name: defaultCustomerName,
    address: {
      ...defaultAddress,
    },
    shipping: {
      address: {
        ...defaultAddress,
      },
      name: defaultCustomerName,
    },
    email: "customer@example.com",
  });
  const customerId = customer.id;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(amount) * 100,
    currency: "inr",
    description: "Any description",
    customer: customerId,
  });
  return res.status(201).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
  });
});
