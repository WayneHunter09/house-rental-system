const Favorite = require("../models/Favorite");
const Property = require("../models/Property");

exports.getFavorites = async (req, res, next) => {
  try {
    if (req.user.role !== "tenant") {
      return res.status(403).json({ message: "Only tenants can save favorites" });
    }

    const favorites = await Favorite.find({ tenant: req.user.id })
      .populate({
        path: "property",
        populate: { path: "landlord", select: "name email phone location" }
      })
      .sort({ createdAt: -1 });

    res.json(favorites.filter((favorite) => favorite.property));
  } catch (error) {
    next(error);
  }
};

exports.addFavorite = async (req, res, next) => {
  try {
    if (req.user.role !== "tenant") {
      return res.status(403).json({ message: "Only tenants can save favorites" });
    }

    const property = await Property.findById(req.params.propertyId);
    if (!property || property.approvalStatus === "Removed") {
      return res.status(404).json({ message: "Property not found" });
    }

    const favorite = await Favorite.findOneAndUpdate(
      { tenant: req.user.id, property: req.params.propertyId },
      { tenant: req.user.id, property: req.params.propertyId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("property");

    res.status(201).json(favorite);
  } catch (error) {
    next(error);
  }
};

exports.removeFavorite = async (req, res, next) => {
  try {
    if (req.user.role !== "tenant") {
      return res.status(403).json({ message: "Only tenants can remove favorites" });
    }

    await Favorite.findOneAndDelete({
      tenant: req.user.id,
      property: req.params.propertyId
    });

    res.json({ message: "Favorite removed" });
  } catch (error) {
    next(error);
  }
};
