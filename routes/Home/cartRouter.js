const express = require("express");
const router = express.Router();
const cartController = require("../../controller/home/cartController");
const checkUserStatus = require("../../middleweres/authCustomerMiddleware");

// Route for adding a product to the cart
router.post("/home/product/add-to-cart", cartController.add_to_cart);
router.get(
  "/home/product/get-cart-product/:userId",
  checkUserStatus,
  cartController.get_cart_products
);
router.delete(
  "/home/product/delete-cart-product/:cartId",
  checkUserStatus,
  cartController.delete_cart_products
);
router.put(
  "/home/product/quantity-inc/:cartId",
  checkUserStatus,
  cartController.quantity_increment
);
router.put(
  "/home/product/quantity-dec/:cartId",
  checkUserStatus,
  cartController.quantity_decrement
);

module.exports = router;
