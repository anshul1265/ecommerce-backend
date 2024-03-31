import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    shippingInfo: {
      address: {
        type: String,
        required: [true, "Please provide the address."],
      },
      city: {
        type: String,
        required: [true, "Please provide the city."],
      },
      state: {
        type: String,
        required: [true, "Please provide the state."],
      },
      pinCode: {
        type: Number,
        required: [true, "Please provide the Pincode."],
      },
      country: {
        type: String,
        required: [true, "Please provide the Country."],
      },
    },
    user: {
      type: String,
      ref: "User",
      required: true,
    },
    subTotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingCharges: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      required: true,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Processing", "Shipped", "Delievered"],
      default: "Processing",
    },
    orderItems: [
      {
        name: String,
        photo: String,
        price: Number,
        quantity: Number,
        productId: {
          type: mongoose.Types.ObjectId,
          ref: "Product",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model("Order", Schema);
