const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.userId,
      role: decoded.role
    };
   console.log("Decoded JWT:", decoded);
console.log("Req user:", req.user);
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

