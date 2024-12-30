const couponModel = require("../../model/couponModel");
const { responseReturn } = require("../../utils/response");

class couponController {
  add_coupon = async (req, res) => {
    // Extracting the coupon details from the request body
    let {
      couponId,
      discountAmount,
      minOrderValue,
      startingDate,
      expirationDate,
      totalRedemptionsAllowed,
      isActive,
    } = req.body;
    couponId = couponId.trim().toUpperCase();
    try {
      // Check if the couponId already exists to prevent duplicates
      const existingCoupon = await couponModel.findOne({ couponId });

      if (existingCoupon) {
        return responseReturn(res, 400, { error: "Coupon already exists!" });
      }

      // Create a new coupon
      const coupon = await couponModel.create({
        couponId,
        discountAmount,
        minOrderValue,
        startingDate,
        expirationDate,
        totalRedemptionsAllowed,
        isActive,
      });

      // Return success response
      return responseReturn(res, 200, { message: "Coupon added successfully" });
    } catch (error) {
      console.log("Error in adding the coupon", error.message);
      return responseReturn(res, 500, { error: "Failed to add coupon" });
    }
  };
  get_coupon = async (req, res) => {
    let { perPage, searchValue, page } = req.query;

    perPage = parseInt(perPage);
    page = parseInt(page);
    const skipPage = perPage * (page - 1);

    try {
      const queryString = searchValue
        ? { $text: { $search: searchValue } }
        : {};

      const coupons = await couponModel
        .find(queryString)
        .skip(skipPage)
        .limit(perPage);
      const totalCoupons = await couponModel.countDocuments(queryString);

      return responseReturn(res, 200, { coupons, totalCoupons });
    } catch (error) {
      console.log("error in fetching the data", error.message);
      return responseReturn(res, 500, { error: "Failed to fatech the data" });
    }
  };
  update_coupon = async (req, res) => {
    // Extracting the coupon details from the request body
    let {
      couponId,
      discountAmount,
      minOrderValue,
      startingDate,
      expirationDate,
      totalRedemptionsAllowed,
      isActive,
    } = req.body;
    couponId = couponId.trim().toUpperCase();

    // Basic validation
    if (!couponId) {
      return responseReturn(res, 400, { error: "Coupon ID is required." });
    }

    try {
      // Find and update the coupon
      const updatedCoupon = await couponModel.findOneAndUpdate(
        { couponId }, // Find by couponId
        {
          discountAmount,
          minOrderValue,
          startingDate,
          expirationDate,
          totalRedemptionsAllowed,
          isActive,
        },
        { new: true } // Return the updated document
      );

      // Check if the coupon exists
      if (!updatedCoupon) {
        return responseReturn(res, 404, { error: "Coupon does not exist!" });
      }

      // Return success response
      return responseReturn(res, 200, {
        message: "Coupon updated successfully",
      });
    } catch (error) {
      console.error("Error in updating the coupon:", error.message);
      return responseReturn(res, 500, { error: "Failed to update coupon" });
    }
  };
  delete_coupon = async (req, res) => {
    // Extracting the coupon details from the request body
    const { couponId } = req.params;

    // Basic validation
    if (!couponId) {
      return responseReturn(res, 400, { error: "Coupon ID is required." });
    }
    try {
      const deletedCoupon = await couponModel.deleteOne({ couponId });

      if (!deletedCoupon) {
        return responseReturn(res, 404, { error: "Coupon does not exist!" });
      }

      return responseReturn(res, 200, {
        message: "Coupon deleted successfully",
      });
    } catch (error) {
      console.error("Error in deleting the coupon:", error.message);
      return responseReturn(res, 500, { error: "Failed to delete coupon" });
    }
  };
}

module.exports = new couponController();
