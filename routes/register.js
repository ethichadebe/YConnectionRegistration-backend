const express = require("express");
const router = express.Router();
const db = require("../db");

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

    await db.execute(`
      INSERT INTO registrations (
        firstName, lastName, email, phone, dateOfBirth, gender, corpsName,
        guardianFirstName, guardianLastName, guardianEmail, guardianPhone, guardianRelationship,
        emergencyName, emergencyPhone, emergencyRelationship,
        medicalConditions, medications, allergies,
        photoVideoConsent, agreedToTerms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      firstName, lastName, email, phone, dateOfBirth, gender, corpsName,
      guardianFirstName, guardianLastName, guardianEmail, guardianPhone, guardianRelationship,
      emergencyName, emergencyPhone, emergencyRelationship,
      medicalConditions, medications, allergies,
      photoVideoConsent, agreedToTerms
    ]);

    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    res.status(500).json({ error: "Failed to register", details: err.message });
  }
});

// GET /api/registrations
router.get("/registrations", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM registrations ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

router.get("/ping", (req, res) => res.send("API working"));

module.exports = router;
