const router = require("express").Router();
const wishlistController = require("../../controller/home/wishlistController");
const authCustomerMiddlewere = require("../../middleweres/authCustomerMiddleware");

router.post(
  "/home/product/add-to-wishlist",
  authCustomerMiddlewere,
  wishlistController.add_to_wishlist
);
router.get(
  "/home/product/get-wishlist-product/:userId",
  authCustomerMiddlewere,
  wishlistController.get_wishlist_product
);
router.delete(
  "/home/product/delete-wishlist-product/:wishlistId",
  authCustomerMiddlewere,
  wishlistController.delete_wishlist_product
);
module.exports = router;
