const addressModel = require("../../model/addressModel");
const { responseReturn } = require("../../utils/response");
class addressController {
  add_address = async (req, res) => {
    console.log("Adding address");
    console.log("Request Body:", req.body);
    console.log("Request Params:", req.params);

    const { userId } = req.params;
    const { name, address, phone, post, district, city, area } = req.body;

    // Trim all inputs
    const trimmedData = {
      userId,
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      post: post.trim(),
      district: district.trim(),
      city: city.trim(),
      area: area.trim(),
    };

    // Check if all required fields are present after trimming
    if (
      !trimmedData.userId ||
      !trimmedData.name ||
      !trimmedData.address ||
      !trimmedData.phone ||
      !trimmedData.post ||
      !trimmedData.district ||
      !trimmedData.city ||
      !trimmedData.area
    ) {
      return responseReturn(res, 400, {
        error: "All fields are required and should not be empty.",
      });
    }

    try {
      // Create a new address
      const newAddress = await addressModel.create(trimmedData);

      // Respond with the created address
      return responseReturn(res, 201, {
        message: "Address successfully added.",
        address: newAddress,
      });
    } catch (error) {
      console.error("Error while adding address:", error.message);
      return responseReturn(res, 500, { error: "Internal Server Error." });
    }
  };
  update_address = async (req, res) => {
    console.log("Adding address");
    console.log("Request Body:", req.body);
    console.log("Request Params:", req.params);

    const { addressId } = req.params;
    const { name, address, phone, post, district, city, area } = req.body;

    // Trim all inputs
    const trimmedData = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      post: post.trim(),
      district: district.trim(),
      city: city.trim(),
      area: area.trim(),
    };

    // Check if all required fields are present after trimming
    if (
      !trimmedData.name ||
      !trimmedData.address ||
      !trimmedData.phone ||
      !trimmedData.post ||
      !trimmedData.district ||
      !trimmedData.city ||
      !trimmedData.area
    ) {
      return responseReturn(res, 400, {
        error: "All fields are required and should not be empty.",
      });
    }

    try {
      // Create a new address
      const newAddress = await addressModel.findByIdAndUpdate(addressId, {
        name: trimmedData.name,
        address: trimmedData.address,
        phone: trimmedData.phone,
        post: trimmedData.post,
        district: trimmedData.district,
        area: trimmedData.area,
        city: trimmedData.city,
      });

      // Respond with the created address
      return responseReturn(res, 201, {
        message: "Address successfully Updated.",
        address: newAddress,
      });
    } catch (error) {
      console.error("Error while adding address:", error.message);
      return responseReturn(res, 500, { error: "Internal Server Error." });
    }
  };
  delete_address = async (req, res) => {
    const { addressId } = req.params;

    try {
      const address = await addressModel.deleteOne({ _id: addressId });

      if (address.deletedCount === 0) {
        return responseReturn(res, 404, { error: "Address not found" });
      }
      return responseReturn(res, 200, {
        message: "Address deleted successfully",
      });
    } catch (error) {
      console.error(error);
      return responseReturn(res, 500, {
        error: "Failed to delete the address",
      });
    }
  };
}

module.exports = new addressController();
