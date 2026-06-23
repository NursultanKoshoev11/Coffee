import { Telegraf, Markup, session } from 'telegraf';
import 'dotenv/config';

const token = process.env.BOT_TOKEN;
const managerChatId = process.env.MANAGER_CHAT_ID;
if (!token) throw new Error('Set BOT_TOKEN in .env');

const bot = new Telegraf(token);
bot.use(session());

const branches = ['Cosmo Center', 'Cosmo Park', 'Cosmo Express'];
const menu = [
  ['Salted Caramel Latte', 190],
  ['Americano', 120],
  ['Cappuccino', 160],
  ['Vanilla Raf', 210],
  ['Iced Matcha', 220],
  ['Butter Croissant', 95],
  ['Basque Cheesecake', 180]
];

const mainKeyboard = Markup.keyboard([
  ['☕ Меню', '📍 Филиалы'],
  ['🎁 Бонусы', '🧾 Заказ']
]).resize();

bot.start(ctx => ctx.reply('Здравствуйте! Это демо-бот Cosmo Social Coffee. Выберите действие:', mainKeyboard));
bot.hears('☕ Меню', ctx => ctx.reply(menu.map(([name, price]) => `${name} — ${price} сом`).join('\n')));
bot.hears('📍 Филиалы', ctx => ctx.reply(branches.join('\n')));
bot.hears('🎁 Бонусы', ctx => ctx.reply('Cosmo Bonus: 5% бонусами, 7-й кофе в подарок, промокод COSMO10.'));
bot.hears('🧾 Заказ', ctx => { ctx.session.step = 'order'; ctx.reply('Напишите заказ одним сообщением. Например: латте 2, круассан 1, Cosmo Center'); });
bot.on('text', async ctx => {
  if (ctx.session?.step !== 'order') return;
  ctx.session.step = null;
  const order = `New demo order from ${ctx.from.first_name || 'guest'}:\n${ctx.message.text}`;
  if (managerChatId) await ctx.telegram.sendMessage(managerChatId, order);
  await ctx.reply('Готово. Демо-заказ принят. Менеджер получит заявку, когда указан MANAGER_CHAT_ID.', mainKeyboard);
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
