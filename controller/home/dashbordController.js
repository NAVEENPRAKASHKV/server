const customerOrderModel = require("../../model/customerOrderModel");
const mongoose = require("mongoose");
const { responseReturn } = require("../../utils/response");
const walletModel = require("../../model/walletModel");
const walletTransactionModel = require("../../model/WalletTransactionModel");
const reviewModel = require("../../model/reviewModel");
const productModel = require("../../model/productModel");

class dashboardController {
  get_dashboard_data = async (req, res) => {
    const { userId } = req.params;
    let pendingOrder = 0;
    let cancelledOrder = 0;
    let totalOrder = 0;

    try {
      // Fetch recent orders (limit to 5)
      const recentOrders = await customerOrderModel
        .find({
          customerId: new mongoose.Types.ObjectId(userId),
        })
        .sort({ updatedAt: -1 })
        .limit(5);

      // Aggregate orders by delivery status
      const orderStats = await customerOrderModel.aggregate([
        {
          $match: {
            customerId: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $group: {
            _id: "$delivery_status", // Group by delivery status
            count: { $sum: 1 }, // Count the number of orders
          },
        },
      ]);

      // Process aggregated data
      for (let ord of orderStats) {
        if (ord._id === "cancelled") {
          cancelledOrder = ord.count;
        } else if (ord._id === "pending") {
          pendingOrder = ord.count;
        }
        totalOrder += ord.count; // Add the count to total orders
      }

      // Respond to the client with the data
      return responseReturn(res, 200, {
        recentOrders,
        pendingOrder,
        totalOrder,
        cancelledOrder,
      });
    } catch (error) {
      console.error("Error in get_dashboard_data:", error);
      return responseReturn(res, 500, { error: "Internal Server Error" });
    }
  };
  get_wallet_data = async (req, res) => {
    console.log("In the get wallet controller", req.params);
    const { userId } = req.params;

    try {
      // Fetch wallet details
      const wallet = await walletModel.findOne({ userId });
      // Check if wallet exists
      if (!wallet) {
        return responseReturn(res, 404, { message: "Wallet not found" });
      }
      // Fetch wallet transactions
      const walletTransactions = await walletTransactionModel
        .find({
          walletId: wallet._id,
        })
        .sort({
          createdAt: -1,
        });
      // Return wallet balance and transactions
      const { balance } = wallet;
      return responseReturn(res, 200, {
        walletBalance: balance,
        walletTransactions: walletTransactions || [],
      });
    } catch (error) {
      console.error("Error in the get wallet data controller:", error.message);
      return responseReturn(res, 500, {
        message: "An error occurred while fetching wallet data",
      });
    }
  };
  submit_review = async (req, res) => {
    console.log("In the submit review controller");

    const { productId, orderId, review, rating, name } = req.body;

    if (!productId || !rating || !name || !review) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    try {
      // Create a new review document
      const newReview = await reviewModel.create({
        productId,
        name,
        rating,
        review,
      });

      // Fetch the associated product
      const product = await productModel.findById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found." });
      }

      // Calculate the new average rating

      const noOfRating = await reviewModel.countDocuments({ productId });
      const oldRating = product.rating || 0;
      const averageReview =
        (oldRating * (noOfRating - 1) + rating) / noOfRating;

      product.rating = averageReview.toFixed(2);
      await product.save();

      //  updating the customer order collection
      const order = await customerOrderModel.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found." });
      }

      // Update the products array
      const updatedProducts = order.products.map((product) => {
        if (product._id.toString() === productId) {
          product.isRated = true; // Set isRated to true for the specific product
        }
        return product;
      });

      // Save the updated products array back to the order
      order.products = updatedProducts;
      // Explicitly mark the 'products' field as modified
      order.markModified("products");
      console.log("save the order");
      await order.save();
      console.log("after the save");

      return res.status(201).json({
        message: "Review submitted successfully.",
      });
    } catch (error) {
      console.error("Error submitting review:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  };
}

module.exports = new dashboardController();
