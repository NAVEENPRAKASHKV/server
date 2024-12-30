const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema(
  {
    couponId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    discountAmount: {
      type: Number,
      required: true,
    },
    minOrderValue: {
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
    totalRedemptionsAllowed: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    redemptionsCount: {
      type: Number,
      default: 0,
    },
    users: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "customers",
        },
        couponApplied: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

CouponSchema.index({
  couponId: "text",
});

const Coupon = mongoose.model("Coupon", CouponSchema);

module.exports = Coupon;
