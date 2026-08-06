const auditService = require("../services/auditService");

exports.getAuditLogs = async (req, res) => {
  try {
    const result = await auditService.getAuditLogs(
      req.user,
      req.query
    );

    res.json(result);

  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};
