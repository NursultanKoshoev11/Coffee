import { Telegraf, Markup, session } from 'telegraf';
import 'dotenv/config';

const token = process.env.BOT_TOKEN;
const managerChatId = process.env.MANAGER_CHAT_ID;
if (!token) throw new Error('Set BOT_TOKEN in .env');

const bot = new Telegraf(token);
bot.use(session({ defaultSession: () => ({ cart: [], step: null, profile: {} }) }));

const branches = [
  { id: 'center', title: 'Cosmo Center', time: '08:00–22:00', note: 'Центральная точка для встреч и dine-in.' },
  { id: 'park', title: 'Cosmo Park', time: '09:00–23:00', note: 'Спокойная атмосфера рядом с парком.' },
  { id: 'express', title: 'Cosmo Express', time: '07:30–21:00', note: 'Быстрый кофе с собой утром и днём.' }
];

const products = [
  {
    id: 'latte',
    code: 'LATTE190',
    category: 'coffee',
    title: 'Salted Caramel Latte',
    price: 190,
    short: 'espresso · молоко · карамель · мягкая соль',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'cappuccino',
    code: 'CAP160',
    category: 'coffee',
    title: 'Cappuccino',
    price: 160,
    short: 'классика, плотная пенка и balanced espresso',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'raf',
    code: 'RAF210',
    category: 'coffee',
    title: 'Vanilla Raf',
    price: 210,
    short: 'сливки · ваниль · espresso · мягкий вкус',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'matcha',
    code: 'MATCHA220',
    category: 'special',
    title: 'Iced Matcha',
    price: 220,
    short: 'matcha · молоко · лёд · свежий зелёный вкус',
    image: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'coldbrew',
    code: 'BERRY240',
    category: 'special',
    title: 'Berry Cold Brew',
    price: 240,
    short: 'cold brew · ягодная пена · лёгкая кислинка',
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'croissant',
    code: 'CRO95',
    category: 'food',
    title: 'Butter Croissant',
    price: 95,
    short: 'тёплая выпечка к кофе или завтраку',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'cheesecake',
    code: 'CHEESE180',
    category: 'food',
    title: 'Basque Cheesecake',
    price: 180,
    short: 'нежный сырный десерт с карамельной корочкой',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1200&q=80'
  }
];

const categories = {
  popular: { title: '🔥 Популярное', ids: ['latte', 'cappuccino', 'matcha', 'croissant'] },
  coffee: { title: '☕ Кофе', ids: products.filter(p => p.category === 'coffee').map(p => p.id) },
  special: { title: '🍵 Special', ids: products.filter(p => p.category === 'special').map(p => p.id) },
  food: { title: '🥐 Десерты', ids: products.filter(p => p.category === 'food').map(p => p.id) }
};

const money = value => `${value} сом`;
const productById = id => products.find(item => item.id === id);
const cartQty = ctx => (ctx.session.cart || []).reduce((sum, line) => sum + line.qty, 0);
const cartTotal = ctx => (ctx.session.cart || []).reduce((sum, line) => {
  const product = productById(line.id);
  return sum + (product ? product.price * line.qty : 0);
}, 0);

const mainKeyboard = Markup.keyboard([
  ['☕ Меню', '🛒 Корзина'],
  ['📍 Филиалы', '🎁 Бонусы'],
  ['🧾 Оформить заказ']
]).resize();

const menuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🔥 Популярное', 'cat:popular'), Markup.button.callback('☕ Кофе', 'cat:coffee')],
  [Markup.button.callback('🍵 Special', 'cat:special'), Markup.button.callback('🥐 Десерты', 'cat:food')],
  [Markup.button.callback('🛒 Корзина', 'cart')]
]);

function html(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function safePhoto(ctx, image, caption, keyboard) {
  try {
    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: 'HTML',
      ...keyboard
    });
  } catch (error) {
    await ctx.reply(caption, {
      parse_mode: 'HTML',
      ...keyboard
    });
  }
}

