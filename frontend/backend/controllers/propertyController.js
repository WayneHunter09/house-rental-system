const Property = require("../models/Property");

const getUploadedImagePaths = (files = []) =>
  files.map((file) => `/uploads/properties/${file.filename}`);

const normalizeExistingImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);

  return [images].filter(Boolean);
};

const publicPopulate = {
  path: "landlord",
  select: "name email phone location"
};

exports.getProperties = async (req, res, next) => {
  try {
    const { location, type, minRent, maxRent, featured } = req.query;
    const filter = { approvalStatus: { $ne: "Removed" } };

    if (location) filter.location = new RegExp(location, "i");
    if (type) filter.type = type;
    if (minRent || maxRent) {
      filter.rent = {};
      if (minRent) filter.rent.$gte = Number(minRent);
      if (maxRent) filter.rent.$lte = Number(maxRent);
    }

    const query = Property.find(filter).populate(publicPopulate).sort({ createdAt: -1 });
    if (featured) query.limit(6);

    const properties = await query;
    res.json(properties);
  } catch (error) {
    next(error);
  }
};

exports.getMyProperties = async (req, res, next) => {
  try {
    if (req.user?.role !== "landlord" && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only landlords can manage house listings" });
    }

    const filter = req.user.role === "admin" ? {} : { landlord: req.user.id };
    const properties = await Property.find(filter)
      .populate(publicPopulate)
      .sort({ createdAt: -1 });

    res.json(properties);
  } catch (error) {
    next(error);
  }
};

exports.getProperty = async (req, res, next) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      approvalStatus: { $ne: "Removed" }
    }).populate(publicPopulate);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(property);
  } catch (error) {
    next(error);
  }
};

exports.createProperty = async (req, res, next) => {
  try {
    if (req.user?.role !== "landlord" && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only landlords can add houses" });
    }

    const uploadedImages = getUploadedImagePaths(req.files);
    const images = [
      ...normalizeExistingImages(req.body.images),
      ...normalizeExistingImages(req.body.imageUrls),
      ...uploadedImages
    ];

    const property = await Property.create({
      title: req.body.title,
      location: req.body.location,
      type: req.body.type,
      rent: req.body.rent,
      description: req.body.description,
      status: req.body.status || "Available",
      approvalStatus: req.body.approvalStatus || "Approved",
      images,
      landlord: req.user.id
    });

    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
};

exports.updateProperty = async (req, res, next) => {
  try {
    if (req.user?.role !== "landlord" && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only landlords can update houses" });
    }

    const existingProperty = await Property.findById(req.params.id);
    if (!existingProperty) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (
      req.user.role !== "admin" &&
      String(existingProperty.landlord) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "You can only update your own houses" });
    }

    const update = {
      title: req.body.title,
      location: req.body.location,
      type: req.body.type,
      rent: req.body.rent,
      description: req.body.description,
      status: req.body.status,
      approvalStatus: req.body.approvalStatus
    };

    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

    const uploadedImages = getUploadedImagePaths(req.files);
    const providedImages = [
      ...normalizeExistingImages(req.body.images),
      ...normalizeExistingImages(req.body.imageUrls)
    ];

    if (uploadedImages.length || providedImages.length) {
      update.images = [...providedImages, ...uploadedImages];
    }

    const property = await Property.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    }).populate(publicPopulate);

    res.json(property);
  } catch (error) {
    next(error);
  }
};

exports.deleteProperty = async (req, res, next) => {
  try {
    if (req.user?.role !== "landlord" && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only landlords can delete houses" });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (
      req.user.role !== "admin" &&
      String(property.landlord) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "You can only delete your own houses" });
    }

    await property.deleteOne();
    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    next(error);
  }
};
