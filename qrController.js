const qrService = require("../services/qrService");

exports.issueQR = async (req, res) => {
  try {
    const result = await qrService.issueQR(req.user, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getQRStatus = async (req, res) => {
  try {
    const result = await qrService.getQRStatus(req.params.qrId);
    res.json(result);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.claimQR = async (req, res) => {
  try {
    const result = await qrService.claimQR(req.user, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.invalidateQR = async (req, res) => {
  try {
    const result = await qrService.invalidateQR(req.user, req.params.qrId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
