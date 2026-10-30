import { z } from 'zod';


export const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 3 character"),
    email: z.string().email("Email is invalid"),
    password: z.string().min(8, "Password must be at least 8 character")
});

export const loginSchema = z.object({
    email: z.string().email("Invalid Email"),
    password: z.string().min(8, "Password must be at least 8 character")
})