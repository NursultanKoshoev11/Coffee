const branches=[
  {id:'center',name:'Cosmo Center',time:'08:00-22:00',address:'центр города · pickup'},
  {id:'park',name:'Cosmo Park',time:'09:00-23:00',address:'рядом с парком · cozy spot'},
  {id:'express',name:'Cosmo Express',time:'07:30-21:00',address:'быстрый кофе с собой'}
];
const products=[
  {id:'latte',cat:'coffee',icon:'☕',name:'Salted Caramel Latte',desc:'espresso, warm milk, caramel cream, soft salt finish',price:190,tone:'#d7954c'},
  {id:'americano',cat:'coffee',icon:'☕',name:'Americano',desc:'clean black coffee for a fast morning order',price:120,tone:'#8f5a35'},
  {id:'cappuccino',cat:'coffee',icon:'☕',name:'Cappuccino',desc:'classic espresso with smooth milk foam',price:160,tone:'#c98951'},
  {id:'raf',cat:'coffee',icon:'☕',name:'Vanilla Raf',desc:'cream, vanilla and espresso in a soft sweet cup',price:210,tone:'#e1b36f'},
  {id:'matcha',cat:'special',icon:'🍵',name:'Iced Matcha',desc:'fresh matcha with milk and ice',price:220,tone:'#9fb88b'},
  {id:'coldbrew',cat:'special',icon:'🫐',name:'Berry Cold Brew',desc:'cold brew with berry foam and light acidity',price:240,tone:'#8c6bb1'},
  {id:'croissant',cat:'food',icon:'🥐',name:'Butter Croissant',desc:'warm pastry for coffee and breakfast orders',price:95,tone:'#e0aa58'},
  {id:'cake',cat:'food',icon:'🍰',name:'Basque Cheesecake',desc:'creamy dessert with roasted top',price:180,tone:'#e7c28d'},
  {id:'tiramisu',cat:'food',icon:'🍫',name:'Coffee Tiramisu',desc:'coffee cream dessert for a premium combo',price:210,tone:'#8b5a3c'}
];
const cats=[['all','Все'],['coffee','Кофе'],['special','Special'],['food','Десерты']];
let activeBranch='center';let activeCat='all';let cart=JSON.parse(localStorage.getItem('cosmoCartV2')||'[]');
const $=id=>document.getElementById(id);const som=n=>`${n} сом`;
function save(){localStorage.setItem('cosmoCartV2',JSON.stringify(cart));renderCart();}
function openCart(){const c=$('cart');c.classList.add('open');c.setAttribute('aria-hidden','false')}
function closeCart(){const c=$('cart');c.classList.remove('open');c.setAttribute('aria-hidden','true')}
function renderBranches(){
  const root=$('branchTabs');root.innerHTML='';
  branches.forEach(b=>{const card=document.createElement('button');card.className='branch-card'+(b.id===activeBranch?' active':'');card.innerHTML=`<small>Открыто</small><b>${b.name}</b><span>${b.time}</span><span>${b.address}</span>`;card.onclick=()=>{activeBranch=b.id;renderBranches()};root.appendChild(card)});
  const select=$('orderBranch');select.innerHTML='';branches.forEach(b=>{const o=document.createElement('option');o.value=b.id;o.textContent=b.name;select.appendChild(o)});select.value=activeBranch;select.onchange=e=>{activeBranch=e.target.value;renderBranches()};
}
function renderCats(){const root=$('categoryTabs');root.innerHTML='';cats.forEach(([id,label])=>{const b=document.createElement('button');b.className=id===activeCat?'active':'';b.textContent=label;b.onclick=()=>{activeCat=id;renderCats();renderMenu()};root.appendChild(b)})}
function renderMenu(){
  const root=$('menuGrid');root.innerHTML='';
  products.filter(p=>activeCat==='all'||p.cat===activeCat).forEach(p=>{const card=document.createElement('article');card.className='menu-card';card.style.setProperty('--tone',p.tone);card.innerHTML=`<div class="product-art"><span>${p.icon}</span></div><h3>${p.name}</h3><p>${p.desc}</p><div class="card-bottom"><span class="price">${som(p.price)}</span><button class="add-btn" data-add="${p.id}">Добавить</button></div>`;root.appendChild(card)});
  document.querySelectorAll('[data-add]').forEach(btn=>btn.onclick=()=>add(btn.dataset.add));
}
function add(id){const line=cart.find(x=>x.id===id);if(line)line.qty++;else cart.push({id,qty:1});save();openCart()}
function changeQty(id,delta){const line=cart.find(x=>x.id===id);if(!line)return;line.qty+=delta;if(line.qty<1)cart=cart.filter(x=>x.id!==id);save()}
function totals(){let sum=cart.reduce((acc,line)=>{const p=products.find(x=>x.id===line.id);return acc+(p?p.price*line.qty:0)},0);const qty=cart.reduce((a,b)=>a+b.qty,0);const promo=($('promoInput')?.value||'').trim().toUpperCase();let discount=0;if(promo==='COSMO10')discount=Math.round(sum*.1);if(promo==='FRIENDS15'&&qty>=2)discount=Math.round(sum*.15);return{sum,discount,total:Math.max(0,sum-discount),qty,promo}}
function renderCart(){
  $('cartCount').textContent=cart.reduce((a,b)=>a+b.qty,0);const root=$('cartItems');root.innerHTML='';
  if(!cart.length){root.innerHTML='<div class="empty-cart">Корзина пустая. Добавьте напиток или десерт из меню.</div>';$('cartTotal').textContent=som(0);return}
  cart.forEach(line=>{const p=products.find(x=>x.id===line.id);const row=document.createElement('div');row.className='cartItem';row.innerHTML=`<div><b>${p.icon} ${p.name}</b><small>${som(p.price)} × ${line.qty}</small></div><div class="qty"><button data-minus="${line.id}">−</button><span>${line.qty}</span><button data-plus="${line.id}">+</button></div>`;root.appendChild(row)});
  document.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.minus,-1));document.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.plus,1));const t=totals();$('cartTotal').textContent=t.discount?`${som(t.total)} · скидка ${som(t.discount)}`:som(t.total)
}
function makeOrderText(){const b=branches.find(x=>x.id===activeBranch);const name=$('guestName').value.trim()||'Гость';const lines=cart.map(line=>{const p=products.find(x=>x.id===line.id);return `• ${p.name} × ${line.qty}`}).join('\n');const t=totals();return `Cosmo Social Coffee demo\nФилиал: ${b.name}\nИмя: ${name}\n\nЗаказ:\n${lines}\n\nИтого: ${som(t.total)}${t.discount?`\nСкидка: ${som(t.discount)}`:''}`}
async function copyOrder(){if(!cart.length){$('status').textContent='Сначала добавьте товар в корзину.';return}const text=makeOrderText();$('status').textContent=text;try{await navigator.clipboard.writeText(text);$('status').textContent=text+'\n\nСкопировано. Можно отправить менеджеру или в Telegram.'}catch(e){}}
$('openCart').onclick=openCart;$('heroOrder').onclick=openCart;$('closeCart').onclick=closeCart;$('cartBackdrop').onclick=closeCart;$('promoInput').oninput=renderCart;$('copyOrder').onclick=copyOrder;renderBranches();renderCats();renderMenu();renderCart();
