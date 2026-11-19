const { auth } = require('../config/firebaseAdmin');
const env = require('../config/env');
const User = require('../models/User');

/**
 * A profile can already exist for this email or phone number under a
 * different Firebase UID when the Firebase account was recreated (e.g. the
 * Auth Emulator was reset, or the account was deleted and registered again).
 * Firebase allows one account per email and per phone number, so the old UID
 * no longer exists; move the profile (and with it the wardrobe, which is keyed
 * on the Mongo _id) to the new UID.
 * A phone number is always verified by its OTP. An email must be verified
 * outside the emulator, so nobody can claim a stale profile just by signing
 * up with someone else's address.
 */
async function relinkExistingProfile(decoded) {
  const byPhone = decoded.phone_number && await User.findOne({ phoneNumber: decoded.phone_number });
  const existing = byPhone || (decoded.email && await User.findOne({ email: decoded.email.toLowerCase() }));
  if (!existing) return null;

  if (!byPhone && !decoded.email_verified && !env.FIREBASE_AUTH_EMULATOR_HOST) {
    const err = new Error('A profile for this email already exists. Verify your email address to restore it.');
    err.statusCode = 409;
    throw err;
  }

  console.warn(`Relinking profile ${existing._id} (${existing.email || existing.phoneNumber}) to new Firebase UID.`);
  existing.firebaseUid = decoded.uid;
  await existing.save();
  return existing;
}

/**
 * Verifies the Firebase ID token sent in the Authorization header,
 * then resolves (or lazily creates) the corresponding MongoDB User
 * document. Downstream handlers must use req.user._id (Mongo ObjectId)
 * for all ownership checks — never trust any user id supplied by the client.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const idToken = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    // Lazily create the Mongo profile on first authenticated request. This is
    // an atomic upsert because the client fires several requests right after
    // sign-in; a find-then-create would race and fail the unique index.
    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user && (decoded.email || decoded.phone_number)) {
      user = await relinkExistingProfile(decoded);
    }
    if (!user) {
      try {
        user = await User.findOneAndUpdate(
          { firebaseUid: decoded.uid },
          {
            $setOnInsert: {
              firebaseUid: decoded.uid,
              name: decoded.name || decoded.email?.split('@')[0] || 'New User',
              ...(decoded.email && { email: decoded.email }),
              ...(decoded.phone_number && { phoneNumber: decoded.phone_number }),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (err) {
        // Two concurrent upserts can still collide; the other one won.
        if (err.code !== 11000) throw err;
        user = await User.findOne({ firebaseUid: decoded.uid })
          || await relinkExistingProfile(decoded);
        if (!user) throw err;
      }
    }

    req.user = user;
    req.firebaseUser = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
