const { Telegraf } = require('telegraf');
const { db } = require('./firebase-config-node');
const { collection, getDocs, onSnapshot, query, where } = require('firebase/firestore');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const parentSubscriptions = new Map();

onSnapshot(collection(db, 'remarks'), (snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === 'added') {
      const remark = change.doc.data();
      const remarkId = change.doc.id;

      console.log(`Нове зауваження додано: ${remarkId}, student: ${remark.student}`);

      const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('name', '==', remark.student)));
      if (studentsSnapshot.empty) {
        console.log(`Учень ${remark.student} не знайдено`);
        return;
      }

      studentsSnapshot.forEach((studentDoc) => {
        const studentCode = studentDoc.data().code;
        console.log(`Знайдено учня ${remark.student} з кодом ${studentCode}`);

        parentSubscriptions.forEach((codes, parentId) => {
          console.log(`Перевіряємо parentId: ${parentId}, codes: ${codes}`);
          if (codes.includes(studentCode)) {
            console.log(`Надсилаємо повідомлення батьку ${parentId} для учня ${studentCode}`);
            bot.telegram.sendMessage(
              parentId,
              `Нове зауваження:\n${remark.teacher} (${remark.subject}, ${remark.class}): ${remark.student} - ${remark.text}`
            ).then(() => {
              console.log(`Повідомлення успішно надіслано батьку ${parentId}`);
            }).catch((error) => {
              console.error(`Помилка при надсиланні повідомлення батьку ${parentId}: ${error.message}`);
            });
          } else {
            console.log(`Код ${studentCode} не знайдено в підписках parentId: ${parentId}`);
          }
        });
      });
    }
  });
});

bot.launch();
console.log('Бот для сповіщень батьків запущено');