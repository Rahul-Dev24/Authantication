import crypto from 'crypto';
import { redisClient } from '../server.js';


export const verifyCSRFToken = async (req, res, next) => {
    try {
        if (req?.method === 'GET') return next();

        const userId = req?.user?._id;

        if (!userId) return res.status(401).json({ message: "user not authanticated" });

        const clientToken = req?.header["x-csrf-token"] || req?.header['"x-xsrf-token'] || req?.header["csrf-token"];

        if (!clientToken) {
            return res.status(403).json({
                message: "CSRF Token missing",
                code: "CSRF_TOKEN_MISSING"
            });
        }
        const csrfKey = `csrf:${userId}`;
        const storedToken = await redisClient.get(csrfKey);

        if (!storedToken) {
            return res.status(403).json({
                message: "CSRF Token Expired",
                code: "CSRF_TOKEN_EXPIRED"
            });
        }

        if (storedToken !== clientToken) {
            return res.status(403).json({
                message: "Invalid CSRF Token",
                code: "CSRF_TOKEN_INVALID"
            });
        }

        next();

    } catch (err) {
        console.log("CSRF verification Error", err);
        return res.status(500).json({
            message: "CSRF verification failed",
            code: "CSRF_VERIFICATION_ERROR"
        });
    }
}

export const revokeCSRFToken = async (userId) => {
    const csrfKey = `csrf:${userId}`;

    await redisClient.del(csrfKey);
}

export const refershCSRFToken = async (userId, res) => {
    await refershCSRFToken(userId);

    return genrateCSRFToken(userId, res);

}

export const genrateCSRFToken = async (userId, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const csrfKey = `csrf:${userId}`;

    await redisClient.setEx(csrfKey, '3600', csrfToken);

    res.cookie('csrfToken', csrfToken, {
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        maxAge: 60 * 60 * 1000
    });

    return csrfToken
}