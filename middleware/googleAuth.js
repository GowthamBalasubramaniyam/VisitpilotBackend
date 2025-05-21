const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Setup Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Try to find user by Google ID
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      return done(null, user); // Already exists
    }

    // Try by email
    const email = profile.emails[0].value;
    const existingEmailUser = await User.findOne({ email });

    if (existingEmailUser) {
      return done(null, existingEmailUser); // Allow existing users by email
    }

    // 🛑 Do NOT save user yet — redirect to complete-profile
    const tempUser = {
      googleId: profile.id,
      name: profile.displayName,
      email,
      avatar: profile.photos[0].value,
      role: 'User'
    };

    // Pass this to the callback and handle in callback route
    return done(null, false, { message: 'complete-profile', tempUser });

  } catch (err) {
    return done(err, null);
  }
}));

// For session handling
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
