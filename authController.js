const authService = require('../services/authService');
const prisma = require("../prismaClient");

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 60 * 60 * 1000
    });

    res.cookie("refreshToken", result.refreshToken,{
        httpOnly:true,
        secure:true,
        sameSite:"Strict",
        maxAge:7*24*60*60*1000
    });

    res.json({
      message: result.message,
      user: result.user
    });

  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

exports.me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.user.id
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });

  res.json(user);
};

exports.logout = async (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};

exports.refresh = async (req,res)=>{

    const token = req.cookies.refreshToken;

    if(!token){
        return res.status(401).json({
            message:"Refresh token missing"
        });
    }

    try{

        const decoded = jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET
        );

        const accessToken = jwt.sign(
            {
                userId:decoded.userId
            },
            process.env.JWT_SECRET,
            {
                expiresIn:"1h"
            }
        );

        res.cookie("accessToken",accessToken,{
            httpOnly:true,
            secure:true,
            sameSite:"Strict",
            maxAge:60*60*1000
        });

        res.json({
            message:"Access token refreshed"
        });

    }catch(err){

        res.status(401).json({
            message:"Invalid refresh token"
        });

    }

};
