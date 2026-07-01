const APP = {
  SPREADSHEET_ID: '', // diisi manual oleh user setelah setup jika ingin memakai spreadsheet yang sudah ada
  DRIVE_FOLDER_ID: '', // diisi/di-update dari sheet Config
  MAX_UPLOAD_MB: 10,
  MAX_EVIDENCE_FILES: 10,
  MAX_EVIDENCE_UPLOAD_MB: 5,
  MAX_ITEMS: 10,
  APP_NAME: 'Pengajuan Kartu Garansi',
  SESSION_DURATION_HOURS: 6,
};

const SHEETS = {
  PENGAJUAN: 'Pengajuan',
  ITEMS: 'PengajuanItems',
  USERS: 'Users',
  RECIPIENTS: 'EmailRecipients',
  CONFIG: 'Config',
  STATUS_LOG: 'StatusLog',
  EMAIL_LOG: 'EmailLog',
  WARRANTY_CARDS: 'WarrantyCards',
  PRINT_BATCH: 'PrintBatch',
  PRINT_LAYOUTS: 'PrintLayouts',
  MODEL_PRODUK: 'ModelProduk',
  SHIPPING_LABELS: 'ShippingLabels',
};

const HEADERS = {
  [SHEETS.PENGAJUAN]: ['ID Pengajuan', 'Timestamp Submit', 'Nama', 'Bagian/Cabang', 'Pemilik', 'Alasan Pengajuan', 'Tanggal Form', 'File Hard Copy URL', 'File Hard Copy ID', 'Catatan Tambahan', 'Jumlah Item', 'Status', 'Catatan Admin', 'Tanggal Update Status Terakhir', 'User Update Status', 'Riwayat Singkat', 'Resume Token', 'Draft Created At', 'Draft Updated At', 'Submitted At', 'Lampiran Foto Bukti URLs', 'Lampiran Foto Bukti IDs'],
  [SHEETS.ITEMS]: ['ID Pengajuan', 'No Item', 'Produk', 'Model', 'Nomor Seri', 'model_normalized', 'produk_status', 'produk_sumber', 'Status Item', 'Catatan Admin Item', 'Tanggal Update Status Item', 'User Update Status Item', 'Keputusan Item'],
  [SHEETS.USERS]: ['Username', 'Password/PIN', 'Nama', 'Role', 'Aktif', 'Last Login'],
  [SHEETS.RECIPIENTS]: ['Nama', 'Email', 'Aktif', 'Keterangan'],
  [SHEETS.CONFIG]: ['Key', 'Value'],
  [SHEETS.STATUS_LOG]: ['Timestamp', 'ID Pengajuan', 'Status Lama', 'Status Baru', 'Catatan Admin', 'User', 'No Item'],
  [SHEETS.EMAIL_LOG]: ['Timestamp', 'Subject', 'Recipients', 'Jumlah Pengajuan', 'Status'],
  [SHEETS.WARRANTY_CARDS]: ['ID Pengajuan', 'No Item', 'Produk', 'Model', 'Nomor Seri', 'Jenis Kartu', 'Status Cetak', 'Print Batch ID', 'Printed At', 'Printed By', 'Reprint Count', 'Last Reprint At', 'Last Reprint By', 'Catatan', 'Status Kirim', 'Shipped At', 'Shipped By', 'Ship Batch ID'],
  [SHEETS.PRINT_BATCH]: ['Batch ID', 'Tipe Batch', 'Created At', 'Created By', 'Jumlah Item', 'Catatan'],
  [SHEETS.PRINT_LAYOUTS]: ['ID', 'Type', 'Name', 'Offset X', 'Offset Y', 'Gap Product Model', 'Gap Model Serial', 'Is Builtin', 'Created At', 'Updated At', 'Updated By'],
  [SHEETS.MODEL_PRODUK]: ['model', 'produk', 'origin', 'status', 'updated_at', 'updated_by'],
  [SHEETS.SHIPPING_LABELS]: ['ID Pengajuan', 'No Item', 'Produk', 'Model', 'Nomor Seri', 'Bagian/Cabang', 'Nama', 'Print Batch ID', 'Printed At', 'Status Kirim', 'Ship Batch ID', 'Shipped At', 'Shipped By', 'Created At', 'Updated At'],
};

const DEFAULT_PRINT_LAYOUTS = [
  { id: 'local-default', type: 'local', name: 'Local Default', offsetX: 0, offsetY: 0, gapProductModel: 0, gapModelSerial: 0, isBuiltin: true },
  { id: 'import-default', type: 'import', name: 'Import Default', offsetX: 0, offsetY: 0, gapProductModel: 0, gapModelSerial: 0, isBuiltin: true },
];
const ACTIVE_PRINT_LAYOUT_KEYS = {
  local: 'ACTIVE_PRINT_LAYOUT_LOCAL',
  import: 'ACTIVE_PRINT_LAYOUT_IMPORT',
};
const DRAFT_STATUS = 'Menunggu Upload';
const VALID_STATUSES = ['Baru', 'Disetujui', 'Ditolak', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'];
const ITEM_APPROVAL_STATUSES = ['Baru', 'Disetujui', 'Ditolak', 'Selesai'];
const ITEM_DECISION_STATUSES = ['Disetujui', 'Ditolak'];
const LIFECYCLE_ORDER = ['Baru', 'Disetujui', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'];
const VALID_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const VALID_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const VALID_EVIDENCE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const VALID_EVIDENCE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

function setupApp() {
  const ss = getSpreadsheet_();
  ensureAllSheets_(ss);

  const usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (usersSheet.getLastRow() < 2) {
    usersSheet.appendRow(['admin', 'admin123', 'Administrator', 'Admin', 'yes', '']);
  }

  const configSheet = ss.getSheetByName(SHEETS.CONFIG);
  const defaults = {
    APP_NAME: APP.APP_NAME,
    DRIVE_FOLDER_ID: '',
    MAX_UPLOAD_MB: APP.MAX_UPLOAD_MB,
    MAX_EVIDENCE_FILES: APP.MAX_EVIDENCE_FILES,
    MAX_EVIDENCE_UPLOAD_MB: APP.MAX_EVIDENCE_UPLOAD_MB,
    MAX_ITEMS: APP.MAX_ITEMS,
    LAST_EMAIL_SENT_AT: '',
    ACTIVE_PRINT_LAYOUT_LOCAL: 'local-default',
    ACTIVE_PRINT_LAYOUT_IMPORT: 'import-default',
  };
  Object.keys(defaults).forEach(function (key) {
    upsertConfig_(configSheet, key, defaults[key], false);
  });
  ensurePrintLayoutDefaults_(configSheet);

  const config = getConfig();
  let folderId = String(config.DRIVE_FOLDER_ID || APP.DRIVE_FOLDER_ID || '').trim();
  if (!folderId) {
    const folder = DriveApp.createFolder(APP.APP_NAME + ' Uploads');
    folderId = folder.getId();
    upsertConfig_(configSheet, 'DRIVE_FOLDER_ID', folderId, true);
  } else {
    DriveApp.getFolderById(folderId);
  }

  ensureEmailDigestTrigger_();
  console.log('Setup selesai. Spreadsheet ID: ' + ss.getId() + ', Drive folder ID: ' + folderId);
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'ping') return jsonResponse_({ success: true, data: { app: APP.APP_NAME, time: new Date().toISOString() } });
  return jsonResponse_({ success: true, data: { message: 'API Pengajuan Kartu Garansi aktif. Gunakan POST untuk action API.' } });
}

function doPost(e) {
  try {
    const data = parseRequest_(e);
    const action = data.action || (e && e.parameter && e.parameter.action);
    if (!action) throw new Error('Action wajib diisi');
    ensureRuntimeHeaders_();

    switch (action) {
      case 'submitPengajuan':
        return jsonResponse_(handleSubmitPengajuan(data));
      case 'saveDraftPengajuan':
        return jsonResponse_(handleSaveDraftPengajuan(data));
      case 'getDraftPengajuan':
        return jsonResponse_(handleGetDraftPengajuan(data));
      case 'getPengajuanForPrint':
        return jsonResponse_(handleGetPengajuanForPrint(data));
      case 'checkDraftPengajuanStatus':
        return jsonResponse_(handleCheckDraftPengajuanStatus(data));
      case 'checkPengajuanStatus':
        return jsonResponse_(handleCheckPengajuanStatus(data));
      case 'getModelProduk':
      case 'getModelKategori':
        return jsonResponse_(handleGetModelProduk(data));
      case 'submitDraftPengajuan':
        return jsonResponse_(handleSubmitDraftPengajuan(data));
      case 'adminLogin':
        return jsonResponse_(handleAdminLogin(data));
      case 'adminUsersList':
        return jsonResponse_(handleAdminUsersList(data));
      case 'adminUsersInvite':
        return jsonResponse_(handleAdminUsersInvite(data));
      case 'adminUsersUpdate':
        return jsonResponse_(handleAdminUsersUpdate(data));
      case 'adminUsersDeactivate':
        return jsonResponse_(handleAdminUsersDeactivate(data));
      case 'adminUsersReactivate':
        return jsonResponse_(handleAdminUsersReactivate(data));
      case 'getDashboard':
        return jsonResponse_(handleGetDashboard(data));
      case 'getDetail':
        return jsonResponse_(handleGetDetail(data));
      case 'updateStatus':
        return jsonResponse_(handleUpdateStatus(data));
      case 'updateItemStatus':
        return jsonResponse_(handleUpdateItemStatus(data));
      case 'getProductReviewQueue':
      case 'getCategoryReviewQueue':
        return jsonResponse_(handleGetProductReviewQueue(data));
      case 'approveModelProduk':
      case 'approveModelKategori':
        return jsonResponse_(handleApproveModelProduk(data));
      case 'getWarrantyPrintQueue':
        return jsonResponse_(handleGetWarrantyPrintQueue(data));
      case 'getPrintLayouts':
        return jsonResponse_(handleGetPrintLayouts(data));
      case 'savePrintLayout':
        return jsonResponse_(handleSavePrintLayout(data));
      case 'deletePrintLayout':
        return jsonResponse_(handleDeletePrintLayout(data));
      case 'setActivePrintLayout':
        return jsonResponse_(handleSetActivePrintLayout(data));
      case 'saveWarrantyCardTypes':
        return jsonResponse_(handleSaveWarrantyCardTypes(data));
      case 'markWarrantyCardsPrinted':
        return jsonResponse_(handleMarkWarrantyCardsPrinted(data));
      case 'markShippingLabelsShipped':
        return jsonResponse_(handleMarkShippingLabelsShipped(data));
      case 'getShippingLabelQueue':
        return jsonResponse_(handleGetShippingLabelQueue(data));
      case 'previewPengajuanLifecycleMigration':
        return jsonResponse_(handlePreviewPengajuanLifecycleMigration(data));
      case 'migratePengajuanLifecycleFromWarrantyCards':
        return jsonResponse_(handleMigratePengajuanLifecycleFromWarrantyCards(data));
      case 'previewItemDecisionBackfill':
        return jsonResponse_(handlePreviewItemDecisionBackfill(data));
      case 'backfillItemDecisions':
        return jsonResponse_(handleBackfillItemDecisions(data));
      case 'adminLogout':
        return jsonResponse_(handleAdminLogout(data));
      default:
        throw new Error('Action tidak dikenal: ' + action);
    }
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message || String(err) });
  }
}

function generateId() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return generateIdUnlocked_();
  } finally {
    lock.releaseLock();
  }
}

function getConfig() {
  const sheet = getSheet_(SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0] || '').trim();
    if (key) config[key] = values[i][1];
  }
  return Object.assign({}, APP, config);
}

function validateSession(token) {
  token = clean_(token);
  if (!token) return null;

  const cacheKey = getSessionCacheKey_(token);
  const raw = CacheService.getScriptCache().get(cacheKey);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  if (token.split('.').length !== 3) return null;

  const session = validateSupabaseSession_(token);
  CacheService.getScriptCache().put(cacheKey, JSON.stringify(session), 300);
  return session;
}

function getSessionCacheKey_(token) {
  if (token.length <= 200) return token;

  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token);
  return 'session:' + digest.map(function (byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function getSupabaseProps_() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = clean_(props.getProperty('SUPABASE_URL')).replace(/\/+$/, '');
  const publishableKey = clean_(props.getProperty('SUPABASE_PUBLISHABLE_KEY'));
  const secretKey = clean_(props.getProperty('SUPABASE_SECRET_KEY'));
  const appUrl = clean_(props.getProperty('APP_URL')).replace(/\/+$/, '');

  return {
    supabaseUrl: supabaseUrl,
    publishableKey: publishableKey,
    secretKey: secretKey,
    appUrl: appUrl,
  };
}

function requireSupabaseProps_(requiredKeys) {
  const config = getSupabaseProps_();
  requiredKeys.forEach(function (key) {
    if (!config[key]) throw new Error('Script Property ' + getSupabasePropertyName_(key) + ' belum dikonfigurasi.');
  });
  return config;
}

function getSupabasePropertyName_(key) {
  const names = {
    supabaseUrl: 'SUPABASE_URL',
    publishableKey: 'SUPABASE_PUBLISHABLE_KEY',
    secretKey: 'SUPABASE_SECRET_KEY',
    appUrl: 'APP_URL',
  };
  return names[key] || key;
}

function supabaseUserHeaders_(token) {
  const config = requireSupabaseProps_(['publishableKey']);
  return {
    'User-Agent': 'MauKaGa-Google-Apps-Script/1.0',
    apikey: config.publishableKey,
    Authorization: 'Bearer ' + token,
  };
}

function supabaseAdminHeaders_() {
  const config = requireSupabaseProps_(['secretKey']);
  const headers = {
    'User-Agent': 'MauKaGa-Google-Apps-Script/1.0',
    apikey: config.secretKey,
  };

  if (config.secretKey.indexOf('sb_secret_') !== 0) {
    headers.Authorization = 'Bearer ' + config.secretKey;
  }

  return headers;
}

function fetchSupabaseJson_(url, options) {
  const response = UrlFetchApp.fetch(url, Object.assign({
    muteHttpExceptions: true,
  }, options || {}));
  const status = response.getResponseCode();
  const text = response.getContentText();
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch (err) {
      json = { message: text };
    }
  }

  if (status < 200 || status >= 300) {
    const message = json && (json.message || json.error_description || json.error || json.msg);
    throw new Error(message || ('Supabase error ' + status));
  }

  return json;
}

function validateSupabaseSession_(token) {
  const config = requireSupabaseProps_(['supabaseUrl', 'publishableKey']);
  const userData = fetchSupabaseJson_(config.supabaseUrl + '/auth/v1/user', {
    method: 'get',
    headers: supabaseUserHeaders_(token),
  });

  if (!userData || !userData.id) throw new Error('Token Supabase tidak valid.');

  const profiles = fetchSupabaseJson_(
    config.supabaseUrl + '/rest/v1/profiles?id=eq.' + encodeURIComponent(userData.id) + '&select=role,is_active,full_name,email',
    {
      method: 'get',
      headers: supabaseUserHeaders_(token),
    }
  );
  const profile = profiles && profiles[0];

  if (!profile) throw new Error('Profile Supabase tidak ditemukan.');
  if (profile.is_active !== true) throw new Error('Unauthorized: akun tidak aktif.');

  const role = normalizeRole_(profile.role);
  if (!role) throw new Error('Unauthorized: role tidak valid.');

  return {
    userId: userData.id,
    username: userData.email || profile.email || userData.id,
    nama: profile.full_name || userData.email || 'User',
    email: userData.email || profile.email || '',
    role: role,
    authProvider: 'supabase',
  };
}

