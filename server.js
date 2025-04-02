const { Telegraf, Markup } = require('telegraf');
const { db } = require('./firebase-config-node');
const { collection, getDocs, addDoc, onSnapshot, query, where } = require('firebase/firestore');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const teacherSessions = new Map();
const parentSubscriptions = new Map();

async function loadSubscriptions() {
  const subscriptionsSnapshot = await getDocs(collection(db, 'parentSubscriptions'));
  subscriptionsSnapshot.forEach(doc => {
    const data = doc.data();
    parentSubscriptions.set(data.chatId, data.codes);
  });
}

async function saveSubscriptions(chatId, codes) {
  const subscriptionsSnapshot = await getDocs(query(collection(db, 'parentSubscriptions'), where('chatId', '==', chatId.toString())));
  if (subscriptionsSnapshot.empty) {
    await addDoc(collection(db, 'parentSubscriptions'), { chatId: chatId.toString(), codes });
  } else {
    const docId = subscriptionsSnapshot.docs[0].id;
    await updateDoc(doc(db, 'parentSubscriptions', docId), { codes });
  }
}

bot.start(async (ctx) => {
  await loadSubscriptions();
  const chatId = ctx.from.id;
  if (parentSubscriptions.has(chatId) && parentSubscriptions.get(chatId).length > 0) {
    const studentNames = await Promise.all(parentSubscriptions.get(chatId).map(async (code) => {
      const studentSnapshot = await getDocs(query(collection(db, 'students'), where('code', '==', code)));
      return studentSnapshot.empty ? null : studentSnapshot.docs[0].data().name;
    }));
    const validNames = studentNames.filter(name => name).join(', ');
    ctx.reply(`Ви вже підписані на сповіщення для: ${validNames}. Додати ще когось?`, Markup.inlineKeyboard([
      [Markup.button.callback('Додати ще', 'add_more')],
      [Markup.button.callback('Ні', 'done')]
    ]));
  } else {
    ctx.reply('Введіть ваш 🆔(3 цифри):');
  }
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const chatId = ctx.from.id;

  if (text.length === 3 && !isNaN(text)) {
    const teachersSnapshot = await getDocs(query(collection(db, 'teachers'), where('code', '==', text)));
    const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('code', '==', text)));

    if (!teachersSnapshot.empty) {
      const teacher = teachersSnapshot.docs[0].data();
      teacherSessions.set(chatId, { teacher, step: 'main' });
      showMainMenu(ctx, teacher.name);
    } else if (!studentsSnapshot.empty) {
      const student = studentsSnapshot.docs[0].data();
      if (!parentSubscriptions.has(chatId)) parentSubscriptions.set(chatId, []);
      const currentCodes = parentSubscriptions.get(chatId);
      if (!currentCodes.includes(text)) {
        currentCodes.push(text);
        parentSubscriptions.set(chatId, currentCodes);
        await saveSubscriptions(chatId, currentCodes);
      }
      ctx.reply(
        `Дитина 🧑‍🎓"${student.name}" додана. Додати ще когось?`,
        Markup.inlineKeyboard([
          [Markup.button.callback('Додати ще', 'add_more')],
          [Markup.button.callback('Ні', 'done')]
        ])
      );
    } else {
      ctx.reply('Невірний 🆔. Спробуйте ще раз 🔄.');
    }
  } else if (teacherSessions.has(chatId)) {
    const session = teacherSessions.get(chatId);
    if (session.step === 'remark_text') {
      const remark = {
        teacher: session.teacher.name,
        subject: session.subject,
        class: session.class,
        student: session.student,
        text,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'remarks'), remark);
      ctx.reply('Зауваження успішно додано!');
      teacherSessions.set(chatId, { teacher: session.teacher, step: 'main' });
      showMainMenu(ctx, session.teacher.name);
    }
  } else {
    ctx.reply('Будь ласка, введіть коректний 🆔.');
  }
});

function showMainMenu(ctx, teacherName) {
  ctx.reply(`Вітаю, 👩‍🏫${teacherName}! Що бажаєте зробити?`, Markup.inlineKeyboard([
    [Markup.button.callback('Дати зауваження 🚨', 'add_remark')]
  ]));
}

bot.action('add_more', (ctx) => {
  ctx.reply('Введіть 🆔 ще однієї дитини:');
});

