const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {Telegraf} = require("telegraf");

admin.initializeApp();
const db = admin.firestore();
const botToken = "7475586284:AAFhVK1cy_0_E-J_FFe7mdNSPGBfwEIPmYk";
const bot = new Telegraf(botToken);

exports.sendRemarkNotification = functions.firestore
    .document("remarks/{remarkId}")
    .onCreate(async (snap, context) => {
      const remark = snap.data();
      const studentId = remark.studentId; // Це тепер parentCode

      // Знайти учня за parentCode
      const studentQuery = await db
          .collection("students")
          .where("parentCode", "==", studentId)
          .limit(1)
          .get();

      if (studentQuery.empty) {
        console.log("Учень не знайдений за parentCode:", studentId);
        return;
      }

      const student = studentQuery.docs[0].data();
      const parentCode = student.parentCode;

      // Знайти батьків за кодом учня
      const parentSnapshot = await db
          .collection("parents")
          .where("childrenCodes", "array-contains", parentCode)
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
    });
