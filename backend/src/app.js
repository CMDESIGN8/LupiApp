  const express = require("express");
  const cors = require("cors");
  const bodyParser = require("body-parser");
  require("dotenv").config();

  const missionsRoutes = require("./routes/missions");
  const cardsRoutes = require("./routes/cards");
  const clubsRoutes = require("./routes/clubs");
  const prizesRoutes = require("./routes/prizes");
  const userRoutes = require('./routes/userRoutes'); 

  const app = express();
  const PORT = process.env.PORT || 5000;

  // Middlewares
  app.use(cors());
  app.use(bodyParser.json());

  // Rutas
  app.use("/api/missions", missionsRoutes);
  app.use("/api/cards", cardsRoutes);
  app.use("/api/clubs", clubsRoutes);
  app.use("/api/prizes", prizesRoutes);
  app.use('/api/users', userRoutes);

  // Ruta de prueba
  app.get("/", (req, res) => {
    res.send("Backend de Lupi Futbol RPG funcionando!");
  });

  app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
