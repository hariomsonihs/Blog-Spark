importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCkw9HIjuET67of-fWDuHMjvBddr6ooA2Y",
  authDomain: "blogspark-9d104.firebaseapp.com",
  projectId: "blogspark-9d104",
  storageBucket: "blogspark-9d104.firebasestorage.app",
  messagingSenderId: "495239379893",
  appId: "1:495239379893:web:fb333990d40f51a473b7fc",
});

const messaging = firebase.messaging();

// Background notification handler
messaging.onBackgroundMessage((payload) => {
  const { title, body, data } = payload.notification || payload.data || {};
  self.registration.showNotification(title || "BlogSpark", {
    body: body || "",
    icon: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
    data: data || payload.data || {},
    tag: payload.data?.id || "blogspark",
    renotify: true,
  });
});

// Notification click → open the content page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = d.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
