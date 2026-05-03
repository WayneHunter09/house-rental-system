const Booking = require("../models/Booking");

exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate("property", "title location rent")
      .populate("tenant", "name email")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const booking = await Booking.create({
      property: req.body.property,
      tenant: req.user.id,
      message: req.body.message
    });
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};
