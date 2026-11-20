/**
 * Registration and login happen entirely on the client via Firebase
 * Authentication (email/password, and Google sign-in where configured).
 * The backend never handles passwords. This endpoint only syncs
 * the MongoDB profile that mirrors the Firebase-authenticated user.
 */

// POST /api/auth/sync — called right after Firebase signup to ensure the
// Mongo profile has the correct display name (authMiddleware already
// lazily creates a baseline User document for any authenticated request).
const sync = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (name && name.trim() && name.trim() !== req.user.name) {
      req.user.name = name.trim();
      await req.user.save();
    }

    res.json({
      success: true,
      message: 'Account synced.',
      data: { user: req.user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sync };
