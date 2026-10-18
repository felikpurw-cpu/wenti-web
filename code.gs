/**
 * TokoSim – Google Apps Script (Code.gs)
 * Menerima data transaksi dari website lalu menyimpannya ke sheet "Transaksi".
 *
 * Cara pakai: Spreadsheet → Ekstensi → Apps Script → tempel kode ini
 * → Deploy → Aplikasi web (Execute as: Saya, Akses: Siapa saja).
 */

const NAMA_SHEET = 'Transaksi';
const HEADER = ['Waktu', 'Tipe', 'Produk', 'Jumlah', 'Harga Satuan', 'Total', 'Saldo'];

// Dipanggil website setiap ada transaksi (metode POST)
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // cegah data bentrok jika dikirim bersamaan

    const d = JSON.parse(e.postData.contents);
    const sheet = ambilSheet_();

    sheet.appendRow([
      d.waktu,
      d.tipe,
      d.produk,
      Number(d.jumlah),
      Number(d.harga),
      Number(d.total),
      Number(d.saldo)
    ]);

    return balas_({ status: 'ok' });
  } catch (err) {
    return balas_({ status: 'error', pesan: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Untuk tes: buka URL /exec di browser, harus muncul {"status":"aktif"}
function doGet() {
  return balas_({ status: 'aktif' });
}

// Ambil sheet "Transaksi"; kalau belum ada, buat otomatis lengkap dengan header
function ambilSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NAMA_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(NAMA_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
    sheet.getRange(1, 1, 1, HEADER.length)
      .setFontWeight('bold')
      .setBackground('#0f766e')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.getRange('E:G').setNumberFormat('"Rp "#,##0');
  }
  return sheet;
}

function balas_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Opsional: jalankan manual sekali untuk mengetes tanpa website
function tesManual() {
  doPost({
    postData: {
      contents: JSON.stringify({
        waktu: new Date().toLocaleString('id-ID'),
        tipe: 'Jual', produk: 'Tes Produk',
        jumlah: 2, harga: 45000, total: 90000, saldo: 1090000
      })
    }
  });
}
