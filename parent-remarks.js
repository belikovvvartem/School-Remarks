let studentCodes = JSON.parse(localStorage.getItem('studentCodes')) || [];
let studentNamesMap = new Map();
let currentFilter = 'all';
let unsubscribeRemarks = null; // Для відписки від onSnapshot
let remarksData = []; // Зберігатимемо зауваження для підрахунку

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
    document.getElementById('settingsButton').addEventListener('click', showSettingsModal);
    document.getElementById('myChildrenButton').addEventListener('click', showMyChildrenModal);
    document.getElementById('addChildButton').addEventListener('click', addChild);
    document.getElementById('resetButton').addEventListener('click', showConfirmResetModal);
    document.getElementById('backButton').addEventListener('click', hideMyChildrenModal);
    document.getElementById('closeSettingsButton').addEventListener('click', hideSettingsModal);
    document.getElementById('backToRemarksButton').addEventListener('click', backToRemarks);
    document.getElementById('confirmReset').addEventListener('click', resetCodes);
    document.getElementById('cancelReset').addEventListener('click', hideConfirmResetModal);
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
        studentNamesMap.set(code, { name: studentName, class: studentsSnapshot.docs[0].data().class });
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

function backToRemarks() {
    document.getElementById('parentLogin').classList.remove('active');
    document.getElementById('remarksList').classList.add('active');
}

async function loadStudentNames() {
    const studentsSnapshot = await firebase.firestore().collection('students').where('code', 'in', studentCodes).get();
    studentNamesMap.clear();
    studentsSnapshot.forEach(doc => {
        const studentData = doc.data();
        studentNamesMap.set(doc.data().code, { name: studentData.name, class: studentData.class });
    });
}

function populateFilter() {
    const filterButtons = document.getElementById('filterButtons');
    filterButtons.innerHTML = '<button class="filter-button active" data-code="all">Усі діти</button>';
    studentCodes.forEach((code, index) => {
        const student = studentNamesMap.get(code) || { name: `Дитина ${index + 1}` };
        filterButtons.innerHTML += `<button class="filter-button" data-code="${code}">${student.name}</button>`;
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
        ? Array.from(studentNamesMap.values()).map(student => student.name) 
        : [studentNamesMap.get(currentFilter).name];

    remarksContainer.innerHTML = '';
    if (noRemarks) {
        noRemarks.classList.remove('show');
    }

    // Відписуємося від попереднього onSnapshot, якщо він існує
    if (unsubscribeRemarks) {
        unsubscribeRemarks();
    }

    // Підписуємося на нові дані
    unsubscribeRemarks = firebase.firestore().collection('remarks').onSnapshot(snapshot => {
        remarksData = [];
        snapshot.forEach(doc => {
            const remark = doc.data();
            if (filteredNames.includes(remark.student)) {
                remarksData.push(remark);
            }
        });

        remarksData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        remarksContainer.innerHTML = '';
        if (remarksData.length === 0) {
            if (noRemarks) {
                noRemarks.classList.add('show');
            }
        } else {
            if (noRemarks) {
                noRemarks.classList.remove('show');
            }
            remarksData.forEach(remark => {
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

function showSettingsModal() {
    document.getElementById('settingsModal').classList.add('show');
}

function hideSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('closing');
    modal.addEventListener('animationend', () => {
        modal.classList.remove('show', 'closing');
    }, { once: true });
}

function showMyChildrenModal() {
    document.getElementById('settingsModal').classList.remove('show');
    const childrenList = document.getElementById('childrenList');
    childrenList.innerHTML = '';

    studentCodes.forEach(code => {
        const student = studentNamesMap.get(code);
        const studentRemarks = remarksData.filter(remark => remark.student === student.name);
        const remarkCount = studentRemarks.length;

        // Підрахунок зауважень за предметами
        const subjectStats = {};
        studentRemarks.forEach(remark => {
            subjectStats[remark.subject] = (subjectStats[remark.subject] || 0) + 1;
        });

        // Формуємо HTML для статистики
        let statsHTML = '<div class="stats">';
        if (Object.keys(subjectStats).length === 0) {
            statsHTML += '<p>Немає зауважень.</p>';
        } else {
            for (const [subject, count] of Object.entries(subjectStats)) {
                statsHTML += `<p>${subject}: ${count} зауваж.</p>`;
            }
        }
        statsHTML += '</div>';

        const remarkClass = remarkCount > 0 ? 'has-remarks' : 'no-remarks';

        childrenList.innerHTML += `
            <div class="child-info ${remarkClass}">
                <p><strong>Ім'я:</strong> ${student.name}</p>
                <p><strong>ID:</strong> ${code}</p>
                <p><strong>Клас:</strong> ${student.class}</p>
                <p><strong>Всього зауважень:</strong> ${remarkCount}</p>
                <button class="delete-button" data-code="${code}">Видалити</button>
            </div>
        `;
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', () => {
            const code = button.getAttribute('data-code');
            deleteChild(code);
        });
    });

    document.getElementById('myChildrenModal').classList.add('show');
}

function hideMyChildrenModal() {
    const modal = document.getElementById('myChildrenModal');
    modal.classList.add('closing');
    modal.addEventListener('animationend', () => {
        modal.classList.remove('show', 'closing');
        document.getElementById('settingsModal').classList.add('show');
    }, { once: true });
}

function deleteChild(code) {
    studentCodes = studentCodes.filter(c => c !== code);
    studentNamesMap.delete(code);
    localStorage.setItem('studentCodes', JSON.stringify(studentCodes));
    if (studentCodes.length === 0) {
        document.getElementById('myChildrenModal').classList.remove('show');
        document.getElementById('settingsModal').classList.remove('show');
        document.getElementById('remarksList').classList.remove('active');
        document.getElementById('parentLogin').classList.add('active');
    } else {
        showMyChildrenModal();
        populateFilter();
        loadRemarks();
    }
}

function addChild() {
    document.getElementById('settingsModal').classList.remove('show');
    document.getElementById('remarksList').classList.remove('active');
    document.getElementById('parentLogin').classList.add('active');
    document.getElementById('studentCode').value = '';
}

function showConfirmResetModal() {
    document.getElementById('settingsModal').classList.remove('show');
    document.getElementById('confirmResetModal').classList.add('show');
}

function hideConfirmResetModal() {
    const modal = document.getElementById('confirmResetModal');
    modal.classList.add('closing');
    modal.addEventListener('animationend', () => {
        modal.classList.remove('show', 'closing');
        document.getElementById('settingsModal').classList.add('show');
    }, { once: true });
}

function resetCodes() {
    studentCodes = [];
    studentNamesMap.clear();
    remarksData = [];
    localStorage.removeItem('studentCodes');
    document.getElementById('confirmResetModal').classList.remove('show');
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