import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { ChevronLeft, Bell, Check, Clock, Scissors, User } from 'lucide-react';
import { db } from '../firebase';
import { pedirTokenNotificacao } from '../notifications';
import { getClienteSalvo, salvarCliente } from '../utils/storage';
import { DIAS_SEMANA_ABREV, dateToStr, getHorariosDisponiveis, proximosDias } from '../utils/slots';

const PASSOS = ['servico', 'barbeiro', 'data', 'horario', 'dados', 'confirmado'];

export default function Booking() {
  const [passo, setPasso] = useState('servico');
  const [carregando, setCarregando] = useState(true);
  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [config, setConfig] = useState(null);

  const [erroCarregamento, setErroCarregamento] = useState(false);

  const [servico, setServico] = useState(null);
  const [barbeiro, setBarbeiro] = useState(null);
  const [dataStr, setDataStr] = useState(null);
  const [hora, setHora] = useState(null);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const clienteSalvo = getClienteSalvo();
  const [nome, setNome] = useState(clienteSalvo?.nome || '');
  const [telefone, setTelefone] = useState(clienteSalvo?.telefone || '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ativandoLembrete, setAtivandoLembrete] = useState(false);
  const [lembreteAtivo, setLembreteAtivo] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        const [servicosSnap, barbeirosSnap, configSnap] = await Promise.all([
          getDocs(collection(db, 'servicos')),
          getDocs(collection(db, 'barbeiros')),
          getDoc(doc(db, 'config', 'geral')),
        ]);
        setServicos(servicosSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.ativo !== false));
        setBarbeiros(barbeirosSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => b.ativo !== false));
        setConfig(configSnap.exists() ? configSnap.data() : null);
      } catch (err) {
        console.error('Falha ao carregar dados da barbearia:', err);
        setErroCarregamento(true);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const dias = useMemo(() => proximosDias(21), []);

  async function escolherData(d) {
    const str = dateToStr(d);
    setDataStr(str);
    setHora(null);
    setCarregandoHorarios(true);
    const snap = await getDocs(query(collection(db, 'agendamentos'), where('data', '==', str)));
    const agendamentosDoDia = snap.docs.map((doc) => doc.data());
    const disponiveis = getHorariosDisponiveis({
      dateStr: str,
      duracaoMin: servico.duracaoMin,
      horariosConfig: config.horarios,
      intervaloMin: config.intervaloMin || 30,
      barbeiroId: barbeiro.id,
      agendamentosDoDia,
    });
    setHorariosDisponiveis(disponiveis);
    setCarregandoHorarios(false);
    setPasso('horario');
  }

  async function confirmarAgendamento(e) {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) return;
    setSalvando(true);
    setErro('');
    try {
      salvarCliente({ nome: nome.trim(), telefone: telefone.trim() });
      const docRef = await addDoc(collection(db, 'agendamentos'), {
        servicoId: servico.id,
        servicoNome: servico.nome,
        servicoDuracao: servico.duracaoMin,
        servicoPreco: servico.preco || null,
        barbeiroId: barbeiro.id,
        barbeiroNome: barbeiro.nome,
        data: dataStr,
        hora,
        clienteNome: nome.trim(),
        clienteTelefone: telefone.trim(),
        status: 'confirmado',
        fcmToken: null,
        lembreteEnviado: false,
        criadoEm: serverTimestamp(),
      });
      setAgendamentoId(docRef.id);
      setPasso('confirmado');
    } catch (err) {
      console.error(err);
      setErro('Não foi possível confirmar o agendamento. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function ativarLembrete() {
    setAtivandoLembrete(true);
    const token = await pedirTokenNotificacao();
    if (token && agendamentoId) {
      await updateDoc(doc(db, 'agendamentos', agendamentoId), { fcmToken: token });
      setLembreteAtivo(true);
    }
    setAtivandoLembrete(false);
  }

  function voltar() {
    const idx = PASSOS.indexOf(passo);
    if (idx > 0) setPasso(PASSOS[idx - 1]);
  }

  if (carregando) {
    return <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 40 }}>Carregando…</p>;
  }

  if (erroCarregamento) {
    return (
      <div className="card" style={{ marginTop: 20, textAlign: 'center', color: 'var(--danger)' }}>
        Não foi possível conectar ao servidor da barbearia. Verifique sua internet ou tente novamente
        em instantes.
      </div>
    );
  }

  if (!servicos.length || !barbeiros.length || !config) {
    return (
      <div className="card" style={{ marginTop: 20, textAlign: 'center', color: 'var(--text-dim)' }}>
        A barbearia ainda não configurou os serviços ou horários. Peça para o administrador acessar
        o painel em <strong>/admin</strong>.
      </div>
    );
  }

  return (
    <div>
      {passo !== 'servico' && passo !== 'confirmado' && (
        <button type="button" onClick={voltar} style={backBtnStyle}>
          <ChevronLeft size={18} /> Voltar
        </button>
      )}

      {passo === 'servico' && (
        <Etapa titulo="Escolha o serviço" icone={<Scissors size={18} />}>
          {servicos.map((s) => (
            <OpcaoCard
              key={s.id}
              titulo={s.nome}
              subtitulo={`${s.duracaoMin} min${s.preco ? ` · R$ ${Number(s.preco).toFixed(2)}` : ''}`}
              onClick={() => {
                setServico(s);
                setPasso('barbeiro');
              }}
            />
          ))}
        </Etapa>
      )}

      {passo === 'barbeiro' && (
        <Etapa titulo="Escolha o barbeiro" icone={<User size={18} />}>
          {barbeiros.map((b) => (
            <OpcaoCard
              key={b.id}
              titulo={b.nome}
              onClick={() => {
                setBarbeiro(b);
                setPasso('data');
              }}
            />
          ))}
        </Etapa>
      )}

      {passo === 'data' && (
        <Etapa titulo="Escolha o dia" icone={<Clock size={18} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {dias.map((d) => (
              <button
                key={d.toISOString()}
                type="button"
                className="card"
                onClick={() => escolherData(d)}
                style={{ cursor: 'pointer', textAlign: 'center', padding: '12px 6px' }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{DIAS_SEMANA_ABREV[d.getDay()]}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{d.getDate()}</div>
              </button>
            ))}
          </div>
        </Etapa>
      )}

      {passo === 'horario' && (
        <Etapa titulo="Escolha o horário" icone={<Clock size={18} />}>
          {carregandoHorarios ? (
            <p style={{ color: 'var(--text-dim)' }}>Verificando horários livres…</p>
          ) : horariosDisponiveis.length === 0 ? (
            <p style={{ color: 'var(--text-dim)' }}>Sem horários livres nesse dia. Escolha outra data.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {horariosDisponiveis.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="card"
                  onClick={() => {
                    setHora(h);
                    setPasso('dados');
                  }}
                  style={{ cursor: 'pointer', textAlign: 'center', fontWeight: 700 }}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </Etapa>
      )}

      {passo === 'dados' && (
        <Etapa titulo="Seus dados" icone={<User size={18} />}>
          <div className="card" style={{ marginBottom: 14 }}>
            <Resumo servico={servico} barbeiro={barbeiro} dataStr={dataStr} hora={hora} />
          </div>
          <form onSubmit={confirmarAgendamento} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            <input
              placeholder="Seu WhatsApp (com DDD)"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              inputMode="tel"
              required
            />
            {erro && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erro}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={salvando}>
              {salvando ? 'Confirmando…' : 'Confirmar agendamento'}
            </button>
          </form>
        </Etapa>
      )}

      {passo === 'confirmado' && (
        <div style={{ textAlign: 'center', paddingTop: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(76,175,125,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Check size={32} color="var(--success)" />
          </div>
          <h2>Horário marcado!</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: 6 }}>Te esperamos na barbearia.</p>

          <div className="card" style={{ marginTop: 20, textAlign: 'left' }}>
            <Resumo servico={servico} barbeiro={barbeiro} dataStr={dataStr} hora={hora} />
          </div>

          {!lembreteAtivo ? (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 16 }}
              onClick={ativarLembrete}
              disabled={ativandoLembrete}
            >
              <Bell size={16} /> {ativandoLembrete ? 'Ativando…' : 'Avisar quando estiver perto do horário'}
            </button>
          ) : (
            <p style={{ marginTop: 16, color: 'var(--success)', fontSize: 14 }}>
              <Bell size={14} style={{ verticalAlign: -2 }} /> Lembrete ativado.
            </p>
          )}

          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 10 }}
            onClick={() => {
              setServico(null);
              setBarbeiro(null);
              setDataStr(null);
              setHora(null);
              setAgendamentoId(null);
              setLembreteAtivo(false);
              setPasso('servico');
            }}
          >
            Agendar outro horário
          </button>
        </div>
      )}
    </div>
  );
}

function Etapa({ titulo, icone, children }) {
  return (
    <section style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--gold)' }}>
        {icone}
        <h2 style={{ fontSize: 17 }}>{titulo}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  );
}

function OpcaoCard({ titulo, subtitulo, onClick }) {
  return (
    <button type="button" className="card" onClick={onClick} style={{ textAlign: 'left', cursor: 'pointer' }}>
      <div style={{ fontWeight: 700 }}>{titulo}</div>
      {subtitulo && <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{subtitulo}</div>}
    </button>
  );
}

function Resumo({ servico, barbeiro, dataStr, hora }) {
  const d = dataStr ? new Date(`${dataStr}T00:00:00`) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
      <Linha label="Serviço" valor={servico?.nome} />
      <Linha label="Barbeiro" valor={barbeiro?.nome} />
      <Linha label="Data" valor={d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : ''} />
      <Linha label="Horário" valor={hora} />
    </div>
  );
}

function Linha({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{valor}</span>
    </div>
  );
}

const backBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'transparent',
  border: 'none',
  color: 'var(--text-dim)',
  padding: '10px 0',
  cursor: 'pointer',
  fontSize: 14,
};
