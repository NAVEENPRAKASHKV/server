const router = require("express").Router();
const adminSellerDashboardController = require("../../controller/dashboard/adminSellerDashboardController");

router.get(
  "/admin/get-admin-sales-data",
  adminSellerDashboardController.get_admin_sales_data
);
router.get(
  "/admin/get-admin-dashboard-data",
  adminSellerDashboardController.get_admin_dashboard_data
);
router.get(
  "/admin/get-admin-dashboard-chart/:option",
  adminSellerDashboardController.get_admin_dashboard_chart
);
router.get(
  "/admin/get-seller-dashboard-data/:sellerId",
  adminSellerDashboardController.get_seller_dashboard_data
);
router.post("/seller/post-blog", adminSellerDashboardController.post_blog);

module.exports = router;
