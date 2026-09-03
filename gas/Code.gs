/**
 * PT RYUTA — Google Apps Script API
 * Spreadsheet をデータストアとして、トレーナー/顧客の記録・メニューを管理する。
 */

var SPREADSHEET_ID = '1jBDb9MmwoACaEkTYEzo4mGchsDSiyTJT1q5P9TT1p08';
var SHEETS = {
  CONFIG: 'Config',
  CLIENTS: '会員マスタ',
  WORKOUTS: 'Workouts',
  MENUS: 'Menus',
  EXERCISES: 'Exercises',
  PT_SESSIONS: 'PtSessions'
};

var DEFAULT_EXERCISES = [
  // name, category(エリア), bodyPart(部位)
  ['トレッドミル', '有酸素', '脚'],
  ['クロストレーナー', '有酸素', '脚'],
  ['バイク', '有酸素', '脚'],
  ['チェストプレス', 'マシン', '胸'],
  ['ショルダープレス', 'マシン', '肩'],
  ['ラットプルダウン', 'マシン', '背中'],
  ['ロー', 'マシン', '背中'],
  ['レッグプレス', 'マシン', '脚'],
  ['レッグエクステンション', 'マシン', '脚'],
  ['レッグカール', 'マシン', '脚'],
  ['アブドミナル', 'マシン', '腹'],
  ['グルート', 'マシン', '脚'],
  ['バックエクステンション', 'マシン', '背中'],
  ['トルソーローテーション', 'マシン', '腹'],
  ['ペックフライ', 'マシン', '胸'],
  ['リアデルト', 'マシン', '肩'],
  ['アブダクション', 'マシン', '脚'],
  ['アダクション', 'マシン', '脚'],
  ['クランチ', 'マシン', '腹'],
  ['スクワット', 'フリーウェイト', '脚'],
  ['デッドリフト', 'フリーウェイト', '背中'],
  ['RDL', 'フリーウェイト', '脚'],
  ['ベンチプレス', 'フリーウェイト', '胸'],
  ['オーバーヘッドプレス', 'フリーウェイト', '肩'],
  ['スミススクワット', 'フリーウェイト', '脚'],
  ['インクラインプレス', 'フリーウェイト', '胸'],
  ['ダンベルプレス', 'フリーウェイト', '胸'],
  ['ダンベルショルダープレス', 'フリーウェイト', '肩'],
  ['ダンベルカール', 'フリーウェイト', '腕'],
  ['サイドレイズ', 'フリーウェイト', '肩'],
  ['インクラインカール', 'フリーウェイト', '腕'],
  ['プッシュダウン', 'フリーウェイト', '腕'],
  ['ローププレスダウン', 'フリーウェイト', '腕'],
  ['ケーブルカール', 'フリーウェイト', '腕'],
  ['ケーブルサイドレイズ', 'フリーウェイト', '肩'],
  ['シーテッドロー', 'フリーウェイト', '背中']
];

function doGet(e) {
  return handleRequest(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  var payload = {};
  try {
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return json_({ ok: false, error: 'Invalid JSON: ' + err });
  }
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (k) {
      if (payload[k] === undefined) payload[k] = e.parameter[k];
    });
  }
  return handleRequest(payload);
}

