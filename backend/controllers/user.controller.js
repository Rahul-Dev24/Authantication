import TryCatch from "../middleware/trycatch.js";
import sanitize from "mongo-sanitize";
import { loginSchema, registerSchema } from "../configs/zod.js";
import { redisClient } from "../server.js";
import { User } from "../model/User.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sentMail } from "../configs/sendMail.js"
import { getOtpHtml, getVerifyEmailHtml } from "../utils/template.js";
import { generateToken, verifyRefreshToken, genrateAccessToken, revokeRefreshToken } from "../utils/generateToken.js";
import { genrateCSRFToken } from "../middleware/csrf.middleware.js";

export const registerUser = TryCatch(async (req, res) => {
    const sanitizedData = sanitize(req.body);
    const validation = registerSchema.safeParse(sanitizedData);

    if (!validation.success) {

        const zodError = validation.error;

        let errorMsg = "Validation Failed";
        let allErrors = [];

        if (zodError.issues && Array.isArray(zodError.issues)) {
            allErrors = zodError?.issues?.map((el) => ({
                field: el?.path ? el?.path?.join(".") : "unknown",
                message: el?.message || "Validation Error",
                code: el?.code
            }));
            errorMsg = allErrors[0]?.message || "Validation Error";
        }

        return res.status(400).json({
            message: errorMsg,
            error: allErrors
        })
    }

    const { name, email, password } = validation.data;

    const rateLimitKey = `register-rate-limit:${req?.ip}:${email}`;

    if (await redisClient.get(rateLimitKey)) {
        return res.status(429).json({
            message: "Too many requests. Try again later"
        })
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.status(400).json({
            message: "User alerdy exist"
        });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const verifyToken = crypto.randomBytes(32).toString("hex");

    const verifyKey = `verify:${verifyToken}`; //redis

    const dataToStore = JSON.stringify({ name, email, password: hashPassword });

    await redisClient.set(verifyKey, dataToStore, { EX: 300 });

    const subject = "Verify you email for account creation";

    const html = getVerifyEmailHtml({ email, token: verifyToken });

    await sentMail({ email, subject, html });

    await redisClient.set(rateLimitKey, "true", { EX: 60 });

    res.json({
        message: "Verification link has been sent to user email"
    })

});

export const verifyUser = TryCatch(async (req, res) => {
    const { token } = req.params;
    if (!token) {
        return res.status(400).json({ message: "verification token is required" });
    }

    const verifyKey = `verify:${token}`;

    const userDataJSON = await redisClient.get(verifyKey);

    if (!userDataJSON) {
        return res.status(400).json({ message: "verification link is expired" });
    }

    await redisClient.del(verifyKey);

    const userData = JSON.parse(userDataJSON);

    const newUser = await User.create({
        name: userData?.name,
        email: userData?.email,
        password: userData?.password
    });

    res.status(201).json({
        message: "Your email is verified successfully",
        user: {
            id: newUser?._id,
            name: newUser.name,
            email: newUser?.email
        }
    })

});


/**
 * Login Business Logic
 */

export const loginUser = TryCatch(async (req, res) => {

    const sanitizeData = sanitize(req?.body);

    const validation = loginSchema.safeParse(sanitizeData);

    if (!validation?.success) {
        const zodError = validation.error;

        let errorMsg = "Validation Failed";
        let allErrors = [];

        if (zodError?.issues && Array.isArray(zodError?.issues)) {
            allErrors = zodError.issues.map((el) => ({
                field: el?.path ? el?.path.join(".") : 'Unknown',
                message: el?.message || "Provided Input is Invalid",
                code: el?.code
            }));

            errorMsg = allErrors[0]?.message || "Validation Error";
        }
        return res.status(400).json({
            message: errorMsg,
            error: allErrors
        });
    }

    const { email, password } = validation?.data;

    const rateLimitKey = `login-rate-limit:${req?.ip}:${email}`;

    if (await redisClient.get(rateLimitKey)) {
        return res.status(429).json({
            message: "Too many requests. Try again later"
        })
    }

    const user = await User.findOne({ email: email });

    if (!user) {
        return res.status(200).json({
            message: 'Invalid Credantials'
        });
    }

    const comparePassword = await bcrypt.compare(password, user?.password);

    if (!comparePassword) return res.status(400).json({ message: 'Invalid Credantials' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpKey = `otp:${email}`;

    await redisClient.set(otpKey, JSON.stringify(otp), { EX: 300 });

    const subject = "Otp for Verification";
    const html = getOtpHtml({ email, otp });

    await sentMail({ email, subject, html });

    await redisClient.set(rateLimitKey, "true", { EX: 60 });

    res.status(200).json({
        message: "OTP is Sended to you register email"
    })
});




export const verifyOtp = TryCatch(async (req, res) => {

    const { email, otp } = req?.body;

    if (!email || !otp) {
        return res.status(400).json({
            message: "Please provide all details"
        });
    }

    const otpKey = `otp:${email}`;

    const storedOtpString = await redisClient.get(otpKey);

    if (!storedOtpString) {
        return res.status(400).json({ message: "Otp Expired" });
    }

    const storedOtp = JSON.parse(storedOtpString);

    if (storedOtp !== otp) {
        return res.status(400).json({ message: "Invalid Otp" });
    }

    await redisClient.del(otpKey);

    let user = await User.findOne({ email }).select("-password");

    const tokenData = await generateToken(user?._id, res);

    res.status(200).json({
        message: `Welcome ${user?.name}`,
        user,
        sessionInfo: {
            sessionId: tokenData?.sessionId,
            loginTime: new Date().toISOString(),
            csrfToken: tokenData.csrfToken
        }
    })
});


export const getUser = TryCatch(async (req, res) => {
    const { user, sessionId } = req;

    const sessionData = await redisClient.get(`session:${sessionId}`);

    const sessionInfo = null;

    if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        sessionInfo = {
            sessionId,
            loginTime: new Date().toISOString(),
            lastActivity: parsedSession?.lastActivity
        }
    }

    res.status(200).json({
        user,
        sessionInfo
    })
})



export const refreshToken = TryCatch(async (req, res) => {
    const refreshToken = req?.cookies?.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            message: "Invalid refresh token"
        })
    }

    const decode = await verifyRefreshToken(refreshToken);

    if (!decode) {
        res.clearCookie("refreshToken");
        res.clearCookie("accessToken");
        res.clearCookie("csrfToken");
        return res.status(401).json({
            message: "Session Expired. Login Again"
        })
    }

    genrateAccessToken(decode?.id, decode?.sessionId, res);

    res.status(200).json({
        message: "token refreshed"
    })
});

export const logoutUser = TryCatch(async (req, res) => {
    const userId = req.user?._id;
    await revokeRefreshToken(userId);

    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.clearCookie("csrfToken");

    await redisClient.del(`user:${userId}`);

    res.json({
        message: "Logout Successfully"
    })
});

export const refershCSRF = TryCatch(async (req, res) => {
    const userId = req?.user?._id;

    const newCSRFToken = await genrateCSRFToken(userId, res);

    res.json({
        message: "CSRF token Refershed Successgully",
        csrfToken: newCSRFToken
    })
})