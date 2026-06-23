import { Telegraf, Markup, session } from 'telegraf';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const token = process.env.BOT_TOKEN;
const managerChatId = process.env.MANAGER_CHAT_ID;
if (!token) throw new Error('Set BOT_TOKEN in .env');

const bot = new Telegraf(token);
bot.use(session({ defaultSession: () => ({ cart: [], step: null, profile: {} }) }));
bot.use((ctx, next) => {
  ctx.session ||= {};
  ctx.session.cart ||= [];
  ctx.session.profile ||= {};
  return next();
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const leaderboardFile = path.join(dataDir, 'leaderboard.json');

const branches = [
  { id: 'center', title: 'Cosmo Center', time: '08:00–22:00', note: 'Центральная точка для встреч и dine-in.' },
  { id: 'park', title: 'Cosmo Park', time: '09:00–23:00', note: 'Спокойная атмосфера рядом с парком.' },
  { id: 'express', title: 'Cosmo Express', time: '07:30–21:00', note: 'Быстрый кофе с собой утром и днём.' }
];

const products = [
  { id: 'latte', code: 'LATTE190', category: 'coffee', title: 'Salted Caramel Latte', price: 190, short: 'espresso · молоко · карамель · мягкая соль', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80' },
  { id: 'cappuccino', code: 'CAP160', category: 'coffee', title: 'Cappuccino', price: 160, short: 'классика, плотная пенка и balanced espresso', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80' },
  { id: 'raf', code: 'RAF210', category: 'coffee', title: 'Vanilla Raf', price: 210, short: 'сливки · ваниль · espresso · мягкий вкус', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80' },
  { id: 'matcha', code: 'MATCHA220', category: 'special', title: 'Iced Matcha', price: 220, short: 'matcha · молоко · лёд · свежий зелёный вкус', image: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=1200&q=80' },
  { id: 'coldbrew', code: 'BERRY240', category: 'special', title: 'Berry Cold Brew', price: 240, short: 'cold brew · ягодная пена · лёгкая кислинка', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1200&q=80' },
  { id: 'croissant', code: 'CRO95', category: 'food', title: 'Butter Croissant', price: 95, short: 'тёплая выпечка к кофе или завтраку', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80' },
  { id: 'cheesecake', code: 'CHEESE180', category: 'food', title: 'Basque Cheesecake', price: 180, short: 'нежный сырный десерт с карамельной корочкой', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1200&q=80' }
];

const categories = {
  popular: { title: '🔥 Популярное', ids: ['latte', 'cappuccino', 'matcha', 'croissant'] },
  coffee: { title: '☕ Кофе', ids: products.filter(p => p.category === 'coffee').map(p => p.id) },
  special: { title: '🍵 Special', ids: products.filter(p => p.category === 'special').map(p => p.id) },
  food: { title: '🥐 Десерты', ids: products.filter(p => p.category === 'food').map(p => p.id) }
};

const money = value => `${value} сом`;
const productById = id => products.find(item => item.id === id);
const cartQty = ctx => ctx.session.cart.reduce((sum, line) => sum + line.qty, 0);
const cartTotal = ctx => ctx.session.cart.reduce((sum, line) => {
  const product = productById(line.id);
  return sum + (product ? product.price * line.qty : 0);
}, 0);

const mainKeyboard = Markup.keyboard([
  ['☕ Меню', '🛒 Корзина'],
  ['📍 Филиалы', '🎁 Бонусы'],
  ['🏆 Лидерборд', '🧾 Оформить заказ']
]).resize();

const menuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🔥 Популярное', 'cat:popular'), Markup.button.callback('☕ Кофе', 'cat:coffee')],
  [Markup.button.callback('🍵 Special', 'cat:special'), Markup.button.callback('🥐 Десерты', 'cat:food')],
  [Markup.button.callback('🛒 Корзина', 'cart'), Markup.button.callback('🏆 Лидерборд', 'leaderboard')]
]);

function html(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function readJson(file, fallback) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('JSON read error:', error);
    return fallback;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

async function loadLeaderboard() {
  return readJson(leaderboardFile, {});
}

async function saveLeaderboard(data) {
  return writeJson(leaderboardFile, data);
}

function telegramName(ctx) {
  const from = ctx.from || {};
  const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ').trim();
  return {
    id: String(from.id || `guest-${Date.now()}`),
    username: from.username ? `@${from.username}` : null,
    name: from.username ? `@${from.username}` : (fullName || 'Гость')
  };
}

function sortedLeaderboard(board) {
  return Object.values(board).sort((a, b) =>
    (b.cups || 0) - (a.cups || 0) ||
    (b.orders || 0) - (a.orders || 0) ||
    (b.totalSpent || 0) - (a.totalSpent || 0)
  );
}

async function addLeaderboardScore(ctx, { cups, total }) {
  const board = await loadLeaderboard();
  const user = telegramName(ctx);
  const current = board[user.id] || {
    id: user.id,
    username: user.username,
    name: user.name,
    cups: 0,
    orders: 0,
    totalSpent: 0,
    firstOrderAt: new Date().toISOString()
  };

  current.username = user.username;
  current.name = user.name;
  current.cups = (current.cups || 0) + cups;
  current.orders = (current.orders || 0) + 1;
  current.totalSpent = (current.totalSpent || 0) + total;
  current.lastOrderAt = new Date().toISOString();
  board[user.id] = current;

  await saveLeaderboard(board);
  const rank = sortedLeaderboard(board).findIndex(item => item.id === user.id) + 1;
  return { user: current, rank };
}

function medal(index) {
  return ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
}

async function safePhoto(ctx, image, caption, keyboard) {
  try {
    await ctx.replyWithPhoto(image, { caption, parse_mode: 'HTML', ...keyboard });
  } catch (error) {
    await ctx.reply(caption, { parse_mode: 'HTML', ...keyboard });
  }
}

function productCaption(product) {
  return [`<b>${html(product.title)}</b>`, `<code>${html(product.code)}</code>`, '', html(product.short), '', `<b>${money(product.price)}</b>`].join('\n');
}

async function showWelcome(ctx) {
  const caption = ['<b>Cosmo Social Coffee</b>', 'Красивое demo-меню для заказа через Telegram.', '', 'Выберите раздел — напитки откроются карточками с фото, ценой и кнопкой добавления.'].join('\n');
  await safePhoto(ctx, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1400&q=80', caption, Markup.inlineKeyboard([
    [Markup.button.callback('Открыть меню', 'menu'), Markup.button.callback('Бонусы', 'bonus')],
    [Markup.button.callback('Филиалы', 'branches'), Markup.button.callback('🏆 Лидерборд', 'leaderboard')],
    [Markup.button.callback(`Корзина ${cartQty(ctx)}`, 'cart')]
  ]));
  await ctx.reply('Главное меню:', mainKeyboard);
}

async function showMenu(ctx) {
  await ctx.reply('<b>Меню Cosmo</b>\nВыберите категорию. Не перегружаю текстом — каждая позиция откроется отдельной красивой карточкой.', { parse_mode: 'HTML', ...menuKeyboard });
}

async function showCategory(ctx, categoryId) {
  const category = categories[categoryId] || categories.popular;
  await ctx.reply(`<b>${category.title}</b>\nНажмите «Добавить», чтобы собрать заказ.`, { parse_mode: 'HTML' });
  for (const id of category.ids) {
    const product = productById(id);
    if (!product) continue;
    await safePhoto(ctx, product.image, productCaption(product), Markup.inlineKeyboard([
      [Markup.button.callback('Добавить в заказ', `add:${product.id}`)],
      [Markup.button.callback('Корзина', 'cart'), Markup.button.callback('Назад к категориям', 'menu')]
    ]));
  }
}

async function showBranches(ctx) {
  const text = ['<b>Филиалы</b>', 'Выберите точку для pickup или покажите клиенту, как заказ можно разделять по филиалам.', '', ...branches.map(branch => `📍 <b>${html(branch.title)}</b>\n<code>${html(branch.time)}</code>\n${html(branch.note)}`)].join('\n\n');
  await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(branches.map(branch => [Markup.button.callback(branch.title, `branch:${branch.id}`)])) });
}

async function showBonus(ctx) {
  const caption = ['<b>Cosmo Bonus</b>', 'Простая loyalty-механика для MVP.', '', '🎁 <code>COSMO10</code> — 10% на первый заказ', '👥 <code>FRIENDS15</code> — 15% от 2 позиций', '🏆 Лидерборд — покупай чаще и поднимайся выше', '☕ <code>7THCUP</code> — каждый 7-й кофе бесплатно'].join('\n');
  await safePhoto(ctx, 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1400&q=80', caption, Markup.inlineKeyboard([[Markup.button.callback('Открыть меню', 'menu'), Markup.button.callback('🏆 Лидерборд', 'leaderboard')], [Markup.button.callback('Корзина', 'cart')]]));
}

async function showLeaderboard(ctx) {
  const board = await loadLeaderboard();
  const top = sortedLeaderboard(board).slice(0, 10);

  if (!top.length) {
    await ctx.reply('🏆 <b>Лидерборд пока пустой</b>\nОформите первый заказ — и имя появится в рейтинге.', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('Открыть меню', 'menu')]])
    });
    return;
  }

  const lines = top.map((user, index) => [
    `${medal(index)} <b>${html(user.name)}</b>`,
    `   ☕ <code>${user.cups || 0}</code> позиций · 🧾 <code>${user.orders || 0}</code> заказов · ${money(user.totalSpent || 0)}`
  ].join('\n'));

  const currentUser = telegramName(ctx);
  const all = sortedLeaderboard(board);
  const myRank = all.findIndex(user => user.id === currentUser.id) + 1;
  const myLine = myRank > 0 ? `\n\nВаше место: <b>#${myRank}</b>` : '\n\nСделайте заказ — и вы попадёте в рейтинг.';

  await ctx.reply(['🏆 <b>Cosmo Coffee Leaderboard</b>', 'Кто больше покупает — тот выше в рейтинге.', '', ...lines, myLine].join('\n'), {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('Открыть меню', 'menu'), Markup.button.callback('Корзина', 'cart')]])
  });
}

