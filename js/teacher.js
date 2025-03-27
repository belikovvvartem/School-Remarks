import { db } from './firebase.js';
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

async function checkCode() {
    const code = document.getElementById("teacherCode").value.trim();
    if (!code || !/^\d{4}$/.test(code)) {
        alert("Введіть 4-значний код!");
        return;
    }
    try {
        const q = query(collection(db, "teachers"), where("accessCode", "==", code));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const teacherData = snapshot.docs[0].data();
            localStorage.setItem("currentTeacher", JSON.stringify(teacherData));
            window.location.href = "teacher.html";
        } else {
            alert("Невірний код!");
        }
    } catch (error) {
        console.error("Помилка при перевірці коду:", error);
        alert("Щось пішло не так.");
    }
}

function loadTeacherData() {
    const currentTeacher = JSON.parse(localStorage.getItem("currentTeacher"));
    const greeting = document.getElementById("teacherGreeting");
    const subjectSelect = document.getElementById("subjectSelect");
    const classSelect = document.getElementById("classSelect");

    if (!currentTeacher) {
        console.error("Помилка: Дані вчителя відсутні");
        alert("Дані вчителя не знайдені. Увійдіть знову.");
        window.location.href = "index.html";
        return;
    }

    greeting.textContent = `Вітаємо, ${currentTeacher.name}!`;

    currentTeacher.subjects.forEach(subject => {
        const option = document.createElement("option");
        option.value = subject;
        option.text = subject;
        subjectSelect.appendChild(option);
    });

    currentTeacher.classes.forEach(className => {
        const option = document.createElement("option");
        option.value = className;
        option.text = className;
        classSelect.appendChild(option);
    });

    if (currentTeacher.classes.length > 0) {
        loadStudents(currentTeacher.classes[0]);
    }
}

async function loadStudents(classId) {
    const studentSelect = document.getElementById("studentSelect");
    if (!studentSelect || !classId) return;

    studentSelect.innerHTML = '<option disabled selected>Виберіть учня</option>';
    try {
        const q = query(collection(db, "students"), where("classId", "==", classId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            studentSelect.innerHTML += '<option disabled>Немає учнів</option>';
        } else {
            snapshot.forEach(doc => {
                const student = doc.data();
                const option = document.createElement("option");
                option.value = student.parentCode; // Зміна на parentCode
                option.text = student.name;
                studentSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Помилка при завантаженні учнів:", error);
    }
}

async function addRemark() {
    const currentTeacher = JSON.parse(localStorage.getItem("currentTeacher"));
    const subject = document.getElementById("subjectSelect").value;
    const classId = document.getElementById("classSelect").value;
    const studentId = document.getElementById("studentSelect").value; // Тепер це parentCode
    const remarkText = document.getElementById("remarkText").value.trim();

    if (!subject || !classId || !studentId || !remarkText || subject === "Виберіть предмет" || classId === "Виберіть клас" || studentId === "Виберіть учня") {
        alert("Заповніть усі поля!");
        return;
    }

    try {
        const remarkRef = await addDoc(collection(db, "remarks"), {
            teacherId: currentTeacher.accessCode,
            studentId, // Зберігаємо parentCode як studentId
            subject,
            classId,
            remarkText,
            timestamp: new Date()
        });
        console.log("Зауваження додано з ID:", remarkRef.id);
        alert("Зауваження додано!");
        document.getElementById("remarkText").value = "";
    } catch (error) {
        console.error("Помилка:", error);
        alert("Не вдалося додати зауваження.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
        document.getElementById("checkCodeBtn").addEventListener("click", checkCode);
    }
    if (window.location.pathname.includes("teacher.html")) {
        loadTeacherData();
        document.getElementById("addRemarkBtn").addEventListener("click", addRemark);
    }
});