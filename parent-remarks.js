let studentCodes = JSON.parse(localStorage.getItem('studentCodes')) || [];

window.onload = function () {
    if (studentCodes.length > 0) {
        document.getElementById('parentLogin').classList.remove('active');
        document.getElementById('remarksList').classList.add('active');
        loadRemarks();
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
    loadRemarks();
}

function loadRemarks() {
    const remarksContainer = document.getElementById('remarksContainer');
    firebase.firestore().collection('students').where('code', 'in', studentCodes).get().then(studentsSnapshot => {
        const studentNames = studentsSnapshot.docs.map(doc => doc.data().name);

        firebase.firestore().collection('remarks').onSnapshot(snapshot => {
            const remarks = [];
            snapshot.forEach(doc => {
                const remark = doc.data();
                if (studentNames.includes(remark.student)) {
                    remarks.push(remark);
                }
            });

            remarks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            remarksContainer.innerHTML = '';
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
        });
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