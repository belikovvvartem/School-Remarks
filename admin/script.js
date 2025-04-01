import { db } from '../firebase-config.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

async function isCodeUnique(collectionName, code) {
    const snapshot = await getDocs(collection(db, collectionName));
    return !snapshot.docs.some(doc => doc.data().code === code);
}

async function generateCode() {
    let code;
    let isUnique = false;
    do {
        code = Math.floor(100 + Math.random() * 900).toString();
        const isUniqueInTeachers = await isCodeUnique('teachers', code);
        const isUniqueInStudents = await isCodeUnique('students', code);
        isUnique = isUniqueInTeachers && isUniqueInStudents;
    } while (!isUnique);
    return code;
}

function loadClasses() {
    const classesDiv = document.getElementById('classes');
    const studentClass = document.getElementById('studentClass');
    for (let i = 1; i <= 11; i++) {
        ['А', 'Б'].forEach(letter => {
            const className = `${i}-${letter}`;
            classesDiv.innerHTML += `<label><input type="checkbox" name="class" value="${className}"> ${className}</label><br>`;
            studentClass.innerHTML += `<option value="${className}">${className}</option>`;
        });
    }
}

async function loginAdmin() {
    const pass = document.getElementById('adminPass').value;

    if (pass === 'lyceum') {
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminRole', 'full');

        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('logIn').style.display = 'none';
        document.getElementById('goToAnalytics').style.display = 'block';
        document.getElementById('remark-list-index').style.display = 'block';

        loadClasses();
        await loadRemarks();
    } else if (pass === '20252025') {
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminRole', 'limited');

        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('logIn').style.display = 'none';
        document.getElementById('goToAnalytics').style.display = 'none';
        document.getElementById('remark-list-index').style.display = 'none';

        loadClasses();
    } else {
        showNotification('Невірний пароль', true);
    }
}

function checkAdminLogin() {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const adminRole = localStorage.getItem('adminRole');

    if (isLoggedIn === 'true') {
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('logIn').style.display = 'none';

        if (adminRole === 'full') {
            document.getElementById('goToAnalytics').style.display = 'block';
            document.getElementById('remark-list-index').style.display = 'block';
            loadClasses();
            loadRemarks();
        } else if (adminRole === 'limited') {
            document.getElementById('goToAnalytics').style.display = 'none';
            document.getElementById('remark-list-index').style.display = 'none';
            loadClasses();
        }
    }
}

window.onload = function () {
    const adminRole = localStorage.getItem('adminRole');
    if (adminRole === 'limited') {
        localStorage.removeItem('isAdminLoggedIn');
        localStorage.removeItem('adminRole');
    }
    checkAdminLogin();
};

async function addTeacher() {
    const name = document.getElementById('teacherName').value.trim();
    let code = document.getElementById('teacherCode').value || await generateCode();
    const subjects = Array.from(document.querySelectorAll('input[name="subject"]:checked')).map(cb => cb.value);
    const classes = Array.from(document.querySelectorAll('input[name="class"]:checked')).map(cb => cb.value);

    if (!name) {
        showNotification('Будь ласка, введіть ім’я вчителя.', true);
        return;
    }
    if (subjects.length === 0) {
        showNotification('Будь ласка, виберіть хоча б один предмет.', true);
        return;
    }
    if (classes.length === 0) {
        showNotification('Будь ласка, виберіть хоча б один клас.', true);
        return;
    }

    const isUniqueInTeachers = await isCodeUnique('teachers', code);
    const isUniqueInStudents = await isCodeUnique('students', code);
    if (!isUniqueInTeachers || !isUniqueInStudents) {
        showNotification('Помилка: Такий код уже існує. Спробуйте інший код.', true);
        return;
    }

    await addDoc(collection(db, 'teachers'), { name, code, subjects, classes });
    showNotification(`Вчителя додано. Код: ${code}`);
}

async function addStudent() {
    const name = document.getElementById('studentName').value;
    const studentClass = document.getElementById('studentClass').value;
    let code = document.getElementById('studentCode').value || await generateCode();

    if (!name) {
        showNotification('Будь ласка, введіть ім’я учня.', true);
        return;
    }

    const isUniqueInTeachers = await isCodeUnique('teachers', code);
    const isUniqueInStudents = await isCodeUnique('students', code);
    if (!isUniqueInTeachers || !isUniqueInStudents) {
        showNotification('Помилка: Такий код уже існує. Спробуйте інший код.', true);
        return;
    }

    await addDoc(collection(db, 'students'), { name, class: studentClass, code });
    showNotification(`Учня додано. Код: ${code}`);
}

async function loadRemarks() {
    const remarks = await getDocs(collection(db, 'remarks'));
    const remarksList = document.getElementById('remarksList');
    remarksList.innerHTML = '';
    remarks.forEach(doc => {
        const data = doc.data();
        remarksList.innerHTML += `<p>${data.teacher} (${data.subject}, ${data.class}): ${data.student} - ${data.text}</p>`;
    });
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const progressBar = document.getElementById('progressBar');

    notificationText.textContent = message;
    if (isError) {
        notification.classList.add('error');
    } else {
        notification.classList.remove('error');
    }

    const oldProgress = document.getElementById('progress');
    if (oldProgress) {
        oldProgress.remove();
    }
    const newProgress = document.createElement('div');
    newProgress.id = 'progress';
    progressBar.appendChild(newProgress);

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

window.loginAdmin = loginAdmin;
window.addTeacher = addTeacher;
window.addStudent = addStudent;