function productCaption(product) {
  return [
    `<b>${html(product.title)}</b>`,
    `<code>${html(product.code)}</code>`,
    '',
    `${html(product.short)}`,
    '',
    `<b>${money(product.price)}</b>`
  ].join('\n');
}

async function showWelcome(ctx) {
  const caption = [
    '<b>Cosmo Social Coffee</b>',
    'Красивое demo-меню для заказа через Telegram.',
    '',
    'Выберите раздел — напитки откроются карточками с фото, ценой и кнопкой добавления.'
  ].join('\n');

  await safePhoto(
    ctx,
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1400&q=80',
    caption,
    Markup.inlineKeyboard([
      [Markup.button.callback('Открыть меню', 'menu'), Markup.button.callback('Бонусы', 'bonus')],
      [Markup.button.callback('Филиалы', 'branches'), Markup.button.callback(`Корзина ${cartQty(ctx)}`, 'cart')]
    ])
  );
  await ctx.reply('Главное меню:', mainKeyboard);
}

async function showMenu(ctx) {
  await ctx.reply('<b>Меню Cosmo</b>\nВыберите категорию. Не перегружаю текстом — каждая позиция откроется отдельной красивой карточкой.', {
    parse_mode: 'HTML',
    ...menuKeyboard
  });
}

async function showCategory(ctx, categoryId) {
  const category = categories[categoryId] || categories.popular;
  await ctx.reply(`<b>${category.title}</b>\nНажмите «Добавить», чтобы собрать заказ.`, { parse_mode: 'HTML' });

  for (const id of category.ids) {
    const product = productById(id);
    if (!product) continue;
    await safePhoto(
      ctx,
      product.image,
      productCaption(product),
      Markup.inlineKeyboard([
        [Markup.button.callback('Добавить в заказ', `add:${product.id}`)],
        [Markup.button.callback('Корзина', 'cart'), Markup.button.callback('Назад к категориям', 'menu')]
      ])
    );
  }
}

async function showBranches(ctx) {
  const text = [
    '<b>Филиалы</b>',
    'Выберите точку для pickup или покажите клиенту, как заказ можно разделять по филиалам.',
    '',
    ...branches.map(branch => `📍 <b>${html(branch.title)}</b>\n<code>${html(branch.time)}</code>\n${html(branch.note)}`)
  ].join('\n\n');

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(branches.map(branch => [Markup.button.callback(branch.title, `branch:${branch.id}`)]))
  });
}

async function showBonus(ctx) {
  const caption = [
    '<b>Cosmo Bonus</b>',
    'Простая loyalty-механика для MVP.',
    '',
    '🎁 <code>COSMO10</code> — 10% на первый заказ',
    '👥 <code>FRIENDS15</code> — 15% от 2 позиций',
    '☕ <code>7THCUP</code> — каждый 7-й кофе бесплатно'
  ].join('\n');

  await safePhoto(
    ctx,
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1400&q=80',
    caption,
    Markup.inlineKeyboard([
      [Markup.button.callback('Открыть меню', 'menu'), Markup.button.callback('Корзина', 'cart')]
    ])
  );
}

async function showCart(ctx) {
  const cart = ctx.session.cart || [];
  if (!cart.length) {
    await ctx.reply('🛒 <b>Корзина пустая</b>\nОткройте меню и добавьте напиток карточкой.', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('Открыть меню', 'menu')]])
    });
    return;
  }

  const lines = cart.map(line => {
    const product = productById(line.id);
    return `• <b>${html(product.title)}</b> × ${line.qty} — <code>${money(product.price * line.qty)}</code>`;
  });

  await ctx.reply([
    '🛒 <b>Ваш заказ</b>',
    ...lines,
    '',
    `Итого: <b>${money(cartTotal(ctx))}</b>`
  ].join('\n'), {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('Оформить заказ', 'checkout')],
      [Markup.button.callback('Добавить ещё', 'menu'), Markup.button.callback('Очистить', 'clear')]
    ])
  });
}

