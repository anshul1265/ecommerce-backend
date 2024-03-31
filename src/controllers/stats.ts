import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/errorHandler.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import {
  calculatePercentage,
  getInventoryInfo,
  getChartData,
} from "../utils/feature.js";

export const getDashboardStats = TryCatch(async (req, res, next) => {
  let stats;
  if (myCache.has("admin-stats"))
    stats = JSON.parse(myCache.get("admin-stats")!);
  else {
    const today = new Date();
    const sixMonthAgo = new Date();
    sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);

    const thisMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };
    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };

    const thisMonthProductsPromise = Product.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthProductsPromise = Product.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });
    const thisMonthUsersPromise = User.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthUsersPromise = User.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });
    const thisMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const lastSixMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    });

    const latestTransactionPractice = Order.find({})
      .select(["orderItems", "discount", "total", "status"])
      .limit(4);

    const [
      lastMonthProducts,
      lastMonthUsers,
      lastMonthOrders,
      thisMonthProducts,
      thisMonthOrders,
      thisMonthUsers,
      productCount,
      userCount,
      orders,
      lastSixMonthOrders,
      categories,
      femaleUsersCount,
      latestTransaction,
    ] = await Promise.all([
      lastMonthProductsPromise,
      lastMonthUsersPromise,
      lastMonthOrdersPromise,
      thisMonthProductsPromise,
      thisMonthOrdersPromise,
      thisMonthUsersPromise,
      Product.countDocuments(),
      User.countDocuments(),
      Order.find({}).select("total"),
      lastSixMonthOrdersPromise,
      Product.distinct("category"),
      User.countDocuments({ gender: "Female" }),
      latestTransactionPractice,
    ]);

    const thisMonthRevenue = thisMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );
    const lastMonthRevenue = lastMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const changeInPercentage = {
      revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
      product: calculatePercentage(
        thisMonthProducts.length,
        lastMonthProducts.length
      ),
      user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
      order: calculatePercentage(
        thisMonthOrders.length,
        lastMonthOrders.length
      ),
    };

    const revenueCount = orders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const count = {
      user: userCount,
      product: productCount,
      order: orders.length,
      revenue: revenueCount,
    };

    // alternate way is commented just below
    const orderMonthlyCount = new Array(6).fill(0);
    const orderMonthlyRevenue = new Array(6).fill(0);
    lastSixMonthOrders.forEach((order) => {
      const creationDate = order.createdAt;
      const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
      if (monthDiff < 6) {
        orderMonthlyCount[5 - monthDiff] += 1;
        orderMonthlyRevenue[5 - monthDiff] += order.total;
      }
    });
    // const orderMonthlyCount = getChartData({
    //   length: 6,
    //   docArr: lastSixMonthOrders,
    //   today,
    // });

    const categoryCount = await getInventoryInfo({ categories, productCount });

    const usersGenderRatio = {
      male: userCount - femaleUsersCount,
      female: femaleUsersCount,
    };

    const modifyLatestTransaction = latestTransaction.map((transaction) => ({
      _id: transaction._id,
      discount: transaction.discount,
      amount: transaction.total,
      quantity: transaction.orderItems.length,
      status: transaction.status,
    }));

    stats = {
      changeInPercentage,
      count,
      chart: { orderMonthlyCount, orderMonthlyRevenue },
      categoryCount,
      usersGenderRatio,
      modifyLatestTransaction,
    };

    myCache.set("admin-stats", JSON.stringify(stats));
  }
  return res.status(200).json({
    success: true,
    stats,
  });
});

