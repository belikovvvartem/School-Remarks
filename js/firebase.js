import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

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
const auth = getAuth(app);

export { db, auth };