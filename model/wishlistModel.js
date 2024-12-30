const { Schema, model } = require("mongoose");

const wishlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "customers", // Referencing the customers collection
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "products", // Referencing the products collection
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = model("Wishlist", wishlistSchema);
