const { Schema, model } = require("mongoose");

const sellerSchema = new Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true, select: false },

    role: { type: String, default: "seller" },
    status: { type: String, default: "pending" }, //approvel for the admin
    payment: { type: String, default: "inactive" }, //payment linked to the stripe
    method: { type: String, required: true }, // to denot which method he is used to sign in
    image: { type: String, default: "" },
    shopInfo: { type: Object, default: {} },
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
sellerSchema.index(
  {
    username: "text",
    email: "text",
    status: "text",
    payment: "text",
  },
  {
    weights: {
      username: 5, // Higher weight, more relevant
      email: 3, // Medium weight
      status: 1, // Lower weight
      payment: 1, // Lower weight
    },
  }
);

module.exports = model("Seller", sellerSchema);