function handleRequest(payload) {
  try {
    ensureSchema_();
    var action = String(payload.action || 'ping');
    var result;

    switch (action) {
      case 'ping':
        result = { ok: true, app: 'PT-RYUTA', time: new Date().toISOString() };
        break;
      case 'setup':
        result = { ok: true, message: 'schema ready', sheets: Object.keys(SHEETS) };
        break;
      case 'listClients':
        requireTrainer_(payload);
        result = { ok: true, clients: listClientsPublic_() };
        break;
      case 'upsertClient':
        result = {
          ok: false,
          error: '会員の追加・変更はスプレッドシート「会員マスタ」からのみ行えます'
        };
        break;
      case 'upsertPtClient':
        requireTrainer_(payload);
        result = { ok: true, client: upsertPtClient_(payload) };
        break;
      case 'adminSyncMembers':
        result = { ok: true, clients: adminSyncMembers_(payload) };
        break;
      case 'listWorkouts':
        result = { ok: true, workouts: listWorkouts_(payload) };
        break;
      case 'addWorkout':
        assertMemberWrite_(payload);
        result = { ok: true, workout: addWorkout_(payload) };
        break;
      case 'addWorkouts':
        assertMemberWrite_(payload);
        result = { ok: true, workouts: addWorkouts_(payload) };
        break;
      case 'updateWorkout':
        assertWorkoutTouch_(payload);
        result = { ok: true, workout: updateWorkout_(payload) };
        break;
      case 'deleteWorkouts':
        assertWorkoutsDelete_(payload);
        result = { ok: true, deleted: deleteWorkouts_(payload) };
        break;
      case 'listMenus':
        requireTrainer_(payload);
        result = { ok: true, menus: listMenus_(payload) };
        break;
      case 'upsertMenu':
        requireTrainer_(payload);
        result = { ok: true, menu: upsertMenu_(payload) };
        break;
      case 'getMenuByToken':
        result = { ok: true, menu: getMenuByToken_(payload.token) };
        break;
      case 'listExercises':
        result = { ok: true, exercises: listExercises_() };
        break;
      case 'listPtSessions':
        requireTrainer_(payload);
        result = { ok: true, sessions: listPtSessions_(payload) };
        break;
      case 'upsertPtSession':
        requireTrainer_(payload);
        result = { ok: true, session: upsertPtSession_(payload) };
        break;
      case 'deletePtSession':
        requireTrainer_(payload);
        result = { ok: true, deleted: deletePtSession_(payload) };
        break;
      case 'verifyTrainer':
        result = { ok: true, valid: verifyTrainer_(payload.pin) };
        break;
      case 'verifyClient':
        result = { ok: true, client: verifyClient_(payload.code) };
        break;
      case 'updateNickname':
        result = { ok: true, client: updateNickname_(payload) };
        break;
      default:
        result = { ok: false, error: 'Unknown action: ' + action };
    }
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function ss_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSchema_() {
  var ss = ss_();
  ensureSheet_(ss, SHEETS.CONFIG, ['key', 'value'], [
    ['trainerPin', '2468'],
    ['appName', 'PT RYUTA'],
    ['createdAt', new Date().toISOString()]
  ]);
  ensureSheet_(ss, SHEETS.CLIENTS, [
    '会員番号',
    '氏名',
    '目標',
    'メモ',
    'id',
    '登録日時',
    '有効'
  ]);
  ensureClientNicknameColumn_();
  ensureClientEnrolledAtColumn_();
  // 旧英語シートが残っていれば参照用に残す（空なら無視）
  migrateLegacyClients_();
  ensureClientIds_();
  ensureSheet_(ss, SHEETS.WORKOUTS, [
    'id',
    'timestamp',
    'date',
    'clientId',
    'clientName',
    'mode',
    'exercise',
    'minutes',
    'weight',
    'reps',
    'sets',
    'rpe',
    'memo',
    'actor'
  ]);
  ensureSheet_(ss, SHEETS.MENUS, [
    'id',
    'clientId',
    'clientName',
    'title',
    'shareToken',
    'itemsJson',
    'notes',
    'updatedAt',
    'published'
  ]);
  ensureSheet_(ss, SHEETS.EXERCISES, ['name', 'category', 'bodyPart'], DEFAULT_EXERCISES);
  ensureSheet_(ss, SHEETS.PT_SESSIONS, [
    'id',
    'clientId',
    'clientName',
    'sessionNo',
    'exercisesJson',
    'memo',
    'createdAt',
    'updatedAt'
  ]);
  renameCycleToBike_();
  replaceExerciseMaster_();
}

function ensureSheet_(ss, name, headers, seedRows) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  var lastCol = Math.max(sheet.getLastColumn(), headers.length);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var headerMismatch = false;
  for (var i = 0; i < headers.length; i++) {
    if (String(existing[i] || '') !== headers[i]) {
      headerMismatch = true;
      break;
    }
  }
  var needsHeader = sheet.getLastRow() === 0 || headerMismatch;
  if (needsHeader && sheet.getLastRow() <= 1) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    if (seedRows && seedRows.length) {
      sheet.getRange(2, 1, seedRows.length, headers.length).setValues(seedRows);
    }
  } else if (needsHeader && sheet.getLastRow() > 1) {
    // データがある場合はヘッダーだけ正しい日本語に直す
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else if (seedRows && seedRows.length && sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, seedRows.length, headers.length).setValues(seedRows);
  }
  return sheet;
}