async function showCart(ctx) {
  if (!ctx.session.cart.length) {
    await ctx.reply('🛒 <b>Корзина пустая</b>\nОткройте меню и добавьте напиток карточкой.', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Открыть меню', 'menu')]]) });
    return;
  }
  const lines = ctx.session.cart.map(line => {
    const product = productById(line.id);
    return `• <b>${html(product.title)}</b> × ${line.qty} — <code>${money(product.price * line.qty)}</code>`;
  });
  await ctx.reply(['🛒 <b>Ваш заказ</b>', ...lines, '', `Итого: <b>${money(cartTotal(ctx))}</b>`].join('\n'), { parse_mode: 'HTML', ...Markup.inlineKeyboard([
    [Markup.button.callback('Оформить заказ', 'checkout')],
    [Markup.button.callback('Добавить ещё', 'menu'), Markup.button.callback('Очистить', 'clear')],
    [Markup.button.callback('🏆 Лидерборд', 'leaderboard')]
  ]) });
}

async function startCheckout(ctx) {
  if (!ctx.session.cart.length) return showCart(ctx);
  ctx.session.step = 'name';
  await ctx.reply('Отлично. Напишите имя гостя.\nНапример: <code>Нурсултан</code>', { parse_mode: 'HTML' });
}

async function finishOrder(ctx, phone) {
  ctx.session.profile.phone = phone;
  const name = ctx.session.profile.name || 'Гость';
  const branch = ctx.session.profile.branch || branches[0].title;
  const orderLines = ctx.session.cart.map(line => {
    const product = productById(line.id);
    return `• ${product.title} × ${line.qty} — ${money(product.price * line.qty)}`;
  }).join('\n');
  const total = cartTotal(ctx);
  const cups = cartQty(ctx);
  const managerText = ['New Cosmo demo order', `Guest: ${name}`, `Telegram: ${telegramName(ctx).name}`, `Phone: ${phone}`, `Branch: ${branch}`, '', orderLines, '', `Items: ${cups}`, `Total: ${money(total)}`].join('\n');
  if (managerChatId) await ctx.telegram.sendMessage(managerChatId, managerText);

  const leaderboard = await addLeaderboardScore(ctx, { cups, total });

  await ctx.reply([
    '✅ <b>Заказ принят</b>',
    `Гость: <b>${html(name)}</b>`,
    `Филиал: <b>${html(branch)}</b>`,
    `Позиции: <b>${cups}</b>`,
    `Итого: <b>${money(total)}</b>`,
    '',
    `🏆 Вы теперь на месте <b>#${leaderboard.rank}</b> в лидерборде.`,
    'Покупайте ещё — рейтинг поднимется выше.'
  ].join('\n'), { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Показать лидерборд', 'leaderboard'), Markup.button.callback('Новое меню', 'menu')]]) });

  await ctx.reply('Главное меню:', mainKeyboard);
  ctx.session.cart = [];
  ctx.session.step = null;
  ctx.session.profile = {};
}

bot.start(showWelcome);
bot.command('leaderboard', showLeaderboard);
bot.hears('☕ Меню', showMenu);
bot.hears('📍 Филиалы', showBranches);
bot.hears('🎁 Бонусы', showBonus);
bot.hears('🛒 Корзина', showCart);
bot.hears('🏆 Лидерборд', showLeaderboard);
bot.hears('🧾 Оформить заказ', startCheckout);
bot.action('menu', async ctx => { await ctx.answerCbQuery(); await showMenu(ctx); });
bot.action('branches', async ctx => { await ctx.answerCbQuery(); await showBranches(ctx); });
bot.action('bonus', async ctx => { await ctx.answerCbQuery(); await showBonus(ctx); });
bot.action('cart', async ctx => { await ctx.answerCbQuery(); await showCart(ctx); });
bot.action('leaderboard', async ctx => { await ctx.answerCbQuery(); await showLeaderboard(ctx); });
bot.action('checkout', async ctx => { await ctx.answerCbQuery(); await startCheckout(ctx); });
bot.action('clear', async ctx => { ctx.session.cart = []; await ctx.answerCbQuery('Корзина очищена'); await showCart(ctx); });
bot.action(/^cat:(.+)$/, async ctx => { await ctx.answerCbQuery(); await showCategory(ctx, ctx.match[1]); });
bot.action(/^add:(.+)$/, async ctx => {
  const product = productById(ctx.match[1]);
  if (!product) return ctx.answerCbQuery('Позиция не найдена');
  const line = ctx.session.cart.find(item => item.id === product.id);
  if (line) line.qty += 1;
  else ctx.session.cart.push({ id: product.id, qty: 1 });
  await ctx.answerCbQuery(`${product.title} добавлен`);
  await ctx.reply(`Добавлено: <b>${html(product.title)}</b>\nВ корзине: <code>${cartQty(ctx)}</code>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Корзина', 'cart'), Markup.button.callback('Ещё меню', 'menu')], [Markup.button.callback('🏆 Лидерборд', 'leaderboard')]]) });
});
bot.action(/^branch:(.+)$/, async ctx => {
  const branch = branches.find(item => item.id === ctx.match[1]);
  if (!branch) return ctx.answerCbQuery('Филиал не найден');
  ctx.session.profile.branch = branch.title;
  await ctx.answerCbQuery(branch.title);
  await ctx.reply(`Филиал выбран: <b>${html(branch.title)}</b>\n<code>${html(branch.time)}</code>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Открыть меню', 'menu'), Markup.button.callback('Корзина', 'cart')]]) });
});
bot.on('text', async ctx => {
  if (ctx.session.step === 'name') {
    ctx.session.profile.name = ctx.message.text.trim();
    ctx.session.step = 'phone';
    await ctx.reply('Теперь номер телефона или Telegram username.\nНапример: <code>+996 555 000 000</code>', { parse_mode: 'HTML' });
    return;
  }
  if (ctx.session.step === 'phone') return finishOrder(ctx, ctx.message.text.trim());
  await ctx.reply('Выберите действие ниже или откройте меню карточками.', mainKeyboard);
});
bot.catch((error, ctx) => console.error(`Bot error for update ${ctx.update?.update_id}:`, error));
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
