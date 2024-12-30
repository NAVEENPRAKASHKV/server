const jwt = require("jsonwebtoken");
const customerModel = require("../model/customerModel.js");

// Middleware to check if user is blocked
const checkUserStatus = async (req, res, next) => {
  try {
    const customerToken =
      req.cookies.customerToken || req.headers.authorization?.split(" ")[1];

    if (!customerToken) {
      console.log("no token");
      return res.status(401).json({ message: "Authentication required" }); // User not authenticated
    }

    // Verify and decode token
    const decoded = jwt.verify(customerToken, process.env.JWT_SECRET_KEY);
    req.id = decoded.id;
    console.log(decoded);

    // Fetch user and check blocked status
    const user = await customerModel.findById(req.id);
    if (!user) {
      console.log("no user");
      return res.status(404).json({ message: "User not found" }); // Handle missing user
    }

    if (user.isBlocked) {
      return res
        .status(403)
        .json({ message: "Your account has been blocked by the admin" }); // User is blocked
    }

    // Proceed to next middleware or route handler
    next();
  } catch (error) {
    console.error("Error in checkUserStatus middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = checkUserStatus;
