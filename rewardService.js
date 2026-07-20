const prisma = require("../prismaClient");

/*
|--------------------------------------------------------------------------
| Get Available Rewards
|--------------------------------------------------------------------------
*/

exports.getRewards = async (user) => {

  if (!user || !user.id) {
    throw new Error("Authentication required.");
  }

  return await prisma.reward.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      pointsRequired: "asc"
    }
  });

};

/*
|--------------------------------------------------------------------------
| Get My Redemption History
|--------------------------------------------------------------------------
*/

exports.getMyRedemptions = async (user) => {

  if (!user || !user.id) {
    throw new Error("Authentication required.");
  }

  const redemptions = await prisma.rewardRedemption.findMany({

    where: {
      userId: user.id
    },

    include: {
      reward: true
    },

    orderBy: {
      createdAt: "desc"
    }

  });

  return redemptions.map(r => ({

    id: r.id,

    rewardName: r.reward.name,

    description: r.reward.description,

    pointsUsed: r.pointsUsed,

    status: r.status,

    remarks: r.remarks,

    createdAt: r.createdAt

  }));

};

/*
|--------------------------------------------------------------------------
| Redeem Reward
|--------------------------------------------------------------------------
*/

exports.redeemReward = async (user, rewardId, body = {}) => {

  if (!user || !user.id) {
    throw new Error("Authentication required.");
  }

  const reward = await prisma.reward.findUnique({

    where: {
      id: rewardId
    }

  });

  if (!reward) {
    throw new Error("Reward not found.");
  }

  if (!reward.isActive) {
    throw new Error("Reward is unavailable.");
  }

  if (reward.stock <= 0) {
    throw new Error("Reward is out of stock.");
  }

  /*
  ---------------------------------------------------------
  Calculate User Current Balance
  ---------------------------------------------------------
  */

  const ledger = await prisma.ledgerEntry.aggregate({

    where: {

      userId: user.id

    },

    _sum: {

      points: true

    }

  });

  const currentBalance = ledger._sum.points || 0;

  if (currentBalance < reward.pointsRequired) {

    throw new Error("Insufficient reward points.");

  }

  /*
  ---------------------------------------------------------
  Transaction
  ---------------------------------------------------------
  */

  const result = await prisma.$transaction(async (tx) => {

    /*
    Create Redemption
    */

    const redemption = await tx.rewardRedemption.create({

      data: {

        userId: user.id,

        rewardId: reward.id,

        pointsUsed: reward.pointsRequired,

        status: "REDEEMED",

        remarks:
          body.remarks ||
          `Redeemed ${reward.name}`

      }

    });

    /*
    Deduct Ledger
    */

    await tx.ledgerEntry.create({

      data: {

        userId: user.id,

        points: -reward.pointsRequired,

        type: "REDEEM",

        description:
          `Redeemed ${reward.name}`

      }

    });

    /*
    Reduce Stock
    */

    await tx.reward.update({

      where: {

        id: reward.id

      },

      data: {

        stock: {

          decrement: 1

        }

      }

    });

    /*
    Audit Log
    */

    await tx.auditLog.create({

      data: {

        action: "REWARD_REDEEMED",

        userId: user.id,

        details: {

          rewardId: reward.id,

          rewardName: reward.name,

          pointsUsed: reward.pointsRequired

        }

      }

    });

    return redemption;

  });

  return {

    message: "Reward redeemed successfully.",

    redemptionId: result.id,

    reward: reward.name,

    pointsUsed: reward.pointsRequired,

    remainingBalance:
      currentBalance - reward.pointsRequired

  };

};
