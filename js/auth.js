import { auth } from './firebase.js';
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

export function adminLogin(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Адмін увійшов:", userCredential.user);
            window.location.href = "admin.html";
        })
        .catch((error) => {
            console.error("Помилка входу:", error);
            alert("Невірний email або пароль");
        });
}

export function logout() {
    return signOut(auth);
}