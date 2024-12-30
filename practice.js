get_wishlist_product = async (req, res) => {
  console.log("In the wishlist controller");

  const { userId } = req.params;

  try {
    // Fetch all wishlist items for the user and populate product details
    const wishlist = await wishlistModel.find({ userId }).populate("productId");

    // Count the total number of wishlist items
    const wishlist_count = await wishlistModel.countDocuments({ userId });

    // Return the response
    return responseReturn(res, 200, {
      wishlist_count: wishlist_count || 0,
      wishlist,
    });
  } catch (error) {
    console.error("Error in get_wishlist_product:", error.message);

    // Handle and return the error
    return responseReturn(res, 500, {
      error: "Internal server error",
    });
  }
};