function sheetValues_(name) {
  var sheet = ss_().getSheetByName(name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) {
      obj[h] = row[i];
    });
    return obj;
  });
}

function appendRow_(name, rowObj) {
  var sheet = ss_().getSheetByName(name);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    return rowObj[h] !== undefined && rowObj[h] !== null ? rowObj[h] : '';
  });
  sheet.appendRow(row);
  return rowObj;
}

function updateRowById_(name, id, patch) {
  var sheet = ss_().getSheetByName(name);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idIdx = headers.indexOf('id');
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idIdx]) === String(id)) {
      headers.forEach(function (h, c) {
        if (patch[h] !== undefined) {
          sheet.getRange(r + 1, c + 1).setValue(patch[h]);
        }
      });
      var updated = {};
      headers.forEach(function (h, c) {
        updated[h] = patch[h] !== undefined ? patch[h] : values[r][c];
      });
      return updated;
    }
  }
  return null;
}

function uid_(prefix) {
  return (
    prefix +
    '_' +
    Utilities.getUuid().replace(/-/g, '').slice(0, 12) +
    '_' +
    Date.now().toString(36)
  );
}

function migrateLegacyClients_() {
  var ss = ss_();
  var legacy = ss.getSheetByName('Clients');
  if (!legacy || legacy.getLastRow() < 2) return;
  var master = ss.getSheetByName(SHEETS.CLIENTS);
  if (!master || master.getLastRow() > 1) return;
  var values = legacy.getDataRange().getValues();
  var headers = values[0];
  var rows = values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) {
      obj[h] = row[i];
    });
    return [
      String(obj.code || ''),
      String(obj.name || ''),
      String(obj.goal || ''),
      String(obj.notes || ''),
      String(obj.id || uid_('cli')),
      String(obj.createdAt || new Date().toISOString()),
      String(obj.active) === 'FALSE' || String(obj.active) === 'false' ? 'FALSE' : 'TRUE'
    ];
  }).filter(function (r) {
    return r[0] || r[1];
  });
  if (rows.length) {
    master.getRange(2, 1, rows.length, 7).setValues(rows);
  }
}

function normalizeMemberNo_(value) {
  var raw = String(value || '').replace(/\D/g, '');
  return raw;
}

function assertMemberNo_(value) {
  var memberNo = normalizeMemberNo_(value);
  if (!/^\d{10}$/.test(memberNo)) {
    throw new Error('会員番号は10桁の数字で入力してください');
  }
  return memberNo;
}

function normalizeNick_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function nickEquals_(a, b) {
  var left = normalizeNick_(a);
  var right = normalizeNick_(b);
  return Boolean(left) && left === right;
}

function ensureClientNicknameColumn_() {
  var sheet = ss_().getSheetByName(SHEETS.CLIENTS);
  if (!sheet) return;
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf('ニックネーム') >= 0) return;
  sheet.getRange(1, lastCol + 1).setValue('ニックネーム');
}

function ensureClientEnrolledAtColumn_() {
  var sheet = ss_().getSheetByName(SHEETS.CLIENTS);
  if (!sheet) return;
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf('入会日') >= 0) return;
  sheet.getRange(1, lastCol + 1).setValue('入会日');
}

function sheetDate_(value) {
  if (
    Object.prototype.toString.call(value) === '[object Date]' &&
    !isNaN(value.getTime())
  ) {
    return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy-MM-dd');
  }
  var s = String(value || '').trim();
  var m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  return s;
}

function requireTrainer_(p) {
  // スタッフ画面は URL 分離のみ。PIN認証なし
  return;
}

function findActiveClientById_(clientId) {
  return listAllClientRows_().find(function (c) {
    return c.id === String(clientId || '') && c.active;
  });
}

function requireMemberAuth_(p) {
  var client = null;
  if (p.clientId) client = findActiveClientById_(p.clientId);
  if (!client && p.code) client = findClientByMemberNo_(p.code);
  if (!client || !client.active) throw new Error('認証に失敗しました');
  var code = normalizeMemberNo_(p.code || '');
  if (!code || normalizeMemberNo_(client.code) !== code) {
    throw new Error('認証に失敗しました');
  }
  return client;
}

