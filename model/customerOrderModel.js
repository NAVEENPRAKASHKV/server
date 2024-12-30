const { Schema, model } = require("mongoose");
const customerOrder = new Schema(
  {
    customerId: {
      type: Schema.ObjectId,
      required: true,
    },
    products: {
      type: Array,
      required: true,
      default: [],
    },
    price: {
      type: Number,
      required: true,
    },
    payment_status: {
      type: String,
      required: true,
    },
    shippingInfo: {
      type: Object,
      required: true,
    },
    shippingFee: {
      type: Object,
      required: true,
    },
    delivery_status: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    couponId: {
      type: String,
      required: true,
      default: null,
    },
    couponAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    couponMinOrderValue: {
      type: Number,
      required: true,
      default: 0,
    },
    razorpay_payment_id: {
      type: String,
      default: "",
    },
    razorpay_order_id: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);
module.exports = model("customerOrders", customerOrder);
