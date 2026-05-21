const express = require("express");
const {
  addFavorite,
  getFavorites,
  removeFavorite
} = require("../controllers/favoriteController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getFavorites);
router.post("/:propertyId", protect, addFavorite);
router.delete("/:propertyId", protect, removeFavorite);

module.exports = router;
