import mongoose, { Document } from "mongoose";
import { myCache } from "../app.js";
import { Product } from "../models/product.js";
import { InvalidateCacheType, OrderItemType } from "../types/types.js";

export const connectDb = (uri: string) => {
  mongoose
    .connect(uri, {
      dbName: "ECommerce",
    })
    .then((c) => {
      console.log(`Db connected to ${c.connection.host}`);
    })
    .catch((e) => console.log(e));
};

export const invalidatesCache = ({
  product,
  order,
  admin = true,
  userId,
  orderId,
  productId,
}: InvalidateCacheType) => {
  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "categories",
      "all-products",
    ];
    if (typeof productId === "string") productKeys.push(`product-${productId}`);
    if (typeof productId === "object")
      productId.forEach((element) => {
        productKeys.push(`product-${element}`);
      });
    myCache.del(productKeys);
  }
  if (order) {
    const orderKeys: string[] = [
      "all-orders",
      `my-orders-${userId}`,
      `order-${orderId}`,
    ];
    myCache.del(orderKeys);
  }
  if (admin) {
    const adminKeys: string[] = [
      "admin-stats",
      "admin-pie-chart",
      "admin-line-chart",
      "admin-bar-chart",
    ];
    myCache.del(adminKeys);
  }
};

export const reduceStock = async (orderItems: OrderItemType[]) => {
  orderItems.forEach(async (order) => {
    const product = await Product.findById(order.productId);
    if (!product) throw new Error("Product not found.");
    product.stock -= order.quantity;
    await product.save();
  });
};

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
  if (lastMonth === 0) return thisMonth * 100;
  const percent = (thisMonth / lastMonth) * 100;
  return Number(percent.toFixed(0));
};

export const getInventoryInfo = async ({
  categories,
  productCount,
}: {
  categories: string[];
  productCount: number;
}) => {
  // map returns an array of count of each category
  const categoriesCountPromise = categories.map((category) =>
    Product.countDocuments({ category })
  );
  const categoriesCount = await Promise.all(categoriesCountPromise);
  // now the categories array and the above categories count became a key-value pair, so we will use this
  const categoryCount: Record<string, number>[] = [];

  categories.forEach((category, i) => {
    categoryCount.push({
      [category]: Math.round((categoriesCount[i] / productCount) * 100),
    });
  });

  return categoryCount;
};

// The below 2 things are meant to be only used her
interface MyDocument extends Document {
  createdAt: Date;
  discount?: number;
  total?: number;
}

type FunctionProps = {
  length: number;
  docArr: MyDocument[];
  today: Date;
  property?: "discount" | "total";
};

export const getChartData = ({
  length,
  docArr,
  today,
  property,
}: FunctionProps) => {
  const data: number[] = new Array(length).fill(0);
  docArr.forEach((i) => {
    const creationDate = i.createdAt;
    const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
    if (monthDiff < length)
      // i.discount is same as i["discount"]
      data[length - monthDiff - 1] += property ? i[property]! : 1;
  });
  return data;
};
