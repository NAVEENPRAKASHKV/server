const { Schema, model } = require("mongoose");

const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: Number,

      default: null,
    },
    fullName: {
      type: String,

      default: null,
    },
    picture: {
      type: String,

      default: null,
    },
    referralId: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      select: false,
    },
    method: {
      type: String,
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Adding text index with field weights
customerSchema.index(
  {
    email: "text",
    name: "text",
    method: "text",
    isBlocked: "text",
  },
  {
    weights: {
      email: 5,
      name: 4,
      method: 3,
      isBlocked: 2,
    },
  }
);

module.exports = model("customers", customerSchema);
