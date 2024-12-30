const homeController = require("../../controller/home/homeController");
const express = require("express");
const router = express.Router();

router.get("/get-categories", homeController.get_categories);
router.get("/get-products", homeController.get_products);
router.get("/product-details/:slug", homeController.product_details);
router.get("/price-range-product", homeController.get_price_range);
router.get("/query-products", homeController.query_products);
router.get("/get-review/:productId", homeController.get_review);
router.get("/get-blog", homeController.get_blog);

module.exports = router;
