import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Bell, Check, ChevronLeft, Clock, User } from 'lucide-react';
import { db } from '../firebase';
import { pedirTokenNotificacao } from '../notifications';
import { getClienteSalvo, salvarCliente } from '../utils/storage';
import { dateToStr, escolherBarbeiroDisponivel, getHorariosDisponiveisGeral, proximosDias } from '../utils/slots';
import DayStrip from '../components/DayStrip';
import TimeSlotGrid from '../components/TimeSlotGrid';

export default function Booking() {
  const clienteSalvo = getClienteSalvo();
  const [passo, setPasso] = useState(clienteSalvo ? 'horario' : 'cadastro');
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [barbeiros, setBarbeiros] = useState([]);
  const [config, setConfig] = useState(null);

  const [nome, setNome] = useState(clienteSalvo?.nome || '');
  const [telefone, setTelefone] = useState(clienteSalvo?.telefone || '');

  const dias = useMemo(() => proximosDias(21), []);
  const [dataStr, setDataStr] = useState(dateToStr(new Date()));
  const [hora, setHora] = useState(null);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ativandoLembrete, setAtivandoLembrete] = useState(false);
  const [lembreteAtivo, setLembreteAtivo] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState(null);
  const [barbeiroEscolhido, setBarbeiroEscolhido] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        const [barbeirosSnap, configSnap] = await Promise.all([
          getDocs(collection(db, 'barbeiros')),
          getDoc(doc(db, 'config', 'geral')),
        ]);
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

  useEffect(() => {
    if (!config || barbeiros.length === 0) return;
    buscarHorarios(dataStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, barbeiros, dataStr]);

  async function buscarHorarios(str) {
    setHora(null);
    setCarregandoHorarios(true);
    const snap = await getDocs(query(collection(db, 'agendamentos'), where('data', '==', str)));
    const agendamentosDoDia = snap.docs.map((d) => d.data());
    const disponiveis = getHorariosDisponiveisGeral({
      dateStr: str,
      duracaoMin: config.intervaloMin || 30,
      horariosConfig: config.horarios,
      intervaloMin: config.intervaloMin || 30,
      barbeiros,
      agendamentosDoDia,
    });
    setHorariosDisponiveis(disponiveis);
    setCarregandoHorarios(false);
  }

  function confirmarCadastro(e) {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) return;
    salvarCliente({ nome: nome.trim(), telefone: telefone.trim() });
    setPasso('horario');
  }

  async function escolherHorario(h) {
    setCarregandoHorarios(true);
    const snap = await getDocs(query(collection(db, 'agendamentos'), where('data', '==', dataStr)));
    const agendamentosDoDia = snap.docs.map((d) => d.data());
    const barbeiro = escolherBarbeiroDisponivel({
      hora: h,
      duracaoMin: config.intervaloMin || 30,
      barbeiros,
      agendamentosDoDia,
    });
    setCarregandoHorarios(false);
    if (!barbeiro) {
      await buscarHorarios(dataStr);
      setErro('Esse horário acabou de ser ocupado. Escolha outro.');
      return;
    }
    setErro('');
    setBarbeiroEscolhido(barbeiro);
    setHora(h);
    setPasso('revisao');
  }

  async function confirmarAgendamento() {
    setSalvando(true);
    setErro('');
    try {
      const docRef = await addDoc(collection(db, 'agendamentos'), {
        barbeiroId: barbeiroEscolhido.id,
        barbeiroNome: barbeiroEscolhido.nome,
        servicoDuracao: config.intervaloMin || 30,
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
      fetch('/api/notify-new-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendamentoId: docRef.id }),
      }).catch(() => {});
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

  function novoAgendamento() {
    setDataStr(dateToStr(new Date()));
    setHora(null);
    setBarbeiroEscolhido(null);
    setAgendamentoId(null);
    setLembreteAtivo(false);
    setPasso('horario');
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

  if (!barbeiros.length || !config) {
    return (
      <div className="card" style={{ marginTop: 20, textAlign: 'center', color: 'var(--text-dim)' }}>
        A barbearia ainda não configurou os barbeiros ou horários. Peça para o administrador acessar
        o painel em <strong>/admin</strong>.
      </div>
    );
  }

  return (
    <div>
      {passo === 'revisao' && (
        <button type="button" onClick={() => setPasso('horario')} style={backBtnStyle}>
          <ChevronLeft size={18} /> Voltar
        </button>
      )}

      {passo === 'cadastro' && (
        <Etapa titulo="Seus dados" icone={<User size={18} />}>
          <form onSubmit={confirmarCadastro} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            <input
              placeholder="Seu WhatsApp (com DDD)"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              inputMode="tel"
              required
            />
            <button type="submit" className="btn btn-primary btn-block">
              Continuar
            </button>
          </form>
        </Etapa>
      )}

      {passo === 'horario' && (
        <Etapa titulo="Escolha o horário" icone={<Clock size={18} />}>
          <DayStrip dias={dias} dataStr={dataStr} onSelect={setDataStr} />

          {erro && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -4 }}>{erro}</p>}

          <div style={{ marginTop: 4 }}>
            <TimeSlotGrid horarios={horariosDisponiveis} carregando={carregandoHorarios} onSelect={escolherHorario} />
          </div>
        </Etapa>
      )}

      {passo === 'revisao' && (
        <Etapa titulo="Confirmar agendamento" icone={<Check size={18} />}>
          <div className="card">
            <Resumo nome={nome} dataStr={dataStr} hora={hora} />
          </div>
          {erro && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erro}</p>}
          <button type="button" className="btn btn-primary btn-block" onClick={confirmarAgendamento} disabled={salvando}>
            {salvando ? 'Confirmando…' : 'Confirmar agendamento'}
          </button>
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
            <Resumo nome={nome} dataStr={dataStr} hora={hora} />
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

          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={novoAgendamento}>
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

function Resumo({ nome, dataStr, hora }) {
  const d = dataStr ? new Date(`${dataStr}T00:00:00`) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
      <Linha label="Nome" valor={nome} />
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
