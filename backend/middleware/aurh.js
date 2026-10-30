import jwt from "jsonwebtoken";
import { redisClient } from "../server.js";
import { User } from "../model/User.model.js"
import { isSessionActive } from "../utils/generateToken.js";

export const AuthMiddleWare = async (req, res, next) => {
    try {
        const token = req?.cookies?.accessToken;

        if (!token) {
            return res.status(403).json({
                message: "Please Login - No token"
            });
        }

        const decodedData = jwt.verify(token, process.env.JWT_SECRET);

        if (!decodedData) return res.status(400).json({ message: "Token Expired" });

        const sessionActive = await isSessionActive(decodedData?.id, decodedData?.sessionId);

        if (!sessionActive) {
            res.clearCookie("refreshToken");
            res.clearCookie("accessToken");
            res.clearCookie("csrfToken");

            return res.status(401).json({
                message: "Session Expired. You have been logged in from another device"
            });
        }

        const cacheUser = await redisClient.get(`user:${decodedData?.id}`);

        if (cacheUser) {
            req.user = JSON.parse(cacheUser);
            req.sessionId = decodedData?.sessionId;
            return next();
        }

        const user = await User.findById(decodedData?.id).select("-password");

        if (!user) return res.status(400).json({ message: "No user with this ID" })

        await redisClient.setEx(`user:${user?._id}`, 3600, JSON.stringify(user));

        req.user = user;
        req.sessionId = decodedData?.sessionId;
        next();
    } catch (e) {
        res.status(500).json({ message: e?.message });
    }
}