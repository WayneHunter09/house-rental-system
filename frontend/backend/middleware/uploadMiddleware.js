const multer = require("multer");

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image uploads are allowed"));
  }

  cb(null, true);
};

const uploadPropertyImages = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 1024 * 1024,
    files: 6
  }
});

module.exports = { uploadPropertyImages };