function requireMemberOrTrainer_(p) {
  if (p && p.staff === true) return { role: 'trainer', client: null };
  if (p.pin && verifyTrainer_(p.pin)) return { role: 'trainer', client: null };
  return { role: 'member', client: requireMemberAuth_(p) };
}

function assertMemberWrite_(p) {
  var auth = requireMemberOrTrainer_(p);
  if (auth.role === 'trainer') return auth;
  if (String(p.clientId || '') !== String(auth.client.id)) {
    throw new Error('権限がありません');
  }
  return auth;
}

function assertWorkoutTouch_(p) {
  var auth = requireMemberOrTrainer_(p);
  if (auth.role === 'trainer') return;
  var rows = sheetValues_(SHEETS.WORKOUTS).map(normalizeWorkout_);
  var found = rows.find(function (w) {
    return w.id === String(p.id || '');
  });
  if (!found) throw new Error('workout not found');
  if (found.clientId !== auth.client.id) throw new Error('権限がありません');
}

function assertWorkoutsDelete_(p) {
  var auth = requireMemberOrTrainer_(p);
  if (auth.role === 'trainer') return;
  var ids = p.ids || (p.id ? [p.id] : []);
  var rows = sheetValues_(SHEETS.WORKOUTS).map(normalizeWorkout_);
  ids.forEach(function (id) {
    var found = rows.find(function (w) {
      return w.id === String(id);
    });
    if (found && found.clientId !== auth.client.id) {
      throw new Error('権限がありません');
    }
  });
}

function listClients_() {
  return sheetValues_(SHEETS.CLIENTS)
    .filter(function (c) {
      var active = c['有効'] !== undefined ? c['有効'] : c.active;
      return String(active) !== 'FALSE' && String(active) !== 'false';
    })
    .map(normalizeClient_);
}

function listClientsPublic_() {
  return listClients_().map(publicClient_);
}

function normalizeClient_(c) {
  var code = String(c['会員番号'] || c.code || '').trim();
  var id = String(c.id || '').trim();
  // 手入力行で id 空のとき会員番号を暫定キーにする（ensureClientIds_ で本IDを埋める）
  if (!id && code) id = code;
  var enrolledAt = sheetDate_(c['入会日'] !== undefined ? c['入会日'] : c.enrolledAt);
  var createdAt = sheetDate_(c['登録日時'] || c.createdAt || '');
  return {
    id: id,
    name: String(c['氏名'] || c.name || ''),
    code: code,
    nickname: String(c['ニックネーム'] || c.nickname || ''),
    goal: String(c['目標'] || c.goal || ''),
    notes: String(c['メモ'] || c.notes || ''),
    enrolledAt: enrolledAt || '',
    createdAt: createdAt || String(c['登録日時'] || c.createdAt || ''),
    active:
      String(c['有効'] !== undefined ? c['有効'] : c.active) !== 'FALSE' &&
      String(c['有効'] !== undefined ? c['有効'] : c.active) !== 'false'
  };
}

/** 会員マスタで id が空の行に cli_… を採番して書き戻す */
function ensureClientIds_() {
  var sheet = ss_().getSheetByName(SHEETS.CLIENTS);
  if (!sheet || sheet.getLastRow() < 2) return;
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idIdx = headers.indexOf('id');
  var codeIdx = headers.indexOf('会員番号');
  if (idIdx < 0) return;
  for (var r = 1; r < values.length; r++) {
    var id = String(values[r][idIdx] || '').trim();
    if (id) continue;
    var code = codeIdx >= 0 ? String(values[r][codeIdx] || '').trim() : '';
    if (!code && !String(values[r].join('') || '').trim()) continue;
    sheet.getRange(r + 1, idIdx + 1).setValue(uid_('cli'));
  }
}

function publicClient_(c) {
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    nickname: c.nickname || '',
    goal: c.goal || '',
    notes: c.notes || '',
    enrolledAt: c.enrolledAt || '',
    createdAt: c.createdAt || '',
    active: c.active
  };
}

