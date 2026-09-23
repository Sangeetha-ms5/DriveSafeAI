// services/firebase.js

const admin = require("firebase-admin");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../.env")
});

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64
    ? JSON.parse(Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64,
        "base64"
    ).toString("utf8"))
    : process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : require(path.join(__dirname, "../serviceAccountKey.json"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),

        databaseURL:
            process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

const messaging = admin.messaging();

module.exports = {
    admin,
    db,
    messaging
};
