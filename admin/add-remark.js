import { db } from '../firebase-config.js';
import { collection, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let teacher = [];
let subjects = [];
let classes = [];
let students = [];

async function verifyTeacher() {
  const teacherCode = document.getElementById('teacherCode').value;
  if (teacherCode.length !== 3 || isNaN(teacherCode)) {
    showNotification('Будь ласка, введіть коректний код (3 цифри).', true);
    return;
  }

  const teachersSnapshot = await getDocs(query(collection(db, 'teachers'), where('code', '==', teacherCode)));
  if (teachersSnapshot.empty) {
    showNotification('Невірний код вчителя.', true);
    return;
  }

  teacher = teachersSnapshot.docs[0].data();
  subjects = teacher.subjects || [];
  classes = teacher.classes || [];

  document.getElementById('teacherLogin').classList.remove('active');
  document.getElementById('remarkForm').classList.add('active');
  const teacherGreeting = document.getElementById('teacherGreeting');
  teacherGreeting.innerHTML = `Вітаємо,<br>👩‍🏫 ${teacher.name}`;
  teacherGreeting.style.display = 'block';
  const btnExit = document.getElementById('exit');
  btnExit.style.display = 'block';
  const nav = document.getElementById('nav');
  nav.style.width = '150px';
  

  // Заповнюємо предмети
  const subjectSelect = document.getElementById('subject');
  subjectSelect.innerHTML = subjects.map(subject => `<option value="${subject}">${subject}</option>`).join('');

  const classSelect = document.getElementById('class');
  classSelect.innerHTML = classes.map(cls => `<option value="${cls}">${cls}</option>`).join('');

  await loadStudents();
}


async function loadStudents() {
  const selectedClass = document.getElementById('class').value;
  const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('class', '==', selectedClass)));
  students = studentsSnapshot.docs.map(doc => doc.data());

  const studentSelect = document.getElementById('student');
  studentSelect.innerHTML = students.map(student => `<option value="${student.name}">${student.name}</option>`).join('');
}

async function addRemark() {
  const subject = document.getElementById('subject').value;
  const selectedClass = document.getElementById('class').value;
  const student = document.getElementById('student').value;
  const remarkText = document.getElementById('remarkText').value;

  if (!subject || !selectedClass || !student || !remarkText) {
    showNotification('Будь ласка, заповніть усі поля.', true);
    return;
  }

  const remark = {
    teacher: teacher.name,
    subject: subject,
    class: selectedClass,
    student: student,
    text: remarkText,
    timestamp: new Date().toISOString(),
    parentViewed: false
  };

  try {
    await addDoc(collection(db, 'remarks'), remark);
    showNotification('Зауваження успішно додано!');
    
    resetForm();
  } catch (error) {
    console.error('Помилка при додаванні зауваження:', error);
    showNotification('Сталася помилка при додаванні зауваження.', true);
  }
}

function resetForm() {
  document.getElementById('subject').selectedIndex = 0;
  document.getElementById('class').selectedIndex = 0;
  document.getElementById('student').selectedIndex = 0;
  document.getElementById('remarkText').value = '';

  loadStudents();
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

window.verifyTeacher = verifyTeacher;
window.loadStudents = loadStudents;
window.addRemark = addRemark;




document.getElementById('howToUs').addEventListener('click', function() {
    document.getElementById('instructions').style.display = 'block';
});

document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('instructions').style.display = 'none';
});

document.getElementById('instructions').addEventListener('click', function(e) {
    if (e.target === this) {
        this.style.display = 'none';
    }
});







const body = document.body;

const colors = [
    '#ffffff', '#cccccc', '#999999', '#666666', 
    '#ff9999', '#99ccff', '#ccff99', '#ffff99'
];

function createBalls() {
    const ballCount = 25; 
    const balls = [];

    for (let i = 0; i < ballCount; i++) {
        const ball = document.createElement('div');
        ball.classList.add('ball');

        const size = Math.random() * 100 + 80; 
        ball.style.width = `${size}px`;
        ball.style.height = `${size}px`;

        ball.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        let x = Math.random() * (window.innerWidth - size);
        let y = Math.random() * (window.innerHeight - size);
        ball.style.left = `${x}px`;
        ball.style.top = `${y}px`;

        
        let speedX = (Math.random() - 0.5) * 6; 
        let speedY = (Math.random() - 0.5) * 6; 

        balls.push({ element: ball, x, y, speedX, speedY, size });

        body.appendChild(ball);
    }

    function animate() {
        balls.forEach(ball => {
            ball.x += ball.speedX;
            ball.y += ball.speedY;

            if (ball.x <= 0 || ball.x + ball.size >= window.innerWidth) {
                ball.speedX = -ball.speedX; 
            }
            if (ball.y <= 0 || ball.y + ball.size >= window.innerHeight) {
                ball.speedY = -ball.speedY; 
            }

            ball.x = Math.max(0, Math.min(ball.x, window.innerWidth - ball.size));
            ball.y = Math.max(0, Math.min(ball.y, window.innerHeight - ball.size));

            ball.element.style.left = `${ball.x}px`;
            ball.element.style.top = `${ball.y}px`;
        });

        requestAnimationFrame(animate);
    }

    animate();
}

window.onload = createBalls;