function handleSubmitPengajuan(data) {
  const config = getConfig();
  const cleaned = normalizeSubmission_(data, config, true);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const id = generateIdUnlocked_();
    const folderId = String(config.DRIVE_FOLDER_ID || APP.DRIVE_FOLDER_ID || '').trim();
    if (!folderId) throw new Error('DRIVE_FOLDER_ID belum dikonfigurasi. Jalankan setupApp() terlebih dahulu.');

    const folder = DriveApp.getFolderById(folderId);
    const bytes = Utilities.base64Decode(cleaned.fileBase64);
    const blob = Utilities.newBlob(bytes, cleaned.fileMimeType, id + '_hardcopy.' + cleaned.fileExtension);
    const file = folder.createFile(blob);
    file.setName(id + '_hardcopy.' + cleaned.fileExtension);
    const evidenceFiles = createEvidenceFiles_(folder, id, cleaned.evidenceAttachments);

    const now = new Date();
    appendPengajuanRow_(id, cleaned, 'Baru', '', now, file.getUrl(), file.getId(), '', '', '', now, '[' + formatDateTime_(now) + '] Pengajuan dibuat', evidenceFiles.urls, evidenceFiles.ids);
    replaceItemRows_(id, cleaned.items);
    return { success: true, data: { idPengajuan: id } };
  } finally {
    lock.releaseLock();
  }
}

function handleSaveDraftPengajuan(data) {
  const config = getConfig();
  const cleaned = normalizeSubmission_(data, config, false);
  const requestedId = clean_(data.idPengajuan);
  const requestedToken = clean_(data.resumeToken);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const now = new Date();
    const sheet = getSheet_(SHEETS.PENGAJUAN);
    const record = requestedId ? findPengajuanRecord_(requestedId) : null;
    let id = requestedId;
    let token = requestedToken;
    let history = '[' + formatDateTime_(now) + '] Draft dibuat';
    let draftCreatedAt = now;

    if (record) {
      if (!requestedToken || clean_(record.row[record.col['Resume Token']]) !== requestedToken) throw new Error('Link lanjutkan tidak valid atau draft tidak ditemukan');
      if (record.row[record.col['Status']] !== DRAFT_STATUS) throw new Error('Draft sudah tidak dapat diubah');
      const oldHistory = record.row[record.col['Riwayat Singkat']] || '';
      history = oldHistory ? oldHistory + '\n[' + formatDateTime_(now) + '] Draft diperbarui' : '[' + formatDateTime_(now) + '] Draft diperbarui';
      draftCreatedAt = record.row[record.col['Draft Created At']] || now;
      updatePengajuanRow_(sheet, record.rowNumber, record.col, id, cleaned, DRAFT_STATUS, token, '', '', '', draftCreatedAt, now, '', history);
    } else {
      if (requestedId || requestedToken) throw new Error('Draft tidak ditemukan atau link lanjutkan tidak valid');
      id = generateIdUnlocked_();
      token = generateResumeToken_();
      appendPengajuanRow_(id, cleaned, DRAFT_STATUS, token, '', '', '', '', now, now, '', history);
    }

    replaceItemRows_(id, cleaned.items);
    return { success: true, data: { idPengajuan: id, resumeToken: token, status: DRAFT_STATUS } };
  } finally {
    lock.releaseLock();
  }
}

function handleGetDraftPengajuan(data) {
  const id = clean_(data.idPengajuan);
  const token = clean_(data.resumeToken);
  if (!id || !token) throw new Error('Buka draft dari Draft Terakhir atau Link Lanjutkan Draft');

  const record = findPengajuanRecord_(id);
  if (!record) throw new Error('Draft tidak ditemukan');
  if (clean_(record.row[record.col['Resume Token']]) !== token) throw new Error('Link lanjutkan tidak valid atau draft tidak ditemukan');
  if (record.row[record.col['Status']] !== DRAFT_STATUS) throw new Error('Draft sudah tidak dapat dilanjutkan');

  const row = record.row;
  const col = record.col;
  return {
    success: true,
    data: {
      idPengajuan: id,
      status: row[col['Status']],
      nama: row[col['Nama']],
      bagianCabang: row[col['Bagian/Cabang']],
      pemilik: row[col['Pemilik']],
      alasanPengajuan: row[col['Alasan Pengajuan']],
      tanggalForm: formatDateOnly_(row[col['Tanggal Form']]),
      catatanTambahan: row[col['Catatan Tambahan']],
      items: getItemsForPengajuan_(id),
    },
  };
}

function handleGetPengajuanForPrint(data) {
  // Untuk fitur "Print Ulang" — mengambil data pengajuan berdasarkan ID saja
  // (tanpa Resume Token, tanpa filter status). Berlaku untuk semua status
  // (Baru, Disetujui, Ditolak, Selesai, maupun Menunggu Upload) supaya
  // user bisa mencetak ulang form meskipun pengajuan sudah final.
  const id = clean_(data.idPengajuan);
  if (!id) throw new Error('Masukkan ID Pengajuan terlebih dahulu.');

  const record = findPengajuanRecord_(id);
  if (!record) throw new Error('ID Pengajuan tidak ditemukan. Periksa kembali ID yang dimasukkan.');

  const row = record.row;
  const col = record.col;
  const status = clean_(row[col['Status']]);
  const allowed = VALID_STATUSES.concat([DRAFT_STATUS]);
  if (allowed.indexOf(status) === -1) {
    throw new Error('Status pengajuan tidak bisa ditampilkan.');
  }

  return {
    success: true,
    data: {
      idPengajuan: id,
      status: status,
      nama: row[col['Nama']],
      bagianCabang: row[col['Bagian/Cabang']],
      pemilik: row[col['Pemilik']],
      alasanPengajuan: row[col['Alasan Pengajuan']],
      tanggalForm: formatDateOnly_(row[col['Tanggal Form']]),
      catatanTambahan: row[col['Catatan Tambahan']],
      items: getItemsForPengajuan_(id, status),
    },
  };
}

function handleCheckDraftPengajuanStatus(data) {
  const id = clean_(data.idPengajuan);
  if (!id) throw new Error('Masukkan ID Pengajuan terlebih dahulu.');

  const record = findPengajuanRecord_(id);
  if (!record) throw new Error('ID Pengajuan tidak ditemukan. Periksa kembali ID pada printout draft.');

  const status = record.row[record.col['Status']];
  if (status !== DRAFT_STATUS) {
    throw new Error('ID Pengajuan ini sudah dikirim final dan tidak bisa dibuka sebagai draft.');
  }

  const resumeToken = clean_(record.row[record.col['Resume Token']]);
  if (!resumeToken) {
    throw new Error('Draft ditemukan, tetapi Resume Token tidak tersedia. Draft ini tidak bisa dilanjutkan. Silakan buat draft baru atau hubungi admin.');
  }

  return { success: true, data: { idPengajuan: id, status: status, resumeToken: resumeToken } };
}

function handleCheckPengajuanStatus(data) {
  const lookup = resolvePengajuanStatusLookup_(data);
  const record = lookup.record;
  const matchedItem = lookup.item ? lookup.item.data : null;

  const row = record.row;
  const col = record.col;
  const id = clean_(row[col['ID Pengajuan']]);
  const parentStatus = clean_(row[col['Status']]);
  if (VALID_STATUSES.concat([DRAFT_STATUS]).indexOf(parentStatus) === -1) {
    throw new Error('Status pengajuan tidak bisa ditampilkan.');
  }

  const itemDecision = matchedItem ? normalizeItemDecision_(matchedItem['Keputusan Item'], matchedItem['Status Item'], parentStatus) : '';
  const itemStatus = matchedItem ? deriveItemStatusFromDecision_(itemDecision, matchedItem['Status Item']) : '';
  const status = parentStatus;

  return {
    success: true,
    data: {
      idPengajuan: id,
      searchBy: lookup.searchBy,
      status: status,
      parentStatus: parentStatus,
      statusItem: itemStatus,
      keputusanItem: itemDecision,
      noItem: matchedItem ? matchedItem['No Item'] : '',
      nomorSeri: matchedItem ? matchedItem['Nomor Seri'] : '',
      produk: matchedItem ? matchedItem['Produk'] : '',
      model: matchedItem ? matchedItem['Model'] : '',
      timestampSubmit: toIso_(row[col['Timestamp Submit']]),
      jumlahItem: row[col['Jumlah Item']],
      catatanAdmin: row[col['Catatan Admin']],
      catatanAdminItem: matchedItem ? clean_(matchedItem['Catatan Admin Item']) : '',
      tanggalUpdateStatusTerakhir: toIso_(row[col['Tanggal Update Status Terakhir']]),
      draftUpdatedAt: toIso_(row[col['Draft Updated At']]),
    },
  };
}

function resolvePengajuanStatusLookup_(data) {
  data = data || {};
  const keyword = clean_(data.keyword || data.search || data.query || data.idPengajuan || data.nomorSeri);
  if (!keyword) throw new Error('Masukkan ID Pengajuan atau Nomor Seri terlebih dahulu.');

  const record = findPengajuanRecord_(keyword) || findPengajuanRecord_(keyword.toUpperCase());
  if (record) return { record: record, item: null, searchBy: 'idPengajuan' };

  const item = findItemRecordBySerial_(keyword);
  if (!item) throw new Error('ID Pengajuan atau Nomor Seri tidak ditemukan. Periksa kembali input yang dimasukkan.');

  const itemId = clean_(item.data['ID Pengajuan']);
  const itemRecord = itemId ? findPengajuanRecord_(itemId) : null;
  if (!itemRecord) throw new Error('Data pengajuan untuk Nomor Seri ini tidak ditemukan.');

  return { record: itemRecord, item: item, searchBy: 'nomorSeri' };
}

function handleGetModelProduk() {
  const rows = getModelProdukRows_().map(function (row) {
    return {
      model: row.model,
      produk: row.produk,
      origin: row.origin,
      status: row.status,
      updatedAt: toIso_(row.updatedAt),
    };
  });
  return { success: true, data: { rows: rows } };
}

function handleSubmitDraftPengajuan(data) {
  const config = getConfig();
  const cleaned = normalizeSubmission_(data, config, true);
  const id = clean_(data.idPengajuan);
  const token = clean_(data.resumeToken);
  if (!id || !token) throw new Error('Buka draft dari Draft Terakhir atau Link Lanjutkan Draft');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const record = findPengajuanRecord_(id);
    if (!record) throw new Error('Draft tidak ditemukan');
    if (clean_(record.row[record.col['Resume Token']]) !== token) throw new Error('Link lanjutkan tidak valid atau draft tidak ditemukan');
    if (record.row[record.col['Status']] !== DRAFT_STATUS) throw new Error('Draft sudah tidak dapat dilanjutkan');

    const folderId = String(config.DRIVE_FOLDER_ID || APP.DRIVE_FOLDER_ID || '').trim();
    if (!folderId) throw new Error('DRIVE_FOLDER_ID belum dikonfigurasi. Jalankan setupApp() terlebih dahulu.');

    const folder = DriveApp.getFolderById(folderId);
    const bytes = Utilities.base64Decode(cleaned.fileBase64);
    const blob = Utilities.newBlob(bytes, cleaned.fileMimeType, id + '_hardcopy.' + cleaned.fileExtension);
    const file = folder.createFile(blob);
    file.setName(id + '_hardcopy.' + cleaned.fileExtension);
    const evidenceFiles = createEvidenceFiles_(folder, id, cleaned.evidenceAttachments);

    const now = new Date();
    const oldHistory = record.row[record.col['Riwayat Singkat']] || '';
    const history = oldHistory ? oldHistory + '\n[' + formatDateTime_(now) + '] Pengajuan final dikirim' : '[' + formatDateTime_(now) + '] Pengajuan final dikirim';
    updatePengajuanRow_(record.sheet, record.rowNumber, record.col, id, cleaned, 'Baru', '', now, file.getUrl(), file.getId(), record.row[record.col['Draft Created At']] || '', record.row[record.col['Draft Updated At']] || '', now, history, evidenceFiles.urls, evidenceFiles.ids);
    replaceItemRows_(id, cleaned.items);
    getSheet_(SHEETS.STATUS_LOG).appendRow([now, id, DRAFT_STATUS, 'Baru', 'Final submit hard copy signed', 'system']);

    return { success: true, data: { idPengajuan: id } };
  } finally {
    lock.releaseLock();
  }
}

function handleAdminLogin(data) {
  const username = clean_(data.username).toLowerCase();
  const password = clean_(data.password);
  if (!username || !password) throw new Error('Username dan password wajib diisi');

  const sheet = getSheet_(SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const rowUsername = clean_(values[i][0]).toLowerCase();
    const rowPassword = clean_(values[i][1]);
    const nama = clean_(values[i][2]);
    const role = clean_(values[i][3]);
    const aktif = clean_(values[i][4]).toLowerCase();
    if (rowUsername === username && aktif === 'yes' && role.toLowerCase() === 'admin') {
      if (rowPassword !== password) break;
      const token = Utilities.getUuid();
      const session = { username: rowUsername, nama: nama || rowUsername, role: role };
      CacheService.getScriptCache().put(token, JSON.stringify(session), APP.SESSION_DURATION_HOURS * 60 * 60);
      sheet.getRange(i + 1, 6).setValue(new Date());
      return { success: true, data: { token: token, nama: session.nama, username: rowUsername } };
    }
  }
  throw new Error('Username atau password salah');
}

function handleAdminLogout(data) {
  const token = clean_(data.token);
  if (token) CacheService.getScriptCache().remove(getSessionCacheKey_(token));
  return { success: true, data: {} };
}

function handleAdminUsersList(data) {
  requireSession_(data.token, ['admin']);

  const config = requireSupabaseProps_(['supabaseUrl', 'secretKey']);
  const users = fetchSupabaseJson_(
    config.supabaseUrl + '/rest/v1/profiles?select=id,email,full_name,role,is_active,created_at&order=created_at.desc',
    {
      method: 'get',
      headers: supabaseAdminHeaders_(),
    }
  ) || [];

  return { success: true, data: users };
}

function handleAdminUsersInvite(data) {
  requireSession_(data.token, ['admin']);

  const email = clean_(data.email).toLowerCase();
  const fullName = clean_(data.full_name || data.fullName);
  const role = normalizeRole_(data.role);

  if (!email) throw new Error('Email wajib diisi.');
  if (!role) throw new Error('Role tidak valid.');

  const config = requireSupabaseProps_(['supabaseUrl', 'secretKey', 'appUrl']);
  const redirectTo = config.appUrl + '/confirm';
  const invitedUser = fetchSupabaseJson_(
    config.supabaseUrl + '/auth/v1/invite?redirect_to=' + encodeURIComponent(redirectTo),
    {
      method: 'post',
      contentType: 'application/json',
      headers: supabaseAdminHeaders_(),
      payload: JSON.stringify({
        email: email,
        data: {
          full_name: fullName,
          role: role,
        },
      }),
    }
  );

  if (invitedUser && invitedUser.id) {
    upsertSupabaseProfile_(invitedUser.id, {
      email: invitedUser.email || email,
      full_name: fullName,
      role: role,
      is_active: true,
    });
  }

  return {
    success: true,
    data: {
      id: invitedUser && invitedUser.id,
      email: invitedUser && invitedUser.email ? invitedUser.email : email,
    },
  };
}