bot.action('done', (ctx) => {
  ctx.reply('Дякую! Ви будете отримувати сповіщення про зауваження 📳.');
});

bot.action('add_remark', (ctx) => {
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  const buttons = session.teacher.subjects.map(subject => [Markup.button.callback(subject, `subject_${subject}`)]);
  buttons.push([Markup.button.callback('До головного меню 🔄', 'main_menu')]);
  ctx.reply('Виберіть урок:', Markup.inlineKeyboard(buttons));
  session.step = 'subject';
});

bot.action(/subject_(.+)/, async (ctx) => {
  const subject = ctx.match[1];
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  session.subject = subject;
  const buttons = session.teacher.classes.map(cls => [Markup.button.callback(cls, `class_${cls}`)]);
  buttons.push([Markup.button.callback('Назад 🔄', 'back_to_subjects')]);
  buttons.push([Markup.button.callback('До головного меню 🔄', 'main_menu')]);
  ctx.reply('Виберіть клас:', Markup.inlineKeyboard(buttons));
  session.step = 'class';
});

bot.action(/class_(.+)/, async (ctx) => {
  const cls = ctx.match[1];
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  session.class = cls;
  const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('class', '==', cls)));
  const buttons = studentsSnapshot.docs.map(doc => [Markup.button.callback(doc.data().name, `student_${doc.data().name}`)]);
  buttons.push([Markup.button.callback('Назад 🔄', 'back_to_classes')]);
  buttons.push([Markup.button.callback('До головного меню 🔄', 'main_menu')]);
  ctx.reply('Виберіть учня 🧑‍🎓:', Markup.inlineKeyboard(buttons));
  session.step = 'student';
});

bot.action(/student_(.+)/, (ctx) => {
  const student = ctx.match[1];
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  session.student = student;
  ctx.reply('Введіть текст зауваження 🚨:', Markup.inlineKeyboard([
    [Markup.button.callback('Назад 🔄', 'back_to_students')],
    [Markup.button.callback('До головного меню 🔄', 'main_menu')]
  ]));
  session.step = 'remark_text';
});

bot.action('back_to_subjects', (ctx) => {
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  const buttons = session.teacher.subjects.map(subject => [Markup.button.callback(subject, `subject_${subject}`)]);
  buttons.push([Markup.button.callback('До головного меню 🔄', 'main_menu')]);
  ctx.reply('Виберіть урок:', Markup.inlineKeyboard(buttons));
  session.step = 'subject';
});

bot.action('back_to_classes', (ctx) => {
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  const buttons = session.teacher.classes.map(cls => [Markup.button.callback(cls, `class_${cls}`)]);
  buttons.push([Markup.button.callback('Назад 🔄', 'back_to_subjects')]);
  buttons.push([Markup.button.callback('До головного меню 🔄', 'main_menu')]);
  ctx.reply('Виберіть клас:', Markup.inlineKeyboard(buttons));
  session.step = 'class';
});

bot.action('back_to_students', async (ctx) => {
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('class', '==', session.class)));
  const buttons = studentsSnapshot.docs.map(doc => [Markup.button.callback(doc.data().name, `student_${doc.data().name}`)]);
  buttons.push([Markup.button.callback('Назад 🔄', 'back_to_classes')]);
  buttons.push([Markup.button.callback('До головного меню 🔄', 'main_menu')]);
  ctx.reply('Виберіть учня:', Markup.inlineKeyboard(buttons));
  session.step = 'student';
});

bot.action('main_menu', (ctx) => {
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  showMainMenu(ctx, session.teacher.name);
});

onSnapshot(collection(db, 'remarks'), (snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === 'added') {
      const remark = change.doc.data();
      const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('name', '==', remark.student)));
      studentsSnapshot.forEach((studentDoc) => {
        const studentCode = studentDoc.data().code;
        parentSubscriptions.forEach((codes, parentId) => {
          if (codes.includes(studentCode)) {
            bot.telegram.sendMessage(
              parentId,
              `Нове зауваження:\n${remark.teacher} (${remark.subject}, ${remark.class}): ${remark.student} - ${remark.text}`
            );
          }
        });
      });
    }
  });
});

bot.launch();
console.log('Бот запущено');