function findClientByMemberNo_(memberNo) {
  return listClients_().find(function (c) {
    return normalizeMemberNo_(c.code) === normalizeMemberNo_(memberNo);
  });
}

function listAllClientRows_() {
  return sheetValues_(SHEETS.CLIENTS).map(normalizeClient_);
}

function setActiveByMemberNo_(memberNo, active) {
  var sheet = ss_().getSheetByName(SHEETS.CLIENTS);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var codeIdx = headers.indexOf('会員番号');
  var activeIdx = headers.indexOf('有効');
  if (codeIdx < 0 || activeIdx < 0) return false;
  var target = normalizeMemberNo_(memberNo);
  for (var r = 1; r < values.length; r++) {
    if (normalizeMemberNo_(values[r][codeIdx]) === target) {
      sheet.getRange(r + 1, activeIdx + 1).setValue(active ? 'TRUE' : 'FALSE');
      return true;
    }
  }
  return false;
}

function upsertClientInternal_(p) {
  if (!p.name) throw new Error('氏名は必須です');
  var memberNo = assertMemberNo_(p.code);
  var nickname = String(p.nickname || '').trim();
  var enrolledAt = sheetDate_(p.enrolledAt || p['入会日'] || '');
  var now = new Date().toISOString();
  var all = listAllClientRows_();
  var existing = all.find(function (c) {
    return normalizeMemberNo_(c.code) === memberNo;
  });

  if (existing) {
    var patch = {
      '氏名': p.name,
      '会員番号': memberNo,
      '目標': p.goal || existing.goal || '',
      'メモ': p.notes || existing.notes || '',
      '有効': 'TRUE'
    };
    if (p.nickname !== undefined) patch['ニックネーム'] = nickname;
    if (enrolledAt) patch['入会日'] = enrolledAt;
    var updated = updateRowById_(SHEETS.CLIENTS, existing.id, patch);
    if (!updated) throw new Error('会員が見つかりません');
    return normalizeClient_(updated);
  }

  var client = {
    '会員番号': memberNo,
    '氏名': p.name,
    'ニックネーム': nickname,
    '目標': p.goal || '',
    'メモ': p.notes || '',
    id: uid_('cli'),
    '登録日時': now,
    '入会日': enrolledAt || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd'),
    '有効': 'TRUE'
  };
  appendRow_(SHEETS.CLIENTS, client);
  return normalizeClient_(client);
}

/** PTアプリから手打ち追加。メモは必ず PT */
function upsertPtClient_(p) {
  ensureClientEnrolledAtColumn_();
  var name = String(p.name || '').trim();
  if (!name) throw new Error('氏名を入力してください');
  var enrolledAt = sheetDate_(p.enrolledAt || '');
  if (!enrolledAt) throw new Error('入会日を入力してください');
  return publicClient_(
    upsertClientInternal_({
      name: name,
      code: p.code,
      notes: 'PT',
      goal: p.goal || '',
      enrolledAt: enrolledAt
    })
  );
}

/** トレーナーPIN必須。指定メンバーだけ有効にし、それ以外は無効化する */
function adminSyncMembers_(p) {
  var members = p.members || [];
  if (!members.length) throw new Error('members が空です');

  var keep = {};
  var synced = members.map(function (m) {
    var client = upsertClientInternal_(m);
    keep[normalizeMemberNo_(client.code)] = true;
    return client;
  });

  listAllClientRows_().forEach(function (c) {
    var no = normalizeMemberNo_(c.code);
    if (!keep[no]) setActiveByMemberNo_(no, false);
  });

  return listClientsPublic_();
}

function upsertClient_(p) {
  throw new Error('会員の追加・変更はスプレッドシート「会員マスタ」からのみ行えます');
}

function verifyClient_(code) {
  if (!code) return null;
  var memberNo = normalizeMemberNo_(code);
  if (!memberNo) return null;
  var client = findClientByMemberNo_(memberNo);
  if (!client || !client.active) return null;
  return publicClient_(client);
}