function handleAdminUsersUpdate(data) {
  requireSession_(data.token, ['admin']);

  const targetUserId = clean_(data.targetUserId || data.id);
  const patch = {};

  if (!targetUserId) throw new Error('targetUserId wajib diisi.');

  if (data.full_name !== undefined || data.fullName !== undefined) {
    patch.full_name = clean_(data.full_name || data.fullName);
  }

  if (data.role !== undefined) {
    const role = normalizeRole_(data.role);
    if (!role) throw new Error('Role tidak valid.');
    if (role !== 'admin') assertNotLastActiveAdmin_(targetUserId, 'Tidak boleh downgrade admin terakhir.');
    patch.role = role;
  }

  if (!Object.keys(patch).length) throw new Error('Tidak ada data user yang diubah.');

  patchSupabaseProfile_(targetUserId, patch);
  return { success: true, data: { id: targetUserId } };
}

function handleAdminUsersDeactivate(data) {
  const caller = requireSession_(data.token, ['admin']);
  const targetUserId = clean_(data.targetUserId || data.id);

  if (!targetUserId) throw new Error('targetUserId wajib diisi.');
  assertNotLastActiveAdmin_(targetUserId, 'Tidak boleh menonaktifkan admin terakhir.');

  patchSupabaseProfile_(targetUserId, { is_active: false });
  return { success: true, data: { id: targetUserId, deactivatedBy: caller.userId || caller.username } };
}

function handleAdminUsersReactivate(data) {
  requireSession_(data.token, ['admin']);

  const targetUserId = clean_(data.targetUserId || data.id);
  if (!targetUserId) throw new Error('targetUserId wajib diisi.');

  patchSupabaseProfile_(targetUserId, { is_active: true });
  return { success: true, data: { id: targetUserId } };
}

function upsertSupabaseProfile_(id, values) {
  const config = requireSupabaseProps_(['supabaseUrl', 'secretKey']);
  const payload = Object.assign({ id: id }, values || {});
  const headers = supabaseAdminHeaders_();
  headers.Prefer = 'resolution=merge-duplicates,return=minimal';

  fetchSupabaseJson_(config.supabaseUrl + '/rest/v1/profiles?on_conflict=id', {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(payload),
  });
}

function patchSupabaseProfile_(id, patch) {
  const config = requireSupabaseProps_(['supabaseUrl', 'secretKey']);
  const headers = supabaseAdminHeaders_();
  headers.Prefer = 'return=minimal';

  fetchSupabaseJson_(config.supabaseUrl + '/rest/v1/profiles?id=eq.' + encodeURIComponent(id), {
    method: 'patch',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(patch),
  });
}

function assertNotLastActiveAdmin_(targetUserId, message) {
  const config = requireSupabaseProps_(['supabaseUrl', 'secretKey']);
  const admins = fetchSupabaseJson_(
    config.supabaseUrl + '/rest/v1/profiles?role=eq.admin&is_active=eq.true&select=id',
    {
      method: 'get',
      headers: supabaseAdminHeaders_(),
    }
  ) || [];

  if (admins.length === 1 && admins[0].id === targetUserId) {
    throw new Error(message);
  }
}

function handleGetDashboard(data) {
  const session = requireSession_(data.token);
  const page = Math.max(parseInt(data.page || 1, 10), 1);
  const pageSize = Math.min(Math.max(parseInt(data.pageSize || 20, 10), 1), 100);
  const search = clean_(data.search).toLowerCase();
  const status = clean_(data.status);
  const dateFrom = data.dateFrom ? startOfDay_(new Date(data.dateFrom)) : null;
  const dateTo = data.dateTo ? endOfDay_(new Date(data.dateTo)) : null;
  if (status && VALID_STATUSES.indexOf(status) === -1) throw new Error('Status filter tidak valid');

  let rows = readObjects_(SHEETS.PENGAJUAN).filter(function (row) {
    if (VALID_STATUSES.indexOf(row['Status']) === -1) return false;
    const ts = row['Timestamp Submit'] instanceof Date ? row['Timestamp Submit'] : new Date(row['Timestamp Submit']);
    const haystack = [row['ID Pengajuan'], row['Nama'], row['Bagian/Cabang']].join(' ').toLowerCase();
    if (search && haystack.indexOf(search) === -1) return false;
    if (status && row['Status'] !== status) return false;
    if (dateFrom && ts < dateFrom) return false;
    if (dateTo && ts > dateTo) return false;
    return true;
  });

  const summary = {
    total: rows.length,
    totalItems: 0,
    baru: 0,
    disetujui: 0,
    ditolak: 0,
    diprint: 0,
    dikirim: 0,
    diterima: 0,
    selesai: 0,
    itemBaru: 0,
    itemDisetujui: 0,
    itemDitolak: 0,
    itemSelesai: 0
  };
  const rowById = {};
  rows.forEach(function (row) {
    const id = clean_(row['ID Pengajuan']);
    if (id) rowById[id] = row;

    const key = String(row['Status'] || '').toLowerCase();
    if (summary.hasOwnProperty(key)) summary[key] += 1;
  });

  const itemCountById = {};
  const itemDetailById = {};
  const itemStatusById = {};
  const itemDecisionById = {};
  readObjects_(SHEETS.ITEMS).forEach(function (item) {
    const id = clean_(item['ID Pengajuan']);
    const parent = rowById[id];
    if (!parent) return;

    const decisionItem = normalizeExplicitItemDecision_(item['Keputusan Item']);
    const statusItem = deriveItemStatusFromDecision_(decisionItem, item['Status Item']);
    const noItem = clean_(item['No Item']);
    const itemKey = 'item' + statusItem.charAt(0).toUpperCase() + statusItem.slice(1).toLowerCase();
    itemCountById[id] = (itemCountById[id] || 0) + 1;
    if (noItem) {
      itemDetailById[id] = itemDetailById[id] || {};
      itemStatusById[id] = itemStatusById[id] || {};
      itemDecisionById[id] = itemDecisionById[id] || {};
      itemDetailById[id][noItem] = {
        model: item['Model'],
        nomorSeri: item['Nomor Seri']
      };
      itemStatusById[id][noItem] = statusItem;
      itemDecisionById[id][noItem] = decisionItem;
    }
    summary.totalItems += 1;
    if (summary.hasOwnProperty(itemKey) && statusItem !== 'Disetujui' && statusItem !== 'Ditolak') summary[itemKey] += 1;
    if (decisionItem === 'Disetujui') summary.itemDisetujui += 1;
    else if (decisionItem === 'Ditolak') summary.itemDitolak += 1;
  });

  rows.forEach(function (row) {
    const id = clean_(row['ID Pengajuan']);
    if (!id || itemCountById[id]) return;

    const itemCount = Number(row['Jumlah Item'] || 0);
    const decisionItem = normalizeExplicitItemDecision_('');
    const statusItem = deriveItemStatusFromDecision_(decisionItem, '');
    const itemKey = 'item' + statusItem.charAt(0).toUpperCase() + statusItem.slice(1).toLowerCase();
    summary.totalItems += itemCount;
    if (summary.hasOwnProperty(itemKey) && statusItem !== 'Disetujui' && statusItem !== 'Ditolak') summary[itemKey] += itemCount;
    if (decisionItem === 'Disetujui') summary.itemDisetujui += itemCount;
    else if (decisionItem === 'Ditolak') summary.itemDitolak += itemCount;
  });

  rows.sort(function (a, b) {
    return new Date(b['Timestamp Submit']).getTime() - new Date(a['Timestamp Submit']).getTime();
  });

  const totalRows = rows.length;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize).map(function (row) {
    const id = clean_(row['ID Pengajuan']);
    const itemCount = Number(row['Jumlah Item'] || itemCountById[id] || 0);
    const itemStatuses = [];

    for (let noItem = 1; noItem <= itemCount; noItem += 1) {
      const itemDetail = itemDetailById[id] && itemDetailById[id][String(noItem)]
        ? itemDetailById[id][String(noItem)]
        : {};

      itemStatuses.push({
        noItem: noItem,
        model: itemDetail.model || '',
        nomorSeri: itemDetail.nomorSeri || '',
        status: itemStatusById[id] && itemStatusById[id][String(noItem)]
          ? itemStatusById[id][String(noItem)]
          : 'Baru',
        keputusanItem: itemDecisionById[id] && Object.prototype.hasOwnProperty.call(itemDecisionById[id], String(noItem))
          ? itemDecisionById[id][String(noItem)]
          : ''
      });
    }

    return {
      idPengajuan: row['ID Pengajuan'],
      timestampSubmit: toIso_(row['Timestamp Submit']),
      nama: row['Nama'],
      bagianCabang: row['Bagian/Cabang'],
      jumlahItem: row['Jumlah Item'],
      status: row['Status'],
      itemStatuses: itemStatuses,
    };
  });

  return { success: true, data: { summary: summary, rows: paged, totalRows: totalRows, page: page, pageSize: pageSize, admin: session.nama } };
}

function handleGetDetail(data) {
  requireSession_(data.token);
  const id = clean_(data.idPengajuan);
  if (!id) throw new Error('ID Pengajuan wajib diisi');

  const pengajuan = readObjects_(SHEETS.PENGAJUAN).find(function (row) { return row['ID Pengajuan'] === id && VALID_STATUSES.indexOf(row['Status']) !== -1; });
  if (!pengajuan) throw new Error('Pengajuan tidak ditemukan');

  const items = getItemsForPengajuan_(id, pengajuan['Status']);
  const riwayat = readObjects_(SHEETS.STATUS_LOG)
    .filter(function (row) { return row['ID Pengajuan'] === id; })
    .sort(function (a, b) { return new Date(b['Timestamp']).getTime() - new Date(a['Timestamp']).getTime(); })
    .map(function (row) {
      return {
        timestamp: toIso_(row['Timestamp']),
        noItem: row['No Item'],
        statusLama: row['Status Lama'],
        statusBaru: row['Status Baru'],
        catatanAdmin: row['Catatan Admin'],
        user: row['User'],
      };
    });

  return {
    success: true,
    data: {
      idPengajuan: pengajuan['ID Pengajuan'],
      timestampSubmit: toIso_(pengajuan['Timestamp Submit']),
      nama: pengajuan['Nama'],
      bagianCabang: pengajuan['Bagian/Cabang'],
      pemilik: pengajuan['Pemilik'],
      alasanPengajuan: pengajuan['Alasan Pengajuan'],
      tanggalForm: formatDateOnly_(pengajuan['Tanggal Form']),
      fileHardCopyUrl: pengajuan['File Hard Copy URL'],
      fileHardCopyId: pengajuan['File Hard Copy ID'],
      evidenceAttachmentUrls: splitStoredLines_(pengajuan['Lampiran Foto Bukti URLs']),
      evidenceAttachmentIds: splitStoredLines_(pengajuan['Lampiran Foto Bukti IDs']),
      catatanTambahan: pengajuan['Catatan Tambahan'],
      jumlahItem: pengajuan['Jumlah Item'],
      status: pengajuan['Status'],
      catatanAdmin: pengajuan['Catatan Admin'],
      tanggalUpdateStatusTerakhir: toIso_(pengajuan['Tanggal Update Status Terakhir']),
      userUpdateStatus: pengajuan['User Update Status'],
      riwayatSingkat: pengajuan['Riwayat Singkat'],
      items: items,
      riwayat: riwayat,
    },
  };
}

function handleUpdateStatus(data) {
  const session = requireSession_(data.token, ['admin', 'qrcc']);
  const id = clean_(data.idPengajuan);
  const statusBaru = clean_(data.statusBaru);
  const catatanAdmin = clean_(data.catatanAdmin);
  if (!id) throw new Error('ID Pengajuan wajib diisi');
  if (VALID_STATUSES.indexOf(statusBaru) === -1) throw new Error('Status tidak valid');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_(SHEETS.PENGAJUAN);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const col = indexMap_(headers);
    let targetRow = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][col['ID Pengajuan']] === id && VALID_STATUSES.indexOf(values[i][col['Status']]) !== -1) {
        targetRow = i + 1;
        break;
      }
    }
    if (targetRow === -1) throw new Error('Pengajuan tidak ditemukan');

    const statusLama = clean_(values[targetRow - 1][col['Status']]);
    assertStatusTransitionAllowed_(session, statusLama, statusBaru, catatanAdmin);
    const now = new Date();
    const entry = '[' + formatDateTime_(now) + '] ' + statusLama + ' → ' + statusBaru + ' oleh ' + session.username;
    const oldHistory = values[targetRow - 1][col['Riwayat Singkat']] || '';

    sheet.getRange(targetRow, col['Status'] + 1).setValue(statusBaru);
    sheet.getRange(targetRow, col['Catatan Admin'] + 1).setValue(catatanAdmin);
    sheet.getRange(targetRow, col['Tanggal Update Status Terakhir'] + 1).setValue(now);
    sheet.getRange(targetRow, col['User Update Status'] + 1).setValue(session.username);
    sheet.getRange(targetRow, col['Riwayat Singkat'] + 1).setValue(oldHistory ? oldHistory + '\n' + entry : entry);

    getSheet_(SHEETS.STATUS_LOG).appendRow([now, id, statusLama, statusBaru, catatanAdmin, session.username, '']);
    return { success: true, data: {} };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateItemStatus(data) {
  const session = requireSession_(data.token, ['admin', 'qrcc']);
  const id = clean_(data.idPengajuan);
  const noItem = clean_(data.noItem);
  const requestedStatus = clean_(data.statusBaru);
  const hasDecisionPayload = Object.prototype.hasOwnProperty.call(data, 'keputusanItem');
  const requestedDecision = hasDecisionPayload ? clean_(data.keputusanItem) : '';
  const catatanAdmin = clean_(data.catatanAdmin);
  if (!id) throw new Error('ID Pengajuan wajib diisi');
  if (!noItem) throw new Error('No Item wajib diisi');
  if (!hasDecisionPayload && requestedStatus !== 'Selesai') throw new Error('Keputusan item wajib diisi');
  if (hasDecisionPayload && requestedDecision && ITEM_DECISION_STATUSES.indexOf(requestedDecision) === -1) throw new Error('Keputusan item tidak valid');
  if (requestedStatus && requestedStatus !== 'Selesai') throw new Error('Status item hanya bisa diubah otomatis dari keputusan, kecuali Selesai');
  if (requestedDecision === 'Ditolak' && !catatanAdmin) throw new Error('Catatan Admin wajib diisi jika keputusan Ditolak');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const pengajuanSheet = getSheet_(SHEETS.PENGAJUAN);
    const pengajuanValues = pengajuanSheet.getDataRange().getValues();
    const pengajuanCol = indexMap_(pengajuanValues[0]);
    let pengajuanRow = -1;
    let parentStatusLama = '';
    let oldHistory = '';

    for (let i = 1; i < pengajuanValues.length; i++) {
      if (pengajuanValues[i][pengajuanCol['ID Pengajuan']] === id && VALID_STATUSES.indexOf(pengajuanValues[i][pengajuanCol['Status']]) !== -1) {
        pengajuanRow = i + 1;
        parentStatusLama = pengajuanValues[i][pengajuanCol['Status']] || '';
        oldHistory = pengajuanValues[i][pengajuanCol['Riwayat Singkat']] || '';
        break;
      }
    }
    if (pengajuanRow === -1) throw new Error('Pengajuan tidak ditemukan');

    const itemSheet = getSheet_(SHEETS.ITEMS);
    const itemValues = itemSheet.getDataRange().getValues();
    const itemCol = indexMap_(itemValues[0]);
    let itemRow = -1;
    let statusLama = '';
    let decisionLama = '';

    for (let i = 1; i < itemValues.length; i++) {
      if (itemValues[i][itemCol['ID Pengajuan']] === id && String(itemValues[i][itemCol['No Item']]) === noItem) {
        itemRow = i + 1;
        decisionLama = itemCol['Keputusan Item'] !== undefined
          ? normalizeExplicitItemDecision_(itemValues[i][itemCol['Keputusan Item']])
          : '';
        statusLama = deriveItemStatusFromDecision_(decisionLama, itemValues[i][itemCol['Status Item']]);
        break;
      }
    }
    if (itemRow === -1) throw new Error('Item pengajuan tidak ditemukan');
    if (itemCol['Keputusan Item'] === undefined) throw new Error('Kolom Keputusan Item belum tersedia. Jalankan setupApp terlebih dahulu.');

    const now = new Date();
    const isCompletingItem = requestedStatus === 'Selesai';
    if (statusLama === 'Selesai' && hasDecisionPayload && requestedDecision !== decisionLama) {
      throw new Error('Item sudah Selesai. Keputusan tidak bisa diubah.');
    }
    if (isCompletingItem && decisionLama !== 'Disetujui') {
      throw new Error('Item harus diputuskan Disetujui sebelum ditandai Selesai.');
    }

    const decisionBaru = isCompletingItem ? decisionLama : normalizeExplicitItemDecision_(requestedDecision);
    const statusBaru = isCompletingItem ? 'Selesai' : deriveItemStatusFromDecision_(decisionBaru, statusLama);
    itemSheet.getRange(itemRow, itemCol['Status Item'] + 1).setValue(statusBaru);
    itemSheet.getRange(itemRow, itemCol['Catatan Admin Item'] + 1).setValue(catatanAdmin);
    itemSheet.getRange(itemRow, itemCol['Tanggal Update Status Item'] + 1).setValue(now);
    itemSheet.getRange(itemRow, itemCol['User Update Status Item'] + 1).setValue(session.username);
    itemSheet.getRange(itemRow, itemCol['Keputusan Item'] + 1).setValue(decisionBaru);

    itemValues[itemRow - 1][itemCol['Status Item']] = statusBaru;
    itemValues[itemRow - 1][itemCol['Keputusan Item']] = decisionBaru;

    // Reuse itemValues yang sudah dibaca di awal untuk hindari getDataRange kedua.
    const refreshedItems = itemValues.slice(1)
      .filter(function (row) { return row[itemCol['ID Pengajuan']] === id; })
      .map(function (row) {
        return deriveItemStatusFromDecision_(row[itemCol['Keputusan Item']], row[itemCol['Status Item']]);
      });
    const derivedParentStatus = derivePengajuanStatusFromItemStatuses_(refreshedItems);
    const parentStatusBaru = shouldApplyItemDerivedParentStatus_(parentStatusLama) ? derivedParentStatus : parentStatusLama;
    const logLabel = isCompletingItem ? 'Item #' + noItem : 'Keputusan Item #' + noItem;
    const logBefore = isCompletingItem ? statusLama : (decisionLama || 'Belum Diputuskan');
    const logAfter = isCompletingItem ? statusBaru : (decisionBaru || 'Belum Diputuskan');
    const entryLog = '[' + formatDateTime_(now) + '] ' + logLabel + ': ' + logBefore + ' -> ' + logAfter + ' oleh ' + session.username;

    pengajuanSheet.getRange(pengajuanRow, pengajuanCol['Status'] + 1).setValue(parentStatusBaru);
    pengajuanSheet.getRange(pengajuanRow, pengajuanCol['Catatan Admin'] + 1).setValue(catatanAdmin);
    pengajuanSheet.getRange(pengajuanRow, pengajuanCol['Tanggal Update Status Terakhir'] + 1).setValue(now);
    pengajuanSheet.getRange(pengajuanRow, pengajuanCol['User Update Status'] + 1).setValue(session.username);
    pengajuanSheet.getRange(pengajuanRow, pengajuanCol['Riwayat Singkat'] + 1).setValue(oldHistory ? oldHistory + '\n' + entryLog : entryLog);

    getSheet_(SHEETS.STATUS_LOG).appendRow([now, id, logBefore, logAfter, catatanAdmin, session.username, noItem]);
    return { success: true, data: { status: parentStatusBaru, statusItem: statusBaru, keputusanItem: decisionBaru } };
  } finally {
    lock.releaseLock();
  }
}

