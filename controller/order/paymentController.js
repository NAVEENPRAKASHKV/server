const Razorpay = require("razorpay");
const { responseReturn } = require("../../utils/response");
const customerOrderModel = require("../../model/customerOrderModel");
const adminOrderModel = require("../../model/adminOrderModel");
const crypto = require("crypto");

class PaymentController {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET_KEY,
    });
  }

  create_razorpay_payment_order = async (req, res) => {
    const { orderId } = req.params;
    console.log("orderid in creating the payment order", orderId);

    if (!orderId) {
      return responseReturn(res, 400, {
        error: "Invalid input. 'orderId' is required.",
      });
    }

    let order;
    try {
      order = await customerOrderModel.findById(orderId);
      console.log("the order in the payment", order.price);
      if (!order) {
        return responseReturn(res, 404, {
          error: "Order not found",
        });
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      return responseReturn(res, 500, {
        error: "Internal server error while fetching order",
      });
    }

    const { price } = order;
    if (!price || price <= 0) {
      return responseReturn(res, 400, {
        error: "Invalid order price",
      });
    }

    const options = {
      amount: price * 100, // Convert to paise
      currency: "INR",
      receipt: `${orderId}_${Date.now()}`,
      notes: {
        orderId,
        createdBy: "Backend API",
      },
    };

    try {
      const razorpayOrder = await this.razorpay.orders.create(options);
      console.log("Razorpay order created successfully:", razorpayOrder);

      return responseReturn(res, 200, {
        message: "Order created successfully",
        razorpayOrder,
      });
    } catch (error) {
      console.error("Error while creating Razorpay order:", error);
      return responseReturn(res, 500, {
        error: "Error while creating payment order",
      });
    }
  };
  //   End Method
  verify_razorpay_payment = async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;
    const { orderId } = req.params;
    console.log("order id while verify the payment", orderId);

    try {
      // Validate input
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return responseReturn(res, 400, { error: "Invalid request data" });
      }

      // Generate HMAC signature
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");

      // Verify signature
      if (generatedSignature !== razorpay_signature) {
        console.log("Payment verification failed:", {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          generatedSignature,
        });
        return responseReturn(res, 401, {
          error: "Payment verification failed",
        });
      }

      // Update customer order
      const order = await customerOrderModel.findByIdAndUpdate(orderId, {
        delivery_status: "placed",
        payment_status: "paid",
        razorpay_payment_id,
        razorpay_order_id,
      });

      // Update admin order
      const adminOrder = await adminOrderModel.findOneAndUpdate(
        { orderId: orderId },
        {
          delivery_status: "placed",
          payment_status: "paid",
          razorpay_payment_id,
          razorpay_order_id,
        }
      );

      return responseReturn(res, 200, {
        message: "order placed successfuly",
      });
    } catch (error) {
      console.error("Error during payment verification:", error);
      return responseReturn(res, 500, { error: "Internal server error" });
    }
  };
  //   endMethod
}

module.exports = new PaymentController();
