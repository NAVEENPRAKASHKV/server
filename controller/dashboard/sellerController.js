const formidable = require("formidable");
const { responseReturn } = require("../../utils/response");
const cloudinary = require("cloudinary").v2;
const sellerModel = require("../../model/sellerModel");
const customerOrderModel = require("../../model/customerOrderModel");

class sellerControler {
  update_seller_profile_info = async (req, res) => {
    console.log("In the seller profile update controller");
    const form = formidable({ multiples: true });

    try {
      // Parse the form data
      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      // Initialize Cloudinary
      cloudinary.config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.API_KEY,
        api_secret: process.env.API_SECRET,
        secure: true,
      });

      console.log("Files:", files);
      console.log("Fields:", fields);

      const { profileImage: image } = files;

      const { userData, sellerId } = fields;

      // Validate input data
      if (!sellerId || !userData) {
        return responseReturn(res, 400, { error: "Invalid input data" });
      }

      // Upload image to Cloudinary
      let result;
      try {
        result = await cloudinary.uploader.upload(image.filepath, {
          folder: "profilePic",
        });
      } catch (err) {
        console.error("Error uploading image:", err);
        return responseReturn(res, 500, { error: "Image upload failed" });
      }

      if (!result || !result.url) {
        return responseReturn(res, 400, { error: "Image upload failed" });
      }

      // Update seller profile in the database
      await sellerModel.findByIdAndUpdate(
        sellerId,
        {
          shopInfo: JSON.parse(userData),
          image: result.url,
        },
        { new: true } // Optionally return the updated document
      );

      return responseReturn(res, 200, {
        message: "Successfully updated the profile",
      });
    } catch (error) {
      console.error("Error while updating the seller profile:", error);
      return responseReturn(res, 500, {
        error: "Error while updating the profile",
      });
    }
  };
  // end method
  get_seller_request = async (req, res) => {
    console.log("In the seller request:");
    let { page, searchValue, perPage } = req.query;

    page = parseInt(page) || 1;
    perPage = parseInt(perPage) || 10;
    const skipPage = (page - 1) * perPage;

    try {
      // Use searchValue to construct the query
      const query = searchValue ? { $text: { $search: searchValue } } : {};

      // Fetch sellers with pagination and sorting
      const sellers = await sellerModel
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skipPage)
        .limit(perPage);

      // Count total sellers matching the query
      const totalSeller = await sellerModel.countDocuments(query);

      // Return response with sellers and total count
      return res.status(200).json({ sellers, totalSeller });
    } catch (error) {
      console.error(
        "Error while fetching the seller details in get_seller_request controller:",
        error.message
      );
      return res.status(500).json({ error: "Failed to fetch seller details" });
    }
  };
  // end method
  get_specific_seller_details = async (req, res) => {
    console.log("in the specfic seller details ", req.params);
    const { sellerId } = req.params;
    try {
      const specificSeller = await sellerModel.findById(sellerId);
      if (!specificSeller) {
        return responseReturn(res, 404, { error: "seller does not exist" });
      }
      return responseReturn(res, 200, { specificSeller });
    } catch (error) {
      console.log("error while fetching the get seller detials");
    }
  };
  // end method
  update_seller_active_deactive = async (req, res) => {
    console.log("in the update seller active deactive");
    const { sellerId } = req.params;
    const { status } = req.body;
    try {
      const specificSeller = await sellerModel.findById(sellerId);
      if (!specificSeller) {
        return responseReturn(res, 404, { error: "seller does not exist" });
      }
      await sellerModel.findByIdAndUpdate(sellerId, { status });
      return responseReturn(res, 200, { message: "status updated" });
    } catch (error) {
      console.log("error while updting the data");
      return responseReturn(res, 500, {
        error: "error while updating the status",
      });
    }
  };
  // end method
  get_top_data = async (req, res) => {
    console.log("in the get top data");
    try {
      const topProduct = await customerOrderModel.aggregate([
        {
          $unwind: "$products",
        },
        {
          $match: {
            delivery_status: { $nin: ["cancelled", "pending"] },
            "products.returnStatus": { $ne: "accepted" },
          },
        },
        {
          $group: {
            _id: "$products._id",
            name: { $first: "$products.name" },
            category: { $first: "$products.category" },
            brand: { $first: "$products.brand" },
            price: { $first: "$products.price" },
            totalQuantity: { $sum: "$products.quantity" },
            totalRevenue: {
              $sum: { $multiply: ["$products.quantity", "$products.price"] },
            },
          },
        },
        {
          $sort: {
            totalQuantity: -1,
          },
        },
        {
          $limit: 10,
        },
      ]);
      const topCategory = await customerOrderModel.aggregate([
        {
          $unwind: "$products",
        },
        {
          $match: {
            delivery_status: { $nin: ["cancelled", "pending"] },
            "products.returnStatus": { $ne: "accepted" },
          },
        },
        {
          $group: {
            _id: "$products.category",
            totalQuantity: { $sum: "$products.quantity" },
            totalRevenue: {
              $sum: { $multiply: ["$products.quantity", "$products.price"] },
            },
          },
        },
        {
          $sort: {
            totalQuantity: -1,
          },
        },
        {
          $limit: 10,
        },
      ]);
      const topBrand = await customerOrderModel.aggregate([
        {
          $unwind: "$products",
        },
        {
          $match: {
            delivery_status: { $nin: ["cancelled", "pending"] },
            "products.returnStatus": { $ne: "accepted" },
          },
        },
        {
          $group: {
            _id: "$products.brand",
            totalQuantity: { $sum: "$products.quantity" },
            totalRevenue: {
              $sum: { $multiply: ["$products.quantity", "$products.price"] },
            },
          },
        },
        {
          $sort: {
            totalQuantity: -1,
          },
        },
        {
          $limit: 10,
        },
      ]);
      return responseReturn(res, 200, {
        topProduct,
        topCategory,
        topBrand,
      });
    } catch (error) {}
  };
}

module.exports = new sellerControler();
