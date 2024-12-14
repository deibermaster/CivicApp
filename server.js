const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const db = require('./config/db');
const jwt = require('jsonwebtoken');
// Configuración dotenv
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.static(path.join(__dirname, 'public'))); // Sirve archivos estáticos de la carpeta public
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000/index.html', // Permitir todas las solicitudes (puedes restringirlo a dominios específicos)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));

// Configuración de subida de archivos
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Ruta para mostrar el formulario de registro
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/register.html'));  // Sirve el archivo register.html
});

// Ruta para mostrar el formulario de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));  // Sirve el archivo login.html
});


function verifyToken(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: 'Se requiere autenticación' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token no válido' });
    }

    // Si el token es válido, agregamos la información del usuario al request
    req.user = decoded;
    next();  // Continúa con la siguiente función (el controlador del reporte)
  });
}

// Ruta para el registro de usuarios
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  try {
    // Verifica si el usuario ya existe
    const [existingUser] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Hashea la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserta el nuevo usuario en la base de datos
    await db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
});


// Ruta para el inicio de sesión
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  try {
    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (user.length === 0) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(password, user[0].password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    // Genera el token JWT para el usuario
    const token = jwt.sign({ userId: user[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Responde con éxito y el token
    res.status(200).json({ message: 'Login exitoso', token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});


// Ruta para recibir reportes (con archivo adjunto)
app.post("/api/reports", verifyToken, upload.single("photo"), (req, res) => {
  const { description, latitude, longitude } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;

  // Validación de parámetros
  if (!description || !latitude || !longitude) {
    return res.status(400).json({ message: 'La descripción y las coordenadas son obligatorias.' });
  }

  // Verifica si el reporte ya existe (evitar duplicados)
  const sqlCheck = `SELECT id FROM reports WHERE description = ? AND latitude = ? AND longitude = ?`;
  db.query(sqlCheck, [description, latitude, longitude], (err, result) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.length > 0) {
      return res.status(400).json({ message: "Este reporte ya ha sido enviado." });
    }

    // Si no hay duplicados, guarda el nuevo reporte
    const sql = `INSERT INTO reports (description, latitude, longitude, photo, user_id) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [description, latitude, longitude, photo, req.user.id], (err, result) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(200).json({
        id: result.insertId,
        description,
        latitude,
        longitude,
        photo,
      });
    });
  });
});



// Sirve los archivos subidos
app.use("/uploads", express.static("uploads"));

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