function derivePengajuanStatusFromItemStatuses_(statuses) {
  const cleanStatuses = statuses.map(function (status) { return normalizeItemApprovalStatus_(status, 'Baru'); });
  if (!cleanStatuses.length) return 'Baru';
  if (cleanStatuses.indexOf('Baru') !== -1) return 'Baru';
  if (cleanStatuses.every(function (status) { return status === 'Ditolak'; })) return 'Ditolak';
  if (cleanStatuses.some(function (status) { return status === 'Disetujui' || status === 'Selesai'; })) return 'Disetujui';
  return 'Baru';
}

function normalizeItemApprovalStatus_(status, fallbackStatus) {
  const cleaned = clean_(status);
  if (ITEM_APPROVAL_STATUSES.indexOf(cleaned) !== -1) return cleaned;

  const fallback = clean_(fallbackStatus);
  if (ITEM_APPROVAL_STATUSES.indexOf(fallback) !== -1) return fallback;

  return 'Baru';
}

function normalizeItemDecision_(decision, itemStatus, parentStatus) {
  return normalizeExplicitItemDecision_(decision);
}

function inferItemDecisionForBackfill_(itemStatus, parentStatus) {
  const status = clean_(itemStatus);
  if (status === 'Ditolak') return 'Ditolak';
  if (status === 'Disetujui' || status === 'Selesai') return 'Disetujui';

  const parent = clean_(parentStatus);
  if (parent === 'Ditolak') return 'Ditolak';
  if (['Disetujui', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'].indexOf(parent) !== -1) return 'Disetujui';

  return '';
}

function deriveItemStatusFromDecision_(decision, currentStatus) {
  const cleanDecision = normalizeExplicitItemDecision_(decision);
  const cleanStatus = clean_(currentStatus);
  if (cleanStatus === 'Selesai' && cleanDecision === 'Disetujui') return 'Selesai';
  if (cleanDecision === 'Disetujui' || cleanDecision === 'Ditolak') return cleanDecision;
  return 'Baru';
}

function normalizeExplicitItemDecision_(decision) {
  const cleanedDecision = clean_(decision);
  return ITEM_DECISION_STATUSES.indexOf(cleanedDecision) !== -1 ? cleanedDecision : '';
}

function deriveItemDecisionAfterStatusChange_(existingDecision, nextStatus) {
  const current = clean_(existingDecision);
  if (ITEM_DECISION_STATUSES.indexOf(current) !== -1 && nextStatus === 'Selesai') return current;
  if (nextStatus === 'Disetujui' || nextStatus === 'Ditolak') return nextStatus;
  if (nextStatus === 'Selesai') return 'Disetujui';
  return '';
}

function shouldApplyItemDerivedParentStatus_(status) {
  return ['Baru', 'Disetujui', 'Ditolak'].indexOf(clean_(status)) !== -1;
}

function getLifecycleRank_(status) {
  return LIFECYCLE_ORDER.indexOf(clean_(status));
}

function isBackwardLifecycleTransition_(fromStatus, toStatus) {
  const fromRank = getLifecycleRank_(fromStatus);
  const toRank = getLifecycleRank_(toStatus);
  return fromRank !== -1 && toRank !== -1 && toRank < fromRank;
}

function assertStatusTransitionAllowed_(session, oldStatus, newStatus, catatanAdmin) {
  const statusLama = clean_(oldStatus);
  const statusBaru = clean_(newStatus);
  const note = clean_(catatanAdmin);
  if (VALID_STATUSES.indexOf(statusBaru) === -1) throw new Error('Status tidak valid');
  if (statusBaru === statusLama) return;

  if (statusBaru === 'Ditolak' && !note) {
    throw new Error('Catatan Admin wajib diisi jika status Ditolak');
  }

  if (isBackwardLifecycleTransition_(statusLama, statusBaru)) {
    if (session.role !== 'admin') throw new Error('Transisi status mundur hanya boleh dilakukan Admin');
    if (!note) throw new Error('Catatan Admin wajib diisi untuk transisi status mundur');
  }

  if (statusBaru === 'Diterima' && statusLama !== 'Dikirim') {
    if (session.role !== 'admin') throw new Error('Status Diterima hanya bisa dipilih setelah status Dikirim');
    if (!note) throw new Error('Catatan Admin wajib diisi jika status Diterima dipilih bukan dari Dikirim');
  }

  if (statusBaru === 'Selesai' && statusLama !== 'Diterima') {
    if (session.role !== 'admin') throw new Error('Status Selesai hanya bisa dipilih setelah status Diterima');
    if (!note) throw new Error('Catatan Admin wajib diisi jika status Selesai dipilih bukan dari Diterima');
  }
}

function appendStatusHistory_(sheet, rowNumber, col, id, statusLama, statusBaru, catatanAdmin, actor, noItem, now, historyPrefix) {
  const timestamp = now || new Date();
  const username = clean_(actor) || 'system';
  const note = clean_(catatanAdmin);
  const prefix = clean_(historyPrefix);
  const entryText = (prefix ? prefix + ': ' : '') + clean_(statusLama) + ' -> ' + clean_(statusBaru) + ' oleh ' + username;
  const entry = '[' + formatDateTime_(timestamp) + '] ' + entryText;
  const oldHistory = sheet.getRange(rowNumber, col['Riwayat Singkat'] + 1).getValue() || '';

  sheet.getRange(rowNumber, col['Status'] + 1).setValue(statusBaru);
  sheet.getRange(rowNumber, col['Catatan Admin'] + 1).setValue(note);
  sheet.getRange(rowNumber, col['Tanggal Update Status Terakhir'] + 1).setValue(timestamp);
  sheet.getRange(rowNumber, col['User Update Status'] + 1).setValue(username);
  sheet.getRange(rowNumber, col['Riwayat Singkat'] + 1).setValue(oldHistory ? oldHistory + '\n' + entry : entry);

  getSheet_(SHEETS.STATUS_LOG).appendRow([timestamp, id, statusLama, statusBaru, note, username, noItem || '']);
}

function getApprovedItemKeysForPengajuan_(idPengajuan) {
  const id = clean_(idPengajuan);
  if (!id) return [];

  return readObjects_(SHEETS.ITEMS)
    .filter(function (row) {
      return clean_(row['ID Pengajuan']) === id && normalizeItemDecision_(row['Keputusan Item'], row['Status Item'], '') === 'Disetujui';
    })
    .map(function (row) {
      return warrantyCardKey_(row['ID Pengajuan'], row['No Item']);
    });
}

function getApprovedItemKeysByPengajuan_() {
  const map = {};
  readObjects_(SHEETS.ITEMS).forEach(function (row) {
    const id = clean_(row['ID Pengajuan']);
    if (!id || normalizeItemDecision_(row['Keputusan Item'], row['Status Item'], '') !== 'Disetujui') return;
    if (!map[id]) map[id] = [];
    map[id].push(warrantyCardKey_(id, row['No Item']));
  });
  return map;
}

function summarizeWarrantyFulfillment_(approvedKeys, cardState) {
  const keys = Array.isArray(approvedKeys) ? approvedKeys : [];
  const state = {
    approvedCount: keys.length,
    printedCount: 0,
    shippedCount: 0,
    allPrinted: false,
    allShipped: false,
  };
  if (!keys.length) return state;

  keys.forEach(function (key) {
    const card = cardState.rows[key] ? cardState.rows[key].data : {};
    if (clean_(card['Status Cetak']) === 'Printed') state.printedCount += 1;
    if (clean_(card['Status Kirim']) === 'Dikirim') state.shippedCount += 1;
  });

  state.allPrinted = state.printedCount === state.approvedCount;
  state.allShipped = state.shippedCount === state.approvedCount;
  return state;
}

function getWarrantyFulfillmentState_(idPengajuan) {
  return summarizeWarrantyFulfillment_(
    getApprovedItemKeysForPengajuan_(idPengajuan),
    getWarrantyCardSheetState_()
  );
}

function derivePengajuanLifecycleFromFulfillment_(idPengajuan, currentStatus) {
  const current = clean_(currentStatus);
  if (['Ditolak', 'Diterima', 'Selesai'].indexOf(current) !== -1) return current;

  const state = getWarrantyFulfillmentState_(idPengajuan);
  if (!state.approvedCount) return current;

  let target = current;
  if (state.allShipped) target = 'Dikirim';
  else if (state.allPrinted) target = 'Diprint';

  const currentRank = getLifecycleRank_(current);
  const targetRank = getLifecycleRank_(target);
  if (currentRank !== -1 && targetRank !== -1 && currentRank > targetRank) return current;

  return target;
}

function syncPengajuanLifecycleFromWarranty_(idPengajuan, actor, note) {
  const id = clean_(idPengajuan);
  if (!id) return { changed: false, status: '' };

  const sheet = getSheet_(SHEETS.PENGAJUAN);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { changed: false, status: '' };

  const col = indexMap_(values[0]);
  for (let i = 1; i < values.length; i++) {
    if (clean_(values[i][col['ID Pengajuan']]) !== id) continue;

    const currentStatus = clean_(values[i][col['Status']]);
    if (VALID_STATUSES.indexOf(currentStatus) === -1) return { changed: false, status: currentStatus };

    const targetStatus = derivePengajuanLifecycleFromFulfillment_(id, currentStatus);
    if (targetStatus === currentStatus) return { changed: false, status: currentStatus };

    appendStatusHistory_(
      sheet,
      i + 1,
      col,
      id,
      currentStatus,
      targetStatus,
      note || 'Sinkronisasi lifecycle dari WarrantyCards',
      actor || 'system',
      '',
      new Date(),
      'Auto lifecycle'
    );
    return { changed: true, status: targetStatus };
  }

  return { changed: false, status: '' };
}

function previewPengajuanLifecycleMigration() {
  return buildPengajuanLifecycleMigrationPreview_();
}

function migratePengajuanLifecycleFromWarrantyCards() {
  return runPengajuanLifecycleMigration_('system:migration', 'Migrasi lifecycle dari WarrantyCards');
}

function handlePreviewPengajuanLifecycleMigration(data) {
  requireSession_(data.token, ['admin']);
  return { success: true, data: buildPengajuanLifecycleMigrationPreview_() };
}

function handleMigratePengajuanLifecycleFromWarrantyCards(data) {
  const session = requireSession_(data.token, ['admin']);
  return { success: true, data: runPengajuanLifecycleMigration_(session.username, 'Migrasi lifecycle dari WarrantyCards') };
}

function previewItemDecisionBackfill() {
  return buildItemDecisionBackfillPreview_();
}

function backfillItemDecisions() {
  return runItemDecisionBackfill_('system:migration');
}

function handlePreviewItemDecisionBackfill(data) {
  requireSession_(data.token, ['admin']);
  return { success: true, data: buildItemDecisionBackfillPreview_() };
}

function handleBackfillItemDecisions(data) {
  const session = requireSession_(data.token, ['admin']);
  return { success: true, data: runItemDecisionBackfill_(session.username) };
}

function buildItemDecisionBackfillPreview_() {
  ensureRuntimeHeaders_();
  const changes = getItemDecisionBackfillChanges_();
  const summary = {
    totalItems: changes.totalItems,
    alreadySet: changes.alreadySet,
    willSet: changes.rows.length,
    willSetDisetujui: 0,
    willSetDitolak: 0,
    unresolved: changes.unresolved.length,
  };

  changes.rows.forEach(function (row) {
    if (row.keputusanItem === 'Disetujui') summary.willSetDisetujui += 1;
    else if (row.keputusanItem === 'Ditolak') summary.willSetDitolak += 1;
  });

  return {
    summary: summary,
    changes: changes.rows,
    unresolved: changes.unresolved,
  };
}

function runItemDecisionBackfill_(actor) {
  ensureRuntimeHeaders_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const changes = getItemDecisionBackfillChanges_();
    if (!changes.rows.length) {
      return { updated: 0, summary: buildItemDecisionBackfillPreview_().summary, changes: [] };
    }

    const sheet = getSheet_(SHEETS.ITEMS);
    const values = sheet.getDataRange().getValues();
    const col = indexMap_(values[0]);
    const decisionCol = col['Keputusan Item'];
    if (decisionCol === undefined) throw new Error('Kolom Keputusan Item belum tersedia. Jalankan setupApp atau panggil API sekali agar header dibuat.');

    const rowByKey = {};
    for (let i = 1; i < values.length; i++) {
      rowByKey[itemDecisionBackfillKey_(values[i][col['ID Pengajuan']], values[i][col['No Item']])] = i + 1;
    }

    changes.rows.forEach(function (change) {
      const rowNumber = rowByKey[itemDecisionBackfillKey_(change.idPengajuan, change.noItem)];
      if (!rowNumber) return;
      sheet.getRange(rowNumber, decisionCol + 1).setValue(change.keputusanItem);
    });

    return {
      updated: changes.rows.length,
      actor: clean_(actor) || 'system:migration',
      summary: buildItemDecisionBackfillPreview_().summary,
      changes: changes.rows,
    };
  } finally {
    lock.releaseLock();
  }
}

function getItemDecisionBackfillChanges_() {
  const parentById = {};
  readObjects_(SHEETS.PENGAJUAN).forEach(function (row) {
    const id = clean_(row['ID Pengajuan']);
    if (id) parentById[id] = row;
  });

  const rows = [];
  const unresolved = [];
  let totalItems = 0;
  let alreadySet = 0;

  readObjects_(SHEETS.ITEMS).forEach(function (item) {
    totalItems += 1;
    const id = clean_(item['ID Pengajuan']);
    const noItem = clean_(item['No Item']);
    const existingDecision = clean_(item['Keputusan Item']);
    if (ITEM_DECISION_STATUSES.indexOf(existingDecision) !== -1) {
      alreadySet += 1;
      return;
    }

    const parent = parentById[id] || {};
    const parentStatus = clean_(parent['Status']);
    const decision = inferItemDecisionForBackfill_(item['Status Item'], parentStatus);
    const preview = {
      idPengajuan: id,
      noItem: noItem,
      statusPengajuan: parentStatus,
      statusItem: clean_(item['Status Item']),
      keputusanItem: decision,
    };

    if (decision) rows.push(preview);
    else unresolved.push(preview);
  });

  return {
    totalItems: totalItems,
    alreadySet: alreadySet,
    rows: rows,
    unresolved: unresolved,
  };
}

function itemDecisionBackfillKey_(idPengajuan, noItem) {
  return clean_(idPengajuan) + '::' + clean_(noItem);
}

function buildPengajuanLifecycleMigrationPreview_() {
  const changes = getPengajuanLifecycleMigrationChanges_();
  const summary = {
    eligible: changes.eligible,
    unchanged: changes.unchanged,
    willChange: changes.rows.length,
    toDisetujui: 0,
    toDiprint: 0,
    toDikirim: 0,
  };

  changes.rows.forEach(function (row) {
    if (row.targetStatus === 'Disetujui') summary.toDisetujui += 1;
    else if (row.targetStatus === 'Diprint') summary.toDiprint += 1;
    else if (row.targetStatus === 'Dikirim') summary.toDikirim += 1;
  });

  return {
    summary: summary,
    changes: changes.rows,
  };
}

function runPengajuanLifecycleMigration_(actor, note) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const changes = getPengajuanLifecycleMigrationChanges_();
    const sheet = getSheet_(SHEETS.PENGAJUAN);
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return { updated: 0, changes: [] };

    const col = indexMap_(values[0]);
    const rowById = {};
    for (let i = 1; i < values.length; i++) {
      rowById[clean_(values[i][col['ID Pengajuan']])] = i + 1;
    }

    const now = new Date();
    changes.rows.forEach(function (change) {
      const rowNumber = rowById[change.idPengajuan];
      if (!rowNumber) return;
      appendStatusHistory_(
        sheet,
        rowNumber,
        col,
        change.idPengajuan,
        change.currentStatus,
        change.targetStatus,
        note,
        actor || 'system:migration',
        '',
        now,
        'Migrasi lifecycle'
      );
    });

    return {
      updated: changes.rows.length,
      changes: changes.rows,
    };
  } finally {
    lock.releaseLock();
  }
}

