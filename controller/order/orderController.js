const moment = require("moment");
const productModel = require("../../model/productModel");
const adminOrderModel = require("../../model/adminOrderModel");
const customerOrderModel = require("../../model/customerOrderModel");
const cartModel = require("../../model/cartModel");
const { responseReturn } = require("../../utils/response");
const {
  mongo: { ObjectId },
} = require("mongoose");
const customerModel = require("../../model/customerModel");
const couponModel = require("../../model/couponModel");
const categoryOfferModel = require("../../model/categoryOfferModel");
const walletModel = require("../../model/walletModel");
const WalletTransactionModel = require("../../model/WalletTransactionModel");

class orderController {
  ////////////////////////////common methods //////////////////
  reduce_stock_on_orderPlace = async (orderId) => {
    try {
      const placedOrder = await customerOrderModel.findById(orderId);
      if (!placedOrder) {
        console.error("No order found with the given ID.");
        return;
      }

      const productList = placedOrder.products; // Assuming products is an array of { _id, quantity }
      for (const product of productList) {
        const productId = product._id;
        const placedQuantity = product.quantity;

        // Decrement stock
        await productModel.findByIdAndUpdate(productId, {
          $inc: { stock: -placedQuantity },
        });
      }

      console.log("Stock updated successfully!");
    } catch (error) {
      console.error("Error processing stock update:", error);
    }
  };
  // End Method
  add_stock_on_order_cancelled = async (orderId) => {
    try {
      const placedOrder = await customerOrderModel.findById(orderId);
      if (!placedOrder) {
        console.error("No order found with the given ID.");
        return;
      }

      const productList = placedOrder.products; // Assuming products is an array of { _id, quantity }
      for (const product of productList) {
        const productId = product._id;
        const placedQuantity = product.quantity;

        // Decrement stock
        await productModel.findByIdAndUpdate(productId, {
          $inc: { stock: placedQuantity },
        });
      }

      console.log("Stock updated successfully!");
    } catch (error) {
      console.error("Error processing stock update:", error);
    }
  };
  // End Method
  check_product_and_offer_exist = async (customerOrderProduct) => {
    const today = new Date();

    for (const product of customerOrderProduct) {
      const { _id, validOfferId } = product;

      try {
        // Check if product exists
        const productExist = await productModel.findOne({
          _id,
          isDeleted: false,
        });
        if (!productExist) {
          return `Product with ID ${_id} does not exist`;
        }

        // Check if valid offer exists
        if (validOfferId) {
          const validOffer = await categoryOfferModel.findOne({
            _id: validOfferId,
            startingDate: { $lte: today },
            expirationDate: { $gt: today },
            isActive: true,
          });

          if (!validOffer) {
            return `Valid offer not found or inactive for product: ${productExist.name}`;
          }
        }
      } catch (error) {
        console.error(`Error processing product ID ${_id}:`, error.message);
        return `An error occurred while processing product with ID ${_id}`;
      }
    }

    // If no errors found, return null
    return null;
  };
  // End Method
  credited_to_wallet = async (customerId, amount, message, orderId = "") => {
    try {
      const wallet = await walletModel.findOneAndUpdate(
        { userId: customerId },
        { $inc: { balance: amount } },
        { new: true }
      );
      await WalletTransactionModel.create({
        walletId: wallet._id,
        type: "credit",
        amount: amount,
        description: message,
        orderId,
      });
      return null;
    } catch (error) {
      console.log("error while amount credited to the wallet");
      return error.message;
    }
  };
  ////////////////////////////customer order/////////////////////////////////////
  paymentCheck = async (id) => {
    try {
      const order = await customerOrderModel.findById(id);
      if (order.payment_status === "unpaid") {
        await customerOrderModel.findByIdAndUpdate(id, {
          delivery_status: "cancelled",
        });
        await adminOrderModel.updateMany(
          {
            orderId: id,
          },
          {
            delivery_status: "cancelled",
          }
        );
        this.add_stock_on_order_cancelled(id);
      }
      return true;
    } catch (error) {
      console.log(error);
    }
  };
  // End method
  place_order = async (req, res) => {
    console.log("product in the place order controller");
    const { price, products, shipping_fee, shippingInfo, userId } = req.body;

    let adminOrderData = [];
    let cartId = [];
    const tempDate = moment(Date.now()).format("LLL");

    // Create customer order product list with quantities
    let customerOrderProduct = [];
    for (let i = 0; i < products.length; i++) {
      const pro = products[i].products;
      for (let j = 0; j < pro.length; j++) {
        const tempCustomerProduct = {
          ...pro[j].productInfo,
          quantity: pro[j].quantity,
          returnStatus: "",
          isRated: false,
          validOfferPercentage: pro[j]?.validOfferPercentage || 0,
          validOfferId: pro[j]?.validOfferId || 0,
        };
        customerOrderProduct.push(tempCustomerProduct);
        if (pro[j]._id) {
          cartId.push(pro[j]._id);
        }
      }
    }
    cartId = [...new Set(cartId)]; // Remove duplicate IDs

    try {
      // cheking product and offer exist in the db
      const error = await this.check_product_and_offer_exist(
        customerOrderProduct
      );
      if (error) {
        return responseReturn(res, 400, { error });
      }

      // Create customer order
      const order = await customerOrderModel.create({
        customerId: userId,
        shippingInfo,
        products: customerOrderProduct,
        price: price + shipping_fee,
        shippingFee: shipping_fee,
        payment_status: "unpaid",
        delivery_status: "pending",
        date: tempDate,
        couponId: null,
        couponId: 0,
      });

      // Create admin order data
      for (let i = 0; i < products.length; i++) {
        const productList = products[i].products;
        const pri = products[i].price;
        const sellerId = products[i].sellerId;
        let storeProducts = [];

        for (let j = 0; j < productList.length; j++) {
          const tempProduct = {
            ...productList[j].productInfo,
            quantity: productList[j].quantity,
            validOfferPercentage: productList[j]?.validOfferPercentage || 0,
            validOfferId: productList[j]?.validOfferId || 0,
            returnStatus: "",
          };
          storeProducts.push(tempProduct);
        }

        adminOrderData.push({
          orderId: order._id,
          sellerId,
          products: storeProducts,
          price: pri,
          payment_status: "unpaid",
          shippingInfo: "Easy Main Warehouse",
          delivery_status: "pending",
          date: tempDate,
        });
      }

      // Insert admin orders
      await adminOrderModel.insertMany(adminOrderData);

      // Delete cart items
      for (let k = 0; k < cartId.length; k++) {
        await cartModel.findByIdAndDelete(cartId[k]);
      }
      // Reduce the quantity in the stock
      this.reduce_stock_on_orderPlace(order.id);

      setTimeout(() => {
        this.paymentCheck(order.id);
      }, 900000);

      return responseReturn(res, 200, {
        message: "Order placed successfully",
        orderId: order._id,
      });
    } catch (error) {
      console.log("Error while placing order:", error.stack);
      return responseReturn(res, 500, {
        error: "An error occurred while placing the order",
      });
    }
  };
  // End Method
  cod_payment = async (req, res) => {
    console.log("Processing COD payment...");
    console.log(req.params);

    const { orderId } = req.params;

    try {
      if (!ObjectId.isValid(orderId)) {
        return responseReturn(res, 400, { message: "Invalid order ID" });
      }

      // Update customer order
      const order = await customerOrderModel.findByIdAndUpdate(
        orderId,
        { delivery_status: "placed", payment_status: "cod" },
        { new: true }
      );

      if (!order) {
        return responseReturn(res, 404, {
          message: "Customer order not found",
        });
      }

      // Update admin orders
      const adminOrder = await adminOrderModel.updateMany(
        { orderId: new ObjectId(orderId) },
        { delivery_status: "placed", payment_status: "cod" },
        { new: true }
      );

      console.log(`Order ${orderId} updated for COD successfully.`);
      return responseReturn(res, 200, {
        message: "order placed successfuly",
      });
    } catch (error) {
      console.error("Error in COD payment:", error.message);
      return responseReturn(res, 500, {
        error: "Error while placing the order",
      });
    }
  };
  // End Method
  apply_coupon = async (req, res) => {
    console.log("In the apply coupon controller", req.params);
    const { userId } = req.params;
    const { orderId, couponId } = req.body;
    // Validate inputs
    if (!couponId || !orderId || !userId) {
      return responseReturn(res, 400, { error: "Missing required fields." });
    }
    const today = new Date();

    try {
      // Check if the coupon is active and not expired
      const isActiveOrExpire = await couponModel.findOne({
        couponId,
        isActive: true,
        expirationDate: { $gt: today },
      });

      if (!isActiveOrExpire) {
        return responseReturn(res, 400, {
          error: "Coupon is either inactive or expired or Not a valid Coupon.",
        });
      }

      // Check coupon redemption limit
      const couponDetails = await couponModel.findOne({ couponId });
      if (
        couponDetails.totalRedemptionsAllowed <= couponDetails.redemptionsCount
      ) {
        return responseReturn(res, 400, {
          error: "Coupon redemption limit reached.",
        });
      }

      // Check if the user has already applied the coupon
      const isAppliedBefore = await couponModel.findOne({
        couponId,
        "users.userId": userId,
      });

      if (isAppliedBefore) {
        return responseReturn(res, 400, {
          error: "Coupon already used .",
        });
      }

      // Add the user to the coupon's users array and update redemptions count
      const coupon = await couponModel.findOneAndUpdate(
        { couponId },
        {
          $addToSet: { users: { userId, couponApplied: today } },
          $inc: { redemptionsCount: 1 },
        },
        { new: true } // Return the updated document
      );

      if (!coupon) {
        return responseReturn(res, 404, { error: "Coupon not found." });
      }

      const order = await customerOrderModel.findById(orderId);
      // Check minimum order value for coupon application
      console.log(order);
      const isMinOrderAssure = order.price >= coupon.minOrderValue;
      if (!isMinOrderAssure) {
        return responseReturn(res, 400, {
          error: `Minimum order value should be ${coupon.minOrderValue}.`,
        });
      }
      // apply to the order after coupon validation
      const applyCouponOnOrder = await customerOrderModel.findByIdAndUpdate(
        orderId,
        {
          couponId,
          couponAmount: coupon.discountAmount,
          couponMinOrderValue: coupon.minOrderValue,
          $inc: { price: -coupon.discountAmount },
        },
        { new: true }
      );
      if (!applyCouponOnOrder) {
        return responseReturn(res, 404, { error: "Order not found." });
      }

      return responseReturn(res, 200, {
        message: "Coupon applied successfully.",
        couponAmount: coupon.discountAmount,
        coupon,
      });
    } catch (error) {
      console.error("Error in apply_coupon controller:", error);
      return responseReturn(res, 500, {
        error: "An internal server error occurred.",
        details: error.message, // Include the error message for debugging
      });
    }
  };
  // End Method
  remove_apply_coupon = async (req, res) => {
    console.log("In the remove coupon controller");
    const { couponId, orderId } = req.body;
    const { userId } = req.params;
    console.log("coupon id", couponId);

    try {
      // Find the coupon and remove the user from the users array
      const coupon = await couponModel.findOneAndUpdate(
        { couponId: couponId }, // Ensure couponId is correct
        { $pull: { users: { userId: userId } } }, // Correct syntax for pulling from array of objects
        { new: true }
      );

      if (coupon.nModified === 0) {
        return responseReturn(res, 404, {
          error: "Coupon not found or user not associated.",
        });
      }

      // Find the order and reset the coupon data
      const order = await customerOrderModel.findByIdAndUpdate(
        orderId,
        {
          couponId: "",
          couponAmount: 0,
          couponMinOrderValue: 0,
          $inc: { price: coupon.discountAmount },
        },
        { new: true }
      );

      if (!order) {
        return responseReturn(res, 404, { error: "Order not found." });
      }

      // Return success message
      return responseReturn(res, 200, {
        message: "Coupon removed successfully.",
      });
    } catch (error) {
      console.error("Error in remove_apply_coupon controller:", error);
      return responseReturn(res, 500, {
        error: "An internal server error occurred while removing the coupon.",
        details: error.message,
      });
    }
  };
  // End Method

