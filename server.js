const express = require("express");
require("dotenv").config();
const cors = require("cors");
const authRouter = require("./routes/authRoutes");
const cookieParser = require("cookie-parser");
const { dbConnect } = require("./utils/db");
const categoryRouter = require("./routes/dashboard/categoryRoutes");
const productRouter = require("./routes/dashboard/productRoutes");
const homeRouter = require("./routes/Home/homeRoutes");
const customerAuthRouter = require("./routes/Home/customerAuthRoutes");
const customerAdminRouter = require("./routes/dashboard/customerRoutes");
const cartRouter = require("./routes/Home/cartRouter");
const orderRouter = require("./routes/order/orderRoutes");
const userDashboardRouter = require("./routes/Home/dashboardRoutes");
const addressRouter = require("./routes/Home/addressRoute");
const wishlistRouter = require("./routes/Home/wishlistRouter");
const couponRouter = require("./routes/dashboard/couponRouter");
const offerRouter = require("./routes/dashboard/offerRoutes");
const paymentRouter = require("./routes/order/paymentRoutes");
const adminSellerDashboardRoter = require("./routes/dashboard/adminSellerDashboardRoutes");
const sellerRouter = require("./routes/dashboard/sellerRoutes");

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/home", homeRouter);
app.use("/api", addressRouter);
app.use("/api", userDashboardRouter);
app.use("/api", orderRouter);
app.use("/api/", cartRouter);
app.use("/api", wishlistRouter);
app.use("/api", authRouter);
app.use("/api", categoryRouter);
app.use("/api", productRouter);
app.use("/api", customerAuthRouter);
app.use("/api", customerAdminRouter);
app.use("/api", couponRouter);
app.use("/api", offerRouter);
app.use("/api", paymentRouter);
app.use("/api", adminSellerDashboardRoter);
app.use("/api", sellerRouter);

dbConnect();
app.listen(PORT, () => console.log(`server is running on port ${PORT}`));
