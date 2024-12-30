const customerModel = require("../../model/customerModel");
const { responseReturn } = require("../../utils/response");
const sellerCustomerModel = require("../../model/chat/sellerCustomerModel");
const bcrypt = require("bcryptjs");
const { createToken } = require("../../utils/tokenCreate");
const nodemailer = require("nodemailer");
const addressModel = require("../../model/addressModel");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const walletModel = require("../../model/walletModel");
const WalletTransactionModel = require("../../model/WalletTransactionModel");

class cutomerAuthController {
  constructor() {
    // Initialize  otpStore

    this.otpStore = {};
  }
  // creating unique referelId
  generateUniqueReferralId = async () => {
    let referralId;
    let isUnique = false;

    while (!isUnique) {
      referralId = Math.floor(
        1000000000 + Math.random() * 9000000000
      ).toString();
      const exists = await customerModel.findOne({ referralId });
      if (!exists) isUnique = true;
    }
    return referralId;
  };

  // method for creating an otp
  createOtp() {
    const expirationTime = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    console.log(otp);
    return { otp, expirationTime };
  }
  // method for sending the otp
  sendEmailWithOtp = async (email) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "naveen.prakash.kv@gmail.com",
        pass: "tens lfeb uihx gnvo", // Use app password if 2FA is enabled
      },
    });

    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code for Easy Shop",
        text: `Your OTP is: ${
          this.otpStore[email].otp
        } and expires at: ${new Date(
          this.otpStore[email].expirationTime
        ).toLocaleString()}`,
      });

      console.log("Email sent: %s", info.messageId);
      return { success: true, message: "OTP sent successfully!" };
    } catch (error) {
      console.error("Error sending email:", error);
      return {
        success: false,
        message: "Error sending OTP",
        error: error.message,
      };
    }
  };
  // End method

  customer_register = async (req, res) => {
    // Trim inputs
    const { name, email, password } = req.body;
    const trimmedData = {
      name: name?.trim(),
      email: email?.trim(),
      password: password?.trim(),
    };

    try {
      // Validate input
      const {
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
      } = trimmedData;

      if (!trimmedName || !trimmedEmail || !trimmedPassword) {
        return responseReturn(res, 400, { error: "All fields are mandatory" });
      }

      // Check if customer already exists
      const existingCustomer = await customerModel.findOne({
        email: trimmedEmail,
        isBlocked: false,
      });
      if (existingCustomer) {
        return responseReturn(res, 400, {
          error: "You are already registered. Please login.",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

      // Create a new customer
      const createCustomer = await customerModel.create({
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
        method: "manual",
      });
      // create wallet

      // Add entry in sellerCustomerModel for chat
      await sellerCustomerModel.create({
        myId: createCustomer._id,
      });

      // Generate JWT token
      const token = await createToken({
        id: createCustomer._id,
        name: createCustomer.name,
        email: createCustomer.email,
        method: createCustomer.method,
      });

      // Set cookie with the token
      res.cookie("customerToken", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      });

      return responseReturn(res, 201, {
        token,
        message: "User registered successfully",
      });
    } catch (error) {
      console.error(`Error in customer registration: ${error.message}`);
      return responseReturn(res, 500, { error: "Internal server error" });
    }
  };
  // End method
  customer_login = async (req, res) => {
    // Trim inputs
    const { email, password } = req.body;
    const trimmedData = {
      email: email?.trim(),
      password: password?.trim(),
    };

    try {
      // Validate input
      const { email: trimmedEmail, password: trimmedPassword } = trimmedData;

      if (!trimmedEmail || !trimmedPassword) {
        return responseReturn(res, 400, { error: "All fields are mandatory" });
      }

      let isBlocked = await customerModel.findOne({
        email: trimmedEmail,
        isBlocked: true,
      });
      if (isBlocked) {
        return responseReturn(res, 404, { error: "You are blocked by admin" });
      }
      // Check if customer already exists
      const customer = await customerModel
        .findOne({
          email: trimmedEmail,
          isBlocked: false,
        })
        .select("+password");
      if (!customer) {
        return responseReturn(res, 400, {
          error: "Email not registerd Please Register first",
        });
      }

      // Hash the password
      const match = await bcrypt.compare(trimmedPassword, customer.password);
      if (!match) {
        return responseReturn(res, 400, {
          error: "invalid credentials",
        });
      }

      // Generate JWT token
      const token = await createToken({
        id: customer._id,
        name: customer.name,
        email: customer.email,
        method: customer.method,
      });

      // Set cookie with the token
      res.cookie("customerToken", token, {
        sameSite: "lax",
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      });

      return responseReturn(res, 201, {
        token,
        message: "Login successfully",
      });
    } catch (error) {
      console.error(`Error in customer registration: ${error.message}`);
      return responseReturn(res, 500, { error: "Internal server error" });
    }
  };
  // End method
  google_signin = async (req, res) => {
    const { email, name } = req.body.userInfo;
    console.log("in google sign in controller ", req.body.userInfo);

    try {
      if (!email || !name) {
        return responseReturn(res, 400, {
          error: "Error please user other method to login",
        });
      }
      let isBlocked = await customerModel.findOne({
        email,
        isBlocked: true,
      });
      if (isBlocked) {
        return responseReturn(res, 403, { error: "You are blocked by admin" });
      }

      let customer = await customerModel.findOne({
        email,
        isBlocked: false,
      });

      if (!customer) {
        // If user doesn't exist, create a new one
        const referralId = await this.generateUniqueReferralId();
        customer = new customerModel({
          name,
          email,
          method: "google",
          password: null,
          referralId: referralId,
        });
        await customer.save();
        // creating wallet for the customer
        await walletModel.create({
          userId: customer._id,
          balance: 0,
        });
      }

      // Generate JWT token
      const authToken = await createToken({
        id: customer._id,
        name: customer.name,
        email: customer.email,
        method: customer.method,
      });

      // Set the JWT token in the cookie
      res.cookie("customerToken", authToken, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Cookie expiration (1 week)
      });

      // Send response with token
      return responseReturn(res, 201, {
        token: authToken,
        message: "Login successful via Google",
      });
    } catch (error) {
      console.error(`Error in Google Sign-In: ${error.message}`);
      return responseReturn(res, 500, { error: "Internal server error" });
    }
  };
  // End method

  send_otp = async (req, res) => {
    console.log("Sending OTP", req.body);
    const { email } = req.body;

    if (!email) {
      return responseReturn(res, 400, { error: "Email is required" });
    }
    // Check if the customer already exists
    const existingCustomer = await customerModel.findOne({
      email: email,
      isBlocked: false,
    });
    if (existingCustomer) {
      return responseReturn(res, 400, {
        error: "You are already registered. Please login.",
      });
    }

    // Generate and store OTP
    this.otpStore[email] = this.createOtp();

    try {
      // Send OTP to the provided email
      const result = await this.sendEmailWithOtp(email);

      if (result.success) {
        return responseReturn(res, 200, { message: "OTP sent successfully!" });
      } else {
        // If email sending fails, return a 500 error with a descriptive message
        return responseReturn(res, 500, { error: "Error while sending OTP" });
      }
    } catch (error) {
      console.error("Error sending otp:", error);
      return responseReturn(res, 500, { error: "Error while sending OTP" });
    }
  };
  // End method

  verify_otp = async (req, res) => {
    console.log("Verifying OTP", req.body);
    const { email, otp, password, name, referralId } = req.body;

    // Validate that email, OTP, password, and name are provided
    if (!email || !otp || !password || !name) {
      return responseReturn(res, 400, {
        error: "Email, OTP, password, and name are required",
      });
    }

    // Check if OTP exists for the email
    if (!this.otpStore[email]) {
      return responseReturn(res, 400, { error: "OTP not found or expired" });
    }

    const storedOtp = this.otpStore[email].otp;
    const expirationTime = this.otpStore[email].expirationTime;

    // Verify OTP and check for expiration
    if (storedOtp !== otp) {
      return responseReturn(res, 400, { error: "Invalid OTP" });
    }

    if (new Date() > new Date(expirationTime)) {
      // OTP expired
      delete this.otpStore[email]; // Clear expired OTP
      return responseReturn(res, 400, { error: "OTP has expired" });
    }

    // OTP is valid, proceed with account creation (save user with email, password, and name)
    try {
      // Clean and validate input data
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (!trimmedName || !trimmedEmail || !trimmedPassword) {
        return responseReturn(res, 400, { error: "All fields are mandatory" });
      }

      // Check if the customer already exists
      const existingCustomer = await customerModel.findOne({
        email: trimmedEmail,
        isBlocked: false,
      });
      if (existingCustomer) {
        return responseReturn(res, 400, {
          error: "You are already registered. Please login.",
        });
      }

      // Hash the password securely
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
      const referralIdNew = await this.generateUniqueReferralId();
      // Create a new customer
      const createCustomer = await customerModel.create({
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
        referralId: referralIdNew,
        method: "manual",
      });

      // creating wallet for the customer
      const newUserWallet = await walletModel.create({
        userId: createCustomer._id,
        balance: 0,
      });

      // Link customer with seller model (if applicable)
      await sellerCustomerModel.create({
        myId: createCustomer._id,
      });
      if (referralId) {
        // Find the customer who referred the new user
        const referedByCustomer = await customerModel.findOne({ referralId });

        if (referedByCustomer) {
          // Add reward to the referrer's wallet and log the transaction
          const referelByWallet = await walletModel.findOneAndUpdate(
            { userId: referedByCustomer._id },
            { $inc: { balance: 50 } },
            { new: true }
          );

          await WalletTransactionModel.create({
            walletId: referelByWallet._id,
            type: "credit",
            amount: 50,
            description: "Referral Reward: Credit to Referrer",
          });

          // Add reward to the new user's wallet and log the transaction
          const ownWallet = await walletModel.findOneAndUpdate(
            { _id: newUserWallet._id },
            { $inc: { balance: 25 } },
            { new: true }
          );

          await WalletTransactionModel.create({
            walletId: ownWallet._id,
            type: "credit",
            amount: 25,
            description: "Referral Reward: Credit to New User",
          });
        }
      }

      // Generate JWT token
      const token = await createToken({
        id: createCustomer._id,
        name: createCustomer.name,
        email: createCustomer.email,
        method: createCustomer.method,
      });

      // Set cookie with the token
      res.cookie("customerToken", token, {
        sameSite: "lax",
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week expiration
      });

      // Return success response with token
      return responseReturn(res, 201, {
        token,
        message: "User registered successfully",
      });
    } catch (error) {
      console.error("Error creating account:", error);
      return responseReturn(res, 500, { error: "Error creating account" });
    }
  };
  // End method

  forgot_password = async (req, res) => {
    console.log("in the forgot password");
    console.log(req.body);
    const { emailId } = req.body;
    try {
      const user = await customerModel.findOne({ email: emailId });
      if (!user) {
        return responseReturn(res, 404, { error: "No user Exist" });
      }

      const token = await jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: "5m",
        }
      );

      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "naveen.prakash.kv@gmail.com",
          pass: "tens lfeb uihx gnvo",
        },
      });

      var mailOptions = {
        from: process.env.EMAIL_USER,
        to: emailId,
        subject: "Reset password login in the EasyShop",
        text: `http://localhost:3000/customer/reset-password/${user._id}/${token}`,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
      return responseReturn(res, 200, {
        message: "reset password link send to email id",
      });
    } catch (error) {
      console.log("error in forgot password", error.message);
      return responseReturn(res, 500, {
        error: "error in sending reset link to email",
      });
    }
  };
  // End method
  reset_password = async (req, res) => {
    const { userId, token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "Password is required.",
      });
    }

    try {
      // Verify the JWT token
      const decodedToken = await jwt.verify(token, process.env.JWT_SECRET_KEY);

      // Validate the token userId matches the request userId
      if (decodedToken.id !== userId) {
        return res.status(403).json({
          error: "Token does not match user. Unauthorized request.",
        });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the user's password in the database
      const user = await customerModel.findByIdAndUpdate(
        userId,
        { password: hashedPassword },
        { new: true } // Return the updated document
      );

      if (!user) {
        return res.status(404).json({
          error: "User not found.",
        });
      }

      return res.status(200).json({
        message: "Password successfully reset.",
      });
    } catch (error) {
      console.error("Error resetting password:", error.message);
      return res.status(403).json({
        error: "Invalid or expired token. Please log in again.",
      });
    }
  };
  // End method

  ///////////////////customer profile////////////////////

  update_user_profile = async (req, res) => {
    console.log(req.body);
    console.log(req.params);
    const { userId } = req.params;
    const { username, fullName, phone } = req.body;

    try {
      if (!username || !fullName || !phone) {
        return responseReturn(res, 400, { error: "Missing required fields." });
      }
      const customer = await customerModel.findByIdAndUpdate(
        userId,
        {
          name: username,
          fullName,
          phone,
        },
        { new: true }
      );
      if (!customer) {
        return responseReturn(res, 404, {
          error: "Fail to update. User not found.",
        });
      }
      // Generate JWT token
      const token = await createToken({
        id: customer._id,
        name: customer.name,
        email: customer.email,
        method: customer.method,
      });

      // Set cookie with the token
      res.cookie("customerToken", token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      });

      return responseReturn(res, 200, {
        token,
        message: "successfuly updated data",
      });
    } catch (error) {
      console.error("Error in updating profile:", error.message);
      return responseReturn(res, 500, { error: "Internal Server Error." });
    }
  };
  // End method
  get_user_profile = async (req, res) => {
    const { userId } = req.params;

    try {
      // Fetch user profile and address data
      const userProfileInfo = await customerModel.findById(userId);
      const addressUser = await addressModel.find({
        userId: new ObjectId(userId),
      });

      // Check if user profile exists
      if (!userProfileInfo) {
        return responseReturn(res, 404, { error: "User profile not found." });
      }
      console.log(addressUser);
      // Return both user profile and address information
      return responseReturn(res, 200, { userProfileInfo, addressUser });
    } catch (error) {
      console.log("Error in fetching the user profile data", error.message);
      return responseReturn(res, 500, { error: "Internal Server Error." });
    }
  };
  ////////////////////////// logout/////////////////////

  customer_logout = async (req, res) => {
    res.cookie("customerToken", "", {
      expires: new Date(Date.now()),
    });
    responseReturn(res, 200, { message: "Logout Success" });
  };
  // End method
}

module.exports = new cutomerAuthController();