  ///////////dashboard
  get_orders = async (req, res) => {
    let { customerId, status } = req.params;
    try {
      status =
        status === "placed"
          ? (status = {
              $in: ["placed", "processing", "warehouse", "dispatched"],
            })
          : status;
      const queryString =
        status === "all"
          ? { customerId: new ObjectId(customerId) }
          : { customerId: new ObjectId(customerId), delivery_status: status };
      const orders = await customerOrderModel
        .find(queryString)
        .sort({ updatedAt: -1 });

      return responseReturn(res, 200, { orders });
    } catch (error) {}
  };
  // End Method
  get_order_details = async (req, res) => {
    const { orderId } = req.params;
    try {
      const order = await customerOrderModel.findById(orderId);
      return responseReturn(res, 200, { order });
    } catch (error) {
      console.log(
        "erro while fetching the specific order details",
        error.message
      );
    }
  };
  // End Method
  cancel_order = async (req, res) => {
    const { orderId } = req.params;

    try {
      // Update the delivery_status to "cancelled"
      const order = await customerOrderModel.findByIdAndUpdate(
        orderId,
        { delivery_status: "cancelled" },
        { new: true } // Returns the updated document
      );
      const orderAdmin = await adminOrderModel.updateMany(
        { orderId: new ObjectId(orderId) },
        { delivery_status: "cancelled" },
        { new: true } // Returns the updated document
      );

      // Handle case where the order is not found
      if (!order && !orderAdmin) {
        return responseReturn(res, 404, {
          error: "Failed to cancel the order",
        });
      }
      let { customerId, price, _id, payment_status, couponAmount } = order;

      if (payment_status === "paid") {
        const error = await this.credited_to_wallet(
          customerId,
          price,
          "cancelled order Refund",
          _id
        );
        if (error) {
          console.log(error);
          return responseReturn(res, 404, {
            error: "error while amount returned to wallet",
          });
        }
      }

      this.add_stock_on_order_cancelled(orderId);
      // Successful response
      return responseReturn(res, 200, {
        message: "Order canceled successfully",
        order,
      });
    } catch (error) {
      console.error("Failed to cancel the order:", error.message);

      // Internal server error response
      return responseReturn(res, 500, {
        error: "Internal server error. Failed to cancel the order.",
      });
    }
  };
  // End Method
  return_product = async (req, res) => {
    console.log("In the return product controller");
    const { orderId, productId } = req.params;

    try {
      // Update in customerOrderModel
      const updatedOrder = await customerOrderModel.findOneAndUpdate(
        {
          _id: orderId,
          "products._id": productId,
        },
        {
          $set: {
            "products.$[product].returnStatus": "requested",
          },
        },
        {
          new: true, // Return updated document
          arrayFilters: [{ "product._id": productId }],
        }
      );

      if (!updatedOrder) {
        return res.status(404).json({
          error: "Order or Product not found in customer orders",
        });
      }

      // Update in adminOrderModel
      const updatedOrderInAdmin = await adminOrderModel.findOneAndUpdate(
        {
          orderId,
          "products._id": productId,
        },
        {
          $set: {
            "products.$[product].returnStatus": "requested",
          },
        },
        {
          new: true,
          arrayFilters: [{ "product._id": productId }],
        }
      );

      if (!updatedOrderInAdmin) {
        return res.status(404).json({
          error: "Order or Product not found in admin orders",
        });
      }

      // Combined success response
      res.status(200).json({
        message:
          "Product return status updated successfully in both customer and admin orders",
        customerOrder: updatedOrder,
        adminOrder: updatedOrderInAdmin,
      });
    } catch (error) {
      console.error("Error updating product return status:", error.message);
      res.status(500).json({
        error: "An error occurred while updating the product return status",
      });
    }
  };

