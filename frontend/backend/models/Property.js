const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["Apartment", "Bungalow", "Bedsitter", "Maisonette"],
      required: true
    },
    rent: {
      type: Number,
      required: true,
      min: 1
    },
    description: {
      type: String,
      trim: true
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["Available", "Occupied"],
      default: "Available"
    },
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Removed"],
      default: "Approved"
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Property", propertySchema);