function updateNickname_(p) {
  var memberNo = assertMemberNo_(p.code);
  var nickname = String(p.nickname || '').trim();
  if (!nickname) throw new Error('ニックネームを入力してください');
  if (nickname.length > 40) throw new Error('ニックネームは40文字以内にしてください');
  var client = findClientByMemberNo_(memberNo);
  if (!client || !client.active) throw new Error('会員番号が違います');
  var updated = updateRowById_(SHEETS.CLIENTS, client.id, {
    'ニックネーム': nickname
  });
  if (!updated) throw new Error('更新に失敗しました');
  return publicClient_(normalizeClient_(updated));
}

function listWorkouts_(p) {
  var auth = requireMemberOrTrainer_(p);
  var rows = sheetValues_(SHEETS.WORKOUTS).map(normalizeWorkout_);
  if (auth.role === 'member') {
    rows = rows.filter(function (w) {
      return w.clientId === auth.client.id;
    });
  } else if (p.clientId) {
    rows = rows.filter(function (w) {
      return w.clientId === String(p.clientId);
    });
  }
  if (p.mode) {
    rows = rows.filter(function (w) {
      return w.mode === String(p.mode);
    });
  }
  if (p.limit) {
    rows = rows.slice(-Number(p.limit));
  }
  return rows.reverse();
}

function renameCycleToBike_() {
  var sheet = ss_().getSheetByName(SHEETS.EXERCISES);
  if (!sheet || sheet.getLastRow() < 2) return;
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]) === 'サイクル') {
      sheet.getRange(r + 1, 1).setValue('バイク');
    }
  }
}

/** 種目マスタを確定リストで置き換え（アプリ側カタログと同期） */
function replaceExerciseMaster_() {
  var sheet = ss_().getSheetByName(SHEETS.EXERCISES);
  if (!sheet) return;
  sheet.clear();
  sheet.getRange(1, 1, 1, 3).setValues([['name', 'category', 'bodyPart']]);
  sheet.setFrozenRows(1);
  sheet.getRange(2, 1, DEFAULT_EXERCISES.length, 3).setValues(DEFAULT_EXERCISES);
}

function listExercises_() {
  return sheetValues_(SHEETS.EXERCISES)
    .map(function (e) {
      return {
        name: String(e.name || ''),
        category: String(e.category || ''),
        bodyPart: String(e.bodyPart || '')
      };
    })
    .filter(function (e) {
      return e.name;
    });
}

function normalizeWorkout_(w) {
  return {
    id: String(w.id || ''),
    timestamp: String(w.timestamp || ''),
    date: normalizeDate_(w.date),
    clientId: String(w.clientId || ''),
    clientName: String(w.clientName || ''),
    mode: String(w.mode || ''),
    exercise: String(w.exercise || ''),
    minutes: w.minutes === '' || w.minutes === null || w.minutes === undefined ? null : Number(w.minutes),
    weight: w.weight === '' || w.weight === null ? null : Number(w.weight),
    reps: w.reps === '' || w.reps === null ? null : Number(w.reps),
    sets: w.sets === '' || w.sets === null ? null : Number(w.sets),
    rpe: w.rpe === '' || w.rpe === null ? null : Number(w.rpe),
    memo: String(w.memo || ''),
    actor: String(w.actor || '')
  };
}

function normalizeDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy-MM-dd');
  }
  var raw = String(value || '');
  var m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  var parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, 'Asia/Tokyo', 'yyyy-MM-dd');
  }
  return raw;
}

function addWorkout_(p) {
  if (!p.exercise) throw new Error('exercise is required');
  var now = new Date();
  var workout = {
    id: uid_('wo'),
    timestamp: now.toISOString(),
    date: p.date || Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd'),
    clientId: p.clientId || '',
    clientName: p.clientName || '',
    mode: p.mode || 'pt',
    exercise: p.exercise,
    minutes: p.minutes === undefined || p.minutes === '' || p.minutes === null ? '' : Number(p.minutes),
    weight: p.weight === undefined || p.weight === '' ? '' : Number(p.weight),
    reps: p.reps === undefined || p.reps === '' ? '' : Number(p.reps),
    sets: p.sets === undefined || p.sets === '' ? '' : Number(p.sets),
    rpe: p.rpe === undefined || p.rpe === '' ? '' : Number(p.rpe),
    memo: p.memo || '',
    actor: p.actor || ''
  };
  // Sheetsが日付型に変換しないよう文字列として明示
  workout.date = String(workout.date);
  appendRow_(SHEETS.WORKOUTS, workout);
  maybeAddExercise_(p.exercise);
  return normalizeWorkout_(workout);
}

