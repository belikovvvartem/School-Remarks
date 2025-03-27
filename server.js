const { Telegraf, Markup } = require('telegraf');
const { db } = require('./firebase-config-node');
const { collection, getDocs, addDoc, onSnapshot, query, where } = require('firebase/firestore');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const teacherSessions = new Map();
const parentSubscriptions = new Map();

bot.start((ctx) => {
  ctx.reply('Введіть ваш код (3 цифри):');
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
      parentSubscriptions.get(chatId).push(text);
      ctx.reply(
        `Дитина "${student.name}" додана. Додати ще когось?`,
        Markup.inlineKeyboard([
          [Markup.button.callback('Додати ще', 'add_more')],
          [Markup.button.callback('Ні', 'done')]
        ])
      );
    } else {
      ctx.reply('Невірний код. Спробуйте ще раз.');
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
    ctx.reply('Будь ласка, введіть коректний код (3 цифри).');
  }
});

function showMainMenu(ctx, teacherName) {
  ctx.reply(`Вітаю, ${teacherName}! Що бажаєте зробити?`, Markup.inlineKeyboard([
    [Markup.button.callback('Дати зауваження', 'add_remark')]
  ]));
}

bot.action('add_more', (ctx) => {
  ctx.reply('Введіть код ще однієї дитини (3 цифри):');
});

bot.action('done', (ctx) => {
  ctx.reply('Дякую! Ви будете отримувати сповіщення про зауваження.');
});

bot.action('add_remark', (ctx) => {
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  const buttons = session.teacher.subjects.map(subject => [Markup.button.callback(subject, `subject_${subject}`)]);
  buttons.push([Markup.button.callback('До головного меню', 'main_menu')]);
  ctx.reply('Виберіть урок:', Markup.inlineKeyboard(buttons));
  session.step = 'subject';
});

bot.action(/subject_(.+)/, async (ctx) => {
  const subject = ctx.match[1];
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  session.subject = subject;
  const buttons = session.teacher.classes.map(cls => [Markup.button.callback(cls, `class_${cls}`)]);
  buttons.push([Markup.button.callback('Назад', 'back_to_subjects')]);
  buttons.push([Markup.button.callback('До головного меню', 'main_menu')]);
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
  buttons.push([Markup.button.callback('Назад', 'back_to_classes')]);
  buttons.push([Markup.button.callback('До головного меню', 'main_menu')]);
  ctx.reply('Виберіть учня:', Markup.inlineKeyboard(buttons));
  session.step = 'student';
});

bot.action(/student_(.+)/, (ctx) => {
  const student = ctx.match[1];
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  session.student = student;
  ctx.reply('Введіть текст зауваження:', Markup.inlineKeyboard([
    [Markup.button.callback('Назад', 'back_to_students')],
    [Markup.button.callback('До головного меню', 'main_menu')]
  ]));
  session.step = 'remark_text';
});

bot.action('back_to_subjects', (ctx) => {
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  const buttons = session.teacher.subjects.map(subject => [Markup.button.callback(subject, `subject_${subject}`)]);
  buttons.push([Markup.button.callback('До головного меню', 'main_menu')]);
  ctx.reply('Виберіть урок:', Markup.inlineKeyboard(buttons));
  session.step = 'subject';
});

bot.action('back_to_classes', (ctx) => {
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  const buttons = session.teacher.classes.map(cls => [Markup.button.callback(cls, `class_${cls}`)]);
  buttons.push([Markup.button.callback('Назад', 'back_to_subjects')]);
  buttons.push([Markup.button.callback('До головного меню', 'main_menu')]);
  ctx.reply('Виберіть клас:', Markup.inlineKeyboard(buttons));
  session.step = 'class';
});

bot.action('back_to_students', async (ctx) => {
  const chatId = ctx.from.id;
  const session = teacherSessions.get(chatId);
  const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('class', '==', session.class)));
  const buttons = studentsSnapshot.docs.map(doc => [Markup.button.callback(doc.data().name, `student_${doc.data().name}`)]);
  buttons.push([Markup.button.callback('Назад', 'back_to_classes')]);
  buttons.push([Markup.button.callback('До головного меню', 'main_menu')]);
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