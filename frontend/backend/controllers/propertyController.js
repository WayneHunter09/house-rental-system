const Property = require("../models/Property");

const getUploadedImagePaths = (files = []) =>
  files.map((file) => `/uploads/properties/${file.filename}`);

const normalizeExistingImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);

  return [images].filter(Boolean);
};

exports.getProperties = async (req, res, next) => {
  try {
    const { location, type, maxRent } = req.query;
    const filter = {};

    if (location) filter.location = new RegExp(location, "i");
    if (type) filter.type = type;
    if (maxRent) filter.rent = { $lte: Number(maxRent) };

    const properties = await Property.find(filter).sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    next(error);
  }
};

exports.getMyProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ landlord: req.user.id }).sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    next(error);
  }
};

exports.getProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
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
    const uploadedImages = getUploadedImagePaths(req.files);
    const images = [
      ...normalizeExistingImages(req.body.images),
      ...normalizeExistingImages(req.body.imageUrls),
      ...uploadedImages
    ];

    const property = await Property.create({
      ...req.body,
      images,
      landlord: req.user?.id
    });
    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
};

exports.updateProperty = async (req, res, next) => {
  try {
    const update = { ...req.body };
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
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(property);
  } catch (error) {
    next(error);
  }
};

exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    next(error);
  }
};