function addWorkouts_(p) {
  var items = p.items || [];
  if (!items.length) throw new Error('items required');
  return items.map(function (item) {
    return addWorkout_({
      date: p.date || item.date,
      clientId: p.clientId || item.clientId,
      clientName: p.clientName || item.clientName,
      mode: p.mode || item.mode,
      actor: p.actor || item.actor,
      exercise: item.exercise,
      minutes: item.minutes,
      weight: item.weight,
      reps: item.reps,
      sets: item.sets,
      rpe: item.rpe,
      memo: item.memo
    });
  });
}

function updateWorkout_(p) {
  if (!p.id) throw new Error('id required');
  var patch = {};
  if (p.exercise !== undefined) patch.exercise = p.exercise;
  if (p.minutes !== undefined) {
    patch.minutes =
      p.minutes === '' || p.minutes === null ? '' : Number(p.minutes);
  }
  if (p.weight !== undefined) {
    patch.weight = p.weight === '' || p.weight === null ? '' : Number(p.weight);
  }
  if (p.reps !== undefined) {
    patch.reps = p.reps === '' || p.reps === null ? '' : Number(p.reps);
  }
  if (p.sets !== undefined) {
    patch.sets = p.sets === '' || p.sets === null ? '' : Number(p.sets);
  }
  if (p.rpe !== undefined) {
    patch.rpe = p.rpe === '' || p.rpe === null ? '' : Number(p.rpe);
  }
  if (p.memo !== undefined) patch.memo = p.memo || '';
  if (p.date !== undefined) patch.date = String(p.date);
  var updated = updateRowById_(SHEETS.WORKOUTS, p.id, patch);
  if (!updated) throw new Error('workout not found');
  return normalizeWorkout_(updated);
}

function deleteRowById_(name, id) {
  var sheet = ss_().getSheetByName(name);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idIdx = headers.indexOf('id');
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][idIdx]) === String(id)) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}

function deleteWorkouts_(p) {
  var ids = p.ids || (p.id ? [p.id] : []);
  if (!ids.length) throw new Error('ids required');
  var count = 0;
  ids.forEach(function (id) {
    if (deleteRowById_(SHEETS.WORKOUTS, id)) count += 1;
  });
  return count;
}

function maybeAddExercise_(name) {
  // 確定リスト以外は追加しない
  var existing = listExercises_();
  var found = existing.some(function (e) {
    return e.name === name;
  });
  if (!found) {
    throw new Error('未登録の種目です。種目リストから選択してください: ' + name);
  }
}

function listMenus_(p) {
  var rows = sheetValues_(SHEETS.MENUS).map(normalizeMenu_);
  if (p.clientId) {
    rows = rows.filter(function (m) {
      return m.clientId === String(p.clientId);
    });
  }
  return rows.reverse();
}

function normalizeMenu_(m) {
  var items = [];
  try {
    items = m.itemsJson ? JSON.parse(m.itemsJson) : [];
  } catch (err) {
    items = [];
  }
  return {
    id: String(m.id || ''),
    clientId: String(m.clientId || ''),
    clientName: String(m.clientName || ''),
    title: String(m.title || ''),
    shareToken: String(m.shareToken || ''),
    items: items,
    notes: String(m.notes || ''),
    updatedAt: String(m.updatedAt || ''),
    published: String(m.published) !== 'FALSE' && String(m.published) !== 'false'
  };
}

function upsertMenu_(p) {
  if (!p.title) throw new Error('title is required');
  var now = new Date().toISOString();
  var itemsJson = JSON.stringify(p.items || []);
  if (p.id) {
    var updated = updateRowById_(SHEETS.MENUS, p.id, {
      clientId: p.clientId || '',
      clientName: p.clientName || '',
      title: p.title,
      itemsJson: itemsJson,
      notes: p.notes || '',
      updatedAt: now,
      published: p.published === false ? 'FALSE' : 'TRUE'
    });
    if (!updated) throw new Error('menu not found');
    return normalizeMenu_(updated);
  }
  var menu = {
    id: uid_('menu'),
    clientId: p.clientId || '',
    clientName: p.clientName || '',
    title: p.title,
    shareToken: uid_('shr').replace(/_/g, '').slice(0, 16),
    itemsJson: itemsJson,
    notes: p.notes || '',
    updatedAt: now,
    published: 'TRUE'
  };
  appendRow_(SHEETS.MENUS, menu);
  return normalizeMenu_(menu);
}

