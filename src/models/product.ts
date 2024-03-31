import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter name."],
    },
    photo: {
      type: String,
      required: [true, "Please upload the photo."],
    },
    price: {
      type: Number,
      required: [true, "Please enter the price."],
    },
    stock: {
      type: Number,
      required: [true, "Please enter the stock size."],
    },
    category: {
      type: String,
      required: [true, "Please enter the type of Product."],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model("Product", schema);