export const getPieChart = TryCatch(async (req, res, next) => {
  let charts;
  if (myCache.has("admin-pie-chart"))
    charts = JSON.parse(myCache.get("admin-pie-chart")!);
  else {
    const allOrdersPromise = Order.find({}).select([
      "total",
      "discount",
      "subTotal",
      "tax",
      "shippingCharges",
    ]);

    const [
      processedOrders,
      shippedOrders,
      delieveredOrders,
      categories,
      productCount,
      outOfStockProducts,
      allOrders,
      adminAccessUsers,
      userAccessUsers,
      usersWithDob,
    ] = await Promise.all([
      Order.countDocuments({ status: "Processing" }),
      Order.countDocuments({ status: "Shipped" }),
      Order.countDocuments({ status: "Delievered" }),
      Product.distinct("category"),
      Product.countDocuments(),
      Product.countDocuments({ stock: 0 }),
      allOrdersPromise,
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user" }),
      User.find({}).select(["dob"]),
    ]);

    const productCategoriesRatio = await getInventoryInfo({
      categories,
      productCount,
    });

    const stockAvailability = {
      inStock: productCount - outOfStockProducts,
      outOfStock: outOfStockProducts,
    };

    const orderFulfillment = {
      processedOrders,
      shippedOrders,
      delieveredOrders,
    };

    const grossIncome = allOrders.reduce(
      (prev, order) => prev + (order.total || 0),
      0
    );

    const discount = allOrders.reduce(
      (prev, order) => prev + (order.discount || 0),
      0
    );

    const productionCost = allOrders.reduce(
      (prev, order) => prev + (order.shippingCharges || 0),
      0
    );

    const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);

    const marketingCost = Math.round((grossIncome * 30) / 100);

    const netMargin =
      grossIncome - discount - productionCost - burnt - marketingCost;

    const revenueDistribution = {
      netMargin,
      discount,
      productionCost,
      burnt,
      marketingCost,
    };

    const usersAgeGroup = {
      teen: usersWithDob.filter((i) => i.age < 20).length,
      adult: usersWithDob.filter((i) => i.age >= 20 && i.age < 60).length,
      old: usersWithDob.filter((i) => i.age >= 60).length,
    };

    const adminCustomer = {
      adminAccessUsers,
      userAccessUsers,
    };

    charts = {
      orderFulfillment,
      productCategoriesRatio,
      stockAvailability,
      revenueDistribution,
      usersAgeGroup,
      adminCustomer,
    };
    myCache.set("admin-pie-chart", JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getBarChart = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-bar-chart";

  if (myCache.has(key)) charts = JSON.parse(myCache.get(key) as string);
  else {
    const today = new Date();
    const sixMonthAgo = new Date();
    sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);
    const twelveMonthAgo = new Date();
    twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 12);

    const lastSixMonthProductsPromise = Product.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    }).select("createdAt");
    const lastSixMonthUsersPromise = User.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    }).select("createdAt");
    const lastTwelveMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: twelveMonthAgo,
        $lte: today,
      },
    }).select("createdAt");

    const [sixMonthProducts, sixMonthUsers, twelveMontOrders] =
      await Promise.all([
        lastSixMonthProductsPromise,
        lastSixMonthUsersPromise,
        lastTwelveMonthOrdersPromise,
      ]);

    const productCount = getChartData({
      length: 6,
      docArr: sixMonthProducts,
      today,
    });
    const userCount = getChartData({
      length: 6,
      docArr: sixMonthUsers,
      today,
    });
    const orderCount = getChartData({
      length: 12,
      docArr: twelveMontOrders,
      today,
    });

    charts = {
      products: productCount,
      users: userCount,
      orders: orderCount,
    };

    myCache.set(key, JSON.stringify(charts));
  }

  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getLineChart = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-line-chart";
  if (myCache.has(key)) charts = JSON.parse(myCache.get(key)!);
  else {
    const today = new Date();
    const twelveMonthAgo = new Date();
    twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 12);

    const getTwelveMonthData = {
      createdAt: {
        $gte: twelveMonthAgo,
        $lte: today,
      },
    };

    const twelveMonthProductPromise =
      Product.find(getTwelveMonthData).select("createdAt");
    const twelveMonthUserPromise =
      User.find(getTwelveMonthData).select("createdAt");
    const twelveMonthOrderPromise = Order.find(getTwelveMonthData).select([
      "createdAt",
      "discount",
      "total",
    ]);

    const [twelveMonthOrder, twelveMonthUser, twelveMonthProduct] =
      await Promise.all([
        twelveMonthOrderPromise,
        twelveMonthProductPromise,
        twelveMonthUserPromise,
      ]);

    const productCount = getChartData({
      length: 12,
      today,
      docArr: twelveMonthProduct,
    });
    const userCount = getChartData({
      length: 12,
      today,
      docArr: twelveMonthUser,
    });
    const discount = getChartData({
      length: 12,
      today,
      docArr: twelveMonthOrder,
      property: "discount",
    });
    const revenue = getChartData({
      length: 12,
      today,
      docArr: twelveMonthOrder,
      property: "total",
    });

    charts = {
      productCount,
      userCount,
      discount,
      revenue,
    };
    myCache.set(key, JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});
