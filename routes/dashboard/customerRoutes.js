const express = require("express");
const router = express.Router();
const customerController = require("../../controller/dashboard/customerController");
const { authMiddleware } = require("../../middleweres/authMiddleware");

router.get(
  "/admin/customer-get",
  authMiddleware,
  customerController.get_customer
);
router.put(
  "/admin/customer-block/:customerId",
  authMiddleware,
  customerController.block_unblock_customer
);

module.exports = router;
