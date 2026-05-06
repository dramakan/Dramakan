// generate-data.js (Requires Node.js environment)
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin (use your service account credentials)
admin.initializeApp({
  credential: admin.credential.cert(YOUR_SERVICE_ACCOUNT_JSON),
  databaseURL: "https://your-database-url.firebaseio.com"
});

const db = admin.firestore(); // or admin.database() if using Realtime DB

async function generateJson() {
  const snapshot = await db.collection('dramas').get();
  const dramas = [];
  snapshot.forEach(doc => {
    dramas.push({ id: doc.id, ...doc.data() });
  });

  // Write this data to a static JSON file in your web folder
  fs.writeFileSync('./public/dramas.json', JSON.stringify(dramas));
  console.log('JSON file successfully generated!');
}

generateJson();