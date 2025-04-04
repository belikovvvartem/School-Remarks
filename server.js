require('dotenv').config(); // Для роботи з .env файлом
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');

// Отримуємо токен із .env файлу
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Список chat_id користувачів
let chatIds = [];

// Функція для надсилання повідомлення
const sendReminder = () => {
    const now = new Date();
    // Перевіряємо, чи не субота (6) і не неділя (0)
    if (now.getDay() !== 6 && now.getDay() !== 0) {
        const message = "Привіт, не забудьте переглянути зауваження.";
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Зауваження", url: process.env.REMINDER_LINK || "YOUR_LINK_HERE" }]
                ]
            }
        };

        chatIds.forEach(chatId => {
            bot.sendMessage(chatId, message, options)
                .catch(error => console.error(`Помилка надсилання до ${chatId}:`, error));
        });
    }
};

// Планувальник: щодня о 16:00
const job = schedule.scheduleJob('0 16 * * *', sendReminder);

// Обробка команди /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!chatIds.includes(chatId)) {
        chatIds.push(chatId);
        bot.sendMessage(chatId, "Ви підписалися на щоденні нагадування о 16:00 (крім вихідних)!");
    } else {
        bot.sendMessage(chatId, "Ви вже підписані на нагадування!");
    }
});

// Логування запуску бота
console.log("Бот запущений...");