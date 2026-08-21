const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const path = require("path");

require("dotenv").config();

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
    "https://fortunedigi.com,https://www.fortunedigi.com,http://127.0.0.1:5500,http://localhost:5500")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin not allowed by CORS"));
    }
}));

app.use(express.json({ limit: "20kb" }));
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." }
});

const brochureLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many brochure requests. Please try again later." }
});

app.use("/api/contact", contactLimiter);
app.use("/api/brochure", brochureLimiter);

app.get("/", (req, res) => {
    res.send("Backend Running");
});

app.get("/health", (req, res) => {
    res.status(200).json({ success: true, service: "fortech-api" });
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+() -]{7,20}$/;

function cleanText(value, maxLength = 500) {
    return String(value || "").trim().slice(0, maxLength);
}

function escapeHtml(value) {
    return cleanText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function sendLeadEmail(options) {
    if (process.env.SKIP_EMAIL === "true") return;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.CONTACT_TO || "fortechmediaandmarketing@gmail.com",
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html
    });
}

app.post("/api/contact", async (req, res) => {
    try {
        const firstName = cleanText(req.body.firstName, 60);
        const lastName = cleanText(req.body.lastName, 60);
        const email = cleanText(req.body.email, 120).toLowerCase();
        const phone = cleanText(req.body.phone, 20);
        const message = cleanText(req.body.message, 2000);

        if (!firstName || !lastName || !email || !phone || !message) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email address" });
        }

        if (phone !== "-" && !phoneRegex.test(phone)) {
            return res.status(400).json({ success: false, message: "Invalid phone number" });
        }

        await sendLeadEmail({
            replyTo: email,
            subject: "New Contact Form Submission",
            html: `
                <h2>New Contact Form</h2>
                <p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
                <p><strong>Email:</strong> ${escapeHtml(email)}</p>
                <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
                <p><strong>Message:</strong> ${escapeHtml(message).replace(/\n/g, "<br>")}</p>
            `
        });

        return res.status(200).json({ success: true, message: "Message Sent Successfully" });
    } catch (error) {
        console.error("Contact request failed:", error.message);
        return res.status(500).json({ success: false, message: "Failed To Send Message" });
    }
});

app.post("/api/brochure", async (req, res) => {
    try {
        const firstName = cleanText(req.body.firstName, 60);
        const lastName = cleanText(req.body.lastName, 60);
        const email = cleanText(req.body.email, 120).toLowerCase();
        const phone = cleanText(req.body.phone, 20);
        const company = cleanText(req.body.company, 100);
        const consent = cleanText(req.body.consent, 10);
        const website = cleanText(req.body.website, 200);

        if (website) {
            return res.status(400).json({ success: false, message: "Invalid submission" });
        }

        if (!firstName || !lastName || !email || !phone || !company || consent !== "yes") {
            return res.status(400).json({
                success: false,
                message: "Please complete all required fields and provide consent."
            });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email address" });
        }

        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ success: false, message: "Invalid phone number" });
        }

        const brochurePath = path.resolve(__dirname, "private", "Fortech-Business-Profile.pdf");

        await sendLeadEmail({
            replyTo: email,
            subject: "New Brochure Download Lead",
            html: `
                <h2>New Brochure Download</h2>
                <p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
                <p><strong>Business email:</strong> ${escapeHtml(email)}</p>
                <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
                <p><strong>Company:</strong> ${escapeHtml(company)}</p>
                <p><strong>Consent:</strong> Provided</p>
            `
        });

        return res.download(brochurePath, "Fortech-Business-Profile.pdf", error => {
            if (error && !res.headersSent) {
                res.status(500).json({ success: false, message: "The brochure is temporarily unavailable." });
            }
        });
    } catch (error) {
        console.error("Brochure request failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to process your request right now. Please try again."
        });
    }
});

app.use((error, req, res, next) => {
    if (error && error.message === "Origin not allowed by CORS") {
        return res.status(403).json({ success: false, message: "Origin not allowed" });
    }

    return next(error);
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
