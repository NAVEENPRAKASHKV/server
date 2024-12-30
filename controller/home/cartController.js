const cartModel = require("../../model/cartModel");
const { responseReturn } = require("../../utils/response");
const {
  mongo: { ObjectId },
} = require("mongoose");
class cartController {
  add_to_cart = async (req, res) => {
    const { userId, quantity, productId } = req.body;
    console.log(req.body);

    try {
      // Validate input data
      if (!userId || !quantity || !productId) {
        return responseReturn(res, 400, { error: "All fields are required." });
      }

      // Check if the product is already in the user's cart
      const existingProduct = await cartModel.findOne({ productId, userId });
      if (existingProduct) {
        return responseReturn(res, 400, {
          error: "Product already added to the cart.",
        });
      }

      // Add the product to the cart
      const product = await cartModel.create({
        userId,
        productId,
        quantity,
      });
      return responseReturn(res, 200, {
        message: "Product added to cart.",
        product,
      });
    } catch (error) {
      console.error("Error while adding product to cart:", error.message);
      return responseReturn(res, 500, {
        error: "Internal server error.",
      });
    }
  };
  get_cart_products = async (req, res) => {
    const commission = 5; // Commission percentage for the admin
    console.log("get cart product controller invoked");
    const { userId } = req.params;

    try {
      const cart_product = await cartModel.aggregate([
        {
          $match: { userId: { $eq: new ObjectId(userId) } },
        },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "products",
          },
        },
        {
          $lookup: {
            from: "categoryoffers",
            let: { category: { $arrayElemAt: ["$products.category", 0] } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$offerCategory", "$$category"] },
                      { $eq: ["$isActive", true] },
                      { $gte: ["$expirationDate", new Date()] },
                      { $lte: ["$startingDate", new Date()] },
                    ],
                  },
                },
              },
              { $sort: { expirationDate: 1 } }, // Sort by nearest expiration date
              { $limit: 1 }, // Get the most relevant offer
            ],
            as: "categoryOffers",
          },
        },
        {
          $addFields: {
            validOfferPercentage: {
              $cond: {
                if: { $gt: [{ $size: "$categoryOffers" }, 0] },
                then: { $arrayElemAt: ["$categoryOffers.offerPercentage", 0] },
                else: 0,
              },
            },
            validOfferId: {
              $cond: {
                if: { $gt: [{ $size: "$categoryOffers" }, 0] },
                then: { $arrayElemAt: ["$categoryOffers._id", 0] },
                else: 0,
              },
            },
          },
        },
      ]);

      console.log(cart_product);

      let buy_product_item = 0;
      let calculatePrice = 0;
      let cart_product_count = 0;

      // Out-of-stock products
      const outOfStockProduct = cart_product.filter(
        (pro) => pro.products[0]?.stock < pro.quantity
      );

      for (let i = 0; i < outOfStockProduct.length; i++) {
        cart_product_count += outOfStockProduct[i].quantity;
      }

      // In-stock products
      const stockProduct = cart_product.filter(
        (pro) => pro.products[0]?.stock >= pro.quantity
      );

      for (let i = 0; i < stockProduct.length; i++) {
        const { quantity, validOfferPercentage } = stockProduct[i];
        cart_product_count += quantity;
        buy_product_item += quantity;

        const { price, discount } = stockProduct[i].products[0];
        const applicableDiscount = Math.max(
          discount || 0,
          validOfferPercentage || 0
        );
        const discountedPrice = applicableDiscount
          ? price - Math.floor((price * applicableDiscount) / 100)
          : price;

        calculatePrice += quantity * discountedPrice;
      }

      console.log("Total Price:", calculatePrice);
      console.log("Total Quantity:", cart_product_count);
      console.log("Items to Buy:", buy_product_item);

      let p = [];
      let unique = [
        ...new Set(stockProduct.map((p) => p.products[0].sellerId.toString())),
      ];

      for (let i = 0; i < unique.length; i++) {
        let price = 0; // Total price for the current seller
        for (let j = 0; j < stockProduct.length; j++) {
          const tempProduct = stockProduct[j].products[0];
          if (unique[i] === tempProduct.sellerId.toString()) {
            let pri = 0;
            if (tempProduct.discount !== 0) {
              pri =
                tempProduct.price -
                Math.floor((tempProduct.price * tempProduct.discount) / 100);
            } else {
              pri = tempProduct.price;
            }

            // Apply valid category offer discount if higher
            const applicableDiscount = Math.max(
              tempProduct.discount || 0,
              stockProduct[j].validOfferPercentage || 0
            );
            pri =
              applicableDiscount > 0
                ? tempProduct.price -
                  Math.floor((tempProduct.price * applicableDiscount) / 100)
                : tempProduct.price;

            // Adjust for admin commission
            pri = pri - Math.floor((pri * commission) / 100);
            price = price + pri * stockProduct[j].quantity;

            p[i] = {
              sellerId: unique[i],
              shopName: tempProduct.shopName,
              price,
              products: p[i]
                ? [
                    ...p[i].products,
                    {
                      _id: stockProduct[j]._id,
                      quantity: stockProduct[j].quantity,
                      productInfo: tempProduct,
                      validOfferPercentage:
                        stockProduct[j].validOfferPercentage,
                    },
                  ]
                : [
                    {
                      _id: stockProduct[j]._id,
                      quantity: stockProduct[j].quantity,
                      productInfo: tempProduct,
                      validOfferPercentage:
                        stockProduct[j].validOfferPercentage,
                      validOfferId: stockProduct[j].validOfferId,
                    },
                  ],
            };
          }
        }
      }

      return responseReturn(res, 200, {
        cart_products: p,
        price: calculatePrice,
        cart_product_count,
        shipping_fee: 20 * p.length,
        outOfStockProduct,
        buy_product_item,
      });
    } catch (error) {
      console.error("Error in get_cart_products:", error);
      return responseReturn(res, 500, { message: "Internal Server Error" });
    }
  };

  delete_cart_products = async (req, res) => {
    console.log(req.params);
    const { cartId } = req.params;
    try {
      await cartModel.findByIdAndDelete(cartId);
      responseReturn(res, 200, { message: "Product Remove Successfully" });
    } catch (error) {
      console.log("error while deleting the products", error.message);
    }
  };
  quantity_increment = async (req, res) => {
    const { cartId } = req.params;
    try {
      await cartModel.findByIdAndUpdate(
        cartId,
        { $inc: { quantity: 1 } }, // Increment quantity by 1
        { new: true }
      );
      console.log("quantity");
      responseReturn(res, 200, { message: "Quantity Updated" });
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 500, { message: "An error occurred" });
    }
  };
  quantity_decrement = async (req, res) => {
    const { cartId } = req.params;
    try {
      await cartModel.findByIdAndUpdate(
        cartId,
        { $inc: { quantity: -1 } },
        { new: true }
      );
      console.log("quantity");
      responseReturn(res, 200, { message: "Quantity Updated" });
    } catch (error) {
      console.log(error.message);
      responseReturn(res, 500, { message: "An error occurred" });
    }
  };
}

module.exports = new cartController();
