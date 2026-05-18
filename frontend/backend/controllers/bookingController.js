const Booking = require("../models/Booking");
const Property = require("../models/Property");

exports.getBookings = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === "tenant") {
      filter.tenant = req.user.id;
    }

    if (req.user.role === "landlord") {
      const properties = await Property.find({ landlord: req.user.id }).select("_id");
      filter.property = { $in: properties.map((property) => property._id) };
    }

    const bookings = await Booking.find(filter)
      .populate("property", "title location rent type status images landlord")
      .populate("tenant", "name email")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    if (req.user.role !== "tenant") {
      return res.status(403).json({ message: "Only tenants can book houses" });
    }

    const property = await Property.findById(req.body.property);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.status !== "Available") {
      return res.status(400).json({ message: "This house is not available for booking" });
    }

    const existingBooking = await Booking.findOne({
      property: req.body.property,
      tenant: req.user.id,
      status: { $in: ["Pending", "Approved"] }
    });

    if (existingBooking) {
      return res.status(409).json({ message: "You already booked this house" });
    }

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
    const booking = await Booking.findById(req.params.id).populate("property");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      req.user.role !== "admin" &&
      String(booking.property.landlord) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "You can only update bookings for your own houses" });
    }

    booking.status = req.body.status;
    await booking.save();

    if (booking.status === "Approved") {
      booking.property.status = "Occupied";
      await booking.property.save();
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};
