const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🔹 Registro
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Encriptar password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id",
      [username, email, hashedPassword]
    );

    const userId = result.rows[0].id;

    // Crear wallet
    await pool.query(
      "INSERT INTO wallets (user_id, balance) VALUES ($1, $2)",
      [userId, 0]
    );

    // Crear carta FIFA inicial
    await pool.query(
      "INSERT INTO cards (user_id, name) VALUES ($1, $2)",
      [userId, `${username} - Carta Inicial`]
    );

    res.json({ message: "Usuario registrado con éxito 🚀", userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// 🔹 Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "Usuario no encontrado" });

    const user = result.rows[0];
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Contraseña incorrecta" });

    // Crear token JWT
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login exitoso ✅", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

module.exports = router;
