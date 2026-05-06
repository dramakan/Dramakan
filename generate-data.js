const admin = require('firebase-admin');
const fs = require('fs');

// Require the downloaded JSON file
const serviceAccount = require('./service-account.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dramakan007.firebaseio.com" // Make sure this is your actual DB URL
});

const db = admin.firestore();

async function generateJson() {
  try {
    const snapshot = await db.collection('dramas').get();
    const dramas = [];
    snapshot.forEach(doc => {
      dramas.push({ id: doc.id, ...doc.data() });
    });

    fs.writeFileSync('./public/dramas.json', JSON.stringify(dramas));
    console.log('JSON file successfully generated!');
  } catch (error) {
    console.error("Error generating JSON: ", error);
    process.exit(1); // Tell Netlify to fail the build if this crashes
  }
}

generateJson();