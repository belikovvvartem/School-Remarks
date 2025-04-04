let studentCodes = JSON.parse(localStorage.getItem('studentCodes')) || [];
let studentNamesMap = new Map();
let currentFilter = 'all';

window.onload = function () {
    if (studentCodes.length > 0) {
        document.getElementById('parentLogin').classList.remove('active');
        document.getElementById('remarksList').classList.add('active');
        loadStudentNames().then(() => {
            populateFilter();
            loadRemarks();
        });
    }

    document.getElementById('addStudentButton').addEventListener('click', addStudentCode);
    document.getElementById('addMoreButton').addEventListener('click', addMoreStudent);
    document.getElementById('showRemarksButton').addEventListener('click', showRemarks);
    document.getElementById('resetButton').addEventListener('click', showConfirmModal);
    document.getElementById('confirmReset').addEventListener('click', resetCodes);
    document.getElementById('cancelReset').addEventListener('click', hideConfirmModal);
};

async function addStudentCode() {
    const code = document.getElementById('studentCode').value;
    if (code.length !== 3 || isNaN(code)) {
        showNotification('Будь ласка, введіть коректний код (3 цифри).', true);
        return;
    }

    const studentsSnapshot = await firebase.firestore().collection('students').where('code', '==', code).get();
    if (studentsSnapshot.empty) {
        showNotification('Невірний код учня.', true);
        return;
    }

    if (!studentCodes.includes(code)) {
        studentCodes.push(code);
        localStorage.setItem('studentCodes', JSON.stringify(studentCodes));
        const studentName = studentsSnapshot.docs[0].data().name;
        studentNamesMap.set(code, studentName);
    }

    document.getElementById('parentLogin').classList.remove('active');
    document.getElementById('addMorePrompt').classList.add('active');
}

function addMoreStudent() {
    document.getElementById('addMorePrompt').classList.remove('active');
    document.getElementById('parentLogin').classList.add('active');
    document.getElementById('studentCode').value = '';
}

function showRemarks() {
    document.getElementById('addMorePrompt').classList.remove('active');
    document.getElementById('remarksList').classList.add('active');
    loadStudentNames().then(() => {
        populateFilter();
        loadRemarks();
    });
}

async function loadStudentNames() {
    const studentsSnapshot = await firebase.firestore().collection('students').where('code', 'in', studentCodes).get();
    studentNamesMap.clear();
    studentsSnapshot.forEach(doc => {
        studentNamesMap.set(doc.data().code, doc.data().name);
    });
}

function populateFilter() {
    const filterButtons = document.getElementById('filterButtons');
    filterButtons.innerHTML = '<button class="filter-button active" data-code="all">Усі діти</button>';
    studentCodes.forEach((code, index) => {
        const name = studentNamesMap.get(code) || `Дитина ${index + 1}`;
        filterButtons.innerHTML += `<button class="filter-button" data-code="${code}">${name}</button>`;
    });

    const filterSection = document.getElementById('filterSection');
    filterSection.style.display = studentCodes.length > 1 ? 'block' : 'none';

    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.getAttribute('data-code');
            loadRemarks();
        });
    });
}

function loadRemarks() {
    const remarksContainer = document.getElementById('remarksContainer');
    const noRemarks = document.getElementById('noRemarks');
    const filteredNames = currentFilter === 'all' 
        ? Array.from(studentNamesMap.values()) 
        : [studentNamesMap.get(currentFilter)];

    firebase.firestore().collection('remarks').onSnapshot(snapshot => {
        const remarks = [];
        snapshot.forEach(doc => {
            const remark = doc.data();
            if (filteredNames.includes(remark.student)) {
                remarks.push(remark);
            }
        });

        remarks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        remarksContainer.innerHTML = '';
        if (remarks.length === 0) {
            noRemarks.classList.add('show');
        } else {
            noRemarks.classList.remove('show');
            remarks.forEach(remark => {
                const date = new Date(remark.timestamp);
                const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
                remarksContainer.innerHTML += `
                    <div class="remark">
                        <p class="teacher">${remark.teacher}</p>
                        <p class="subject-class">${remark.subject}, ${remark.class}</p>
                        <p class="student-remark">${remark.student} — ${remark.text}</p>
                        <span>${formattedDate}</span>
                    </div>
                `;
            });
        }
    });
}

function showConfirmModal() {
    document.getElementById('confirmModal').classList.add('show');
}

function hideConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
}

function resetCodes() {
    studentCodes = [];
    studentNamesMap.clear();
    localStorage.removeItem('studentCodes');
    document.getElementById('confirmModal').classList.remove('show');
    document.getElementById('remarksList').classList.remove('active');
    document.getElementById('parentLogin').classList.add('active');
    document.getElementById('studentCode').value = '';
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