import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, VAPID_KEY } from './firebase';

// Pede permissão de notificação e devolve o token do FCM (ou null se o
// usuário recusar, o navegador não suportar push, ou a VAPID key não
// estiver configurada ainda).
export async function pedirTokenNotificacao() {
  try {
    if (!(await isSupported())) return null;
    if (!VAPID_KEY || VAPID_KEY === 'sua-vapid-key-aqui') return null;

    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (err) {
    console.error('Não foi possível ativar notificações:', err);
    return null;
  }
}
