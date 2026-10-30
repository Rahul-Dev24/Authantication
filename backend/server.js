import { connectDB } from "./configs/db.js";
import express from "express";
import dotenv from "dotenv";
import router from "./routes/user.route.js";
import { createClient } from 'redis';
import cookieParser from "cookie-parser";
import cors from 'cors';

dotenv.config();
await connectDB();

const PORT = process.env.PORT || 5000;
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.log("Redis Url Missing");
    process.exit(1);
}

export const redisClient = createClient({
    url: redisUrl
});

redisClient.connect().then(() => {
    console.log("connected to Redis")
}).catch(console.error);

const app = express();

app.use(cookieParser());

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}))

app.use(express.json({ limit: '50mb' }));

/**
 * /api/vi
 */
app.use('/api/v1', router);

app.listen(PORT, () => {
    console.log("Server is running on ", PORT);
})