function getPengajuanLifecycleMigrationChanges_() {
  const eligibleStatuses = ['Disetujui', 'Diprint', 'Dikirim'];
  const approvedById = getApprovedItemKeysByPengajuan_();
  const cardState = getWarrantyCardSheetState_();
  const rows = [];
  let eligible = 0;
  let unchanged = 0;

  readObjects_(SHEETS.PENGAJUAN).forEach(function (row) {
    const id = clean_(row['ID Pengajuan']);
    const currentStatus = clean_(row['Status']);
    if (!id || eligibleStatuses.indexOf(currentStatus) === -1) return;

    eligible += 1;
    const approvedKeys = approvedById[id] || [];
    const state = summarizeWarrantyFulfillment_(approvedKeys, cardState);
    const targetStatus = deriveMigrationLifecycleTarget_(currentStatus, state);

    if (targetStatus === currentStatus) {
      unchanged += 1;
      return;
    }

    rows.push({
      idPengajuan: id,
      currentStatus: currentStatus,
      targetStatus: targetStatus,
      approvedCount: state.approvedCount,
      printedCount: state.printedCount,
      shippedCount: state.shippedCount,
    });
  });

  return {
    eligible: eligible,
    unchanged: unchanged,
    rows: rows,
  };
}

function deriveMigrationLifecycleTarget_(currentStatus, state) {
  if (!state || !state.approvedCount) return currentStatus;
  if (state.allShipped) return 'Dikirim';
  if (state.allPrinted) return 'Diprint';
  return 'Disetujui';
}

function handleGetProductReviewQueue(data) {
  requireSession_(data.token);
  const pengajuanMap = {};
  readObjects_(SHEETS.PENGAJUAN).forEach(function (row) {
    if (VALID_STATUSES.indexOf(row['Status']) !== -1) pengajuanMap[row['ID Pengajuan']] = row;
  });

  const groups = {};
  readObjects_(SHEETS.ITEMS).forEach(function (row) {
    const pengajuan = pengajuanMap[row['ID Pengajuan']];
    if (!pengajuan) return;
    const status = clean_(row['produk_status']);
    if (status === 'verified') return;
    const model = clean_(row['model_normalized']) || normalizeModelKey_(row['Model']);
    if (!model) return;
    if (!groups[model]) {
      groups[model] = {
        model: model,
        produk: clean_(row['Produk']),
        count: 0,
        items: [],
        produkOptions: {},
      };
    }
    const group = groups[model];
    const produk = clean_(row['Produk']);
    group.count += 1;
    if (produk) group.produkOptions[produk] = (group.produkOptions[produk] || 0) + 1;
    group.items.push({
      idPengajuan: row['ID Pengajuan'],
      noItem: row['No Item'],
      produk: produk,
      model: row['Model'],
      nomorSeri: row['Nomor Seri'],
      statusPengajuan: pengajuan['Status'],
      bagianCabang: pengajuan['Bagian/Cabang'],
    });
  });

  const rows = Object.keys(groups).map(function (key) {
    const group = groups[key];
    const options = Object.keys(group.produkOptions).sort(function (a, b) {
      return group.produkOptions[b] - group.produkOptions[a] || a.localeCompare(b);
    });
    if (!group.produk && options.length) group.produk = options[0];
    group.produkOptions = options.map(function (produk) {
      return { produk: produk, count: group.produkOptions[produk] };
    });
    return group;
  }).sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.model.localeCompare(b.model);
  });

  return { success: true, data: { rows: rows } };
}

function handleApproveModelProduk(data) {
  const session = requireSession_(data.token, ['admin', 'qrcc']);
  const model = normalizeModelKey_(data.model);
  const produk = clean_(data.produk || data.kategori);
  const hasOriginInput = data.origin !== undefined && data.origin !== null;
  const origin = hasOriginInput ? normalizeModelOrigin_(data.origin, false) : undefined;
  if (!model) throw new Error('Model wajib dipilih');
  if (!produk) throw new Error('Nama Produk wajib diisi');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    upsertModelProduk_(model, produk, session.username, origin);
    const count = verifyPendingItemsByModel_(model, produk);
    CacheService.getScriptCache().remove('model_produk_map');
    return { success: true, data: { model: model, produk: produk, origin: origin || '', count: count } };
  } finally {
    lock.releaseLock();
  }
}

function handleGetWarrantyPrintQueue(data) {
  requireSession_(data.token, ['admin', 'qrcc']);
  const includePrinted = data.includePrinted === true || clean_(data.includePrinted).toLowerCase() === 'yes';
  const onlyUnsent = data.onlyUnsent === true || clean_(data.onlyUnsent).toLowerCase() === 'yes';
  const search = clean_(data.search).toLowerCase();
  const cardType = normalizeWarrantyCardType_(data.jenisKartu, false);
  const rows = getApprovedWarrantyQueueItems_().filter(function (item) {
    if (!includePrinted && item.statusCetak === 'Printed') return false;
    if (onlyUnsent && item.statusKirim !== 'Belum Dikirim') return false;
    if (cardType && item.jenisKartu !== cardType) return false;
    if (search) {
      const haystack = [
        item.idPengajuan,
        item.nama,
        item.bagianCabang,
        item.produk,
        item.model,
        item.nomorSeri,
      ].join(' ').toLowerCase();
      if (haystack.indexOf(search) === -1) return false;
    }
    return true;
  });

  rows.sort(function (a, b) {
    const typeOrder = { Local: 1, Import: 2, '': 3 };
    const aType = typeOrder[a.jenisKartu] || 3;
    const bType = typeOrder[b.jenisKartu] || 3;
    if (aType !== bType) return aType - bType;
    const aTime = new Date(a.timestampSubmit || 0).getTime();
    const bTime = new Date(b.timestampSubmit || 0).getTime();
    if (aTime !== bTime) return aTime - bTime;
    if (a.idPengajuan !== b.idPengajuan) return String(a.idPengajuan).localeCompare(String(b.idPengajuan));
    return Number(a.noItem) - Number(b.noItem);
  });

  const summary = { total: rows.length, local: 0, import: 0, belumJenisKartu: 0, printed: 0 };
  rows.forEach(function (item) {
    if (item.jenisKartu === 'Local') summary.local += 1;
    else if (item.jenisKartu === 'Import') summary.import += 1;
    else summary.belumJenisKartu += 1;
    if (item.statusCetak === 'Printed') summary.printed += 1;
  });

  return { success: true, data: { rows: rows, summary: summary } };
}

function handleGetPrintLayouts(data) {
  requireSession_(data.token, ['admin', 'qrcc']);
  ensurePrintLayoutDefaults_(getSheet_(SHEETS.CONFIG));
  return { success: true, data: getPrintLayoutState_() };
}

function handleSavePrintLayout(data) {
  const session = requireSession_(data.token, ['admin', 'qrcc']);
  const cleaned = normalizePrintLayoutInput_(data.layout || data, true);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    ensurePrintLayoutDefaults_(getSheet_(SHEETS.CONFIG));
    const sheet = getSheet_(SHEETS.PRINT_LAYOUTS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0] || HEADERS[SHEETS.PRINT_LAYOUTS];
    const col = indexMap_(headers);
    const now = new Date();
    let targetRow = -1;
    let existing = null;
    if (cleaned.id) {
      for (let i = 1; i < values.length; i++) {
        if (clean_(values[i][col.ID]) === cleaned.id) {
          targetRow = i + 1;
          existing = values[i];
          break;
        }
      }
    }
    const id = cleaned.id || generatePrintLayoutId_(cleaned.type);
    const isBuiltin = existing ? parseBoolean_(existing[col['Is Builtin']]) : false;
    const createdAt = existing ? existing[col['Created At']] : now;
    const row = [
      id,
      cleaned.type,
      cleaned.name,
      cleaned.offsetX,
      cleaned.offsetY,
      cleaned.gapProductModel,
      cleaned.gapModelSerial,
      isBuiltin ? 'TRUE' : 'FALSE',
      createdAt,
      now,
      session.username,
    ];
    if (targetRow > -1) sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
    const state = getPrintLayoutState_();
    state.savedLayoutId = id;
    return { success: true, data: state };
  } finally {
    lock.releaseLock();
  }
}

function handleDeletePrintLayout(data) {
  requireSession_(data.token, ['admin', 'qrcc']);
  const id = clean_(data.id || data.layoutId);
  if (!id) throw new Error('Layout wajib dipilih');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    ensurePrintLayoutDefaults_(getSheet_(SHEETS.CONFIG));
    const state = getPrintLayoutState_();
    const layout = state.layouts.find(function (item) { return item.id === id; });
    if (!layout) throw new Error('Layout tidak ditemukan');
    if (layout.isBuiltin) throw new Error('Layout bawaan tidak boleh dihapus');
    if (state.active[layout.type] === id) throw new Error('Pilih layout aktif lain sebelum menghapus layout ini');

    const sheet = getSheet_(SHEETS.PRINT_LAYOUTS);
    const values = sheet.getDataRange().getValues();
    const col = indexMap_(values[0]);
    for (let i = 1; i < values.length; i++) {
      if (clean_(values[i][col.ID]) === id) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return { success: true, data: getPrintLayoutState_() };
  } finally {
    lock.releaseLock();
  }
}

function handleSetActivePrintLayout(data) {
  const session = requireSession_(data.token, ['admin', 'qrcc']);
  const type = normalizePrintLayoutType_(data.type, true);
  const id = clean_(data.id || data.layoutId);
  if (!id) throw new Error('Layout wajib dipilih');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    ensurePrintLayoutDefaults_(getSheet_(SHEETS.CONFIG));
    const state = getPrintLayoutState_();
    const layout = state.layouts.find(function (item) { return item.id === id && item.type === type; });
    if (!layout) throw new Error('Layout tidak ditemukan untuk jenis kartu ini');
    upsertConfig_(getSheet_(SHEETS.CONFIG), ACTIVE_PRINT_LAYOUT_KEYS[type], id, true);
    return { success: true, data: getPrintLayoutState_(), updatedBy: session.username };
  } finally {
    lock.releaseLock();
  }
}

function handleSaveWarrantyCardTypes(data) {
  const session = requireSession_(data.token, ['admin', 'qrcc']);
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) throw new Error('Pilih item terlebih dahulu');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const approvedMap = mapByWarrantyKey_(getApprovedWarrantyQueueItems_());
    const state = getWarrantyCardSheetState_();
    let originUpdated = false;
    items.forEach(function (input) {
      const id = clean_(input.idPengajuan);
      const noItem = clean_(input.noItem);
      const jenisKartu = normalizeWarrantyCardType_(input.jenisKartu, true);
      const key = warrantyCardKey_(id, noItem);
      const item = approvedMap[key];
      if (!item) throw new Error('Item tidak ditemukan atau belum berstatus Disetujui: ' + id + ' #' + noItem);

      const existing = state.rows[key] ? state.rows[key].data : {};
      writeWarrantyCardRow_(state.sheet, state.rows[key], {
        idPengajuan: item.idPengajuan,
        noItem: item.noItem,
        produk: item.produk,
        model: item.model,
        nomorSeri: item.nomorSeri,
        jenisKartu: jenisKartu,
        statusCetak: clean_(existing['Status Cetak']) || 'Belum Dicetak',
        printBatchId: clean_(existing['Print Batch ID']),
        printedAt: existing['Printed At'] || '',
        printedBy: clean_(existing['Printed By']),
        reprintCount: Number(existing['Reprint Count'] || 0),
        lastReprintAt: existing['Last Reprint At'] || '',
        lastReprintBy: clean_(existing['Last Reprint By']),
        catatan: clean_(existing['Catatan']) || ('Jenis kartu disimpan oleh ' + session.username),
      });
      originUpdated = updateModelProdukOriginIfMissing_(item.model, jenisKartu, session.username) || originUpdated;
      state.rows[key] = findWarrantyCardStateRow_(state.sheet, key);
    });

    const cache = CacheService.getScriptCache();
    cache.remove('warranty_card_state');
    if (originUpdated) cache.remove('model_produk_map');
    return { success: true, data: { count: items.length } };
  } finally {
    lock.releaseLock();
  }
}