function getMenuByToken_(token) {
  if (!token) throw new Error('token required');
  var found = sheetValues_(SHEETS.MENUS).find(function (m) {
    return String(m.shareToken) === String(token);
  });
  if (!found) throw new Error('menu not found');
  return normalizeMenu_(found);
}

function verifyTrainer_(pin) {
  var rows = sheetValues_(SHEETS.CONFIG);
  var row = rows.find(function (r) {
    return String(r.key) === 'trainerPin';
  });
  var expected = row ? String(row.value) : '2468';
  return String(pin) === expected;
}

function normalizePtSession_(row) {
  var exercises = [];
  try {
    exercises = JSON.parse(String(row.exercisesJson || '[]'));
    if (!Array.isArray(exercises)) exercises = [];
  } catch (e) {
    exercises = [];
  }
  return {
    id: String(row.id || ''),
    clientId: String(row.clientId || ''),
    clientName: String(row.clientName || ''),
    sessionNo: Number(row.sessionNo) || 0,
    exercises: exercises,
    memo: String(row.memo || ''),
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || '')
  };
}

function listPtSessions_(p) {
  var clientId = String(p.clientId || '');
  if (!clientId) throw new Error('clientId required');
  var aliases = clientIdAliases_(clientId);
  return sheetValues_(SHEETS.PT_SESSIONS)
    .map(normalizePtSession_)
    .filter(function (s) {
      return aliases.indexOf(s.clientId) >= 0;
    })
    .sort(function (a, b) {
      return a.sessionNo - b.sessionNo;
    });
}

/** id / 会員番号のどちらで来ても突き合わせられるようにする */
function clientIdAliases_(key) {
  var k = String(key || '').trim();
  var set = {};
  if (k) set[k] = true;
  listClients_().forEach(function (c) {
    if (c.id === k || c.code === k) {
      if (c.id) set[c.id] = true;
      if (c.code) set[c.code] = true;
    }
  });
  return Object.keys(set);
}

function nextPtSessionNo_(clientId) {
  var max = 0;
  listPtSessions_({ clientId: clientId }).forEach(function (s) {
    if (s.sessionNo > max) max = s.sessionNo;
  });
  return max + 1;
}

function upsertPtSession_(p) {
  var clientId = String(p.clientId || '');
  var clientName = String(p.clientName || '');
  if (!clientId) throw new Error('clientId required');
  var exercises = Array.isArray(p.exercises) ? p.exercises : [];
  var memo = String(p.memo || '');
  var now = new Date().toISOString();

  if (p.id) {
    var existing = sheetValues_(SHEETS.PT_SESSIONS).find(function (r) {
      return String(r.id) === String(p.id);
    });
    if (!existing) throw new Error('session not found');
    var updated = updateRowById_(SHEETS.PT_SESSIONS, p.id, {
      clientId: clientId,
      clientName: clientName || existing.clientName,
      sessionNo: Number(p.sessionNo) || Number(existing.sessionNo) || 1,
      exercisesJson: JSON.stringify(exercises),
      memo: memo,
      updatedAt: now
    });
    if (!updated) throw new Error('更新に失敗しました');
    return normalizePtSession_(updated);
  }

  var sessionNo = Number(p.sessionNo) || nextPtSessionNo_(clientId);
  var row = {
    id: uid_('pts'),
    clientId: clientId,
    clientName: clientName,
    sessionNo: sessionNo,
    exercisesJson: JSON.stringify(exercises),
    memo: memo,
    createdAt: now,
    updatedAt: now
  };
  appendRow_(SHEETS.PT_SESSIONS, row);
  return normalizePtSession_(row);
}

function deletePtSession_(p) {
  var id = String(p.id || '');
  if (!id) throw new Error('id required');
  if (!deleteRowById_(SHEETS.PT_SESSIONS, id)) throw new Error('session not found');
  return 1;
}
