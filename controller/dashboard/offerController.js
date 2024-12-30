const { responseReturn } = require("../../utils/response");
const categoryOfferModel = require("../../model/categoryOfferModel");
const { ObjectId } = require("mongoose").Types;

class offerController {
  add_category_offer = async (req, res) => {
    console.log("In the add category offer controller", req.body);
    const {
      offerCategory,
      offerPercentage,
      startingDate,
      expirationDate,
      isActive,
    } = req.body;

    try {
      // Convert dates to Date objects for accurate comparison
      const start = new Date(startingDate);
      const end = new Date(expirationDate);

      if (start >= end) {
        return responseReturn(res, 400, {
          error: "Starting date must be earlier than the expiration date.",
        });
      }

      // Check for overlapping offers in the same category
      const isActiveOfferExist = await categoryOfferModel.findOne({
        offerCategory,
        isActive,
        $or: [{ startingDate: { $lte: end }, expirationDate: { $gte: start } }],
      });

      if (isActiveOfferExist) {
        return responseReturn(res, 400, {
          error:
            "An active offer with overlapping dates already exists for this category.",
        });
      }

      // Create the new offer
      const offer = await categoryOfferModel.create({
        offerCategory,
        offerPercentage,
        startingDate: start,
        expirationDate: end,
        isActive,
      });

      return responseReturn(res, 201, {
        message: `New offer added in category: ${offerCategory}`,
        data: offer,
      });
    } catch (error) {
      console.error("Error while adding the new category offer:", error);
      return responseReturn(res, 500, {
        error: "An internal server error occurred.",
        details: error.message,
      });
    }
  };
  //End Method
  get_category_offer = async (req, res) => {
    console.log("in the categoy offer controller");
    let { perpage, searchValue, page } = req.query;
    perpage = parseInt(perpage) || 10;
    page = parseInt(page) || 1;
    const skipItem = (page - 1) * perpage;

    // Search query
    const searchQuery = searchValue ? { $text: { $search: searchValue } } : {};
    try {
      const categoryOffer = await categoryOfferModel
        .find(searchQuery)
        .limit(perpage)
        .skip(skipItem)
        .sort({ updatedAt: -1 });
      const totalOffer = await categoryOfferModel.countDocuments(searchQuery);
      return responseReturn(res, 200, { categoryOffer, totalOffer });
    } catch (error) {
      console.error(
        "Error in the get_category_offer controller:",
        error.message
      );
      return responseReturn(res, 500, { error: "Internal server error" });
    }
  };
  //End Method
  update_category_offer = async (req, res) => {
    console.log("In the update category offer controller");
    const { offerId } = req.params;
    let {
      offerCategory,
      offerPercentage,
      startingDate,
      expirationDate,
      isActive,
    } = req.body;

    offerPercentage = parseInt(offerPercentage);
    const start = new Date(startingDate);
    const end = new Date(expirationDate);

    // Validate `offerId`
    if (!ObjectId.isValid(offerId)) {
      return res
        .status(400)
        .json({ error: "Invalid or missing offer ID format" });
    }
    const offerIdObject = new ObjectId(offerId);
    // Validate date range
    if (start >= end) {
      return responseReturn(res, 400, {
        error: "Starting date must be earlier than the expiration date.",
      });
    }

    try {
      // Check for overlapping offers in the same category, excluding the current one
      const isActiveOfferExist = await categoryOfferModel.findOne({
        offerCategory,
        isActive,
        _id: { $ne: offerIdObject },
        $or: [{ startingDate: { $lte: end }, expirationDate: { $gte: start } }],
      });

      if (isActiveOfferExist) {
        return responseReturn(res, 400, {
          error:
            "An active offer with overlapping dates already exists for this category.",
        });
      }

      // Update the existing offer
      const offer = await categoryOfferModel.findByIdAndUpdate(
        offerIdObject,
        {
          offerPercentage,
          startingDate: start,
          expirationDate: end,
          isActive,
        },
        { new: true } // Return the updated document
      );

      if (!offer) {
        return responseReturn(res, 404, {
          error: "Offer not found. Update failed.",
        });
      }

      return responseReturn(res, 200, {
        message: `Offer updated successfully in category: ${offerCategory}`,
        data: offer,
      });
    } catch (error) {
      console.error("Error while updating the category offer:", error.message);
      return responseReturn(res, 500, {
        error: "An internal server error occurred.",
      });
    }
  };
  //End Method
  delete_category_offer = async (req, res) => {
    console.log("in the offer delete controller", req.params);
    const { offerId } = req.params;
    try {
      await categoryOfferModel.findByIdAndDelete(offerId);
      return responseReturn(res, 200, { message: "offer deleted successfuly" });
    } catch (error) {
      console.log("error while deleting");
      return responseReturn(res, 500, { error: "internel server error" });
    }
  };
  //End Method
}

module.exports = new offerController();
