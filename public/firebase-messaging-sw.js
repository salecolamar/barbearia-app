// Service worker do Cloud Messaging: recebe as notificações de lembrete
// quando o app está fechado ou em segundo plano.
// IMPORTANTE: copie aqui os mesmos valores de firebaseConfig usados em src/firebase.js.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'sua-api-key-aqui',
  authDomain: 'seu-projeto.firebaseapp.com',
  projectId: 'seu-projeto',
  storageBucket: 'seu-projeto.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Barbearia', {
    body: body || 'Seu horário está chegando.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  });
});
