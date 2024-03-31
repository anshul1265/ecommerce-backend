import mongoose from "mongoose";
import validator from "validator";

interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  photo: string;
  gender: "Male" | "Female";
  dob: Date;
  createdAt: Date;
  updatedAt: Date;
  // virtual attribute
  age: number;
}

const schema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: [true, "Please enter ID."],
    },
    name: {
      type: String,
      required: [true, "Please enter Name."],
    },
    email: {
      type: String,
      unique: [true, "User already exists."],
      required: [true, "Please enter e-mail."],
      validate: validator.default.isEmail,
    },
    photo: {
      type: String,
      required: [true, "Please upload photo."],
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: [true, "Please enter your gender."],
    },
    dob: {
      type: Date,
      required: [true, "Please enter DOB."],
    },
  },
  {
    timestamps: true,
  }
);

schema.virtual("age").get(function () {
  const today: Date = new Date();
  const dob: Date = this.dob;
  let age: number = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  ) {
    age--;
  }
  return age;
});

export const User = mongoose.model<IUser>("User", schema);
