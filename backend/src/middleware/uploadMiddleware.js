const multer = require('multer');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error('Only JPEG, PNG, and WebP images are allowed.');
    err.statusCode = 400;
    return cb(err);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Multipart forms can only carry strings, so structured fields (arrays such as
// colors or season) are sent as one JSON string in `data` next to the file.
const parseJsonField = (req, res, next) => {
  if (typeof req.body.data !== 'string') return next();
  try {
    const parsed = JSON.parse(req.body.data);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    req.body = parsed;
    next();
  } catch {
    res.status(400).json({ success: false, message: 'Invalid form data.' });
  }
};

module.exports = { upload, parseJsonField, ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
