// Avisa o barbeiro por push quando o aniversário de um cliente está chegando
// (dentro dos próximos 3 dias). Roda uma vez ao dia.
//
// Chamado periodicamente por um serviço de cron externo (ex: cron-job.org),
// batendo em /api/send-birthday-alerts?secret=SEU_SEGREDO uma vez por dia.
// Veja o README.md para configurar as variáveis de ambiente necessárias.

import admin from 'firebase-admin';

const JANELA_AVISO_DIAS = 3;

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

function hojeComoBR() {
  const agora = new Date(Date.now() - OFFSET_MS);
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
}

function diasParaAniversario(aniversario, hoje) {
  const [, mes, dia] = aniversario.split('-').map(Number);
  let proxima = new Date(Date.UTC(hoje.getUTCFullYear(), mes - 1, dia));
  if (proxima < hoje) proxima = new Date(Date.UTC(hoje.getUTCFullYear() + 1, mes - 1, dia));
  return Math.round((proxima - hoje) / 86400000);
}

export default async function handler(req, res) {
  if (req.query.secret !== process.env.REMINDER_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const app = getApp();
    const db = admin.firestore(app);

    const [clientesSnap, configSnap] = await Promise.all([
      db.collection('clientes').get(),
      db.collection('config').doc('geral').get(),
    ]);

    const tokens = configSnap.exists ? configSnap.data().barberTokens || [] : [];
    const hoje = hojeComoBR();
    const anoAtual = hoje.getUTCFullYear();
    let enviados = 0;

    for (const docSnap of clientesSnap.docs) {
      const c = docSnap.data();
      if (!c.aniversario) continue;

      const dias = diasParaAniversario(c.aniversario, hoje);
      if (dias > JANELA_AVISO_DIAS) continue;
      if (c.ultimoAvisoAniversarioAno === anoAtual) continue;

      const quando = dias === 0 ? 'é hoje' : dias === 1 ? 'é amanhã' : `é em ${dias} dias`;

      for (const token of tokens) {
        try {
          await admin.messaging(app).send({
            token,
            notification: {
              title: '🎂 Aniversário chegando!',
              body: `O aniversário de ${c.nome || c.telefone} ${quando}.`,
            },
          });
          enviados++;
        } catch (err) {
          console.error(`Falha ao notificar aniversário de ${docSnap.id}:`, err.message);
        }
      }

      await docSnap.ref.update({ ultimoAvisoAniversarioAno: anoAtual });
    }

    res.status(200).json({ ok: true, enviados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
