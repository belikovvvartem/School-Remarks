const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyC-yPpMl9odK5ARLJJA34-q5e_IeFdOP0w",
    authDomain: "school-remarks-dobrianske.firebaseapp.com",
    projectId: "school-remarks-dobrianske",
    storageBucket: "school-remarks-dobrianske.firebasestorage.app",
    messagingSenderId: "109159636975",
    appId: "1:109159636975:web:e02e9644d6818940fce01a",
    measurementId: "G-CDFJR46EGM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db };