function handleMarkWarrantyCardsPrinted(data) {
  const session = requireSession_(data.token, ['admin', 'qrcc']);
  const inputs = Array.isArray(data.items) ? data.items : [];
  const catatan = clean_(data.catatan);
  if (!inputs.length) throw new Error('Pilih item yang sudah dicetak');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const approvedMap = mapByWarrantyKey_(getApprovedWarrantyQueueItems_());
    const state = getWarrantyCardSheetState_();
    const now = new Date();
    const batchId = generatePrintBatchId_('KG');
    const touchedPengajuanIds = {};

    inputs.forEach(function (input) {
      const id = clean_(input.idPengajuan);
      const noItem = clean_(input.noItem);
      const key = warrantyCardKey_(id, noItem);
      const item = approvedMap[key];
      if (!item) throw new Error('Item tidak ditemukan atau belum berstatus Disetujui: ' + id + ' #' + noItem);
      touchedPengajuanIds[id] = true;

      const existing = state.rows[key] ? state.rows[key].data : {};
      const jenisKartu = normalizeWarrantyCardType_(input.jenisKartu || existing['Jenis Kartu'], true);
      const alreadyPrinted = clean_(existing['Status Cetak']) === 'Printed';
      const printedAt = existing['Printed At'] || now;
      const printedBy = clean_(existing['Printed By']) || session.username;
      const reprintCount = alreadyPrinted ? Number(existing['Reprint Count'] || 0) + 1 : Number(existing['Reprint Count'] || 0);

      writeWarrantyCardRow_(state.sheet, state.rows[key], {
        idPengajuan: item.idPengajuan,
        noItem: item.noItem,
        produk: item.produk,
        model: item.model,
        nomorSeri: item.nomorSeri,
        jenisKartu: jenisKartu,
        statusCetak: 'Printed',
        printBatchId: batchId,
        printedAt: printedAt,
        printedBy: printedBy,
        reprintCount: reprintCount,
        lastReprintAt: alreadyPrinted ? now : (existing['Last Reprint At'] || ''),
        lastReprintBy: alreadyPrinted ? session.username : clean_(existing['Last Reprint By']),
        catatan: catatan,
      });
      state.rows[key] = findWarrantyCardStateRow_(state.sheet, key);
    });

    getSheet_(SHEETS.PRINT_BATCH).appendRow([batchId, 'warranty_card', now, session.username, inputs.length, catatan]);
    const cache = CacheService.getScriptCache();
    cache.remove('warranty_card_state');
    syncShippingLabelQueue_(inputs.map(function (i) {
      return { idPengajuan: i.idPengajuan, noItem: i.noItem };
    }), 'insert', { batchId: batchId, printedAt: now, printedBy: session.username });
    cache.remove('shipping_label_state');
    cache.remove('warranty_card_state');
    Object.keys(touchedPengajuanIds).forEach(function (idPengajuan) {
      syncPengajuanLifecycleFromWarranty_(idPengajuan, session.username, catatan || 'Sinkronisasi setelah tandai printed');
    });
    return { success: true, data: { batchId: batchId, count: inputs.length } };
  } finally {
    lock.releaseLock();
  }
}

function handleMarkShippingLabelsShipped(data) {
  const session = requireSession_(data.token, ['admin', 'qrcc']);
  const inputs = Array.isArray(data.items) ? data.items : [];
  if (!inputs.length) throw new Error('Pilih item yang akan ditandai dikirim');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const state = getWarrantyCardSheetState_();
    const now = new Date();
    const batchId = generatePrintBatchId_('KIRIM');
    const touchedPengajuanIds = {};

    inputs.forEach(function (input) {
      const id = clean_(input.idPengajuan);
      const noItem = clean_(input.noItem);
      const key = warrantyCardKey_(id, noItem);
      const existing = state.rows[key] ? state.rows[key].data : null;
      if (!existing) throw new Error('Item tidak ditemukan: ' + id + ' #' + noItem);
      if (clean_(existing['Status Cetak']) !== 'Printed') throw new Error('Item belum berstatus Printed: ' + id + ' #' + noItem);
      touchedPengajuanIds[id] = true;

      writeWarrantyCardRow_(state.sheet, state.rows[key], {
        idPengajuan: id,
        noItem: noItem,
        produk: existing['Produk'],
        model: existing['Model'],
        nomorSeri: existing['Nomor Seri'],
        jenisKartu: existing['Jenis Kartu'],
        statusCetak: existing['Status Cetak'],
        printBatchId: existing['Print Batch ID'],
        printedAt: existing['Printed At'],
        printedBy: existing['Printed By'],
        reprintCount: existing['Reprint Count'],
        lastReprintAt: existing['Last Reprint At'],
        lastReprintBy: existing['Last Reprint By'],
        catatan: existing['Catatan'],
        statusKirim: 'Dikirim',
        shippedAt: now,
        shippedBy: session.username,
        shipBatchId: batchId,
      });
      state.rows[key] = findWarrantyCardStateRow_(state.sheet, key);
    });

    getSheet_(SHEETS.PRINT_BATCH).appendRow([batchId, 'shipping_label', now, session.username, inputs.length, '']);
    const cache = CacheService.getScriptCache();
    cache.remove('warranty_card_state');
    syncShippingLabelQueue_(inputs, 'update', {
      statusKirim: 'Dikirim',
      shipBatchId: batchId,
      shippedAt: now,
      shippedBy: session.username
    });
    cache.remove('shipping_label_state');
    cache.remove('warranty_card_state');
    Object.keys(touchedPengajuanIds).forEach(function (idPengajuan) {
      syncPengajuanLifecycleFromWarranty_(idPengajuan, session.username, 'Sinkronisasi setelah tandai dikirim');
    });
    return { success: true, data: { batchId: batchId, count: inputs.length } };
  } finally {
    lock.releaseLock();
  }
}

function syncShippingLabelQueue_(items, mode, payload) {
  payload = payload || {};
  if (!Array.isArray(items) || !items.length) return;

  const state = getShippingLabelSheetState_();
  const now = payload.updatedAt || new Date();

  items.forEach(function (input) {
    const id = clean_(input.idPengajuan);
    const noItem = clean_(input.noItem);
    if (!id || !noItem) return;
    const key = warrantyCardKey_(id, noItem);

    // Untuk insert, ambil snapshot lengkap dari WarrantyCards agar tidak sinkron parsial.
    const cardRow = state.warrantyRows[key];
    if (mode === 'insert') {
      if (!cardRow) return; // item belum ada di WarrantyCards (skip defensif)
      const existing = state.rows[key];
      if (existing) return; // idempotent: jangan duplikasi row
      const row = [
        id,
        noItem,
        cardRow.produk || '',
        cardRow.model || '',
        cardRow.nomorSeri || '',
        cardRow.bagianCabang || '',
        cardRow.nama || '',
        payload.batchId || cardRow.printBatchId || '',
        payload.printedAt || cardRow.printedAt || now,
        'Belum Dikirim',
        '',
        '',
        '',
        now,
        now
      ];
      state.sheet.appendRow(row);
      state.rows[key] = { rowNumber: state.sheet.getLastRow(), data: listToObject_(HEADERS[SHEETS.SHIPPING_LABELS], row) };
      return;
    }

    if (mode === 'update') {
      const existing = state.rows[key];
      if (!existing) {
        // Row belum ada (mis. Printed di-call sebelum sync insert) — insert dulu.
        if (state.warrantyRows[key]) {
          const cardRow = state.warrantyRows[key];
          const row = [
            id,
            noItem,
            cardRow.produk || '',
            cardRow.model || '',
            cardRow.nomorSeri || '',
            cardRow.bagianCabang || '',
            cardRow.nama || '',
            cardRow.printBatchId || '',
            cardRow.printedAt || '',
            payload.statusKirim || 'Dikirim',
            payload.shipBatchId || '',
            payload.shippedAt || now,
            payload.shippedBy || '',
            now,
            now
          ];
          state.sheet.appendRow(row);
          state.rows[key] = { rowNumber: state.sheet.getLastRow(), data: listToObject_(HEADERS[SHEETS.SHIPPING_LABELS], row) };
        }
        return;
      }
      const range = state.sheet.getRange(existing.rowNumber, 1, 1, HEADERS[SHEETS.SHIPPING_LABELS].length);
      const current = range.getValues()[0];
      const headers = HEADERS[SHEETS.SHIPPING_LABELS];
      const next = current.slice();
      headers.forEach(function (header, index) {
        if (header === 'Status Kirim' && payload.statusKirim) next[index] = payload.statusKirim;
        else if (header === 'Ship Batch ID' && payload.shipBatchId) next[index] = payload.shipBatchId;
        else if (header === 'Shipped At' && payload.shippedAt) next[index] = payload.shippedAt;
        else if (header === 'Shipped By' && payload.shippedBy) next[index] = payload.shippedBy;
        else if (header === 'Updated At') next[index] = now;
      });
      range.setValues([next]);
      existing.data = listToObject_(headers, next);
    }
  });
}

function getShippingLabelSheetState_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('shipping_label_state');
  const sheet = getSheet_(SHEETS.SHIPPING_LABELS);
  let cachedRows = null;
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      cachedRows = parsed.rows || null;
    } catch (e) {}
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0] || HEADERS[SHEETS.SHIPPING_LABELS];
  const rows = {};
  for (let i = 1; i < values.length; i++) {
    if (!values[i].some(function (cell) { return cell !== ''; })) continue;
    const data = listToObject_(headers, values[i]);
    const key = warrantyCardKey_(data['ID Pengajuan'], data['No Item']);
    if (key.indexOf('::') !== -1) {
      rows[key] = { rowNumber: i + 1, data: data };
    }
  }

  // Bangun snapshot WarrantyCards untuk fallback insert (dipakai hanya saat mode insert).
  const warrantyRows = {};
  const approvedMap = mapByWarrantyKey_(getApprovedWarrantyQueueItems_());
  Object.keys(approvedMap).forEach(function (key) {
    const item = approvedMap[key];
    warrantyRows[key] = {
      produk: item.produk,
      model: item.model,
      nomorSeri: item.nomorSeri,
      bagianCabang: item.bagianCabang,
      nama: item.nama,
      printBatchId: item.printBatchId,
      printedAt: item.printedAt
    };
  });

  // Sinkronkan rows dengan cache (yang valid) — kalau cache lebih baru & ada row di sheet
  // yang belum tercatat, fallback ke rows hasil scan.
  if (cachedRows) {
    Object.keys(rows).forEach(function (key) {
      cachedRows[key] = rows[key];
    });
  }

  cache.put('shipping_label_state', JSON.stringify({ rows: cachedRows || rows }), 30);
  return { sheet: sheet, rows: cachedRows || rows, warrantyRows: warrantyRows };
}

function listToObject_(headers, row) {
  const obj = {};
  headers.forEach(function (header, index) { obj[header] = row[index]; });
  return obj;
}

function handleGetShippingLabelQueue(data) {
  requireSession_(data.token, ['admin', 'qrcc']);
  const state = getShippingLabelSheetState_();
  const statusKirim = clean_(data.statusKirim);
  const shipBatchId = clean_(data.shipBatchId);

  const rows = Object.keys(state.rows).map(function (key) {
    const data = state.rows[key].data;
    return {
      key: key,
      idPengajuan: clean_(data['ID Pengajuan']),
      noItem: clean_(data['No Item']),
      produk: clean_(data['Produk']),
      model: clean_(data['Model']),
      nomorSeri: clean_(data['Nomor Seri']),
      bagianCabang: clean_(data['Bagian/Cabang']),
      nama: clean_(data['Nama']),
      printBatchId: clean_(data['Print Batch ID']),
      printedAt: toIso_(data['Printed At']),
      statusKirim: clean_(data['Status Kirim']) || 'Belum Dikirim',
      shipBatchId: clean_(data['Ship Batch ID']),
      shippedAt: toIso_(data['Shipped At']),
      shippedBy: clean_(data['Shipped By']),
      createdAt: toIso_(data['Created At']),
      updatedAt: toIso_(data['Updated At'])
    };
  }).filter(function (row) {
    if (statusKirim && row.statusKirim !== statusKirim) return false;
    if (shipBatchId && row.shipBatchId !== shipBatchId) return false;
    return true;
  }).sort(function (a, b) {
    const at = new Date(a.createdAt || 0).getTime();
    const bt = new Date(b.createdAt || 0).getTime();
    return bt - at;
  });

  return { success: true, data: { rows: rows, total: rows.length } };
}

function sendEmailDigest() {
  const config = getConfig();
  const appName = config.APP_NAME || APP.APP_NAME;
  const recipients = readObjects_(SHEETS.RECIPIENTS)
    .filter(function (row) { return clean_(row['Aktif']).toLowerCase() === 'yes' && clean_(row['Email']); })
    .map(function (row) { return clean_(row['Email']); });
  const subject = '[' + appName + '] Reminder pengajuan baru';

  if (!recipients.length) {
    getSheet_(SHEETS.EMAIL_LOG).appendRow([new Date(), subject, '', 0, 'Tidak ada penerima aktif']);
    return;
  }

  const rows = readObjects_(SHEETS.PENGAJUAN)
    .filter(function (row) { return clean_(row['Status']) === 'Baru'; });
  const count = rows.length;

  if (!count) {
    getSheet_(SHEETS.EMAIL_LOG).appendRow([new Date(), subject, recipients.join(', '), 0, 'Tidak ada pengajuan status Baru']);
    return;
  }

  const sendSubject = '[' + appName + '] ' + count + ' pengajuan baru perlu diproses';
  const htmlBody = buildDigestHtml_(count, config);
  MailApp.sendEmail({ to: recipients.join(','), subject: sendSubject, htmlBody: htmlBody });
  upsertConfig_(getSheet_(SHEETS.CONFIG), 'LAST_EMAIL_SENT_AT', new Date(), true);
  getSheet_(SHEETS.EMAIL_LOG).appendRow([new Date(), sendSubject, recipients.join(', '), count, 'Terkirim']);
}

function ensureRuntimeHeaders_() {
  ensureAllSheets_(getSpreadsheet_());
}

function getSpreadsheet_() {
  if (APP.SPREADSHEET_ID) return SpreadsheetApp.openById(APP.SPREADSHEET_ID);
  const props = PropertiesService.getScriptProperties();
  const storedId = props.getProperty('SPREADSHEET_ID');
  if (storedId) return SpreadsheetApp.openById(storedId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('SPREADSHEET_ID', active.getId());
    return active;
  }
  const created = SpreadsheetApp.create(APP.APP_NAME + ' Data');
  props.setProperty('SPREADSHEET_ID', created.getId());
  return created;
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Sheet ' + name + ' belum ada. Jalankan setupApp() terlebih dahulu.');
  return sheet;
}

