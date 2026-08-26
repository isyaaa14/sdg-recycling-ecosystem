import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { loginStudent4User, registerStudent4User } from '../services/student4Client.js';

const router = Router();

function student4ErrorMessage(error, fallback) {
  return (
    error.response?.data?.error?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

function issueBffStudentSession(user, student4Token) {
  const token = jwt.sign(
    {
      email: user.email,
      role: 'end_user',
      name: user.name,
      student4UserId: user.id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    student4Token,
    role: 'end_user',
    name: user.name,
    email: user.email,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email, and password are required.',
      });
    }

    const { token: student4Token, user } = await registerStudent4User({
      name,
      email,
      password,
    });

    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        error: 'Only student accounts can register on this portal.',
      });
    }

    return res.status(201).json(issueBffStudentSession(user, student4Token));
  } catch (error) {
    const status = error.response?.status || 503;
    console.error('[POST /auth/register] failed:', error.message);
    return res.status(status >= 400 && status < 500 ? status : 503).json({
      error: student4ErrorMessage(error, 'Unable to register. Please try again.'),
    });
  }
});

router.post('/student-login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.',
      });
    }

    const { token: student4Token, user } = await loginStudent4User({
      email,
      password,
    });

    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        error: 'Please use Admin Login for staff accounts.',
      });
    }

    return res.json(issueBffStudentSession(user, student4Token));
  } catch (error) {
    const status = error.response?.status || 503;
    console.error('[POST /auth/student-login] failed:', error.message);
    return res.status(status >= 400 && status < 500 ? status : 503).json({
      error: student4ErrorMessage(error, 'Invalid student email or password'),
    });
  }
});

export default router;
