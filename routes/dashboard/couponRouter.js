const router = require("express").Router();
const couponController = require("../../controller/dashboard/couponController");

router.post("/admin/add-coupon", couponController.add_coupon);
router.get("/admin/get-coupon?", couponController.get_coupon);
router.post("/admin/update-coupon", couponController.update_coupon);
router.delete("/admin/delete-coupon/:couponId", couponController.delete_coupon);
module.exports = router;
