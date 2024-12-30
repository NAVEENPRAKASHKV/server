const customerModel = require("../../model/customerModel");
const { responseReturn } = require("../../utils/response");
class customerController {
  get_customer = async (req, res) => {
    console.log("customer controller");
    console.log("query strig", req.query);
    const { page, searchValue, perPage } = req.query;
    const skipPage = parseInt(perPage) * (parseInt(page) - 1);
    try {
      // Dynamic search query
      const searchQuery = searchValue
        ? { $text: { $search: searchValue } }
        : {};
      const totalCustomers = await customerModel.countDocuments(searchQuery);
      const customers = await customerModel
        .find(searchQuery)
        .skip(skipPage)
        .sort({ createdAt: -1 })
        .limit(parseInt(perPage));

      return responseReturn(res, 200, { totalCustomers, customers });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return responseReturn(res, 500, { error: "Internal Server Error" });
    }
  };
  block_unblock_customer = async (req, res) => {
    console.log("In the block function");
    console.log(req.params);
    const { customerId } = req.params;

    if (!customerId) {
      return responseReturn(res, 404, { error: "Customer ID is required" });
    }

    try {
      const customer = await customerModel.findById(customerId);

      if (!customer) {
        return responseReturn(res, 404, { error: "Customer not found" });
      }

      // Toggle the isBlocked status
      const updatedCustomer = await customerModel.findByIdAndUpdate(
        customerId,
        {
          isBlocked: !customer.isBlocked,
          blockedAt: customer.isBlocked ? null : new Date(),
        },
        { new: true }
      );

      const message = updatedCustomer.isBlocked
        ? "Customer blocked successfully"
        : "Customer unblocked successfully";

      return responseReturn(res, 200, { updatedCustomer, message });
    } catch (error) {
      console.error("Error while blocking/unblocking the customer:", error);
      return responseReturn(res, 500, { error: "Internal server error" });
    }
  };
}

module.exports = new customerController();
