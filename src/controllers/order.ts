import { Request } from "express";
import { TryCatch } from "../middlewares/errorHandler.js";
import { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { invalidatesCache, reduceStock } from "../utils/feature.js";
import ErrorHandler from "../utils/utilityClass.js";
import { myCache } from "../app.js";

export const newOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subTotal,
      tax,
      shippingCharges,
      discount,
      total,
    } = req.body;
    if (!shippingInfo || !orderItems || !user || !subTotal || !tax || !total)
      return next(new ErrorHandler("Please enter all the fields", 400));
    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subTotal,
      tax,
      shippingCharges,
      discount,
      total,
    });
    await reduceStock(orderItems);
    invalidatesCache({
      product: true,
      order: true,
      admin: true,
      userId: user,
      productId: order.orderItems.map((i) => String(i.productId)),
    });
    res.status(201).json({
      success: true,
      message: "Order placed successfully.",
    });
  }
);

export const myOrders = TryCatch(async (req, res, next) => {
  const { id: user } = req.query;
  let orders = [];
  if (myCache.has(`my-orders-${user}`))
    orders = JSON.parse(myCache.get(`my-orders-${user}`)!);
  else {
    orders = await Order.find({ user });
    myCache.set(`my-orders-${user}`, JSON.stringify(orders));
  }
  return res.status(200).json({
    success: true,
    orders,
  });
});

export const allOrders = TryCatch(async (req, res, next) => {
  let orders = [];
  if (myCache.has("all-orders"))
    orders = JSON.parse(myCache.get("all-orders")!);
  else {
    // we only want to show the name of the user in the orders
    orders = await Order.find().populate("user", "name");
    myCache.set("all-orders", JSON.stringify(orders));
  }
  return res.status(200).json({
    success: true,
    orders,
  });
});

export const getSingleOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const key = `order-${id}`;
  let order;
  if (myCache.has(key)) order = JSON.parse(myCache.get(key)!);
  else {
    order = await Order.findById(id).populate("user", "name");
    if (!order) return next(new ErrorHandler("Order not found.", 404));
    myCache.set(key, JSON.stringify(order));
  }
  return res.status(200).json({
    success: true,
    order,
  });
});

export const processOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order does not exist", 404));
  switch (order.status) {
    case "Processing":
      order.status = "Shipped";
      break;
    case "Shipped":
      order.status = "Delievered";
      break;
    default:
      order.status = "Delievered";
      break;
  }
  await order.save();
  invalidatesCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });
  return res.status(200).json({
    success: true,
    message: "Order processed successfully.",
  });
});

export const deleteOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order not found", 404));
  await order.deleteOne();
  invalidatesCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });
  return res.status(200).json({
    success: true,
    message: "Order deleted successfully.",
  });
});
