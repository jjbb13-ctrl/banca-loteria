import { useState } from 'react';
import { store, hoy } from '@/store';

export default function Vendor({ taq, onLogout }: { taq: string; onLogout: () => void }) {
  const terminal = store.terminalByCod(taq);

  if (!terminal) {
    return (
      <div style={{ padding: 40 }}>
        <p>Terminal no encontrada: {taq}</p>
        <button onClick={onLogout}>Volver al login</button>
      </div>
    );
  }

  const [fechaSorteo, setFechaSorteo] = useState(hoy());

  return (
    <div style={{ padding: 40 }}>
      <h1>TAQUILLA - PRUEBA</h1>
      <p>Taquilla: {taq}</p>
      <p>Terminal: {terminal.nombre}</p>
      <p>Fecha sorteo: {fechaSorteo}</p>
      <input
        type="date"
        value={fechaSorteo}
        onChange={e => setFechaSorteo(e.target.value)}
      />
      <br /><br />
      <button onClick={onLogout}>Salir</button>
    </div>
  );
}