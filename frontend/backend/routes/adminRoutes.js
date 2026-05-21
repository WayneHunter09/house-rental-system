const express = require("express");
const {
  deleteListing,
  deleteUser,
  getListings,
  getReports,
  getUsers,
  updateListingStatus,
  updateUser
} = require("../controllers/adminController");
const { authorize, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/reports", getReports);
router.get("/users", getUsers);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/listings", getListings);
router.patch("/listings/:id/status", updateListingStatus);
router.delete("/listings/:id", deleteListing);

module.exports = router;
