const branches=[
  {id:'pickup',name:'Pickup preorder',time:'08:00-22:00',address:'забрать кофе и еду без ожидания'},
  {id:'dinein',name:'Dine-in order',time:'08:00-22:00',address:'заказ для гостей внутри Focus'},
  {id:'booking',name:'Table booking',time:'10:00-22:00',address:'бронь стола под завтрак, обед или ужин'}
];
const products=[
  {id:'flatwhite',cat:'coffee',icon:'☕',name:'Flat White',desc:'double espresso, silky milk, clean focus taste',price:180,tone:'#d8ff68'},
  {id:'americano',cat:'coffee',icon:'●',name:'Black Americano',desc:'чистый вкус, быстро и без лишнего',price:130,tone:'#eeeeee'},
  {id:'latte',cat:'coffee',icon:'◐',name:'Iced Latte',desc:'espresso, milk, ice, light texture',price:190,tone:'#c8c1b2'},
  {id:'filter',cat:'coffee',icon:'◎',name:'Batch Brew',desc:'фильтр дня, мягкий профиль, удобно брать to go',price:160,tone:'#d8ff68'},
  {id:'toast',cat:'kitchen',icon:'▣',name:'Avocado Toast',desc:'sourdough, avocado, egg, greens',price:290,tone:'#b7ff2a'},
  {id:'breakfast',cat:'kitchen',icon:'◒',name:'Focus Breakfast Plate',desc:'яйца, салат, тост, соус, сезонные добавки',price:340,tone:'#f3f1ec'},
  {id:'shakshuka',cat:'kitchen',icon:'◉',name:'Shakshuka',desc:'томаты, яйца, специи, хлеб',price:320,tone:'#ffb36b'},
  {id:'sandwich',cat:'kitchen',icon:'▰',name:'Chicken Sandwich',desc:'курица, соус, зелень, хрустящий хлеб',price:310,tone:'#d5c3a3'},
  {id:'salad',cat:'kitchen',icon:'◇',name:'Green Bowl',desc:'овощи, зелень, яйцо, лёгкий dressing',price:280,tone:'#a8ff35'},
  {id:'croissant',cat:'dessert',icon:'△',name:'Butter Croissant',desc:'тёплый круассан к утреннему кофе',price:110,tone:'#d5c3a3'},
  {id:'bun',cat:'dessert',icon:'◇',name:'Cardamom Bun',desc:'булочка с кардамоном',price:120,tone:'#c9b48f'},
  {id:'cheesecake',cat:'dessert',icon:'□',name:'Burnt Cheesecake',desc:'нежный десерт к фильтру или латте',price:190,tone:'#8c8174'}
];
const cats=[['all','Все'],['coffee','Coffee'],['kitchen','Kitchen'],['dessert','Dessert']];
const seed=[
  {id:'demo1',name:'Алина',avatar:'A',cups:21,orders:8,totalSpent:4980},
  {id:'demo2',name:'Данияр',avatar:'D',cups:17,orders:6,totalSpent:3910},
  {id:'demo3',name:'Мира',avatar:'M',cups:14,orders:5,totalSpent:3260},
  {id:'demo4',name:'Focus Guest',avatar:'F',cups:9,orders:3,totalSpent:2080}
];
let activeBranch='pickup';let activeCat='all';let cart=JSON.parse(localStorage.getItem('focusKitchenCartV1')||'[]');
const $=id=>document.getElementById(id);const som=n=>`${n} сом`;
function save(){localStorage.setItem('focusKitchenCartV1',JSON.stringify(cart));renderCart()}
function openCart(){const c=$('cart');c.classList.add('open');c.setAttribute('aria-hidden','false')}
function closeCart(){const c=$('cart');c.classList.remove('open');c.setAttribute('aria-hidden','true')}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function publicName(v=''){let s=String(v).replaceAll('@','').replaceAll('+','').replace(/[0-9]/g,'').replace(/\s+/g,' ').trim();return s.length>1?s.slice(0,22):'Focus Guest'}
function initials(name){return name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'F'}
function board(){return JSON.parse(localStorage.getItem('focusKitchenLeaderboardV1')||JSON.stringify(seed))}
function saveBoard(data){localStorage.setItem('focusKitchenLeaderboardV1',JSON.stringify(data))}
function sorted(data){return[...data].sort((a,b)=>(b.cups||0)-(a.cups||0)||(b.orders||0)-(a.orders||0)||(b.totalSpent||0)-(a.totalSpent||0))}
function medal(i){return['01','02','03'][i]||String(i+1).padStart(2,'0')}
function guestKey(name){return 'guest-'+publicName(name).toLowerCase().replace(/[^а-яa-z]+/gi,'-').replace(/^-|-$/g,'focus')}
function addScore(name,{cups,total}){const publicValue=publicName(name);const data=board();const id=guestKey(publicValue);let u=data.find(x=>x.id===id);if(!u){u={id,name:publicValue,avatar:initials(publicValue),cups:0,orders:0,totalSpent:0};data.push(u)}u.name=publicValue;u.avatar=u.avatar||initials(publicValue);u.cups+=cups;u.orders+=1;u.totalSpent+=total;saveBoard(data);return sorted(data).findIndex(x=>x.id===id)+1}
function renderLeaderboard(){const podium=$('leaderboardPodium'),list=$('leaderboardList'),total=$('leaderboardTotal');if(!podium||!list)return;const data=sorted(board());total.textContent=`${data.length} участников`;podium.innerHTML=data.slice(0,3).map((u,i)=>`<article class="podium-card rank-${i+1}"><div class="rank-medal">${medal(i)}</div><div class="league-avatar">${escapeHtml(u.avatar||initials(u.name))}</div><b>${escapeHtml(u.name)}</b><span>${u.cups||0} позиций · ${u.orders||0} заказов</span><em>${som(u.totalSpent||0)}</em></article>`).join('');list.innerHTML=data.slice(0,8).map((u,i)=>`<div class="leader-row"><div class="leader-place">${medal(i)}</div><div class="league-avatar small">${escapeHtml(u.avatar||initials(u.name))}</div><div class="leader-name"><b>${escapeHtml(u.name)}</b><span>privacy-safe · no username</span></div><div class="leader-score"><b>${u.cups||0}</b><span>coffee + kitchen</span></div></div>`).join('')}
function resetLeaderboard(){saveBoard(seed);renderLeaderboard();$('status').textContent='Focus Coffee & Kitchen demo-лига сброшена.'}
function renderBranches(){const root=$('branchTabs');root.innerHTML='';branches.forEach(b=>{const card=document.createElement('button');card.className='branch-card'+(b.id===activeBranch?' active':'');card.innerHTML=`<small>open</small><b>${b.name}</b><span>${b.time}</span><span>${b.address}</span>`;card.onclick=()=>{activeBranch=b.id;renderBranches()};root.appendChild(card)});const select=$('orderBranch');select.innerHTML='';branches.forEach(b=>{const o=document.createElement('option');o.value=b.id;o.textContent=b.name;select.appendChild(o)});select.value=activeBranch;select.onchange=e=>{activeBranch=e.target.value;renderBranches()}}
function renderCats(){const root=$('categoryTabs');root.innerHTML='';cats.forEach(([id,label])=>{const b=document.createElement('button');b.className=id===activeCat?'active':'';b.textContent=label;b.onclick=()=>{activeCat=id;renderCats();renderMenu()};root.appendChild(b)})}
function renderMenu(){const root=$('menuGrid');root.innerHTML='';products.filter(p=>activeCat==='all'||p.cat===activeCat).forEach(p=>{const card=document.createElement('article');card.className='menu-card';card.style.setProperty('--tone',p.tone);card.innerHTML=`<div class="product-art"><span>${p.icon}</span></div><h3>${p.name}</h3><p>${p.desc}</p><div class="card-bottom"><span class="price">${som(p.price)}</span><button class="add-btn" data-add="${p.id}">Добавить</button></div>`;root.appendChild(card)});document.querySelectorAll('[data-add]').forEach(btn=>btn.onclick=()=>add(btn.dataset.add))}
function add(id){const line=cart.find(x=>x.id===id);if(line)line.qty++;else cart.push({id,qty:1});save();openCart()}
function changeQty(id,delta){const line=cart.find(x=>x.id===id);if(!line)return;line.qty+=delta;if(line.qty<1)cart=cart.filter(x=>x.id!==id);save()}
function totals(){let sum=cart.reduce((acc,line)=>{const p=products.find(x=>x.id===line.id);return acc+(p?p.price*line.qty:0)},0);const qty=cart.reduce((a,b)=>a+b.qty,0);const promo=($('promoInput')?.value||'').trim().toUpperCase();let discount=0;if(promo==='FOCUS10')discount=Math.round(sum*.1);if(promo==='KITCHEN15'&&qty>=2)discount=Math.round(sum*.15);return{sum,discount,total:Math.max(0,sum-discount),qty,promo}}
function renderCart(){ $('cartCount').textContent=cart.reduce((a,b)=>a+b.qty,0);const root=$('cartItems');root.innerHTML='';if(!cart.length){root.innerHTML='<div class="empty-cart">Корзина пустая. Добавьте кофе, завтрак или блюдо кухни.</div>';$('cartTotal').textContent=som(0);return}cart.forEach(line=>{const p=products.find(x=>x.id===line.id);const row=document.createElement('div');row.className='cartItem';row.innerHTML=`<div><b>${p.icon} ${p.name}</b><small>${som(p.price)} × ${line.qty}</small></div><div class="qty"><button data-minus="${line.id}">−</button><span>${line.qty}</span><button data-plus="${line.id}">+</button></div>`;root.appendChild(row)});document.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.minus,-1));document.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.plus,1));const t=totals();$('cartTotal').textContent=t.discount?`${som(t.total)} · скидка ${som(t.discount)}`:som(t.total)}
function makeOrderText(){const b=branches.find(x=>x.id===activeBranch);const name=publicName($('guestName').value);const pickup=($('pickupTime')?.value||'как можно скорее').trim();const lines=cart.map(line=>{const p=products.find(x=>x.id===line.id);return `• ${p.name} × ${line.qty}`}).join('\n');const t=totals();return `Focus Coffee & Kitchen demo\nФормат: ${b.name}\nИмя: ${name}\nВремя: ${pickup}\n\nЗаказ:\n${lines}\n\nИтого: ${som(t.total)}${t.discount?`\nСкидка: ${som(t.discount)}`:''}`}
async function copyOrder(){if(!cart.length){$('status').textContent='Сначала добавьте кофе или блюдо в корзину.';return}const t=totals();const name=publicName($('guestName').value);const text=makeOrderText();const rank=addScore(name,{cups:t.qty,total:t.total});renderLeaderboard();$('status').textContent=`${text}\n\nFocus League: ${name} теперь #${rank}.`;try{await navigator.clipboard.writeText(text)}catch(e){}cart=[];save();setTimeout(()=>document.querySelector('#leaderboard')?.scrollIntoView({behavior:'smooth'}),250)}
function handleReservation(e){e.preventDefault();const name=publicName($('reserveName').value);const date=$('reserveDate').value||'сегодня';const time=$('reserveTime').value||'уточнить время';const guests=$('reserveGuests').value;const note=$('reserveNote').value||'без комментария';$('reservationStatus').textContent=`Focus Coffee & Kitchen booking\nИмя: ${name}\nДата: ${date}\nВремя: ${time}\nГостей: ${guests}\nКомментарий: ${note}\n\nDemo-бронь сформирована. В реальной версии это уйдёт менеджеру в Telegram.`}
$('openCart').onclick=openCart;$('heroOrder').onclick=openCart;$('closeCart').onclick=closeCart;$('cartBackdrop').onclick=closeCart;$('promoInput').oninput=renderCart;$('copyOrder').onclick=copyOrder;$('resetLeaderboard').onclick=resetLeaderboard;$('reservationForm').onsubmit=handleReservation;renderBranches();renderCats();renderMenu();renderCart();renderLeaderboard();
