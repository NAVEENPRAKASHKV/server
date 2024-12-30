const express = require("express");
const router = express();
const addressController = require("../../controller/home/addressController");
const checkUserStatus = require("../../middleweres/authCustomerMiddleware");
router.post(
  "/home/customer/add_address/:userId",
  checkUserStatus,
  addressController.add_address
);
router.post(
  "/home/customer/update_address/:addressId",
  checkUserStatus,
  addressController.update_address
);
router.delete(
  "/home/customer/delete-address/:addressId",
  checkUserStatus,
  addressController.delete_address
);

module.exports = router;
