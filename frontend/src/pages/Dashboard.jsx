import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function Dashboard() {
  const [misiones, setMisiones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener misiones de ejemplo desde Firestore
    const fetchMisiones = async () => {
      try {
        const misionesCol = collection(db, "misiones");
        const q = query(misionesCol); // Puedes filtrar por usuario/clase etc.
        const snapshot = await getDocs(q);
        const listaMisiones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMisiones(listaMisiones);
        setLoading(false);
      } catch (error) {
        console.error("Error al cargar misiones:", error);
        setLoading(false);
      }
    };

    fetchMisiones();
  }, []);

  if (loading) return <div className="text-center mt-20">Cargando...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard Lupi RPG</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Misiones</h2>
        {misiones.length === 0 ? (
          <p>No hay misiones activas.</p>
        ) : (
          <ul className="space-y-3">
            {misiones.map(m => (
              <li key={m.id} className="p-4 bg-gray-100 rounded shadow">
                <h3 className="font-bold">{m.nombre}</h3>
                <p>{m.descripcion}</p>
                <p>Recompensa: {m.recompensa} coins</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tu carta FIFA</h2>
        <div className="p-4 bg-yellow-100 rounded shadow w-64">
          <h3 className="font-bold">Jugador: Lupi</h3>
          <p>Nivel: 1</p>
          <p>Fuerza: 10</p>
          <p>Velocidad: 12</p>
          <p>Habilidad: 11</p>
        </div>
      </section>
    </div>
  );
}
