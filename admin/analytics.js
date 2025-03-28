import { db } from '../firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let remarks = [];
let teachers = [];
let students = [];

async function loadInitialData() {
  const remarksSnapshot = await getDocs(collection(db, 'remarks'));
  remarks = remarksSnapshot.docs.map(doc => doc.data());
  const teachersSnapshot = await getDocs(collection(db, 'teachers'));
  teachers = teachersSnapshot.docs.map(doc => ({ name: doc.data().name, code: doc.data().code }));
  const studentsSnapshot = await getDocs(collection(db, 'students'));
  students = studentsSnapshot.docs.map(doc => doc.data());

  loadAllAnalytics();
  loadRemarksByPeriod();
  loadCharts();
}

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');
}

async function loadRemarksByPeriod() {
  const period = document.getElementById('periodSelect').value;
  const now = new Date();
  let startDate;

  if (period === 'day') {
    startDate = new Date(now.setHours(0, 0, 0, 0));
  } else if (period === 'week') {
    startDate = new Date(now.setDate(now.getDate() - now.getDay()));
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const filteredRemarks = remarks.filter(remark => {
    const remarkDate = new Date(remark.timestamp);
    return remarkDate >= startDate;
  });

  document.getElementById('remarksCount').textContent = `Кількість зауважень: ${filteredRemarks.length}`;
}

function loadCharts() {
  const subjectStats = {};
  remarks.forEach(remark => {
    subjectStats[remark.subject] = (subjectStats[remark.subject] || 0) + 1;
  });
  new Chart(document.getElementById('subjectChart'), {
    type: 'pie',
    data: {
      labels: Object.keys(subjectStats),
      datasets: [{
        data: Object.values(subjectStats),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
      }]
    },
    options: { title: { display: true, text: 'Зауваження по предметах' } }
  });

  const teacherStats = {};
  remarks.forEach(remark => {
    teacherStats[remark.teacher] = (teacherStats[remark.teacher] || 0) + 1;
  });
  new Chart(document.getElementById('teacherChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(teacherStats),
      datasets: [{
        label: 'Кількість зауважень',
        data: Object.values(teacherStats),
        backgroundColor: '#36A2EB'
      }]
    },
    options: { scales: { y: { beginAtZero: true } }, title: { display: true, text: 'Зауваження по вчителях' } }
  });
}

function showDetails(type, name) {
  const details = remarks.filter(remark => 
    (type === 'teacher' && remark.teacher === name) || 
    (type === 'student' && remark.student === name)
  );
  document.getElementById('popupTitle').textContent = `Зауваження для ${name}`;
  document.getElementById('popupDetails').innerHTML = details
    .map(remark => `<li>${remark.timestamp} — ${remark.subject}: ${remark.text}</li>`)
    .join('');
  document.getElementById('detailsPopup').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
}

function hideDetails() {
  document.getElementById('detailsPopup').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
}

