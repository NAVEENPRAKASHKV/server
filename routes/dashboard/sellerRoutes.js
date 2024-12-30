const router = require("express").Router();
const sellerControler = require("../../controller/dashboard/sellerController");

router.post(
  "/seller/update-seller-profile-info",
  sellerControler.update_seller_profile_info
);
router.get("/admin/request-seller-get", sellerControler.get_seller_request);
router.get(
  "/admin/get-specific-seller-details/:sellerId",
  sellerControler.get_specific_seller_details
);
router.put(
  "/admin/update-seller-active-deactive/:sellerId",
  sellerControler.update_seller_active_deactive
);

router.get("/admin/get-top-data", sellerControler.get_top_data);

module.exports = router;
