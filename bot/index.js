import { Telegraf, Markup, session } from 'telegraf';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const token = process.env.BOT_TOKEN;
const managerChatId = process.env.MANAGER_CHAT_ID;
if (!token) throw new Error('Укажите BOT_TOKEN в .env');

const bot = new Telegraf(token);
bot.use(session({ defaultSession: () => ({ cart: [], step: null, profile: {} }) }));
bot.use((ctx, next) => { ctx.session ||= {}; ctx.session.cart ||= []; ctx.session.profile ||= {}; return next(); });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const leaderboardFile = path.join(dataDir, 'focus-kitchen-leaderboard.json');

const branches = [
  { id: 'pickup', title: 'Предзаказ с собой', time: '08:00–22:00', note: 'кофе и еда без ожидания' },
  { id: 'dinein', title: 'Заказ в зале', time: '08:00–22:00', note: 'заказ для гостей внутри Focus' },
  { id: 'booking', title: 'Бронь столика', time: '10:00–22:00', note: 'бронь стола под завтрак, обед или ужин' }
];

const products = [
  { id: 'flatwhite', code: 'FOCUS-FW', category: 'coffee', title: 'Флэт уайт', price: 180, short: 'двойной эспрессо · мягкое молоко · чистый вкус', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80' },
  { id: 'americano', code: 'FOCUS-BLK', category: 'coffee', title: 'Чёрный американо', price: 130, short: 'чистый кофе, быстро и без лишнего', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=80' },
  { id: 'filter', code: 'FOCUS-BATCH', category: 'coffee', title: 'Фильтр дня', price: 160, short: 'мягкий профиль, удобно брать с собой', image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80' },
  { id: 'toast', code: 'FOCUS-TOAST', category: 'kitchen', title: 'Авокадо-тост', price: 290, short: 'хлеб, авокадо, яйцо, зелень', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80' },
  { id: 'breakfast', code: 'FOCUS-BRUNCH', category: 'kitchen', title: 'Фокус-завтрак', price: 340, short: 'яйца, салат, тост, соус, сезонные добавки', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=80' },
  { id: 'shakshuka', code: 'FOCUS-SHAK', category: 'kitchen', title: 'Шакшука', price: 320, short: 'томаты, яйца, специи, хлеб', image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=1200&q=80' },
  { id: 'sandwich', code: 'FOCUS-SAND', category: 'kitchen', title: 'Сэндвич с курицей', price: 310, short: 'курица, соус, зелень, хрустящий хлеб', image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=1200&q=80' },
  { id: 'croissant', code: 'FOCUS-CRO', category: 'dessert', title: 'Круассан', price: 110, short: 'тёплый круассан к утреннему кофе', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80' },
  { id: 'cheesecake', code: 'FOCUS-CAKE', category: 'dessert', title: 'Баскский чизкейк', price: 190, short: 'нежный десерт к фильтру или латте', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1200&q=80' }
];

const categories = {
  popular: { title: '● Популярное', ids: ['flatwhite', 'toast', 'breakfast', 'croissant'] },
  coffee: { title: '☕ Кофе', ids: products.filter(p => p.category === 'coffee').map(p => p.id) },
  kitchen: { title: '🍽 Кухня', ids: products.filter(p => p.category === 'kitchen').map(p => p.id) },
  dessert: { title: '△ Десерты', ids: products.filter(p => p.category === 'dessert').map(p => p.id) }
};

const money = value => `${value} сом`;
const productById = id => products.find(item => item.id === id);
const cartQty = ctx => ctx.session.cart.reduce((sum, line) => sum + line.qty, 0);
const cartTotal = ctx => ctx.session.cart.reduce((sum, line) => { const p = productById(line.id); return sum + (p ? p.price * line.qty : 0); }, 0);
const mainKeyboard = Markup.keyboard([['☕ Кофе', '🍽 Кухня'], ['🛒 Корзина', '📅 Бронь'], ['🏆 Лига Focus', '🧾 Предзаказ']]).resize();
const menuKeyboard = Markup.inlineKeyboard([[Markup.button.callback('● Популярное', 'cat:popular'), Markup.button.callback('☕ Кофе', 'cat:coffee')], [Markup.button.callback('🍽 Кухня', 'cat:kitchen'), Markup.button.callback('△ Десерты', 'cat:dessert')], [Markup.button.callback('📅 Бронь', 'reserve'), Markup.button.callback('🏆 Лига', 'leaderboard')]]);
function html(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function publicName(ctx) { const f = ctx.from || {}; const base = f.username ? f.first_name : [f.first_name, f.last_name].filter(Boolean).join(' '); return (base || 'Гость Focus').slice(0, 22); }
async function readJson(file, fallback) { await fs.mkdir(path.dirname(file), { recursive: true }); try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; } }
async function writeJson(file, data) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8'); }
async function loadBoard() { return readJson(leaderboardFile, {}); }
async function saveBoard(data) { return writeJson(leaderboardFile, data); }
function sortedBoard(board) { return Object.values(board).sort((a, b) => (b.cups || 0) - (a.cups || 0) || (b.orders || 0) - (a.orders || 0)); }
async function addScore(ctx, { cups, total }) { const board = await loadBoard(); const id = String(ctx.from?.id || Date.now()); const name = publicName(ctx); const u = board[id] || { id, name, cups: 0, orders: 0, totalSpent: 0 }; u.name = name; u.cups += cups; u.orders += 1; u.totalSpent += total; board[id] = u; await saveBoard(board); return sortedBoard(board).findIndex(x => x.id === id) + 1; }
async function safePhoto(ctx, image, captionText, keyboard) { try { await ctx.replyWithPhoto(image, { caption: captionText, parse_mode: 'HTML', ...keyboard }); } catch { await ctx.reply(captionText, { parse_mode: 'HTML', ...keyboard }); } }
function caption(p) { return [`<b>${html(p.title)}</b>`, `<code>${html(p.code)}</code>`, '', html(p.short), '', `<b>${money(p.price)}</b>`].join('\n'); }
async function welcome(ctx) { await safePhoto(ctx, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1400&q=80', '<b>Focus Coffee & Kitchen</b>\nМеню, предзаказ кухни, бронь столиков и Лига Focus.', Markup.inlineKeyboard([[Markup.button.callback('Открыть меню', 'menu'), Markup.button.callback('Бронь столика', 'reserve')], [Markup.button.callback('Лига Focus', 'leaderboard'), Markup.button.callback(`Корзина ${cartQty(ctx)}`, 'cart')]])); await ctx.reply('Главное меню:', mainKeyboard); }
async function showMenu(ctx) { await ctx.reply('<b>Focus Coffee & Kitchen</b>\nВыберите раздел: кофе, кухня или десерты.', { parse_mode: 'HTML', ...menuKeyboard }); }
async function showCategory(ctx, id) { const c = categories[id] || categories.popular; await ctx.reply(`<b>${c.title}</b>`, { parse_mode: 'HTML' }); for (const productId of c.ids) { const p = productById(productId); if (p) await safePhoto(ctx, p.image, caption(p), Markup.inlineKeyboard([[Markup.button.callback('Добавить', `add:${p.id}`)], [Markup.button.callback('Корзина', 'cart'), Markup.button.callback('Категории', 'menu')]])); } }
async function showBranches(ctx) { const text = ['<b>Форматы Focus</b>', ...branches.map(b => `📍 <b>${html(b.title)}</b>\n<code>${html(b.time)}</code>\n${html(b.note)}`)].join('\n\n'); await ctx.reply(text, { parse_mode: 'HTML' }); }
async function showBonus(ctx) { await ctx.reply('<b>Бонусы Focus</b>\n<code>FOCUS10</code> — 10% на первый предзаказ\n<code>KITCHEN15</code> — 15% от 2 позиций\n🏆 Лига Focus — кофе и кухня дают очки', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Меню', 'menu'), Markup.button.callback('Лига', 'leaderboard')]]) }); }
async function showLeaderboard(ctx) { const top = sortedBoard(await loadBoard()).slice(0, 10); if (!top.length) return ctx.reply('🏆 <b>Лига Focus пока пустая</b>\nОформите первый предзаказ.', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Меню', 'menu')]]) }); const lines = top.map((u, i) => `${String(i + 1).padStart(2, '0')} <b>${html(u.name)}</b>\n   ☕ <code>${u.cups}</code> позиций · 🧾 <code>${u.orders}</code> заказов`); await ctx.reply(['🏆 <b>Лига Focus</b>', 'Публично показываем только имя, без логина и телефона.', '', ...lines].join('\n'), { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Меню', 'menu'), Markup.button.callback('Бронь', 'reserve')]]) }); }
async function showCart(ctx) { if (!ctx.session.cart.length) return ctx.reply('🛒 <b>Корзина пустая</b>\nОткройте меню и добавьте кофе или блюдо.', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Меню', 'menu')]]) }); const lines = ctx.session.cart.map(line => { const p = productById(line.id); return `• <b>${html(p.title)}</b> × ${line.qty} — <code>${money(p.price * line.qty)}</code>`; }); await ctx.reply(['🛒 <b>Предзаказ Focus</b>', ...lines, '', `Итого: <b>${money(cartTotal(ctx))}</b>`].join('\n'), { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Оформить', 'checkout')], [Markup.button.callback('Добавить ещё', 'menu'), Markup.button.callback('Очистить', 'clear')]]) }); }
async function checkout(ctx) { if (!ctx.session.cart.length) return showCart(ctx); ctx.session.step = 'pickup'; await ctx.reply('Напишите время получения или визита. Например: <code>15:30</code> или <code>на месте</code>', { parse_mode: 'HTML' }); }
async function reserve(ctx) { ctx.session.step = 'reserve'; await ctx.reply('Напишите бронь одним сообщением.\nПример: <code>сегодня 19:30, 2 гостя, у окна</code>', { parse_mode: 'HTML' }); }
async function finishOrder(ctx, pickup) { const total = cartTotal(ctx); const cups = cartQty(ctx); const rank = await addScore(ctx, { cups, total }); const lines = ctx.session.cart.map(line => { const p = productById(line.id); return `• ${p.title} × ${line.qty}`; }).join('\n'); if (managerChatId) await ctx.telegram.sendMessage(managerChatId, `Новый предзаказ Focus Coffee & Kitchen\nГость: ${publicName(ctx)}\nВремя: ${pickup}\n\n${lines}\n\nИтого: ${money(total)}`); await ctx.reply(`✅ <b>Предзаказ принят</b>\nВремя: <b>${html(pickup)}</b>\nИтого: <b>${money(total)}</b>\n\n🏆 Вы теперь #${rank} в Лиге Focus.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Показать Лигу', 'leaderboard'), Markup.button.callback('Новое меню', 'menu')]]) }); ctx.session.cart = []; ctx.session.step = null; }
async function finishReserve(ctx, details) { if (managerChatId) await ctx.telegram.sendMessage(managerChatId, `Новая бронь Focus\nГость: ${publicName(ctx)}\nДетали: ${details}`); await ctx.reply(`📅 <b>Бронь сформирована</b>\n${html(details)}\n\nМенеджер сможет подтвердить столик.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Меню', 'menu'), Markup.button.callback('Лига', 'leaderboard')]]) }); ctx.session.step = null; }
bot.start(welcome); bot.command('leaderboard', showLeaderboard); bot.hears('☕ Кофе', async ctx => showCategory(ctx, 'coffee')); bot.hears('🍽 Кухня', async ctx => showCategory(ctx, 'kitchen')); bot.hears('📅 Бронь', reserve); bot.hears('🎁 Бонусы', showBonus); bot.hears('🛒 Корзина', showCart); bot.hears('🏆 Лига Focus', showLeaderboard); bot.hears('🧾 Предзаказ', checkout);
bot.action('menu', async ctx => { await ctx.answerCbQuery(); await showMenu(ctx); }); bot.action('leaderboard', async ctx => { await ctx.answerCbQuery(); await showLeaderboard(ctx); }); bot.action('cart', async ctx => { await ctx.answerCbQuery(); await showCart(ctx); }); bot.action('checkout', async ctx => { await ctx.answerCbQuery(); await checkout(ctx); }); bot.action('reserve', async ctx => { await ctx.answerCbQuery(); await reserve(ctx); }); bot.action('clear', async ctx => { ctx.session.cart = []; await ctx.answerCbQuery('Очищено'); await showCart(ctx); }); bot.action(/^cat:(.+)$/, async ctx => { await ctx.answerCbQuery(); await showCategory(ctx, ctx.match[1]); }); bot.action(/^add:(.+)$/, async ctx => { const p = productById(ctx.match[1]); if (!p) return ctx.answerCbQuery('Позиция не найдена'); const line = ctx.session.cart.find(x => x.id === p.id); if (line) line.qty += 1; else ctx.session.cart.push({ id: p.id, qty: 1 }); await ctx.answerCbQuery(`${p.title} добавлен`); await ctx.reply(`Добавлено: <b>${html(p.title)}</b>\nВ корзине: <code>${cartQty(ctx)}</code>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Корзина', 'cart'), Markup.button.callback('Ещё меню', 'menu')]]) }); });
bot.on('text', async ctx => { if (ctx.session.step === 'pickup') return finishOrder(ctx, ctx.message.text.trim()); if (ctx.session.step === 'reserve') return finishReserve(ctx, ctx.message.text.trim()); await ctx.reply('Выберите действие ниже.', mainKeyboard); });
bot.catch(error => console.error('Ошибка бота Focus:', error));
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