async function downloadCodes() {
  if (typeof XLSX === 'undefined') {
    alert('Помилка: бібліотека XLSX не завантажена. Перевірте підключення до інтернету та спробуйте ще раз.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Аркуш для вчителів
  const teacherData = teachers.map(teacher => [teacher.name, teacher.code]);
  teacherData.unshift(["Вчитель", "Код"]);
  const teacherSheet = XLSX.utils.aoa_to_sheet(teacherData);
  XLSX.utils.book_append_sheet(wb, teacherSheet, "Вчителі");

  // Аркуші для учнів по класах
  const classOrder = Array.from({ length: 11 }, (_, i) => `${11 - i}-А`).concat(
    Array.from({ length: 11 }, (_, i) => `${11 - i}-Б`)
  );
  const sortedStudents = [...students].sort((a, b) => classOrder.indexOf(a.class) - classOrder.indexOf(b.class));
  const studentDataByClass = {};
  
  sortedStudents.forEach(student => {
    if (!studentDataByClass[student.class]) {
      studentDataByClass[student.class] = [];
    }
    studentDataByClass[student.class].push([student.name, student.code]);
  });

  Object.entries(studentDataByClass).forEach(([className, classStudents]) => {
    const studentData = [["Учень", "Код"], ...classStudents];
    const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
    XLSX.utils.book_append_sheet(wb, studentSheet, className);
  });

  // Завантаження файлу
  XLSX.writeFile(wb, "school_codes.xlsx");
}

function loadAllAnalytics() {
  // Зауваження по вчителях
  const teacherStats = {};
  remarks.forEach(remark => {
    teacherStats[remark.teacher] = (teacherStats[remark.teacher] || 0) + 1;
  });
  document.getElementById('teacherStats').innerHTML = Object.entries(teacherStats)
    .map(([teacher, count]) => `<li><span class="clickable" onclick="showDetails('teacher', '${teacher}')">${teacher}</span>: ${count} зауважень</li>`)
    .join('');

  // Зауваження по учнях
  const studentStats = {};
  remarks.forEach(remark => {
    studentStats[remark.student] = (studentStats[remark.student] || 0) + 1;
  });
  document.getElementById('studentStats').innerHTML = Object.entries(studentStats)
    .map(([student, count]) => {
      const emoji = count > 5 ? '😡' : count > 0 ? '😐' : '😊';
      return `<li><span class="clickable" onclick="showDetails('student', '${student}')">${student}</span>: ${count} зауважень ${emoji}</li>`;
    })
    .join('');

  // Зауваження по предметах
  const subjectStats = {};
  remarks.forEach(remark => {
    subjectStats[remark.subject] = (subjectStats[remark.subject] || 0) + 1;
  });
  document.getElementById('subjectStats').innerHTML = Object.entries(subjectStats)
    .map(([subject, count]) => `<li>${subject}: ${count} зауважень</li>`)
    .join('');

  // Активність вчителів
  const teacherActivity = {};
  teachers.forEach(teacher => {
    teacherActivity[teacher.name] = teacherStats[teacher.name] || 0;
  });
  const totalRemarks = remarks.length;
  document.getElementById('teacherActivity').innerHTML = Object.entries(teacherActivity)
    .map(([teacher, count]) => {
      const percentage = totalRemarks > 0 ? ((count / totalRemarks) * 100).toFixed(2) : 0;
      const emoji = percentage > 50 ? '🔥' : percentage >= 20 ? '🌟' : '😴';
      return `<li><span class="clickable" onclick="showDetails('teacher', '${teacher}')">${teacher}</span>: ${count} зауважень (${percentage}%) ${emoji}</li>`;
    })
    .join('');

  // Список усіх учнів (11-1 класи)
  const classOrder = Array.from({ length: 11 }, (_, i) => `${11 - i}-А`).concat(
    Array.from({ length: 11 }, (_, i) => `${11 - i}-Б`)
  );
  const sortedStudents = students.sort((a, b) => classOrder.indexOf(a.class) - classOrder.indexOf(b.class));
  document.getElementById('allStudentsList').innerHTML = sortedStudents
    .map(student => `<li>${student.name} (${student.class}, код: ${student.code})</li>`)
    .join('');

  // Список усіх вчителів із кодами та смайликами
  const emojis = ['👩‍🏫', '👨‍🏫', '📚', '✏️', '🎓', '🖋️'];
  document.getElementById('allTeachersList').innerHTML = teachers
    .map(teacher => {
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      return `<li>${teacher.name} — Код: ${teacher.code} ${randomEmoji}</li>`;
    })
    .join('');

  // Список усіх зауважень
  document.getElementById('allRemarksList').innerHTML = remarks
    .map(remark => `<li>${remark.timestamp} — ${remark.teacher} для ${remark.student} (${remark.subject}): ${remark.text}</li>`)
    .join('');
}

window.showSection = showSection;
window.loadRemarksByPeriod = loadRemarksByPeriod;
window.showDetails = showDetails;
window.hideDetails = hideDetails;
window.downloadCodes = downloadCodes;

loadInitialData();