// firebase-messaging-sw.js
// We must use the 'compat' libraries for the service worker
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007",
    storageBucket: "dramakan007.firebasestorage.app",
    messagingSenderId: "1069933586213",
    appId: "1:1069933586213:web:b28ab37436679a4906dccc"
});

const messaging = firebase.messaging();

// This handler fires when the app is running in the background
messaging.onBackgroundMessage((payload) => {
    console.log("Background message received: ", payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/images/dramakan-icon.png', // Ensure you have a logo here
        data: payload.data // Contains the link if you send one
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle what happens when the user clicks the notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data.link || "https://dramakan.site";
    event.waitUntil(clients.openWindow(urlToOpen));
});