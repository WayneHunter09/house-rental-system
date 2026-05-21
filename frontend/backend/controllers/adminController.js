const Favorite = require("../models/Favorite");
const Property = require("../models/Property");
const User = require("../models/User");

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const update = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      location: req.body.location,
      role: ["tenant", "landlord", "admin"].includes(req.body.role) ? req.body.role : undefined
    };
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (String(req.user.id) === String(req.params.id)) {
      return res.status(400).json({ message: "You cannot remove your own admin account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Favorite.deleteMany({ tenant: req.params.id });
    res.json({ message: "User removed" });
  } catch (error) {
    next(error);
  }
};

exports.getListings = async (req, res, next) => {
  try {
    const listings = await Property.find()
      .populate("landlord", "name email phone location")
      .sort({ createdAt: -1 });
    res.json(listings);
  } catch (error) {
    next(error);
  }
};

exports.updateListingStatus = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: req.body.approvalStatus || "Approved" },
      { new: true, runValidators: true }
    ).populate("landlord", "name email phone location");

    if (!property) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json(property);
  } catch (error) {
    next(error);
  }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "Removed" },
      { new: true }
    );
    if (!property) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json({ message: "Listing removed" });
  } catch (error) {
    next(error);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const [
      users,
      tenants,
      landlords,
      admins,
      listings,
      availableListings,
      occupiedListings,
      removedListings,
      favorites
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "tenant" }),
      User.countDocuments({ role: "landlord" }),
      User.countDocuments({ role: "admin" }),
      Property.countDocuments(),
      Property.countDocuments({ status: "Available", approvalStatus: { $ne: "Removed" } }),
      Property.countDocuments({ status: "Occupied", approvalStatus: { $ne: "Removed" } }),
      Property.countDocuments({ approvalStatus: "Removed" }),
      Favorite.countDocuments()
    ]);

    res.json({
      users,
      tenants,
      landlords,
      admins,
      listings,
      availableListings,
      occupiedListings,
      removedListings,
      favorites
    });
  } catch (error) {
    next(error);
  }
};
