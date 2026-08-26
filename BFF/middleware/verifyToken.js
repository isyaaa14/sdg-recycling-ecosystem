import jwt from 'jsonwebtoken';

export default function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorised' });
  }
}
