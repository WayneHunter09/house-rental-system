const express = require("express");
const {
  createProperty,
  deleteProperty,
  getProperties,
  getProperty,
  updateProperty
} = require("../controllers/propertyController");
const { protect } = require("../middleware/authMiddleware");
const { uploadPropertyImages } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", getProperties);
router.get("/:id", getProperty);
router.post("/", protect, uploadPropertyImages.array("images", 8), createProperty);
router.put("/:id", protect, uploadPropertyImages.array("images", 8), updateProperty);
router.delete("/:id", protect, deleteProperty);

module.exports = router;
