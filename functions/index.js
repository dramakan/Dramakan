// index.js (Firebase Cloud Functions)
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendGlobalBroadcast = functions.firestore
    .document("notifications/{docId}")
    .onCreate(async (snap, context) => {
        const notifData = snap.data();

        // 1. Get all users with FCM tokens
        const usersSnapshot = await admin.firestore().collection("users").get();
        const tokens = [];

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.fcmToken) {
                // You can add logic here to filter by 'viewers' or 'creators' based on notifData.target
                tokens.push(userData.fcmToken);
            }
        });

        if (tokens.length === 0) {
            return console.log("No devices to send to.");
        }

        // 2. Build the Push Notification Payload
        const message = {
            notification: {
                title: notifData.title,
                body: notifData.message
            },
            data: {
                link: notifData.link || ""
            },
            tokens: tokens // Send to all collected tokens
        };

        // 3. Blast the notification via Firebase Admin
        try {
            const response = await admin.messaging().sendMulticast(message);
            console.log(response.successCount + " messages were sent successfully");
        } catch (error) {
            console.error("Error sending push: ", error);
        }
    });