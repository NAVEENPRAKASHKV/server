const express = require("express");
const AuthController = require("../controller/authController");
const { authMiddleware } = require("../middleweres/authMiddleware");
const router = express.Router();

router.post("/admin-login", AuthController.admin_login);
router.get("/get-user", authMiddleware, AuthController.getUser);
router.post("/seller-register", AuthController.seller_register);
router.post("/seller-login", AuthController.seller_login);
router.get("/logout", authMiddleware, AuthController.logout);
module.exports = router;
