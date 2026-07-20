require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const qrRoutes = require('./routes/qr');
const ledgerRoutes = require('./routes/ledger');
const app = express();
const cookieParser = require("cookie-parser");
const transactionRoutes = require("./routes/transactions");
const rewardRoutes = require("./routes/rewards");
// middleware
app.use(helmet());
app.use(cors({
    origin: "https://127.0.0.1",
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());
// routes
app.use('/auth', authRoutes);
app.use('/qr', qrRoutes);
app.use('/transactions', transactionRoutes);
app.use('/ledger', ledgerRoutes);
app.use("/rewards", rewardRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Recycle Backend API running' });
});
// start server
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
