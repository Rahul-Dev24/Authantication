import { createTransport } from 'nodemailer';

export const sentMail = async ({ email, subject, html }) => {
    const transport = createTransport({
        host: "smtp.gmail.com",
        port: 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        },
    });

    await transport.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: subject,
        html: html
    })
}