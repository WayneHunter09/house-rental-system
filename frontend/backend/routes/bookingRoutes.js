const express = require("express");
const {
  createBooking,
  getBookings,
  updateBookingStatus
} = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getBookings);
router.post("/", protect, createBooking);
router.patch("/:id/status", protect, updateBookingStatus);

module.exports = router;
