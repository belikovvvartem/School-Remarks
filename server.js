const { Telegraf, Markup } = require('telegraf');
const { db } = require('./firebase-config-node');
const { collection, getDocs, addDoc, onSnapshot, query, where, updateDoc, doc } = require('firebase/firestore');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const teacherSessions = new Map();
const parentSubscriptions = new Map();

bot.start((ctx) => {
  ctx.reply('Введіть ваш 🆔(3 цифри):');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const chatId = ctx.from.id;

  if (text.length === 3 && !isNaN(text)) {
    const teachersSnapshot = await getDocs(query(collection(db, 'teachers'), where('code', '==', text)));
    const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('code', '==', text)));

    if (!teachersSnapshot.empty) {
      const teacher = teachersSnapshot.docs[0].data();
      teacher.chatId = chatId; 
      teacherSessions.set(chatId, { teacher, step: 'main' });
      showMainMenu(ctx, teacher.name);
    } else if (!studentsSnapshot.empty) {
      const student = studentsSnapshot.docs[0].data();
      if (!parentSubscriptions.has(chatId)) parentSubscriptions.set(chatId, []);
      parentSubscriptions.get(chatId).push(text); 
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
        timestamp: new Date().toISOString(),
        parentViewed: false 
      };
      const remarkRef = await addDoc(collection(db, 'remarks'), remark);
      session.remarkId = remarkRef.id; 
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

bot.action(/viewed_(.+)/, async (ctx) => {
  const remarkId = ctx.match[1];
  const chatId = ctx.from.id;

  console.log(`Кнопка "Переглянуто" натиснута для remarkId: ${remarkId}, chatId: ${chatId}`);

  const remarkRef = doc(db, 'remarks', remarkId);
  await updateDoc(remarkRef, {
    parentViewed: true,
    parentViewedTimestamp: new Date().toISOString()
  });

  const remarkSnapshot = await getDocs(query(collection(db, 'remarks'), where('__name__', '==', remarkId)));
  if (remarkSnapshot.empty) {
    console.log(`Зауваження з ID ${remarkId} не знайдено`);
    return;
  }
  const remark = remarkSnapshot.docs[0].data();

  const teacherSnapshot = await getDocs(query(collection(db, 'teachers'), where('name', '==', remark.teacher)));
  if (!teacherSnapshot.empty) {
    const teacher = teacherSnapshot.docs[0].data();
    const teacherChatId = teacherSessions.get(chatId)?.teacher.chatId || teacher.chatId;

    if (teacherChatId) {
      console.log(`Надсилаємо сповіщення вчителю ${teacher.name} на chatId: ${teacherChatId}`);
      bot.telegram.sendMessage(
        teacherChatId,
        `Батько учня ${remark.student} побачив ваше зауваження ✅.`
      );
    } else {
      console.log(`chatId вчителя ${teacher.name} не знайдено`);
    }
  } else {
    console.log(`Вчитель ${remark.teacher} не знайдено`);
  }

  try {
    await ctx.editMessageText(
      `Нове зауваження:\n${remark.teacher} (${remark.subject}, ${remark.class}): ${remark.student} - ${remark.text}\n✅ Переглянуто`,
      { reply_markup: { inline_keyboard: [] } } 
    );
    console.log(`Повідомлення для батьків оновлено для remarkId: ${remarkId}`);
  } catch (error) {
    console.error(`Помилка при оновленні повідомлення для батьків: ${error.message}`);
  }
});

onSnapshot(collection(db, 'remarks'), (snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === 'added') {
      const remark = change.doc.data();
      const remarkId = change.doc.id;

      console.log(`Нове зауваження додано: ${remarkId}, student: ${remark.student}, parentViewed: ${remark.parentViewed}`);

      if (!remark.parentViewed) {
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
                `Нове зауваження:\n${remark.teacher}\n(${remark.subject},\n${remark.class}):\${remark.student} - ${remark.text}`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: 'Переглянуто ✅', callback_data: `viewed_${remarkId}` }]
                    ]
                  }
                }
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
    }
  });
});

bot.launch();
console.log('Бот запущено');