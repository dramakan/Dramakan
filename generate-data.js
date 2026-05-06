const admin = require('firebase-admin');
const fs = require('fs');

// 1. Grab the secret key from Netlify's secure vault
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKey) {
  console.error("FATAL ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is missing!");
  process.exit(1);
}

// 2. Convert the text back into a JSON object
const serviceAccount = JSON.parse(serviceAccountKey);

// 3. Connect to your specific Firebase project
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dramakan007.firebaseio.com" 
});

const db = admin.firestore();

async function generateJson() {
  try {
    console.log("Connecting to Firestore...");
    const snapshot = await db.collection('dramas').get();
    const dramas = [];
    
    snapshot.forEach(doc => {
      dramas.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Successfully fetched ${dramas.length} dramas.`);
    
    // 4. Save the data to a static file right next to your index.html
    fs.writeFileSync('./dramas.json', JSON.stringify(dramas));
    console.log('dramas.json file successfully generated!');
    
  } catch (error) {
    console.error("Error generating JSON: ", error);
    process.exit(1); // Tell Netlify to fail the build if it crashes
  }
}

generateJson();