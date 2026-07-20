const ledgerService = require("../services/ledgerService");

exports.getMyLedger = async (req, res) => {
  try {
    const result = await ledgerService.getMyLedger(req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};
