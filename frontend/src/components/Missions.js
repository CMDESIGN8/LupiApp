import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

const Missions = () => {
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/missions`)
      .then(res => setMissions(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Misiones</h2>
      <ul>
        {missions.map((m) => (
          <li key={m.id}>{m.nombre}</li>
        ))}
      </ul>
    </div>
  );
};

export default Missions;
