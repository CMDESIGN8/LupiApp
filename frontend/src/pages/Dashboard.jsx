import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Dashboard() {
  const [misiones, setMisiones] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUsuario({ uid: user.uid, email: user.email });
      else setUsuario(null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!usuario) return;

    const fetchMisiones = async () => {
      try {
        const misionesCol = collection(db, "misiones");
        const q = query(misionesCol, where("uid", "==", usuario.uid));
        const snapshot = await getDocs(q);
        const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMisiones(lista);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    fetchMisiones();
  }, [usuario]);

  const completarMision = async (misionId) => {
    try {
      const misionRef = doc(db, "misiones", misionId);
      await updateDoc(misionRef, { completada: true });
      setMisiones(prev => prev.map(m => m.id === misionId ? { ...m, completada: true } : m));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="text-center mt-20">Cargando...</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard Lupi RPG</h1>

      {usuario && (
        <div className="p-4 bg-blue-100 rounded shadow w-80">
          <h2 className="font-bold text-xl mb-2">Usuario</h2>
          <p>Email: {usuario.email || "Anónimo"}</p>
        </div>
      )}

      <section>
        <h2 className="text-2xl font-semibold mb-4">Misiones</h2>
        {misiones.length === 0 ? (
          <p>No tienes misiones activas.</p>
        ) : (
          <ul className="space-y-3">
            {misiones.map(m => (
              <li
                key={m.id}
                className={`p-4 rounded shadow ${m.completada ? "bg-green-200" : "bg-gray-100"}`}
              >
                <h3 className="font-bold">{m.nombre}</h3>
                <p>{m.descripcion}</p>
                <p>Recompensa: {m.recompensa} coins</p>
                {!m.completada && (
                  <button
                    onClick={() => completarMision(m.id)}
                    className="mt-2 px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Completar
                  </button>
                )}
                {m.completada && <span className="text-green-800 font-semibold">Completada</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tu carta FIFA</h2>
        <div className="p-4 bg-yellow-100 rounded shadow w-64 space-y-2">
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
