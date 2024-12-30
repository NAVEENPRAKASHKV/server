const router = require("express").Router();
const offerController = require("../../controller/dashboard/offerController");

router.post("/category/add-category-offer", offerController.add_category_offer);
router.get("/category/get-category-offer", offerController.get_category_offer);
router.put(
  "/category/update-category-offer/:offerId",
  offerController.update_category_offer
);
router.delete(
  "/category/delete-category-offer/:offerId",
  offerController.delete_category_offer
);
module.exports = router;
