// ─────────────────────────────────────────────────────────
//  middleware/auth.js  —  JWT Authentication Middleware
//
//  What is middleware?
//    A function that runs between the request arriving and
//    your route handler running. It can read, modify, or
//    reject a request.
//
//  What does this one do?
//    It reads the JWT token from the request header,
//    verifies it is valid and not expired, and then attaches
//    the decoded user info to req.user so route handlers
//    can access it.
//
//  Usage in a route file:
//    import authenticate from '../middleware/auth.js';
//    router.get('/profile', authenticate, (req, res) => { ... });
//                           ^^^^^^^^^^^
//                           runs BEFORE the handler
// ─────────────────────────────────────────────────────────

import jwt from 'jsonwebtoken';

const authenticate = (req, res, next) => {
  // Tokens are sent in the Authorization header like this:
  //   Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  // Split "Bearer <token>" and take the token part
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify checks:
    //   1. The signature is valid (made with our JWT_SECRET)
    //   2. The token has not expired
    // If both pass, it returns the decoded payload we signed
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded payload to req so the next handler can use it
    // Example: req.user.id, req.user.username
    req.user = decoded;

    // Call next() to pass control to the actual route handler
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};

export default authenticate;
