// Envia notificação de lembrete (push) para clientes com agendamento
// confirmado começando dentro dos próximos 30 minutos.
//
// Chamado periodicamente por um serviço de cron externo (ex: cron-job.org),
// batendo em /api/send-reminders?secret=SEU_SEGREDO a cada 10 minutos.
// Veja o README.md para configurar as variáveis de ambiente necessárias.

import admin from 'firebase-admin';

const JANELA_LEMBRETE_MIN = 30;

function getApp() {
  if (admin.apps.length) return admin.apps[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY não configurada');
  const serviceAccount = JSON.parse(raw);

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Brasil (São Paulo) não usa mais horário de verão: UTC-3 o ano todo.
const OFFSET_MS = 3 * 60 * 60 * 1000;

function agoraComoBR() {
  return new Date(Date.now() - OFFSET_MS);
}

export default async function handler(req, res) {
  if (req.query.secret !== process.env.REMINDER_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const app = getApp();
    const db = admin.firestore(app);

    const snap = await db
      .collection('agendamentos')
      .where('status', '==', 'confirmado')
      .where('lembreteEnviado', '==', false)
      .get();

    const nowBR = agoraComoBR();
    let enviados = 0;

    for (const docSnap of snap.docs) {
      const a = docSnap.data();
      if (!a.fcmToken || !a.data || !a.hora) continue;

      const [y, m, d] = a.data.split('-').map(Number);
      const [hh, mm] = a.hora.split(':').map(Number);
      const apptBR = new Date(Date.UTC(y, m - 1, d, hh, mm));
      const diffMin = (apptBR.getTime() - nowBR.getTime()) / 60000;

      if (diffMin <= 0 || diffMin > JANELA_LEMBRETE_MIN) continue;

      const servicosTexto = a.servicos?.length ? a.servicos.map((s) => s.nome).join(', ') : 'seu horário';

      try {
        await admin.messaging(app).send({
          token: a.fcmToken,
          notification: {
            title: 'Seu horário está chegando!',
            body: `${servicosTexto} às ${a.hora} com ${a.barbeiroNome}.`,
          },
        });
        await docSnap.ref.update({ lembreteEnviado: true });
        enviados++;
      } catch (err) {
        console.error(`Falha ao enviar lembrete ${docSnap.id}:`, err.message);
        await docSnap.ref.update({ lembreteEnviado: true });
      }
    }

    res.status(200).json({ ok: true, enviados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
