const express = require("express");
const router = express.Router();
const orderController = require("../../controller/order/orderController");
const checkUserStatus = require("../../middleweres/authCustomerMiddleware");

////////////////////// customer////////////////////

router.post(
  "/home/order/place-order",
  checkUserStatus,
  orderController.place_order
);
router.get(
  "/home/customer/get-orders/:customerId/:status",
  checkUserStatus,
  orderController.get_orders
);
router.get(
  "/home/customer/get-order-details/:orderId",
  checkUserStatus,
  orderController.get_order_details
);
// cancel order
router.put(
  "/home/customer/cancel-order/:orderId",
  checkUserStatus,
  orderController.cancel_order
);
//retrun order
router.put(
  "/home/customer/return-product/:orderId/:productId",
  checkUserStatus,
  orderController.return_product
);
//payment
router.put(
  "/home/customer/cod-payment/:orderId",
  checkUserStatus,
  orderController.cod_payment
);
// coupon
router.put(
  "/home/product/apply-coupon/:userId",
  checkUserStatus,
  orderController.apply_coupon
);
router.put(
  "/home/product/remove-apply-coupon/:userId",
  checkUserStatus,
  orderController.remove_apply_coupon
);

//////////////////// admin/////////////////////////

router.get("/admin/orders", orderController.get_admin_order);
router.get(
  "/admin/specific-order/:orderId",
  orderController.get_admin_specific_order
);
router.put(
  "/admin/order-status/update/:orderId",
  orderController.admin_order_status_update
);
// return product
router.put(
  "/admin/return-request-decision/update/:orderId/:productId",
  orderController.admin_return_request_decision
);

////////////////////Seller//////////////////////////
router.get("/seller/orders/:sellerId", orderController.get_seller_order);
router.get(
  "/seller/specific-order/:adminOrderId/:sellerId",
  orderController.get_seller_specific_order
);
router.put(
  "/seller/order-status/update/:adminOrderId",
  orderController.seller_order_status_update
);

module.exports = router;
