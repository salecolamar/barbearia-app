import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { AtSign, Calendar, Clock, Download, MapPin, Megaphone, Phone, Share, X } from 'lucide-react';
import { db } from '../firebase';
import { formatarHorarios } from '../utils/slots';
import logo from '../assets/logo.jpg';

const TOQUES_PARA_PAINEL = 5;
const JANELA_TOQUES_MS = 1500;

const jaInstalado =
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);

export default function Home({ irParaAgendar, podeInstalarAndroid, onInstalarAndroid }) {
  const [config, setConfig] = useState(undefined);
  const [avisoAndroid, setAvisoAndroid] = useState('');
  const [tutorialIphone, setTutorialIphone] = useState(false);
  const toquesRef = useRef(0);
  const timeoutRef = useRef(null);

  async function tocarInstalarAndroid() {
    if (!podeInstalarAndroid) {
      setAvisoAndroid('Não deu pra instalar automático por aqui. Tente pelo menu (⋮) do Chrome → "Adicionar à tela inicial".');
      return;
    }
    const instalou = await onInstalarAndroid();
    if (!instalou) {
      setAvisoAndroid('Instalação cancelada. Toque no botão novamente quando quiser.');
    }
  }

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
    <div className="home-stack" style={{ paddingTop: 6, display: 'flex', flexDirection: 'column' }}>
      <div className="card home-hero" style={{ textAlign: 'center' }}>
        <img
          src={logo}
          alt={config.nomeBarbearia}
          onClick={tocarLogo}
          className="home-logo"
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
        <h1 style={{ fontSize: 21 }}>{config.nomeBarbearia}</h1>
        {config.descricao && (
          <p
            style={{
              color: 'var(--text-dim)',
              fontSize: 11,
              marginTop: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {config.descricao}
          </p>
        )}
      </div>

      {config.recado && (
        <div
          className="home-recado"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 7,
            background: 'rgba(201,162,39,0.1)',
            border: '1px solid var(--gold)',
            borderRadius: 'var(--radius)',
          }}
        >
          <Megaphone size={14} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: 'var(--text)', lineHeight: 1.35 }}>{config.recado}</p>
        </div>
      )}

      {config.horarios && (
        <div className="home-card">
          <SecaoTitulo icone={<Clock size={16} />} texto="Horário de funcionamento" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {formatarHorarios(config.horarios).map((linha) => (
              <p key={linha} style={{ fontSize: 14, color: 'var(--text-dim)' }}>
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
          className="home-card"
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <SecaoTitulo icone={<MapPin size={16} />} texto="Endereço" />
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>{config.endereco}</p>
          <p style={{ fontSize: 13, color: 'var(--gold)', marginTop: 5 }}>Abrir no mapa →</p>
        </a>
      )}

      {(config.whatsapp || config.instagram) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {config.whatsapp && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-secondary home-mini-btn" style={{ flex: 1 }}>
              <Phone size={14} /> WhatsApp
            </a>
          )}
          {config.instagram && (
            <a href={config.instagram} target="_blank" rel="noreferrer" className="btn btn-secondary home-mini-btn" style={{ flex: 1 }}>
              <AtSign size={14} /> Instagram
            </a>
          )}
        </div>
      )}

      {!jaInstalado && (
        <div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary home-mini-btn" style={{ flex: 1 }} onClick={tocarInstalarAndroid}>
              <Download size={14} /> Instalar (Android)
            </button>
            <button
              type="button"
              className="btn btn-secondary home-mini-btn"
              style={{ flex: 1 }}
              onClick={() => setTutorialIphone(true)}
            >
              <Share size={14} /> Instalar (iPhone)
            </button>
          </div>
          {avisoAndroid && <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{avisoAndroid}</p>}
        </div>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={irParaAgendar}>
        <Calendar size={16} /> Agendar horário
      </button>

      {tutorialIphone && <TutorialIphone onFechar={() => setTutorialIphone(false)} />}
    </div>
  );
}

function TutorialIphone({ onFechar }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onFechar}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', padding: '20px 20px calc(20px + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16 }}>Instalar no iPhone</h2>
          <button type="button" onClick={onFechar} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
          Precisa ser pelo <strong>Safari</strong> (não funciona no Chrome do iPhone). Siga os passos:
        </p>
        <PassoTutorial numero={1} texto='Toque no ícone de compartilhar (o quadrado com uma seta ↑) na barra do Safari.' />
        <PassoTutorial numero={2} texto='Role a lista e toque em "Adicionar à Tela de Início".' />
        <PassoTutorial numero={3} texto='Toque em "Adicionar" no canto superior direito.' />
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 6 }} onClick={onFechar}>
          Entendi
        </button>
      </div>
    </div>
  );
}

function PassoTutorial({ numero, texto }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
      <span
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--gold)',
          color: '#1a1400',
          fontSize: 12,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {numero}
      </span>
      <p style={{ fontSize: 14, lineHeight: 1.4 }}>{texto}</p>
    </div>
  );
}

function SecaoTitulo({ icone, texto }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', marginBottom: 7, fontSize: 13, fontWeight: 700 }}>
      {icone}
      {texto}
    </div>
  );
}
