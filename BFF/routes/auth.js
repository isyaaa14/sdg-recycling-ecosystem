import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

const ACCOUNTS = [
  {
    email: '0137612@student.uow.edu.my',
    password: '0137612',
    role: 'end_user',
    name: 'Aaron Tan Wen Zhuan',
  },
  {
    email: 'moderator@sdg.com',
    password: 'moderatorSDG123',
    role: 'moderator',
    name: 'Moderator Admin',
  },
  {
    email: 'contentmanager@sdg.com',
    password: 'contentmanagerSDG123',
    role: 'content_manager',
    name: 'Content Manager Admin',
  },
  {
    email: 'rewardsmanager@sdg.com',
    password: 'rewardsmanagerSDG123',
    role: 'rewards_manager',
    name: 'Rewards Manager Admin',
  },
  {
    email: 'dataanalyst@sdg.com',
    password: 'dataanalystSDG123',
    role: 'data_analyst',
    name: 'Data Analyst Admin',
  },
  {
    email: 'systemadmin@sdg.com',
    password: 'systemadminSDG123',
    role: 'system_admin',
    name: 'System Admin',
  },
];

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const account = ACCOUNTS.find(
    (user) => user.email === email && user.password === password
  );

  if (!account) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { email: account.email, role: account.role, name: account.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.json({
    token,
    role: account.role,
    name: account.name,
    email: account.email,
  });
});

export default router;
