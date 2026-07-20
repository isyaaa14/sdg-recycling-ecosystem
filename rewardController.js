const rewardService = require("../services/rewardService");

/*
|--------------------------------------------------------------------------
| Get Available Rewards
|--------------------------------------------------------------------------
*/

exports.getRewards = async (req, res) => {
  try {
    const result = await rewardService.getRewards(req.user);

    res.json(result);
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get My Redemption History
|--------------------------------------------------------------------------
*/

exports.getMyRedemptions = async (req, res) => {
  try {
    const result = await rewardService.getMyRedemptions(req.user);

    res.json(result);
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Redeem Reward
|--------------------------------------------------------------------------
*/

exports.redeemReward = async (req, res) => {
  try {
    const result = await rewardService.redeemReward(
      req.user,
      req.params.id,
      req.body
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};
