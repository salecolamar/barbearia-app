// Notifica o(s) barbeiro(s) por push assim que um cliente confirma um agendamento.
// Chamado pelo front-end (Booking.jsx) logo depois de criar o documento em
// "agendamentos". Se a chave de serviço não estiver configurada, simplesmente
// não faz nada (o agendamento já foi salvo normalmente).

import admin from 'firebase-admin';

function getApp() {
  if (admin.apps.length) return admin.apps[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  const serviceAccount = JSON.parse(raw);
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const app = getApp();
    if (!app) {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }

    const db = admin.firestore(app);
    const { agendamentoId } = req.body || {};
    if (!agendamentoId) {
      res.status(400).json({ error: 'agendamentoId é obrigatório' });
      return;
    }

    const [agendamentoSnap, configSnap] = await Promise.all([
      db.collection('agendamentos').doc(agendamentoId).get(),
      db.collection('config').doc('geral').get(),
    ]);

    if (!agendamentoSnap.exists) {
      res.status(404).json({ error: 'Agendamento não encontrado' });
      return;
    }

    const a = agendamentoSnap.data();
    const tokens = configSnap.exists ? configSnap.data().barberTokens || [] : [];

    let enviados = 0;
    for (const token of tokens) {
      try {
        await admin.messaging(app).send({
          token,
          notification: {
            title: 'Novo agendamento!',
            body: `${a.clienteNome} marcou ${a.data} às ${a.hora} com ${a.barbeiroNome}.`,
          },
        });
        enviados++;
      } catch (err) {
        console.error('Falha ao notificar barbeiro:', err.message);
      }
    }

    res.status(200).json({ ok: true, enviados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