function ensureAllSheets_(ss) {
  Object.keys(HEADERS).forEach(function (name) {
    if (name === SHEETS.MODEL_PRODUK) {
      ensureModelProdukSheet_(ss);
      return;
    }
    ensureSheet_(ss, name, HEADERS[name]);
  });
}

function ensureModelProdukSheet_(ss) {
  const headers = HEADERS[SHEETS.MODEL_PRODUK];
  const sheet = ss.getSheetByName(SHEETS.MODEL_PRODUK) || ss.insertSheet(SHEETS.MODEL_PRODUK);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  const isCurrent = headers.every(function (header, index) { return existing[index] === header; }) &&
    existing.slice(headers.length).every(function (header) { return !header; });
  if (isCurrent) {
    sheet.setFrozenRows(1);
    return sheet;
  }

  const values = sheet.getDataRange().getValues();
  const oldHeaders = values[0] || [];
  const rowsByModel = {};
  for (let i = 1; i < values.length; i++) {
    const source = {};
    oldHeaders.forEach(function (header, index) {
      if (header) source[header] = values[i][index];
    });

    const row = normalizeModelProdukObject_(source);
    if (!row.model || !row.produk) continue;
    rowsByModel[row.model] = [
      row.model,
      row.produk,
      row.origin,
      row.status,
      row.updatedAt,
      row.updatedBy,
    ];
  }

  const rows = Object.keys(rowsByModel).sort().map(function (model) { return rowsByModel[model]; });
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  const needsHeader = headers.some(function (header, index) { return existing[index] !== header; });
  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function upsertConfig_(sheet, key, value, overwrite) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === key) {
      if (overwrite || values[i][1] === '') sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function ensureEmailDigestTrigger_() {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(function (trigger) { return trigger.getHandlerFunction() === 'sendEmailDigest'; });
  if (!exists) {
    ScriptApp.newTrigger('sendEmailDigest').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();
    ScriptApp.newTrigger('sendEmailDigest').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(9).create();
  }
}

function parseRequest_(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); }
    catch (err) { throw new Error('Body request tidak valid (bukan JSON).'); }
  }
  const data = {};
  if (e && e.parameter) Object.keys(e.parameter).forEach(function (key) { data[key] = e.parameter[key]; });
  return data;
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function normalizeModelKey_(value) {
  return clean_(value).replace(/\s+/g, ' ').toUpperCase();
}

function normalizeModelOrigin_(value, required) {
  const raw = clean_(value).toLowerCase();
  if (!raw) {
    if (required) throw new Error('Origin wajib dipilih');
    return '';
  }
  if (raw === 'local' || raw === 'lokal') return 'local';
  if (raw === 'import' || raw === 'impor') return 'import';
  throw new Error('Origin tidak valid: ' + value);
}

function normalizeModelProdukObject_(row) {
  const model = normalizeModelKey_(row.model || row['model_normalized']);
  let produk = clean_(row.produk);
  const origin = normalizeModelOrigin_(row.origin || row.Origin || row['Jenis Kartu'], false);
  let status = clean_(row.status) || 'verified';
  let updatedAt = row.updated_at || '';
  const updatedBy = clean_(row.updated_by);

  if (status !== 'verified' && clean_(row.updated_at) === 'verified') {
    produk = status;
    status = 'verified';
    updatedAt = '';
  }

  return {
    model: model,
    produk: produk,
    origin: origin,
    status: status,
    updatedAt: updatedAt,
    updatedBy: updatedBy,
  };
}

function getModelProdukRows_() {
  return readObjects_(SHEETS.MODEL_PRODUK)
    .map(normalizeModelProdukObject_)
    .filter(function (row) {
      return row.model && row.produk && row.status === 'verified';
    });
}

function getModelProdukMap_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('model_produk_map');
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  const map = {};
  getModelProdukRows_().forEach(function (row) {
    map[row.model] = row;
  });
  cache.put('model_produk_map', JSON.stringify(map), 60);
  return map;
}

function resolveItemProduk_(item, modelMap) {
  const modelNormalized = normalizeModelKey_(item.model);
  const master = modelMap[modelNormalized];
  if (master) {
    return Object.assign({}, item, {
      produk: master.produk,
      modelNormalized: modelNormalized,
      produkStatus: 'verified',
      produkSumber: 'auto',
    });
  }
  return Object.assign({}, item, {
    modelNormalized: modelNormalized,
    produkStatus: 'needs_review',
    produkSumber: 'manual',
  });
}

function upsertModelProduk_(model, produk, username, origin) {
  const sheet = getSheet_(SHEETS.MODEL_PRODUK);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || HEADERS[SHEETS.MODEL_PRODUK];
  const col = indexMap_(headers);
  const now = new Date();
  const hasOriginInput = origin !== undefined && origin !== null;
  const normalizedOrigin = hasOriginInput ? normalizeModelOrigin_(origin, false) : '';
  for (let i = 1; i < values.length; i++) {
    if (normalizeModelKey_(values[i][col.model]) === model) {
      const row = values[i].slice(0, headers.length);
      row[col.model] = model;
      row[col.produk] = produk;
      if (hasOriginInput) row[col.origin] = normalizedOrigin;
      row[col.status] = 'verified';
      row[col.updated_at] = now;
      row[col.updated_by] = username;
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow([model, produk, normalizedOrigin, 'verified', now, username]);
}

function updateModelProdukOriginIfMissing_(model, origin, username) {
  const normalizedModel = normalizeModelKey_(model);
  const normalizedOrigin = normalizeModelOrigin_(origin, false);
  if (!normalizedModel || !normalizedOrigin) return false;

  const sheet = getSheet_(SHEETS.MODEL_PRODUK);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;

  const headers = values[0] || HEADERS[SHEETS.MODEL_PRODUK];
  const col = indexMap_(headers);
  if (col.origin == null) return false;

  for (let i = 1; i < values.length; i++) {
    if (normalizeModelKey_(values[i][col.model]) !== normalizedModel) continue;
    if (clean_(values[i][col.origin])) return false;

    const row = values[i].slice(0, headers.length);
    row[col.origin] = normalizedOrigin;
    row[col.updated_at] = new Date();
    row[col.updated_by] = username;
    sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
    return true;
  }

  return false;
}

function verifyPendingItemsByModel_(model, produk) {
  const sheet = getSheet_(SHEETS.ITEMS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;
  const col = indexMap_(values[0]);
  let count = 0;
  for (let i = 1; i < values.length; i++) {
    const rowModelNormalized = clean_(values[i][col['model_normalized']]) || normalizeModelKey_(values[i][col['Model']]);
    if (rowModelNormalized !== model) continue;
    if (clean_(values[i][col['produk_status']]) === 'verified') continue;
    values[i][col['Produk']] = produk;
    values[i][col['model_normalized']] = model;
    values[i][col['produk_status']] = 'verified';
    values[i][col['produk_sumber']] = 'admin';
    count += 1;
  }
  if (count) {
    sheet.getRange(2, 1, values.length - 1, values[0].length).setValues(values.slice(1));
  }
  return count;
}

function normalizeSubmission_(data, config, includeFile) {
  const cleaned = {
    nama: clean_(data.nama),
    bagianCabang: clean_(data.bagianCabang),
    pemilik: clean_(data.pemilik),
    tanggalForm: clean_(data.tanggalForm),
    alasanPengajuan: clean_(data.alasanPengajuan),
    catatanTambahan: clean_(data.catatanTambahan),
    items: Array.isArray(data.items) ? data.items : [],
    fileBase64: clean_(data.fileBase64),
    fileExtension: clean_(data.fileExtension).toLowerCase().replace(/^\./, ''),
    fileMimeType: clean_(data.fileMimeType).toLowerCase(),
    evidenceAttachments: normalizeEvidenceAttachments_(data.evidenceAttachments, config),
  };
  ['nama', 'bagianCabang', 'pemilik', 'tanggalForm', 'alasanPengajuan'].forEach(function (field) {
    if (!cleaned[field]) throw new Error('Field wajib belum lengkap: ' + field);
  });

  const tanggal = new Date(cleaned.tanggalForm + 'T00:00:00');
  if (isNaN(tanggal.getTime())) throw new Error('Tanggal Form tidak valid');
  const maxDate = endOfDay_(new Date());
  maxDate.setDate(maxDate.getDate() + 7);
  if (tanggal > maxDate) throw new Error('Tanggal Form tidak boleh lebih dari 7 hari ke depan');

  const maxItems = Number(config.MAX_ITEMS || APP.MAX_ITEMS);
  if (!cleaned.items.length) throw new Error('Minimal 1 item produk wajib diisi');
  if (cleaned.items.length > maxItems) throw new Error('Jumlah item maksimal ' + maxItems);
  const modelMap = getModelProdukMap_();
  cleaned.items = cleaned.items.map(function (item, index) {
    const normalized = { produk: clean_(item.produk), model: clean_(item.model), nomorSeri: clean_(item.nomorSeri) };
    if (!normalized.produk || !normalized.model || !normalized.nomorSeri) throw new Error('Item #' + (index + 1) + ' belum lengkap');
    return resolveItemProduk_(normalized, modelMap);
  });

  if (includeFile) {
    if (!cleaned.fileBase64) throw new Error('File hard copy wajib dilampirkan');
    if (VALID_EXTENSIONS.indexOf(cleaned.fileExtension) === -1) throw new Error('Format file tidak valid');
    if (VALID_MIME_TYPES.indexOf(cleaned.fileMimeType) === -1) throw new Error('MIME type file tidak valid');
    const approxBytes = Math.ceil((cleaned.fileBase64.length * 3) / 4);
    const maxBytes = Number(config.MAX_UPLOAD_MB || APP.MAX_UPLOAD_MB) * 1024 * 1024;
    if (approxBytes > maxBytes) throw new Error('Ukuran file melebihi ' + (config.MAX_UPLOAD_MB || APP.MAX_UPLOAD_MB) + 'MB');
  }
  return cleaned;
}

function normalizeEvidenceAttachments_(attachments, config) {
  if (!Array.isArray(attachments)) return [];

  const maxFiles = Number(config.MAX_EVIDENCE_FILES || APP.MAX_EVIDENCE_FILES);
  if (attachments.length > maxFiles) throw new Error('Jumlah lampiran foto bukti maksimal ' + maxFiles);

  const maxBytes = Number(config.MAX_EVIDENCE_UPLOAD_MB || APP.MAX_EVIDENCE_UPLOAD_MB) * 1024 * 1024;

  return attachments.map(function (rawAttachment, index) {
    const attachment = rawAttachment || {};
    const fileName = clean_(attachment.fileName || attachment.name || ('foto-bukti-' + (index + 1)));
    const extensionFromName = clean_(fileName).split('.').pop();
    const fileExtension = clean_(attachment.fileExtension || extensionFromName).toLowerCase().replace(/^\./, '');
    const fileMimeType = clean_(attachment.fileMimeType || attachment.mimeType).toLowerCase();
    const fileBase64 = clean_(attachment.fileBase64 || attachment.base64);

    if (!fileBase64) throw new Error('Lampiran foto bukti #' + (index + 1) + ' belum lengkap');
    if (VALID_EVIDENCE_EXTENSIONS.indexOf(fileExtension) === -1) throw new Error('Format lampiran foto bukti harus JPG/JPEG/PNG');
    if (VALID_EVIDENCE_MIME_TYPES.indexOf(fileMimeType) === -1) throw new Error('MIME type lampiran foto bukti tidak valid');

    const approxBytes = Math.ceil((fileBase64.length * 3) / 4);
    if (approxBytes > maxBytes) throw new Error('Ukuran lampiran foto bukti #' + (index + 1) + ' melebihi ' + (config.MAX_EVIDENCE_UPLOAD_MB || APP.MAX_EVIDENCE_UPLOAD_MB) + 'MB');

    return {
      fileName: fileName,
      fileBase64: fileBase64,
      fileExtension: fileExtension,
      fileMimeType: fileMimeType,
    };
  });
}

function createEvidenceFiles_(folder, id, attachments) {
  const urls = [];
  const ids = [];

  (attachments || []).forEach(function (attachment, index) {
    const sequence = String(index + 1).padStart(2, '0');
    const name = id + '_bukti_' + sequence + '.' + attachment.fileExtension;
    const bytes = Utilities.base64Decode(attachment.fileBase64);
    const blob = Utilities.newBlob(bytes, attachment.fileMimeType, name);
    const file = folder.createFile(blob);
    file.setName(name);
    urls.push(file.getUrl());
    ids.push(file.getId());
  });

  return {
    urls: urls.join('\n'),
    ids: ids.join('\n'),
  };
}

function appendPengajuanRow_(id, cleaned, status, resumeToken, timestampSubmit, fileUrl, fileId, catatanAdmin, draftCreatedAt, draftUpdatedAt, submittedAt, riwayatSingkat, evidenceFileUrls, evidenceFileIds) {
  getSheet_(SHEETS.PENGAJUAN).appendRow([
    id,
    timestampSubmit,
    cleaned.nama,
    cleaned.bagianCabang,
    cleaned.pemilik,
    cleaned.alasanPengajuan,
    cleaned.tanggalForm,
    fileUrl,
    fileId,
    cleaned.catatanTambahan,
    cleaned.items.length,
    status,
    catatanAdmin,
    '',
    '',
    riwayatSingkat,
    resumeToken,
    draftCreatedAt,
    draftUpdatedAt,
    submittedAt,
    evidenceFileUrls || '',
    evidenceFileIds || '',
  ]);
}

function updatePengajuanRow_(sheet, rowNumber, col, id, cleaned, status, resumeToken, timestampSubmit, fileUrl, fileId, draftCreatedAt, draftUpdatedAt, submittedAt, riwayatSingkat, evidenceFileUrls, evidenceFileIds) {
  const row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  row[col['ID Pengajuan']] = id;
  row[col['Timestamp Submit']] = timestampSubmit;
  row[col['Nama']] = cleaned.nama;
  row[col['Bagian/Cabang']] = cleaned.bagianCabang;
  row[col['Pemilik']] = cleaned.pemilik;
  row[col['Alasan Pengajuan']] = cleaned.alasanPengajuan;
  row[col['Tanggal Form']] = cleaned.tanggalForm;
  row[col['File Hard Copy URL']] = fileUrl;
  row[col['File Hard Copy ID']] = fileId;
  row[col['Catatan Tambahan']] = cleaned.catatanTambahan;
  row[col['Jumlah Item']] = cleaned.items.length;
  row[col['Status']] = status;
  row[col['Catatan Admin']] = '';
  row[col['Tanggal Update Status Terakhir']] = '';
  row[col['User Update Status']] = '';
  row[col['Riwayat Singkat']] = riwayatSingkat;
  row[col['Resume Token']] = resumeToken;
  row[col['Draft Created At']] = draftCreatedAt;
  row[col['Draft Updated At']] = draftUpdatedAt;
  row[col['Submitted At']] = submittedAt;
  if (col['Lampiran Foto Bukti URLs'] !== undefined) row[col['Lampiran Foto Bukti URLs']] = evidenceFileUrls || '';
  if (col['Lampiran Foto Bukti IDs'] !== undefined) row[col['Lampiran Foto Bukti IDs']] = evidenceFileIds || '';
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
}

function findPengajuanRecord_(id) {
  const sheet = getSheet_(SHEETS.PENGAJUAN);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const col = indexMap_(headers);
  for (let i = 1; i < values.length; i++) {
    if (values[i][col['ID Pengajuan']] === id) {
      return { sheet: sheet, values: values, headers: headers, col: col, rowNumber: i + 1, row: values[i] };
    }
  }
  return null;
}

function findItemRecordBySerial_(nomorSeri) {
  const serial = clean_(nomorSeri).toLowerCase();
  if (!serial) return null;

  const sheet = getSheet_(SHEETS.ITEMS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0];
  const col = indexMap_(headers);
  const matches = [];

  for (let i = 1; i < values.length; i++) {
    if (clean_(values[i][col['Nomor Seri']]).toLowerCase() !== serial) continue;
    matches.push({
      sheet: sheet,
      values: values,
      headers: headers,
      col: col,
      rowNumber: i + 1,
      row: values[i],
      data: listToObject_(headers, values[i]),
    });
  }

  if (!matches.length) return null;
  if (matches.length > 1) {
    throw new Error('Nomor Seri ditemukan di lebih dari satu item. Gunakan ID Pengajuan untuk hasil yang lebih spesifik.');
  }

  return matches[0];
}

function getItemsForPengajuan_(id, fallbackStatus) {
  return readObjects_(SHEETS.ITEMS)
    .filter(function (row) { return row['ID Pengajuan'] === id; })
    .sort(function (a, b) { return Number(a['No Item']) - Number(b['No Item']); })
    .map(function (row) {
      return {
        noItem: row['No Item'],
        produk: row['Produk'],
        model: row['Model'],
        nomorSeri: row['Nomor Seri'],
        modelNormalized: clean_(row['model_normalized']) || normalizeModelKey_(row['Model']),
        produkStatus: clean_(row['produk_status']) || 'needs_review',
        produkSumber: clean_(row['produk_sumber']) || '',
        statusItem: deriveItemStatusFromDecision_(row['Keputusan Item'], row['Status Item']),
        keputusanItem: normalizeItemDecision_(row['Keputusan Item'], row['Status Item'], fallbackStatus),
        catatanAdminItem: clean_(row['Catatan Admin Item']),
        tanggalUpdateStatusItem: toIso_(row['Tanggal Update Status Item']),
        userUpdateStatusItem: clean_(row['User Update Status Item']),
      };
    });
}

function getApprovedWarrantyQueueItems_() {
  const pengajuanMap = {};
  readObjects_(SHEETS.PENGAJUAN).forEach(function (row) {
    if (VALID_STATUSES.indexOf(row['Status']) === -1) return;
    pengajuanMap[row['ID Pengajuan']] = row;
  });

  const cardState = getWarrantyCardSheetState_();
  const modelMap = getModelProdukMap_();
  return readObjects_(SHEETS.ITEMS)
    .filter(function (row) {
      const pengajuan = pengajuanMap[row['ID Pengajuan']];
      const decisionItem = normalizeExplicitItemDecision_(row['Keputusan Item']);
      return pengajuan && decisionItem === 'Disetujui' && clean_(row['produk_status']) === 'verified';
    })
    .map(function (row) {
      const pengajuan = pengajuanMap[row['ID Pengajuan']];
      const key = warrantyCardKey_(row['ID Pengajuan'], row['No Item']);
      const state = cardState.rows[key] ? cardState.rows[key].data : {};
      const modelNormalized = clean_(row['model_normalized']) || normalizeModelKey_(row['Model']);
      const master = modelMap[modelNormalized] || {};
      const originJenisKartu = normalizeWarrantyCardType_(master.origin, false);
      const jenisKartu = normalizeWarrantyCardType_(state['Jenis Kartu'], false) || originJenisKartu;
      return {
        key: key,
        idPengajuan: row['ID Pengajuan'],
        noItem: row['No Item'],
        produk: row['Produk'],
        model: row['Model'],
        nomorSeri: row['Nomor Seri'],
        origin: master.origin || '',
        jenisKartu: jenisKartu,
        jenisKartuKey: jenisKartu ? jenisKartu.toLowerCase() : '',
        statusCetak: clean_(state['Status Cetak']) || 'Belum Dicetak',
        printBatchId: clean_(state['Print Batch ID']),
        printedAt: toIso_(state['Printed At']),
        printedBy: clean_(state['Printed By']),
        reprintCount: Number(state['Reprint Count'] || 0),
        statusKirim: clean_(state['Status Kirim']) || 'Belum Dikirim',
        shippedAt: toIso_(state['Shipped At']),
        shippedBy: clean_(state['Shipped By']),
        shipBatchId: clean_(state['Ship Batch ID']),
        nama: pengajuan['Nama'],
        bagianCabang: pengajuan['Bagian/Cabang'],
        timestampSubmit: toIso_(pengajuan['Timestamp Submit']),
      };
    });
}

function getWarrantyCardSheetState_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('warranty_card_state');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // sheet reference tidak bisa di-JSON-kan; rekonstruksi.
      return { sheet: getSheet_(SHEETS.WARRANTY_CARDS), rows: parsed.rows };
    } catch (e) {}
  }
  const sheet = getSheet_(SHEETS.WARRANTY_CARDS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || HEADERS[SHEETS.WARRANTY_CARDS];
  const rows = {};
  for (let i = 1; i < values.length; i++) {
    if (!values[i].some(function (cell) { return cell !== ''; })) continue;
    const data = {};
    headers.forEach(function (header, index) { data[header] = values[i][index]; });
    rows[warrantyCardKey_(data['ID Pengajuan'], data['No Item'])] = { rowNumber: i + 1, data: data };
  }
  cache.put('warranty_card_state', JSON.stringify({ rows: rows }), 30);
  return { sheet: sheet, rows: rows };
}

function findWarrantyCardStateRow_(sheet, key) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || HEADERS[SHEETS.WARRANTY_CARDS];
  for (let i = 1; i < values.length; i++) {
    const data = {};
    headers.forEach(function (header, index) { data[header] = values[i][index]; });
    if (warrantyCardKey_(data['ID Pengajuan'], data['No Item']) === key) return { rowNumber: i + 1, data: data };
  }
  return null;
}

