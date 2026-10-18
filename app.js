/* ============================================================
   PENGATURAN – ISI DI SINI
   Tempel URL Web App dari Google Apps Script (berakhiran /exec)
   di antara tanda kutip. Contoh:
   const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   Kosongkan ('') kalau belum mau mengirim data ke Spreadsheet.
   ============================================================ */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyBpm1xbmYoyAhqrPwjf1zWWj09Yn6_ZHwNzl-F7esM-v6sik2o2D6bvhcGcB60LEw/exec';

const $ = s => document.querySelector(s);
const rp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const START = 1000000, MAXBAR = 50;
const fresh = () => ({saldo: START, untung: 0, url: '', log: [], produk: [
  {id: 1, e: '👕', n: 'Kaos Polos', b: 25000, j: 45000, s: 20},
  {id: 2, e: '🎧', n: 'Earphone', b: 40000, j: 75000, s: 12},
  {id: 3, e: '🧴', n: 'Tumbler', b: 30000, j: 55000, s: 8}]});
let S;
try { S = JSON.parse(localStorage.getItem('tokosim')) || fresh(); } catch (e) { S = fresh(); }
if (WEB_APP_URL) S.url = WEB_APP_URL; // URL di atas selalu dipakai jika diisi
const save = () => { try { localStorage.setItem('tokosim', JSON.stringify(S)); } catch (e) {} };

/* ---------- tema ---------- */
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $('#theme').textContent = t === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('tokosim-theme', t); } catch (e) {}
}
let saved = null; try { saved = localStorage.getItem('tokosim-theme'); } catch (e) {}
setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

/* ---------- toast & angka beranimasi ---------- */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), 3000);
}
function count(el, to) {
  const from = +el.dataset.v || 0; el.dataset.v = to;
  const t0 = performance.now(), d = 700;
  (function f(t) {
    const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
    el.textContent = rp(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(f);
  })(t0);
}

/* ---------- render ---------- */
let first = true;
function render() {
  const nilai = S.produk.reduce((a, p) => a + p.b * p.s, 0);
  const stok = S.produk.reduce((a, p) => a + p.s, 0);
  count($('#sSaldo'), S.saldo); count($('#sNilai'), nilai); count($('#sUntung'), S.untung);
  $('#sStok').textContent = stok + ' pcs';

  const g = $('#grid');
  if (!S.produk.length) g.innerHTML = '<div class="card empty" style="grid-column:1/-1">Belum ada produk. Tambahkan produk pertamamu di atas 👆</div>';
  else g.innerHTML = S.produk.map((p, i) => {
    const pct = Math.min(100, p.s / MAXBAR * 100);
    const cls = p.s === 0 ? 'zero' : p.s <= 5 ? 'low' : '';
    return `<div class="card p" style="animation-delay:${first ? i * 70 : 0}ms" data-id="${p.id}">
      <div class="top"><div class="em">${esc(p.e)}</div><div><h3>${esc(p.n)}</h3>
      <div class="pr">Beli ${rp(p.b)} · Jual ${rp(p.j)}</div></div></div>
      <div class="meter"><i class="${cls}" data-w="${pct}"></i></div>
      <div class="stk"><span>Stok: <b>${p.s}</b> pcs</span><span>${p.s === 0 ? 'Habis!' : p.s <= 5 ? 'Menipis' : 'Aman'}</span></div>
      <div class="act"><input type="number" min="1" value="1" aria-label="Jumlah">
      <button class="btn" data-a="Jual">Jual</button><button class="btn g" data-a="Restock">Restock</button>
      <button class="btn r" data-a="Hapus" style="flex:0">✕</button></div></div>`;
  }).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => g.querySelectorAll('.meter i').forEach(m => m.style.width = m.dataset.w + '%')));

  $('#log').innerHTML = S.log.length ? S.log.slice().reverse().slice(0, 30).map((l, i) =>
    `<tr style="animation-delay:${i * 25}ms"><td>${esc(l.waktu)}</td><td><span class="tag ${l.tipe}">${l.tipe}</span></td><td>${esc(l.produk)}</td><td>${l.jumlah}</td><td>${rp(l.harga)}</td><td>${rp(l.total)}</td><td>${rp(l.saldo)}</td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">Belum ada transaksi. Coba jual satu barang!</td></tr>';
  first = false; save();
}

/* ---------- kirim ke Google Sheets ---------- */
async function send(data) {
  if (!S.url) return false;
  try {
    await fetch(S.url, {method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(data)});
    return true;
  } catch (e) { toast('Gagal kirim ke Spreadsheet'); return false; }
}

/* ---------- transaksi ---------- */
function trx(tipe, id, q) {
  const p = S.produk.find(x => x.id === id);
  q = Math.floor(q);
  if (!p || !(q > 0)) return toast('Isi jumlah dengan benar');
  let harga, total;
  if (tipe === 'Jual') {
    if (q > p.s) return toast(`Stok ${p.n} tidak cukup (sisa ${p.s})`);
    harga = p.j; total = harga * q; p.s -= q; S.saldo += total; S.untung += (p.j - p.b) * q;
  } else {
    harga = p.b; total = harga * q;
    if (total > S.saldo) return toast('Saldo tidak cukup untuk restock');
    p.s += q; S.saldo -= total;
  }
  const entry = {waktu: new Date().toLocaleString('id-ID'), tipe, produk: p.n, jumlah: q, harga, total, saldo: S.saldo};
  S.log.push(entry); render(); send(entry);
  toast(`${tipe} ${q} × ${p.n} · ${rp(total)}`);
  const c = document.querySelector(`[data-id="${id}"]`); if (c) c.classList.add('flash');
}

$('#grid').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const c = b.closest('.p'), id = +c.dataset.id, a = b.dataset.a;
  if (a === 'Hapus') {
    c.style.transition = 'all .3s'; c.style.opacity = 0; c.style.transform = 'scale(.9)';
    setTimeout(() => { S.produk = S.produk.filter(x => x.id !== id); render(); }, 280);
  } else trx(a, id, +c.querySelector('input').value);
});

$('#form').onsubmit = e => {
  e.preventDefault();
  S.produk.push({id: Date.now(), e: $('#fe').value || '📦', n: $('#fn').value.trim(), b: +$('#fb').value, j: +$('#fj').value, s: +$('#fs').value});
  e.target.reset(); $('#fe').value = '📦'; render(); toast('Produk ditambahkan');
};

$('#rand').onclick = () => {
  const ada = S.produk.filter(p => p.s > 0);
  if (!ada.length) return toast('Semua stok habis, lakukan restock dulu');
  const p = ada[Math.floor(Math.random() * ada.length)];
  trx('Jual', p.id, 1 + Math.floor(Math.random() * Math.min(5, p.s)));
};

$('#sendAll').onclick = async () => {
  if (!S.url) { toast('Isi URL Web App dulu di ⚙️'); return $('#dlg').showModal(); }
  if (!S.log.length) return toast('Belum ada transaksi');
  for (const l of S.log) await send(l);
  toast(`${S.log.length} transaksi dikirim ke Spreadsheet`);
};

$('#reset').onclick = () => {
  if (!confirm('Reset semua data simulasi?')) return;
  const u = S.url; S = fresh(); S.url = u; first = true; render(); toast('Simulasi di-reset');
};

$('#cfg').onclick = () => { $('#url').value = S.url; $('#dlg').showModal(); };
$('#close').onclick = () => $('#dlg').close();
$('#saveUrl').onclick = () => { S.url = $('#url').value.trim(); save(); $('#dlg').close(); toast(S.url ? 'URL tersimpan' : 'Pengiriman dimatikan'); };

render();
