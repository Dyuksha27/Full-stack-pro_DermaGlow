// backend/src/middlewares/uploadMiddleware.js
import multer from "multer";
import path from "path";

// Configure how and where files should be saved on the server disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/products/"); // Make sure this folder path exists!
  },
  filename: (req, file, cb) => {
    // Generate a unique file name timestamp to avoid collisions
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

// Sanitize incoming uploads to only allow common image formats
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed!"));
};

export const uploadProductImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limit files to a maximum of 5MB
});