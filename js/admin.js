import { db } from './firebase.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const classes = [];
for (let i = 1; i <= 11; i++) {
    classes.push(`${i}-А`, `${i}-Б`);
}

async function loadAdminData() {
    const classButtons = document.getElementById("classButtons");
    classes.forEach(className => {
        const button = document.createElement("button");
        button.textContent = className;
        button.onclick = () => openStudentModal(className);
        classButtons.appendChild(button);
    });

    const subjectsSnapshot = await getDocs(collection(db, "subjects"));
    const teacherSubjects = document.getElementById("teacherSubjects");
    const teacherClasses = document.getElementById("teacherClasses");

    subjectsSnapshot.forEach(doc => {
        const subject = doc.data().name;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = subject;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${subject}`));
        teacherSubjects.appendChild(label);
    });

    classes.forEach(className => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = className;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${className}`));
        teacherClasses.appendChild(label);
    });
}

function openStudentModal(className) {
    const modal = document.getElementById("studentModal");
    document.getElementById("modalClassName").textContent = className;
    modal.classList.add("active");
}

async function addStudent() {
    const name = document.getElementById("studentName").value.trim();
    const parentCode = document.getElementById("parentCode").value.trim();
    const classId = document.getElementById("modalClassName").textContent;

    if (!name || !parentCode || !/^\d{4}$/.test(parentCode)) {
        alert("Заповніть усі поля коректно!");
        return;
    }

    try {
        await addDoc(collection(db, "students"), { name, parentCode, classId });
        alert("Учня додано!");
        document.getElementById("studentName").value = "";
        document.getElementById("parentCode").value = "";
        document.getElementById("studentModal").classList.remove("active");
    } catch (error) {
        console.error("Помилка:", error);
        alert("Не вдалося додати учня.");
    }
}

async function addSubject() {
    const subjectName = document.getElementById("subjectName").value.trim();
    if (!subjectName) {
        alert("Введіть назву уроку!");
        return;
    }
    try {
        await addDoc(collection(db, "subjects"), { name: subjectName });
        alert("Урок додано!");
        document.getElementById("subjectName").value = "";
        loadAdminData(); // Оновити список
    } catch (error) {
        console.error("Помилка:", error);
        alert("Не вдалося додати урок.");
    }
}

async function addTeacher() {
    const name = document.getElementById("teacherName").value.trim();
    const code = document.getElementById("teacherCode").value.trim();
    const subjects = Array.from(document.querySelectorAll("#teacherSubjects input:checked")).map(cb => cb.value);
    const classes = Array.from(document.querySelectorAll("#teacherClasses input:checked")).map(cb => cb.value);

    if (!name || !code || !/^\d{4}$/.test(code) || subjects.length === 0 || classes.length === 0) {
        alert("Заповніть усі поля коректно!");
        return;
    }

    try {
        await addDoc(collection(db, "teachers"), { name, accessCode: code, subjects, classes });
        alert("Вчителя додано!");
        document.getElementById("teacherName").value = "";
        document.getElementById("teacherCode").value = "";
        document.querySelectorAll("#teacherSubjects input").forEach(cb => cb.checked = false);
        document.querySelectorAll("#teacherClasses input").forEach(cb => cb.checked = false);
    } catch (error) {
        console.error("Помилка:", error);
        alert("Не вдалося додати вчителя.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdminData();
    document.getElementById("saveStudentBtn").addEventListener("click", addStudent);
    document.getElementById("addSubjectBtn").addEventListener("click", addSubject);
    document.getElementById("addTeacherBtn").addEventListener("click", addTeacher);
});