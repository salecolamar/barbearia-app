// Service worker do Cloud Messaging: recebe as notificações de lembrete
// quando o app está fechado ou em segundo plano.
// IMPORTANTE: copie aqui os mesmos valores de firebaseConfig usados em src/firebase.js.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC7Jvao7L3b1zpXnve9NPfbOB0zS2Ju08I',
  authDomain: 'barbearia-1778e.firebaseapp.com',
  projectId: 'barbearia-1778e',
  storageBucket: 'barbearia-1778e.firebasestorage.app',
  messagingSenderId: '992952424450',
  appId: '1:992952424450:web:6d2cf757b3c15cb595af1b',
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