function writeWarrantyCardRow_(sheet, existingRow, data) {
  const row = [
    data.idPengajuan,
    data.noItem,
    data.produk,
    data.model,
    data.nomorSeri,
    data.jenisKartu,
    data.statusCetak,
    data.printBatchId,
    data.printedAt,
    data.printedBy,
    data.reprintCount,
    data.lastReprintAt,
    data.lastReprintBy,
    data.catatan,
    data.statusKirim || '',
    data.shippedAt || '',
    data.shippedBy || '',
    data.shipBatchId || '',
  ];
  if (existingRow && existingRow.rowNumber) {
    sheet.getRange(existingRow.rowNumber, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function mapByWarrantyKey_(items) {
  const map = {};
  items.forEach(function (item) { map[warrantyCardKey_(item.idPengajuan, item.noItem)] = item; });
  return map;
}

function warrantyCardKey_(id, noItem) {
  return clean_(id) + '::' + clean_(noItem);
}

function normalizeWarrantyCardType_(value, required) {
  const raw = clean_(value).toLowerCase();
  if (!raw) {
    if (required) throw new Error('Jenis kartu wajib dipilih');
    return '';
  }
  if (raw === 'local' || raw === 'lokal') return 'Local';
  if (raw === 'import' || raw === 'impor') return 'Import';
  throw new Error('Jenis kartu tidak valid: ' + value);
}

function ensurePrintLayoutDefaults_(configSheet) {
  const sheet = getSheet_(SHEETS.PRINT_LAYOUTS);
  const state = getPrintLayoutRows_();
  const now = new Date();
  DEFAULT_PRINT_LAYOUTS.forEach(function (layout) {
    if (!state.byId[layout.id]) {
      sheet.appendRow([
        layout.id,
        layout.type,
        layout.name,
        layout.offsetX,
        layout.offsetY,
        layout.gapProductModel,
        layout.gapModelSerial,
        'TRUE',
        now,
        now,
        'system',
      ]);
    }
    upsertConfig_(configSheet, ACTIVE_PRINT_LAYOUT_KEYS[layout.type], layout.id, false);
  });
}

function getPrintLayoutState_() {
  const rows = getPrintLayoutRows_().layouts;
  const configSheet = getSheet_(SHEETS.CONFIG);
  const config = getConfig();
  const active = {
    local: clean_(config.ACTIVE_PRINT_LAYOUT_LOCAL) || 'local-default',
    import: clean_(config.ACTIVE_PRINT_LAYOUT_IMPORT) || 'import-default',
  };
  const activeLayouts = {};
  ['local', 'import'].forEach(function (type) {
    let layout = rows.find(function (item) { return item.id === active[type] && item.type === type; });
    if (!layout) {
      layout = rows.find(function (item) { return item.id === type + '-default' && item.type === type; });
      active[type] = layout ? layout.id : '';
      if (layout) upsertConfig_(configSheet, ACTIVE_PRINT_LAYOUT_KEYS[type], layout.id, true);
    }
    activeLayouts[type] = layout || null;
  });
  return { layouts: rows, active: active, activeLayouts: activeLayouts };
}

function getPrintLayoutRows_() {
  const sheet = getSheet_(SHEETS.PRINT_LAYOUTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || HEADERS[SHEETS.PRINT_LAYOUTS];
  const col = indexMap_(headers);
  const layouts = [];
  const byId = {};
  for (let i = 1; i < values.length; i++) {
    if (!values[i].some(function (cell) { return cell !== ''; })) continue;
    const layout = {
      id: clean_(values[i][col.ID]),
      type: normalizePrintLayoutType_(values[i][col.Type], false),
      name: clean_(values[i][col.Name]),
      offsetX: normalizeNumber_(values[i][col['Offset X']], 0, true),
      offsetY: normalizeNumber_(values[i][col['Offset Y']], 0, true),
      gapProductModel: normalizeNumber_(values[i][col['Gap Product Model']], 0, true),
      gapModelSerial: normalizeNumber_(values[i][col['Gap Model Serial']], 0, true),
      isBuiltin: parseBoolean_(values[i][col['Is Builtin']]),
      createdAt: toIso_(values[i][col['Created At']]),
      updatedAt: toIso_(values[i][col['Updated At']]),
      updatedBy: clean_(values[i][col['Updated By']]),
    };
    if (!layout.id || !layout.type) continue;
    layouts.push(layout);
    byId[layout.id] = layout;
  }
  layouts.sort(function (a, b) {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.isBuiltin !== b.isBuiltin) return a.isBuiltin ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { layouts: layouts, byId: byId };
}

function normalizePrintLayoutInput_(input, requireName) {
  const layout = {
    id: clean_(input.id || input.layoutId),
    type: normalizePrintLayoutType_(input.type, true),
    name: clean_(input.name),
    offsetX: normalizeNumber_(input.offsetX, 0, true),
    offsetY: normalizeNumber_(input.offsetY, 0, true),
    gapProductModel: normalizeNumber_(input.gapProductModel, 0, true),
    gapModelSerial: normalizeNumber_(input.gapModelSerial, 0, true),
  };
  if (requireName && !layout.name) throw new Error('Nama layout wajib diisi');
  return layout;
}

function normalizePrintLayoutType_(value, required) {
  const raw = clean_(value).toLowerCase();
  if (!raw) {
    if (required) throw new Error('Jenis layout wajib dipilih');
    return '';
  }
  if (raw === 'local' || raw === 'lokal') return 'local';
  if (raw === 'import' || raw === 'impor') return 'import';
  throw new Error('Jenis layout tidak valid: ' + value);
}

function normalizeNumber_(value, fallback, allowNegative) {
  if (value === '' || value == null) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('Nilai angka tidak valid');
  if (!allowNegative && number < 0) throw new Error('Nilai tidak boleh negatif');
  return number;
}

function parseBoolean_(value) {
  const raw = clean_(value).toLowerCase();
  return raw === 'true' || raw === 'yes' || raw === '1';
}

function generatePrintLayoutId_(type) {
  return type + '-' + Utilities.getUuid().slice(0, 8).toLowerCase();
}

function replaceItemRows_(id, items) {
  const sheet = getSheet_(SHEETS.ITEMS);
  const values = sheet.getDataRange().getValues();
  if (values.length >= 2) {
    const col = indexMap_(values[0]);
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][col['ID Pengajuan']] === id) sheet.deleteRow(i + 1);
    }
  }

  const itemRows = items.map(function (item, index) {
    return [id, index + 1, item.produk, item.model, item.nomorSeri, item.modelNormalized, item.produkStatus, item.produkSumber, 'Baru', '', '', '', ''];
  });
  if (itemRows.length) sheet.getRange(sheet.getLastRow() + 1, 1, itemRows.length, itemRows[0].length).setValues(itemRows);
}

function generateIdUnlocked_() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  const prefix = 'KG-' + today + '-';
  const sheet = getSheet_(SHEETS.PENGAJUAN);
  const lastRow = sheet.getLastRow();
  let max = 0;
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    ids.forEach(function (id) {
      id = String(id || '');
      if (id.indexOf(prefix) === 0) {
        const seq = parseInt(id.slice(prefix.length), 10);
        if (!isNaN(seq) && seq > max) max = seq;
      }
    });
  }
  return prefix + String(max + 1).padStart(4, '0');
}

function generatePrintBatchId_(prefix) {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  return prefix + '-PRINT-' + stamp + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function generateResumeToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

function readObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(function (row) { return row.some(function (cell) { return cell !== ''; }); }).map(function (row) {
    const obj = {};
    headers.forEach(function (header, index) { obj[header] = row[index]; });
    return obj;
  });
}

function requireSession_(token, allowedRoles) {
  const session = validateSession(token);
  if (!session) throw new Error('Unauthorized');

  session.role = normalizeRole_(session.role);
  if (!session.role) throw new Error('Unauthorized');

  if (allowedRoles && allowedRoles.length && allowedRoles.indexOf(session.role) === -1) {
    throw new Error('Unauthorized');
  }

  return session;
}

function normalizeRole_(value) {
  const role = clean_(value).toLowerCase();
  if (role === 'admin' || role === 'administrator') return 'admin';
  if (role === 'management' || role === 'manajemen') return 'management';
  if (role === 'qrcc') return 'qrcc';
  return '';
}

function splitStoredLines_(value) {
  return clean_(value).split(/\r?\n/).map(clean_).filter(Boolean);
}

function clean_(value) {
  return String(value == null ? '' : value).trim();
}

function indexMap_(headers) {
  const map = {};
  headers.forEach(function (header, index) { map[header] = index; });
  return map;
}

function startOfDay_(date) {
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay_(date) {
  date.setHours(23, 59, 59, 999);
  return date;
}

function toIso_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function formatDateOnly_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? String(value) : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatDateTime_(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function buildDigestHtml_(count, config) {
  const appName = config.APP_NAME || APP.APP_NAME;
  const safeAppName = escapeHtml_(appName);
  const safeCount = escapeHtml_(count);
  const sentAt = escapeHtml_(formatDateTime_(new Date()));

  return '<div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">' +
    '<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">' +
    '<div style="font-size:14px;font-weight:700;color:#65a30d;margin-bottom:12px;">' + safeAppName + '</div>' +
    '<h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:#111827;">Pengajuan Baru Perlu Diproses</h1>' +
    '<div style="font-size:48px;line-height:1;font-weight:700;color:#65a30d;margin:0 0 16px;">' + safeCount + '</div>' +
    '<p style="font-size:16px;line-height:1.5;margin:0 0 8px;">Ada ' + safeCount + ' pengajuan status "Baru" yang harus diproses.</p>' +
    '<p style="font-size:16px;line-height:1.5;margin:0 0 24px;">Silakan cek dashboard admin ' + safeAppName + '.</p>' +
    '<p style="font-size:12px;line-height:1.5;margin:0;color:#6b7280;">Email ini dikirim otomatis oleh sistem ' + safeAppName + ' pada ' + sentAt + '.</p>' +
    '</div>' +
    '</div>';
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
