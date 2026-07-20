const transactionService = require("../services/transactionService");

exports.getMyTransactions = async (req, res) => {
  try {
    const result = await transactionService.getMyTransactions(req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};
exports.getAdminTransactions = async (req, res) => {
  try {
    const result = await transactionService.getAdminTransactions(req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.approveTransaction = async (req, res) => {
  try {
    const result = await transactionService.approveTransaction(
      req.user,
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  try {
    const result = await transactionService.rejectTransaction(
      req.user,
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
