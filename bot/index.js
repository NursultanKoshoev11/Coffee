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
bot.use((ctx, next) => { ctx.session ||= {}; ctx.session.cart ||= []; ctx.session.profile ||= {}; return next(); });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const leaderboardFile = path.join(dataDir, 'focus-leaderboard.json');

const branches = [
  { id: 'main', title: 'Focus Coffee Bar', time: '08:00–22:00', note: 'preorder, pickup, specialty coffee' },
  { id: 'togo', title: 'Focus To Go', time: '07:30–20:00', note: 'быстрый кофе с собой' }
];

const products = [
  { id: 'flatwhite', code: 'FOCUS-FW', category: 'coffee', title: 'Flat White', price: 180, short: 'double espresso · silky milk · clean focus', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80' },
  { id: 'americano', code: 'FOCUS-BLK', category: 'coffee', title: 'Black Americano', price: 130, short: 'чистый вкус, быстро и без лишнего', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=80' },
  { id: 'filter', code: 'FOCUS-BATCH', category: 'brew', title: 'Batch Brew', price: 160, short: 'фильтр дня, мягкий профиль, to go', image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80' },
  { id: 'tonic', code: 'FOCUS-TONIC', category: 'brew', title: 'Espresso Tonic', price: 220, short: 'espresso shot, tonic, citrus finish', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1200&q=80' },
  { id: 'matcha', code: 'FOCUS-MATCHA', category: 'brew', title: 'Matcha Cloud', price: 230, short: 'matcha, milk, cold foam', image: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=1200&q=80' },
  { id: 'croissant', code: 'FOCUS-CRO', category: 'food', title: 'Butter Croissant', price: 110, short: 'тёплый круассан к утреннему кофе', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80' },
  { id: 'bun', code: 'FOCUS-BUN', category: 'food', title: 'Cardamom Bun', price: 120, short: 'булочка с кардамоном', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80' }
];

const categories = {
  popular: { title: '● Популярное', ids: ['flatwhite', 'filter', 'tonic', 'croissant'] },
  coffee: { title: '☕ Coffee', ids: products.filter(p => p.category === 'coffee').map(p => p.id) },
  brew: { title: '◎ Brew', ids: products.filter(p => p.category === 'brew').map(p => p.id) },
  food: { title: '△ Food', ids: products.filter(p => p.category === 'food').map(p => p.id) }
};

const money = value => `${value} сом`;
const productById = id => products.find(item => item.id === id);
const cartQty = ctx => ctx.session.cart.reduce((sum, line) => sum + line.qty, 0);
const cartTotal = ctx => ctx.session.cart.reduce((sum, line) => { const p = productById(line.id); return sum + (p ? p.price * line.qty : 0); }, 0);
const mainKeyboard = Markup.keyboard([['☕ Меню', '🛒 Корзина'], ['📍 Точка', '🎁 Bonus'], ['🏆 Focus League', '🧾 Предзаказ']]).resize();
const menuKeyboard = Markup.inlineKeyboard([[Markup.button.callback('● Популярное', 'cat:popular'), Markup.button.callback('☕ Coffee', 'cat:coffee')], [Markup.button.callback('◎ Brew', 'cat:brew'), Markup.button.callback('△ Food', 'cat:food')], [Markup.button.callback('🛒 Корзина', 'cart'), Markup.button.callback('🏆 League', 'leaderboard')]]);
function html(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function publicName(ctx) { const f = ctx.from || {}; const base = f.username ? f.first_name : [f.first_name, f.last_name].filter(Boolean).join(' '); return (base || 'Focus Guest').slice(0, 22); }
async function readJson(file, fallback) { await fs.mkdir(path.dirname(file), { recursive: true }); try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; } }
async function writeJson(file, data) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8'); }
async function loadBoard() { return readJson(leaderboardFile, {}); }
async function saveBoard(data) { return writeJson(leaderboardFile, data); }
function sortedBoard(board) { return Object.values(board).sort((a, b) => (b.cups || 0) - (a.cups || 0) || (b.orders || 0) - (a.orders || 0)); }
async function addScore(ctx, { cups, total }) { const board = await loadBoard(); const id = String(ctx.from?.id || Date.now()); const name = publicName(ctx); const u = board[id] || { id, name, cups: 0, orders: 0, totalSpent: 0 }; u.name = name; u.cups += cups; u.orders += 1; u.totalSpent += total; board[id] = u; await saveBoard(board); return sortedBoard(board).findIndex(x => x.id === id) + 1; }
async function safePhoto(ctx, image, caption, keyboard) { try { await ctx.replyWithPhoto(image, { caption, parse_mode: 'HTML', ...keyboard }); } catch { await ctx.reply(caption, { parse_mode: 'HTML', ...keyboard }); } }
function caption(p) { return [`<b>${html(p.title)}</b>`, `<code>${html(p.code)}</code>`, '', html(p.short), '', `<b>${money(p.price)}</b>`].join('\n'); }
async function welcome(ctx) { await safePhoto(ctx, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1400&q=80', '<b>Focus Coffee Bar</b>\nDark minimal demo: menu, preorder and loyalty league.', Markup.inlineKeyboard([[Markup.button.callback('Открыть меню', 'menu'), Markup.button.callback('Focus League', 'leaderboard')], [Markup.button.callback('Точка', 'branches'), Markup.button.callback(`Корзина ${cartQty(ctx)}`, 'cart')]])); await ctx.reply('Главное меню:', mainKeyboard); }
async function showMenu(ctx) { await ctx.reply('<b>Focus Menu</b>\nВыберите категорию. Позиции откроются карточками с фото и кнопкой добавления.', { parse_mode: 'HTML', ...menuKeyboard }); }
async function showCategory(ctx, id) { const c = categories[id] || categories.popular; await ctx.reply(`<b>${c.title}</b>`, { parse_mode: 'HTML' }); for (const productId of c.ids) { const p = productById(productId); if (p) await safePhoto(ctx, p.image, caption(p), Markup.inlineKeyboard([[Markup.button.callback('Добавить', `add:${p.id}`)], [Markup.button.callback('Корзина', 'cart'), Markup.button.callback('Категории', 'menu')]])); } }
async function showBranches(ctx) { const text = ['<b>Focus точка</b>', ...branches.map(b => `📍 <b>${html(b.title)}</b>\n<code>${html(b.time)}</code>\n${html(b.note)}`)].join('\n\n'); await ctx.reply(text, { parse_mode: 'HTML' }); }
async function showBonus(ctx) { await ctx.reply('<b>Focus Bonus</b>\n<code>FOCUS10</code> — 10% на первый preorder\n🏆 Focus League — покупай чаще и поднимайся выше', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Меню', 'menu'), Markup.button.callback('League', 'leaderboard')]]) }); }
async function showLeaderboard(ctx) { const top = sortedBoard(await loadBoard()).slice(0, 10); if (!top.length) return ctx.reply('🏆 <b>Focus League пока пустая</b>\nОформите первый preorder.', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Меню', 'menu')]]) }); const lines = top.map((u, i) => `${String(i + 1).padStart(2, '0')} <b>${html(u.name)}</b>\n   ☕ <code>${u.cups}</code> позиций · 🧾 <code>${u.orders}</code> заказов`); await ctx.reply(['🏆 <b>Focus League</b>', 'Публично показываем только имя, без username.', '', ...lines].join('\n'), { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Меню', 'menu'), Markup.button.callback('Корзина', 'cart')]]) }); }
async function showCart(ctx) { if (!ctx.session.cart.length) return ctx.reply('🛒 <b>Корзина пустая</b>\nОткройте меню и добавьте кофе.', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Меню', 'menu')]]) }); const lines = ctx.session.cart.map(line => { const p = productById(line.id); return `• <b>${html(p.title)}</b> × ${line.qty} — <code>${money(p.price * line.qty)}</code>`; }); await ctx.reply(['🛒 <b>Focus preorder</b>', ...lines, '', `Итого: <b>${money(cartTotal(ctx))}</b>`].join('\n'), { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Оформить', 'checkout')], [Markup.button.callback('Добавить ещё', 'menu'), Markup.button.callback('Очистить', 'clear')]]) }); }
async function checkout(ctx) { if (!ctx.session.cart.length) return showCart(ctx); ctx.session.step = 'pickup'; await ctx.reply('Напишите pickup time. Например: <code>15:30</code>', { parse_mode: 'HTML' }); }
async function finish(ctx, pickup) { const total = cartTotal(ctx); const cups = cartQty(ctx); const rank = await addScore(ctx, { cups, total }); const lines = ctx.session.cart.map(line => { const p = productById(line.id); return `• ${p.title} × ${line.qty}`; }).join('\n'); if (managerChatId) await ctx.telegram.sendMessage(managerChatId, `New Focus preorder\nGuest: ${publicName(ctx)}\nPickup: ${pickup}\n\n${lines}\n\nTotal: ${money(total)}`); await ctx.reply(`✅ <b>Предзаказ принят</b>\nPickup: <b>${html(pickup)}</b>\nИтого: <b>${money(total)}</b>\n\n🏆 Вы теперь #${rank} в Focus League.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Показать League', 'leaderboard'), Markup.button.callback('Новое меню', 'menu')]]) }); ctx.session.cart = []; ctx.session.step = null; }
bot.start(welcome); bot.command('leaderboard', showLeaderboard); bot.hears('☕ Меню', showMenu); bot.hears('📍 Точка', showBranches); bot.hears('🎁 Bonus', showBonus); bot.hears('🛒 Корзина', showCart); bot.hears('🏆 Focus League', showLeaderboard); bot.hears('🧾 Предзаказ', checkout);
bot.action('menu', async ctx => { await ctx.answerCbQuery(); await showMenu(ctx); }); bot.action('branches', async ctx => { await ctx.answerCbQuery(); await showBranches(ctx); }); bot.action('leaderboard', async ctx => { await ctx.answerCbQuery(); await showLeaderboard(ctx); }); bot.action('cart', async ctx => { await ctx.answerCbQuery(); await showCart(ctx); }); bot.action('checkout', async ctx => { await ctx.answerCbQuery(); await checkout(ctx); }); bot.action('clear', async ctx => { ctx.session.cart = []; await ctx.answerCbQuery('Очищено'); await showCart(ctx); }); bot.action(/^cat:(.+)$/, async ctx => { await ctx.answerCbQuery(); await showCategory(ctx, ctx.match[1]); }); bot.action(/^add:(.+)$/, async ctx => { const p = productById(ctx.match[1]); if (!p) return ctx.answerCbQuery('Нет позиции'); const line = ctx.session.cart.find(x => x.id === p.id); if (line) line.qty += 1; else ctx.session.cart.push({ id: p.id, qty: 1 }); await ctx.answerCbQuery(`${p.title} добавлен`); await ctx.reply(`Добавлено: <b>${html(p.title)}</b>\nВ корзине: <code>${cartQty(ctx)}</code>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('Корзина', 'cart'), Markup.button.callback('Ещё меню', 'menu')]]) }); });
bot.on('text', async ctx => { if (ctx.session.step === 'pickup') return finish(ctx, ctx.message.text.trim()); await ctx.reply('Выберите действие ниже.', mainKeyboard); });
bot.catch(error => console.error('Focus bot error:', error));
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