  ////////////////////////////////// Admin order///////////////////////////////////

  get_admin_order = async (req, res) => {
    let { page, searchValue, perPage } = req.query;

    // Validate and parse query parameters
    page = parseInt(page) || 1;
    perPage = parseInt(perPage) || 5;
    const skipPage = perPage * (page - 1);

    try {
      // Build the match stage
      let matchStage = { delivery_status: { $ne: "pending" } };
      if (searchValue) {
        if (ObjectId.isValid(searchValue)) {
          matchStage = { orderId: new ObjectId(searchValue) };
        } else {
          return responseReturn(res, 400, {
            error: "Invalid Order ID format.",
          });
        }
      }

      // Fetch paginated orders
      const orders = await customerOrderModel.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: "adminorders",
            localField: "_id",
            foreignField: "orderId",
            as: "suborders",
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skipPage },
        { $limit: perPage },
      ]);

      // Fetch total count
      const totalOrder = await customerOrderModel.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: "adminorders",
            localField: "_id",
            foreignField: "orderId",
            as: "suborders",
          },
        },
        { $count: "total" },
      ]);

      return responseReturn(res, 200, {
        orders,
        totalOrder: totalOrder[0]?.total || 0,
      });
    } catch (error) {
      console.error("error in get admin order", error.message);
      responseReturn(res, 500, {
        message: "An error occurred while fetching orders.",
      });
    }
  };
  // End Method
  get_admin_specific_order = async (req, res) => {
    const { orderId } = req.params;

    try {
      // Validate ObjectId
      if (!ObjectId.isValid(orderId)) {
        return responseReturn(res, 400, { error: "Invalid Order ID format" });
      }

      // Aggregate to fetch the order and its suborder details
      const order = await customerOrderModel.aggregate([
        {
          $match: { _id: new ObjectId(orderId) },
        },
        {
          $lookup: {
            from: "adminorders",
            localField: "_id",
            foreignField: "orderId",
            as: "suborders",
          },
        },
      ]);

      if (!order.length) {
        return responseReturn(res, 404, { error: "Order not found" });
      }
      console.log(order);

      responseReturn(res, 200, { order: order[0] });
    } catch (error) {
      console.error("Error in get_admin_specific_order:", error.message);
      responseReturn(res, 500, {
        message: "An error occurred while fetching the order.",
      });
    }
  };
  // End Method
  admin_order_status_update = async (req, res) => {
    console.log("in the order status update");
    console.log(req.body);
    console.log(req.params);
    const { orderId } = req.params;
    const { status } = req.body;
    try {
      // Update the delivery_status to "cancelled"
      const order = await customerOrderModel.findByIdAndUpdate(
        orderId,
        { delivery_status: status },
        { new: true } // Returns the updated document
      );
      const orderAdmin = await adminOrderModel.updateMany(
        { orderId: new ObjectId(orderId) },
        { delivery_status: status },
        { new: true } // Returns the updated document
      );
      let { customerId, price, _id, payment_status, couponAmount } = order;
      if (status === "cancelled") {
        this.add_stock_on_order_cancelled(orderId);

        if (payment_status === "paid") {
          const error = await this.credited_to_wallet(
            customerId,
            price,
            "cancelled order Refund",
            _id
          );
          if (error) {
            console.log(error);
            return responseReturn(res, 404, {
              error: "error while amount returned to wallet",
            });
          }
        }
      }
      // Successful response
      return responseReturn(res, 200, {
        message: "Order status changed successfully",
      });
    } catch (error) {
      console.error("Failed to cancel the order:", error.message);
      return responseReturn(res, 500, {
        error: "Internal server error. Failed to cancel the order.",
      });
    }
  };
  // End Method
  admin_return_request_decision = async (req, res) => {
    console.log("In the admin return request decision controller");
    const { orderId, productId } = req.params;
    const { returnOption } = req.body;

    try {
      let amountToReduce = 0;

      if (returnOption === "rejected") {
        // Rejecting the return request: updating both customer and admin order models
        const updatedOrder = await customerOrderModel.findOneAndUpdate(
          { _id: orderId, "products._id": productId },
          { $set: { "products.$[product].returnStatus": returnOption } },
          { new: true, arrayFilters: [{ "product._id": productId }] }
        );

        if (!updatedOrder) {
          return res.status(404).json({
            error: "Order or Product not found in customer orders",
          });
        }

        // Update in adminOrderModel
        const updatedOrderInAdmin = await adminOrderModel.findOneAndUpdate(
          { orderId, "products._id": productId },
          { $set: { "products.$[product].returnStatus": returnOption } },
          { new: true, arrayFilters: [{ "product._id": productId }] }
        );

        if (!updatedOrderInAdmin) {
          return res.status(404).json({
            error: "Order or Product not found in admin orders",
          });
        }
      } else {
        // Handling the case when the return is not rejected: calculating amount to reduce
        const matchOrder = await customerOrderModel.findOne({ _id: orderId });
        const placedPrice = matchOrder["price"];
        let couponId = matchOrder["couponId"];
        let couponAmount = matchOrder["couponAmount"];
        const couponMinOrderValue = matchOrder["couponMinOrderValue"];

        // Filter the products to find the matching product
        const MatchProduct = matchOrder.products.filter(
          (product) => product._id.toString() === productId
        );

        // Ensure the product is found
        if (MatchProduct.length > 0) {
          const { validOfferPercentage, discount, price, quantity } =
            MatchProduct[0];
          const validOfferDiscount =
            validOfferPercentage > discount ? validOfferPercentage : discount;
          amountToReduce =
            (price - Math.floor((price * validOfferDiscount) / 100)) * quantity;
          console.log("amount to reduce", amountToReduce);
          console.log("admin", 0.95 * amountToReduce);
        }
        const adminAmountToReduce = amountToReduce;
        // Adjust the amount to reduce if the coupon minimum order value condition is met
        if (couponMinOrderValue > placedPrice - amountToReduce) {
          amountToReduce -= couponAmount;
          couponId = "";
          couponAmount = "";
        }

        // Update the order in the customer order model
        const updatedOrder = await customerOrderModel.findOneAndUpdate(
          { _id: orderId, "products._id": productId },
          {
            $set: {
              "products.$[product].returnStatus": returnOption,
              couponId,
              couponAmount,
            },
            $inc: { price: -amountToReduce }, // Subtract amount from total price
          },
          { new: true, arrayFilters: [{ "product._id": productId }] }
        );

        if (!updatedOrder) {
          return res.status(404).json({
            error: "Order or Product not found in customer orders",
          });
        }
        const { customerId } = updatedOrder;
        const error = await this.credited_to_wallet(
          customerId,
          amountToReduce,
          "Return Product",
          orderId
        );

        // Update in adminOrderModel
        const updatedOrderInAdmin = await adminOrderModel.findOneAndUpdate(
          { orderId, "products._id": productId },
          {
            $set: { "products.$[product].returnStatus": returnOption },
            $inc: { price: -Math.ceil(0.95 * adminAmountToReduce) },
          },
          { new: true, arrayFilters: [{ "product._id": productId }] }
        );

        if (!updatedOrderInAdmin) {
          return res.status(404).json({
            error: "Order or Product not found in admin orders",
          });
        }

        if (error) {
          return responseReturn(res, 404, {
            error: "Error while amount returned to wallet",
          });
        }
      }

      res.status(200).json({
        message: "Product return status updated successfully",
      });
    } catch (error) {
      console.error("Error updating product return status:", error.message);
      res.status(500).json({
        error: "An error occurred while updating the product return status",
      });
    }
  };

  ////////////////////////////////// seller order///////////////////////////////////
  get_seller_order = async (req, res) => {
    let { page, searchValue, perPage } = req.query;
    const { sellerId } = req.params;
    console.log(sellerId);
    console.log(req.query);

    // Validate and parse query parameters
    page = parseInt(page) || 1;
    perPage = parseInt(perPage) || 5;
    const skipPage = perPage * (page - 1);

    try {
      // Build the match stage
      let matchStage = {
        sellerId: new ObjectId(sellerId),
        delivery_status: { $ne: "pending" },
      };
      if (searchValue) {
        if (ObjectId.isValid(searchValue)) {
          matchStage = {
            orderId: new ObjectId(searchValue),
            sellerId: new ObjectId(sellerId),
          };
        } else {
          return responseReturn(res, 400, {
            error: "Invalid Order ID format.",
          });
        }
      }

      // Fetch paginated orders
      const orders = await adminOrderModel.aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $skip: skipPage },
        { $limit: perPage },
      ]);

      // Fetch total count
      const totalOrder = await adminOrderModel.aggregate([
        { $match: matchStage },
        { $count: "total" },
      ]);

      return responseReturn(res, 200, {
        orders,
        totalOrder: totalOrder[0]?.total || 0,
      });
    } catch (error) {
      console.error("error in get admin order", error.message);
      responseReturn(res, 500, {
        message: "An error occurred while fetching orders.",
      });
    }
  };
  // End Method
  get_seller_specific_order = async (req, res) => {
    const { adminOrderId, sellerId } = req.params;
    console.log(req.params);

    try {
      // Validate ObjectId
      if (!ObjectId.isValid(adminOrderId)) {
        return responseReturn(res, 400, { error: "Invalid Order ID format" });
      }

      // Aggregate to fetch the order and its suborder details
      const order = await adminOrderModel.aggregate([
        {
          $match: {
            _id: new ObjectId(adminOrderId),
            sellerId: new ObjectId(sellerId),
          },
        },
      ]);

      if (!order.length) {
        return responseReturn(res, 404, { error: "Order not found" });
      }
      console.log(order);

      responseReturn(res, 200, { order: order[0] });
    } catch (error) {
      console.error("Error in get_admin_specific_order:", error.message);
      responseReturn(res, 500, {
        message: "An error occurred while fetching the order.",
      });
    }
  };
  // End Method

  seller_order_status_update = async (req, res) => {
    console.log("in the order status update");
    console.log(req.body);
    console.log(req.params);
    const { adminOrderId } = req.params;
    const { status } = req.body;
    try {
      const orderAdmin = await adminOrderModel.findByIdAndUpdate(
        adminOrderId,
        { delivery_status: status },
        { new: true } // Returns the updated document
      );

      // Successful response
      return responseReturn(res, 200, {
        message: "Order status changed successfully",
      });
    } catch (error) {
      console.error("Failed to cancel the order:", error.message);
      return responseReturn(res, 500, {
        error: "Internal server error. Failed to cancel the order.",
      });
    }
  };
  // End Method
}

module.exports = new orderController();
