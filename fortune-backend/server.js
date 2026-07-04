const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const app = express();
app.set("trust proxy", 1);

/* =========================
   CORS
========================= */

app.use(cors({
    origin: "https://fortunedigi.com"
}));

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json());

/* =========================
   RATE LIMITER
========================= */

const contactLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 5,

    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

app.use("/api/contact", contactLimiter);

/* =========================
   TEST ROUTE
========================= */

app.get("/", (req, res) => {
    res.send("Backend Running");
});

/* =========================
   NODEMAILER
========================= */

const transporter = nodemailer.createTransport({

    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/* =========================
   CONTACT API
========================= */

app.post("/api/contact", async (req, res) => {

    try {

        const {
            firstName,
            lastName,
            email,
            phone,
            message
        } = req.body;

        /* =========================
           EMPTY FIELD VALIDATION
        ========================= */

        if (
            !firstName ||
            !lastName ||
            !email ||
            !phone ||
            !message
        ) {

            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        /* =========================
           EMAIL VALIDATION
        ========================= */

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {

            return res.status(400).json({
                success: false,
                message: "Invalid email address"
            });
        }

        /* =========================
           SEND EMAIL
        ========================= */

        await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to: process.env.EMAIL_USER,

            subject: "New Contact Form Submission",

            html: `
                <h2>New Contact Form</h2>

                <p><strong>Name:</strong> ${firstName} ${lastName}</p>

                <p><strong>Email:</strong> ${email}</p>

                <p><strong>Phone:</strong> ${phone}</p>

                <p><strong>Message:</strong> ${message}</p>
            `
        });

        /* =========================
           SUCCESS RESPONSE
        ========================= */

        res.status(200).json({
            success: true,
            message: "Message Sent Successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed To Send Message"
        });
    }
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});