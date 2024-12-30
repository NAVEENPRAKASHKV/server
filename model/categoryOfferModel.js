const { Schema, model } = require("mongoose");

const categoryOfferSchema = new Schema(
  {
    offerCategory: {
      type: String,
      required: true,
    },
    offerPercentage: {
      type: Number,
      required: true,
    },
    startingDate: {
      type: Date,
      required: true,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

categoryOfferSchema.index({ offerCategory: "text" });

const CategoryOffer = model("CategoryOffer", categoryOfferSchema);

module.exports = CategoryOffer;
