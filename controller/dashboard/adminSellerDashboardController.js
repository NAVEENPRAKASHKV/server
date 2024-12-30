const customerOrderModel = require("../../model/customerOrderModel");
const adminOrderModel = require("../../model/adminOrderModel");
const productModel = require("../../model/productModel");
const sellerModel = require("../../model/sellerModel");
const { responseReturn } = require("../../utils/response");
const { ObjectId } = require("mongoose").Types;
const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;
const blogModel = require("../../model/blogModel");

class adminSellerDashboardController {
  get_admin_sales_data = async (req, res) => {
    console.log("In the admin controller", req.query);
    let { beginDate, lastDate, page } = req.query;
    const perPage = 10;

    page = parseInt(page) || 1;
    const skipPage = (page - 1) * perPage;

    try {
      // Ensure `beginDate` and `lastDate` are valid dates
      beginDate = new Date(beginDate);
      lastDate = new Date(lastDate);

      // Perform the aggregation query
      const salesOrders = await customerOrderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: beginDate, $lte: lastDate },
            delivery_status: { $nin: ["cancelled", "pending"] },
          },
        },
        { $sort: { createdAt: -1 } }, // Sort by date, newest first
        { $skip: skipPage }, // Skip for pagination
        { $limit: perPage }, // Limit for pagination
      ]);

      // total order matching the filter (without pagination)
      const totalOrder = await customerOrderModel.countDocuments({
        createdAt: { $gte: beginDate, $lte: lastDate },
        delivery_status: { $nin: ["cancelled", "pending"] },
      });
      let totalProductSold = 0;
      let totalProductReturn = 0;
      let pendingOrder = 0;
      let totalSalesRevenue = 0;
      let couponUsedCount = 0;
      let couponUsedAmount = 0;
      if (salesOrders) {
        // total product sold
        totalProductSold = salesOrders.reduce((totalProductSold, order) => {
          let productCount = order["products"].reduce(
            (productCount, product) => {
              if (product.returnStatus !== "accepted") {
                return productCount + product.quantity;
              }
              return productCount;
            },
            0
          );
          return totalProductSold + productCount;
        }, 0);
        // total product return
        totalProductReturn = salesOrders.reduce((totalProductReturn, order) => {
          let productCount = order["products"].reduce(
            (productCount, product) => {
              if (product.returnStatus === "accepted") {
                return productCount + product.quantity;
              }
              return productCount;
            },
            0
          );
          return totalProductReturn + productCount;
        }, 0);
        // pending Order
        pendingOrder = salesOrders.reduce((pendingOrder, order) => {
          if (order.delivery_status === "placed") {
            return pendingOrder + 1;
          }
          return pendingOrder;
        }, 0);
        // total Sales Revenue
        totalSalesRevenue = salesOrders.reduce((revenue, order) => {
          if (order.delivery_status !== "cancelled") {
            return revenue + order.price;
          }
          return revenue;
        }, 0);
        // coupon Used Count
        couponUsedCount = salesOrders.reduce((count, order) => {
          if (order.delivery_status !== "cancelled") {
            if (order.couponAmount) return count + 1;
          }
          return count;
        }, 0);
        // coupon Used Amount
        couponUsedAmount = salesOrders.reduce((amount, order) => {
          if (order.delivery_status !== "cancelled") {
            if (order.couponAmount) return amount + order.couponAmount;
          }
          return amount;
        }, 0);
      }
      // to find out admin revenue
      const sellerOrder = await adminOrderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: beginDate, $lte: lastDate },
            delivery_status: { $nin: ["cancelled", "pending"] },
          },
        },
      ]);
      let totalSallerRevenue = 0;
      if (sellerOrder.length > 0) {
        totalSallerRevenue = sellerOrder.reduce((revenue, order) => {
          if (order.delivery_status !== "cancelled") {
            return revenue + order.price;
          }
          return revenue;
        }, 0);
      }

      const totalAdminRevenue = totalSalesRevenue - totalSallerRevenue;

      // Send the response
      console.log("total order", totalOrder);
      console.log("total product sold", totalProductSold);
      console.log("total product return", totalProductReturn);
      console.log("total pending order", pendingOrder);
      console.log("total revenue ", totalSalesRevenue);
      console.log("coupon count ", couponUsedCount);
      console.log("coupon amount", couponUsedAmount);
      console.log("seller revenue", totalSallerRevenue);
      console.log("totoal admin revenue", totalAdminRevenue);
      // console.log(sellerRevenue);

      res.status(200).json({
        salesOrders,
        totalOrder,
        totalProductSold,
        totalProductReturn,
        pendingOrder,
        totalSalesRevenue,
        couponUsedCount,
        couponUsedAmount,
        totalAdminRevenue,
      });
    } catch (error) {
      console.error("Error fetching admin sales data:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
  // End Method
  get_admin_dashboard_data = async (req, res) => {
    console.log("in the admin dashboard data");
    try {
      const [allSalesSum, allOrders, allProducts, allSellers] =
        await Promise.all([
          customerOrderModel.aggregate([
            {
              $match: {
                delivery_status: { $nin: ["cancelled", "pending"] },
              },
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$price" },
              },
            },
          ]),
          customerOrderModel.countDocuments({
            delivery_status: { $nin: ["cancelled", "pending"] },
          }),
          productModel.countDocuments({ isDeleted: false }),
          sellerModel.countDocuments(),
        ]);

      const allSalesRevenue =
        allSalesSum.length > 0 ? allSalesSum[0].totalAmount : 0;

      return responseReturn(res, 200, {
        allSalesRevenue,
        allOrders,
        allProducts,
        allSellers,
      });
    } catch (error) {
      console.log(
        "erro while fetching the get admin dashboard data",
        error.message
      );
      return responseReturn(res, 500, { error: "internel server error" });
    }
  };
  // End Method
  get_admin_dashboard_chart = async (req, res) => {
    console.log("In the chart controller:", req.params);
    const { option } = req.params;

    // Get current year
    const currentYear = new Date().getFullYear();

    // Initialize arrays for 5 years
    const orders = Array(5).fill(0);
    const revenue = Array(5).fill(0);

    try {
      const matchCondition = {
        delivery_status: { $nin: ["cancelled", "pending"] },
        createdAt: {
          $gte: new Date(currentYear - 5, 0, 1),
        },
      };

      const addFields =
        option === "year"
          ? { year: { $year: "$createdAt" } }
          : { month: { $month: "$createdAt" } };

      const groupBy =
        option === "year"
          ? {
              _id: { year: "$year" },
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: "$price" },
            }
          : {
              _id: { month: "$month" },
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: "$price" },
            };

      const sortBy = option === "year" ? { "_id.year": 1 } : { "_id.month": 1 };

      const aggregationPipeline = [
        { $match: matchCondition },
        { $addFields: addFields },
        { $group: groupBy },
        { $sort: sortBy },
      ];

      const chartData = await customerOrderModel.aggregate(aggregationPipeline);

      // Map data into arrays (adjusting for the last 5 years)
      chartData.forEach((item) => {
        if (option === "year") {
          // For year option, map data to the correct year index (last 5 years)
          const yearIndex = currentYear - item._id.year;
          if (yearIndex >= 0 && yearIndex < 5) {
            orders[yearIndex] = item.totalOrders;
            revenue[yearIndex] = item.totalRevenue;
          }
        } else {
          // For month option, map data to correct month index
          const monthIndex = item._id.month - 1;
          orders[monthIndex] = item.totalOrders;
          revenue[monthIndex] = item.totalRevenue;
        }
      });

      // Return the result
      return res.status(200).json({
        chartOrders: orders,
        chartRevenue: revenue,
      });
    } catch (error) {
      console.error("Error in get_admin_dashboard_chart:", error.message);

      // Handle the error gracefully
      return res.status(500).json({
        message: "Error fetching chart data.",
        chartOrders: orders,
        chartRevenue: revenue,
      });
    }
  };

  // End Method
  get_seller_dashboard_data = async (req, res) => {
    console.log("in the get seller dashboard controller ", req.params);
    const { sellerId } = req.params;

    try {
      const [
        totalSales,
        sellerTotalOrder,
        sellerTotalProduct,
        sellerPendingOrder,
      ] = await Promise.all([
        // Calculate total sales for the seller
        adminOrderModel.aggregate([
          {
            $match: {
              sellerId: new ObjectId(sellerId),
              delivery_status: { $nin: ["cancelled", "pending"] },
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$price" },
            },
          },
        ]),
        // Count total orders for the seller excluding "cancelled" and "pending" statuses
        adminOrderModel.countDocuments({
          sellerId,
          delivery_status: { $nin: ["cancelled", "pending"] }, // Use $nin
        }),
        // Count total products for the seller
        productModel.countDocuments({ sellerId, isDeleted: false }),
        // Count pending orders for the seller
        adminOrderModel.countDocuments({
          sellerId,
          delivery_status: "placed",
        }),
      ]);

      const sellerTotalSales = totalSales[0]?.totalAmount || 0;

      const monthlyData = await adminOrderModel.aggregate([
        {
          $match: {
            sellerId: new ObjectId(sellerId),
            delivery_status: { $nin: ["cancelled", "pending"] },
          },
        },
        {
          $addFields: {
            month: { $month: "$createdAt" }, // Extract month from `createdAt`
          },
        },
        {
          $group: {
            _id: { month: "$month" },
            totalOrders: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $add: [
                  "$price",
                  { $ifNull: ["$couponAmount", 0] }, // Handle null values in `couponAmount`
                ],
              },
            },
          },
        },
        { $sort: { "_id.month": 1 } },
      ]);

      // Initialize arrays for consistent 12-month representation
      const orders = Array(12).fill(0);
      const revenue = Array(12).fill(0);

      // Map data into arrays
      monthlyData.forEach((item) => {
        const monthIndex = item._id.month - 1; // Map month (1-12) to index (0-11)
        orders[monthIndex] = item.totalOrders;
        revenue[monthIndex] = item.totalRevenue;
      });

      return responseReturn(res, 200, {
        sellerTotalSales,
        sellerTotalOrder,
        sellerTotalProduct,
        sellerPendingOrder,
        chartRevenue: revenue,
        chartOrders: orders,
      });
    } catch (error) {
      console.log(
        "error in the get seller dashbord data controller",
        error.message
      );
    }
  };
  // End Method
  post_blog = async (req, res, next) => {
    try {
      const form = new formidable.IncomingForm();

      // Use a promise to handle form parsing asynchronously
      form.parse(req, async (err, fields, files) => {
        if (err) {
          return next(err); // If there's an error parsing the form, pass it to the error handler
        }

        console.log("Form Fields:", fields);
        console.log("Uploaded Files:", files);

        // Validate Cloudinary configuration
        if (
          !process.env.CLOUD_NAME ||
          !process.env.API_KEY ||
          !process.env.API_SECRET
        ) {
          console.error("Missing Cloudinary configuration");
          return responseReturn(res, 500, {
            error: "Cloudinary configuration missing",
          });
        }

        cloudinary.config({
          cloud_name: process.env.CLOUD_NAME,
          api_key: process.env.API_KEY,
          api_secret: process.env.API_SECRET,
          secure: true,
        });

        const image = files.image;

        if (!image) {
          return responseReturn(res, 400, { error: "No image file provided" });
        }

        try {
          // Upload image to Cloudinary
          const result = await cloudinary.uploader.upload(image.filepath, {
            folder: "blog", // Specify folder in Cloudinary
          });

          if (!result || !result.url) {
            return responseReturn(res, 400, { error: "Image upload failed" });
          }

          console.log("Image uploaded to Cloudinary:", result.url);

          // Create blog post data object
          const blogPost = {
            heading: fields.heading,
            bloggerName: fields.bloggerName,
            content: fields.content,
            imageUrl: result.url,
          };

          // Save blog post to database
          await blogModel.create(blogPost);

          // Send a success response
          res.status(200).json({
            message: "Blog submitted successfully!",
          });
        } catch (uploadErr) {
          console.error("Error uploading image:", uploadErr);
          return responseReturn(res, 500, { error: "Image upload failed" });
        }
      });
    } catch (error) {
      console.error("Error during blog submission:", error);
      return responseReturn(res, 500, { error: "Failed to submit blog" });
    }
  };

  // End Method
}

module.exports = new adminSellerDashboardController();