async function startCheckout(ctx) {
  if (!ctx.session.cart?.length) {
    await showCart(ctx);
    return;
  }
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

  const managerText = [
    'New Cosmo demo order',
    `Guest: ${name}`,
    `Phone: ${phone}`,
    `Branch: ${branch}`,
    '',
    orderLines,
    '',
    `Total: ${money(cartTotal(ctx))}`
  ].join('\n');

  if (managerChatId) await ctx.telegram.sendMessage(managerChatId, managerText);

  await ctx.reply([
    '✅ <b>Заказ принят</b>',
    `Гость: <b>${html(name)}</b>`,
    `Филиал: <b>${html(branch)}</b>`,
    `Итого: <b>${money(cartTotal(ctx))}</b>`,
    '',
    'Для MVP это показывает полный сценарий: меню → корзина → заявка менеджеру.'
  ].join('\n'), { parse_mode: 'HTML', ...mainKeyboard });

  ctx.session.cart = [];
  ctx.session.step = null;
  ctx.session.profile = {};
}

bot.start(showWelcome);
bot.hears('☕ Меню', showMenu);
bot.hears('📍 Филиалы', showBranches);
bot.hears('🎁 Бонусы', showBonus);
bot.hears('🛒 Корзина', showCart);
bot.hears('🧾 Оформить заказ', startCheckout);

bot.action('menu', async ctx => { await ctx.answerCbQuery(); await showMenu(ctx); });
bot.action('branches', async ctx => { await ctx.answerCbQuery(); await showBranches(ctx); });
bot.action('bonus', async ctx => { await ctx.answerCbQuery(); await showBonus(ctx); });
bot.action('cart', async ctx => { await ctx.answerCbQuery(); await showCart(ctx); });
bot.action('checkout', async ctx => { await ctx.answerCbQuery(); await startCheckout(ctx); });
bot.action('clear', async ctx => { ctx.session.cart = []; await ctx.answerCbQuery('Корзина очищена'); await showCart(ctx); });

bot.action(/^cat:(.+)$/, async ctx => {
  await ctx.answerCbQuery();
  await showCategory(ctx, ctx.match[1]);
});

bot.action(/^add:(.+)$/, async ctx => {
  const id = ctx.match[1];
  const product = productById(id);
  if (!product) return ctx.answerCbQuery('Позиция не найдена');
  const line = ctx.session.cart.find(item => item.id === id);
  if (line) line.qty += 1;
  else ctx.session.cart.push({ id, qty: 1 });
  await ctx.answerCbQuery(`${product.title} добавлен`);
  await ctx.reply(`Добавлено: <b>${html(product.title)}</b>\nВ корзине: <code>${cartQty(ctx)}</code>`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('Корзина', 'cart'), Markup.button.callback('Ещё меню', 'menu')]])
  });
});

bot.action(/^branch:(.+)$/, async ctx => {
  const branch = branches.find(item => item.id === ctx.match[1]);
  if (!branch) return ctx.answerCbQuery('Филиал не найден');
  ctx.session.profile.branch = branch.title;
  await ctx.answerCbQuery(branch.title);
  await ctx.reply(`Филиал выбран: <b>${html(branch.title)}</b>\n<code>${html(branch.time)}</code>`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('Открыть меню', 'menu'), Markup.button.callback('Корзина', 'cart')]])
  });
});

bot.on('text', async ctx => {
  if (ctx.session.step === 'name') {
    ctx.session.profile.name = ctx.message.text.trim();
    ctx.session.step = 'phone';
    await ctx.reply('Теперь номер телефона или Telegram username.\nНапример: <code>+996 555 000 000</code>', { parse_mode: 'HTML' });
    return;
  }

  if (ctx.session.step === 'phone') {
    await finishOrder(ctx, ctx.message.text.trim());
    return;
  }

  await ctx.reply('Выберите действие ниже или откройте меню карточками.', mainKeyboard);
});

bot.catch((error, ctx) => {
  console.error(`Bot error for update ${ctx.update?.update_id}:`, error);
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
