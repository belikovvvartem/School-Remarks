import { db } from '../firebase-config.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

function generateCode() {
  return Math.floor(100 + Math.random() * 900).toString(); // Тризначний код (100-999)
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
  if (pass === 'helloworld') {
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('logIn').style.display = 'none';
    loadClasses();
    await loadRemarks();
  } else {
    alert('Невірний пароль');
  }
}

async function addTeacher() {
  const name = document.getElementById('teacherName').value;
  let code = document.getElementById('teacherCode').value || generateCode();
  const subjects = Array.from(document.querySelectorAll('input[name="subject"]:checked')).map(cb => cb.value);
  const classes = Array.from(document.querySelectorAll('input[name="class"]:checked')).map(cb => cb.value);
  await addDoc(collection(db, 'teachers'), { name, code, subjects, classes });
  alert(`Вчителя додано. Код: ${code}`);
}

async function addStudent() {
  const name = document.getElementById('studentName').value;
  const studentClass = document.getElementById('studentClass').value;
  let code = document.getElementById('studentCode').value || generateCode();
  await addDoc(collection(db, 'students'), { name, class: studentClass, code });
  alert(`Учня додано. Код: ${code}`);
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

window.loginAdmin = loginAdmin;
window.addTeacher = addTeacher;
window.addStudent = addStudent;