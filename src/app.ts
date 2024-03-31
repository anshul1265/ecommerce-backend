import express from "express";
import { connectDb } from "./utils/feature.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import NodeCache from "node-cache";
import { config } from "dotenv";
import morgan from "morgan";
import Stripe from "stripe";
import cors from "cors";

// importing Routes
import userRoute from "./routes/user.js";
import productRoute from "./routes/product.js";
import orderRoute from "./routes/order.js";
import paymentRoute from "./routes/payment.js";
import dashboardRoute from "./routes/stats.js";

config({
  path: "./.env",
});
connectDb(process.env.MONGO_URI!);
export const stripe = new Stripe(process.env.STRIPE_KEY!);
export const myCache = new NodeCache();

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
const PORT = process.env.PORT || 4000;

// using all the routes
app.get("/", (req, res) => {
  res.send("Working.");
});
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/dashboard", dashboardRoute);

app.use("/uploads", express.static("uploads"));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}.`);
});
