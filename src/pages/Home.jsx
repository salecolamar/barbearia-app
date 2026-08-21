import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Calendar, Clock, MapPin, Phone, Scissors } from 'lucide-react';
import { db } from '../firebase';
import { formatarHorarios } from '../utils/slots';

export default function Home({ irParaAgendar }) {
  const [config, setConfig] = useState(undefined);

  useEffect(() => {
    getDoc(doc(db, 'config', 'geral'))
      .then((snap) => setConfig(snap.exists() ? snap.data() : null))
      .catch(() => setConfig(null));
  }, []);

  if (config === undefined) {
    return <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 40 }}>Carregando…</p>;
  }

  if (!config) {
    return (
      <div className="card" style={{ marginTop: 20, textAlign: 'center', color: 'var(--text-dim)' }}>
        A barbearia ainda não configurou o app. Peça para o administrador acessar o painel em{' '}
        <strong>/admin</strong>.
      </div>
    );
  }

  const enderecoUrl = config.endereco
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.endereco)}`
    : null;
  const whatsappUrl = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, '')}` : null;

  return (
    <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(201,162,39,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <Scissors size={26} color="var(--gold)" />
        </div>
        <h1 style={{ fontSize: 22 }}>{config.nomeBarbearia}</h1>
        {config.descricao && (
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 8 }}>{config.descricao}</p>
        )}
      </div>

      {config.horarios && (
        <div className="card">
          <SecaoTitulo icone={<Clock size={16} />} texto="Horário de funcionamento" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {formatarHorarios(config.horarios).map((linha) => (
              <p key={linha} style={{ fontSize: 14, color: 'var(--text-dim)' }}>
                {linha}
              </p>
            ))}
          </div>
        </div>
      )}

      {config.endereco && (
        <a href={enderecoUrl} target="_blank" rel="noreferrer" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <SecaoTitulo icone={<MapPin size={16} />} texto="Endereço" />
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>{config.endereco}</p>
          <p style={{ fontSize: 13, color: 'var(--gold)', marginTop: 6 }}>Abrir no mapa →</p>
        </a>
      )}

      {config.whatsapp && (
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-block">
          <Phone size={16} /> Falar no WhatsApp
        </a>
      )}

      <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 4 }} onClick={irParaAgendar}>
        <Calendar size={16} /> Agendar horário
      </button>
    </div>
  );
}

function SecaoTitulo({ icone, texto }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
      {icone}
      {texto}
    </div>
  );
}
