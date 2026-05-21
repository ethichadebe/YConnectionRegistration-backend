const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");

// ---- mailer setup ----
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true", // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendConfirmationEmail(reg, insertId) {
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const replyTo = process.env.REPLY_TO || undefined;

  const fullName = `${reg.firstName} ${reg.lastName}`.trim();
  const subject = "Y-CON 2026 Registration Confirmation";

  // Minimal, safe helpers
  const safe = (v) => (v === undefined || v === null || String(v).trim() === "" ? "—" : String(v));
  const dt = (d) => (d ? new Date(d).toLocaleDateString("en-ZA") : "—");

  const text = `
Hi ${fullName},

You're registered for The Salvation Army Central Division – Y-CON 2026.

Summary:
- Name: ${fullName}
- Email: ${safe(reg.email)}
- Phone: ${safe(reg.phone)}
- Corps: ${safe(reg.corpsName)}
- Date of Birth: ${dt(reg.dateOfBirth)}
- Gender: ${safe(reg.gender)}
- Emergency: ${safe(reg.emergencyName)} (${safe(reg.emergencyPhone)})
- Photo/Video Consent: ${safe(reg.photoVideoConsent)}

Your reference: YC2026-${insertId}

If any of these details are incorrect, please reply to this email.

See you at Mighty Apies, Pretoria — 3–5 July 2026!
`;

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55;color:#0f172a">
    <div style="background:#cc0000;height:6px;margin-bottom:24px"></div>
    <h2 style="margin:0 0 4px;color:#cc0000">Y-CON 2026</h2>
    <p style="margin:0 0 16px;font-size:0.8rem;color:#888;letter-spacing:0.1em">REGISTRATION CONFIRMED</p>
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>You're registered for <strong>The Salvation Army Central Division – Y-CON 2026</strong>.</p>
    <table style="border-collapse:collapse;margin:12px 0 16px;width:100%;max-width:560px">
      <tbody>
        <tr><td style="padding:6px 0;width:180px;color:#475569">Name</td><td style="padding:6px 0"><strong>${fullName}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#475569">Email</td><td style="padding:6px 0">${safe(reg.email)}</td></tr>
        <tr><td style="padding:6px 0;color:#475569">Phone</td><td style="padding:6px 0">${safe(reg.phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#475569">Corps</td><td style="padding:6px 0">${safe(reg.corpsName)}</td></tr>
        <tr><td style="padding:6px 0;color:#475569">Date of Birth</td><td style="padding:6px 0">${dt(reg.dateOfBirth)}</td></tr>
        <tr><td style="padding:6px 0;color:#475569">Gender</td><td style="padding:6px 0">${safe(reg.gender)}</td></tr>
        <tr><td style="padding:6px 0;color:#475569">Emergency</td><td style="padding:6px 0">${safe(reg.emergencyName)} (${safe(reg.emergencyPhone)})</td></tr>
        <tr><td style="padding:6px 0;color:#475569">Photo/Video Consent</td><td style="padding:6px 0">${safe(reg.photoVideoConsent)}</td></tr>
      </tbody>
    </table>
    <p style="margin:0 0 6px">Your reference: <strong style="color:#cc0000">YC2026-${insertId}</strong></p>
    <p>If any details are incorrect, please reply to this email.</p>
    <p style="margin-top:18px">See you at <strong>Mighty Apies, Pretoria — 3–5 July 2026</strong>!</p>
    <div style="background:#cc0000;height:6px;margin-top:24px"></div>
  </div>
  `;

  return transporter.sendMail({
    from,
    to: reg.email,
    replyTo,
    subject,
    text,
    html,
  });
}

// POST /api/register
router.post("/register", async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, dateOfBirth, gender, corpsName,
      guardianFirstName, guardianLastName, guardianEmail, guardianPhone, guardianRelationship,
      emergencyName, emergencyPhone, emergencyRelationship,
      medicalConditions, medications, allergies,
      photoVideoConsent, agreedToTerms
    } = req.body;

    const [result] = await db.execute(
      `
      INSERT INTO registrations (
        firstName, lastName, email, phone, dateOfBirth, gender, corpsName,
        guardianFirstName, guardianLastName, guardianEmail, guardianPhone, guardianRelationship,
        emergencyName, emergencyPhone, emergencyRelationship,
        medicalConditions, medications, allergies,
        photoVideoConsent, agreedToTerms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        firstName, lastName, email, phone, dateOfBirth, gender, corpsName,
        guardianFirstName, guardianLastName, guardianEmail, guardianPhone, guardianRelationship,
        emergencyName, emergencyPhone, emergencyRelationship,
        medicalConditions, medications, allergies,
        photoVideoConsent, agreedToTerms
      ]
    );

    const insertId = result?.insertId;

    // Try to send confirmation email, but don't fail the registration if it errors
    try {
      await sendConfirmationEmail(
        {
          firstName, lastName, email, phone, dateOfBirth, gender, corpsName,
          emergencyName, emergencyPhone, photoVideoConsent
        },
        insertId
      );
    } catch (mailErr) {
      console.error("Email send failed:", mailErr?.message || mailErr);
      // Optionally: capture in logs/monitoring
    }

    res.status(201).json({ message: "Registration successful", id: insertId });
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).json({ error: "Failed to register", details: err.message });
  }
});

// GET /api/registrations
router.get("/registrations", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM registrations ORDER BY id DESC");

    const updatedRows = rows.map((row) => {
      const birthDate = new Date(row.dateOfBirth);
      const ageDiff = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDiff);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      return { ...row, age, isUnder18: age < 18 };
    });

    res.json(updatedRows);
  } catch (err) {
    console.error("Fetch registrations failed:", err);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// GET /api/registration/:id
router.get("/registration/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute("SELECT * FROM registrations WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Registration not found" });
    }

    const registration = rows[0];
    const birthDate = new Date(registration.dateOfBirth);
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    res.json({ ...registration, age, isUnder18: age < 18 });
  } catch (error) {
    console.error("Error fetching registration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/ping", (req, res) => res.send("API working"));

module.exports = router;
