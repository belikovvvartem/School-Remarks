const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert('./config/serviceAccountKey.json'),
    databaseURL: "https://school-remarks-dobrianske.firebaseio.com"
});

const db = admin.firestore();
const bot = new Telegraf('7475586284:AAFhVK1cy_0_E-J_FFe7mdNSPGBfwEIPmYk');

bot.start((ctx) => {
    ctx.reply('Вітаю! Введіть код вашої дитини (4 цифри):');
});

bot.on('text', async (ctx) => {
    const code = ctx.message.text;
    const studentQuery = await db.collection('students').where('parentCode', '==', code).get();

    if (!studentQuery.empty) {
        const chatId = ctx.chat.id;
        await db.collection('parents').doc(chatId.toString()).set({
            childrenCodes: admin.firestore.FieldValue.arrayUnion(code)
        }, { merge: true });

        ctx.reply('Код прийнято! Додайте ще один код або натисніть "Готово".', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Готово', callback_data: 'done' }]
                ]
            }
        });
    } else {
        ctx.reply('Невірний код. Спробуйте ще раз.');
    }
});

bot.action('done', (ctx) => {
    ctx.reply('Реєстрацію завершено! Ви отримуватимете сповіщення про зауваження.');
});

// Підписка на нові зауваження у Firestore
db.collection('remarks').onSnapshot(async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
            const remark = change.doc.data();
            const studentId = remark.studentId; // Це parentCode

            // Знайти учня за parentCode
            const studentQuery = await db.collection('students')
                .where('parentCode', '==', studentId)
                .limit(1)
                .get();

            if (studentQuery.empty) {
                console.log("Учень не знайдений за parentCode:", studentId);
                return;
            }

            const student = studentQuery.docs[0].data();
            const parentCode = student.parentCode;

            // Знайти батьків за кодом учня
            const parentSnapshot = await db.collection('parents')
                .where('childrenCodes', 'array-contains', parentCode)
                .get();

            if (parentSnapshot.empty) {
                console.log("Батьки не знайдені для коду:", parentCode);
                return;
            }

            const message = `Нове зауваження для ${student.name}:\n` +
                `Предмет: ${remark.subject}\n` +
                `Клас: ${remark.classId}\n` +
                `Текст: ${remark.remarkText}`;

            // Відправити повідомлення кожному з батьків
            parentSnapshot.forEach((doc) => {
                const chatId = doc.id;
                bot.telegram.sendMessage(chatId, message)
                    .catch((err) => console.error("Помилка відправки:", err));
            });
        }
    });
});

bot.launch()
    .then(() => console.log("Бот запущено!"))
    .catch((err) => console.error("Помилка запуску бота:", err));