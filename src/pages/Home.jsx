import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { AtSign, Calendar, Clock, MapPin, Phone } from 'lucide-react';
import { db } from '../firebase';
import { formatarHorarios } from '../utils/slots';
import logo from '../assets/logo.jpg';

const TOQUES_PARA_PAINEL = 5;
const JANELA_TOQUES_MS = 1500;

export default function Home({ irParaAgendar }) {
  const [config, setConfig] = useState(undefined);
  const toquesRef = useRef(0);
  const timeoutRef = useRef(null);

  function tocarLogo() {
    toquesRef.current += 1;
    if (toquesRef.current >= TOQUES_PARA_PAINEL) {
      window.location.href = '/admin';
      return;
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      toquesRef.current = 0;
    }, JANELA_TOQUES_MS);
  }

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
    <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'space-between' }}>
      <div className="card" style={{ textAlign: 'center', padding: '10px 14px' }}>
        <img
          src={logo}
          alt={config.nomeBarbearia}
          onClick={tocarLogo}
          style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px' }}
        />
        <h1 style={{ fontSize: 19 }}>{config.nomeBarbearia}</h1>
        {config.descricao && (
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>{config.descricao}</p>
        )}
      </div>

      {config.horarios && (
        <div className="card" style={{ padding: '10px 14px' }}>
          <SecaoTitulo icone={<Clock size={15} />} texto="Horário de funcionamento" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formatarHorarios(config.horarios).map((linha) => (
              <p key={linha} style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                {linha}
              </p>
            ))}
          </div>
        </div>
      )}

      {config.endereco && (
        <a
          href={enderecoUrl}
          target="_blank"
          rel="noreferrer"
          className="card"
          style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '10px 14px' }}
        >
          <SecaoTitulo icone={<MapPin size={15} />} texto="Endereço" />
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{config.endereco}</p>
          <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>Abrir no mapa →</p>
        </a>
      )}

      {(config.whatsapp || config.instagram) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {config.whatsapp && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1 }}>
              <Phone size={16} /> WhatsApp
            </a>
          )}
          {config.instagram && (
            <a href={config.instagram} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1 }}>
              <AtSign size={16} /> Instagram
            </a>
          )}
        </div>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={irParaAgendar}>
        <Calendar size={16} /> Agendar horário
      </button>
    </div>
  );
}

function SecaoTitulo({ icone, texto }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', marginBottom: 5, fontSize: 13, fontWeight: 700 }}>
      {icone}
      {texto}
    </div>
  );
}
