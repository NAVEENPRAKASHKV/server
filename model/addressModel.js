const { Schema, model } = require("mongoose");

const addressSchema = new Schema(
  {
    userId: {
      type: Schema.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    post: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    area: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Address = model("Address", addressSchema);

module.exports = Address;
