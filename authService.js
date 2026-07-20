const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

exports.register = async (data) => {
  const { name, email, password } = data;

  // check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash
    }
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
};


exports.login = async (data) => {
  const { email, password } = data;

  // 1. Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // 2. Check password
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // 3. Create JWT token
  const accessToken = jwt.sign(
    {
      userId: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
const refreshToken = jwt.sign(
  {
    userId: user.id,
    role: user.role
  },
  process.env.JWT_REFRESH_SECRET,
  {
    expiresIn: "7d"
  }
);
  return {
  message: "Login successful",
  accessToken,
  refreshToken,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
};
};
