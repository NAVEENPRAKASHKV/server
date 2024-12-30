const { Schema, model } = require("mongoose");

const cartSchema = new Schema(
  {
    userId: {
      type: Schema.ObjectId,
      required: true,
    },
    productId: {
      type: Schema.ObjectId,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Add a compound index for efficient querying
cartSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = model("cartProducts", cartSchema);
