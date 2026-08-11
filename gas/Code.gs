/**
 * PT RYUTA — Google Apps Script API
 * Spreadsheet をデータストアとして、トレーナー/顧客の記録・メニューを管理する。
 */

var SPREADSHEET_ID = '1jBDb9MmwoACaEkTYEzo4mGchsDSiyTJT1q5P9TT1p08';
var SHEETS = {
  CONFIG: 'Config',
  CLIENTS: 'Clients',
  WORKOUTS: 'Workouts',
  MENUS: 'Menus',
  EXERCISES: 'Exercises'
};

var DEFAULT_EXERCISES = [
  ['トレッドミル', '有酸素'],
  ['クロストレーナー', '有酸素'],
  ['サイクル', '有酸素'],
  ['チェストプレス', 'マシン'],
  ['ショルダープレス', 'マシン'],
  ['ラットプルダウン', 'マシン'],
  ['ローイング', 'マシン'],
  ['レッグプレス', 'マシン'],
  ['レッグエクステンション', 'マシン'],
  ['レッグカール', 'マシン'],
  ['アブドミナル', 'マシン'],
  ['バックエクステンション', 'マシン'],
  ['ペックフライ', 'マシン'],
  ['リアデルト', 'マシン'],
  ['アブダクション', 'マシン'],
  ['アダクション', 'マシン'],
  ['カーフレイズ', 'マシン'],
  ['マルチジャングル', 'マシン'],
  ['パワーラック', 'フリーウェイト'],
  ['スミスマシン', 'フリーウェイト'],
  ['ダンベルベンチプレス', 'フリーウェイト'],
  ['スクワット', 'フリーウェイト'],
  ['デッドリフト', 'フリーウェイト'],
  ['ベンチプレス', 'フリーウェイト'],
  ['オーバーヘッドプレス', 'フリーウェイト'],
  ['バーベルロウ', 'フリーウェイト'],
  ['ケーブルクロス', 'フリーウェイト'],
  ['ケトルベルスイング', 'フリーウェイト']
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
        result = { ok: true, clients: listClients_() };
        break;
      case 'upsertClient':
        result = { ok: true, client: upsertClient_(payload) };
        break;
      case 'listWorkouts':
        result = { ok: true, workouts: listWorkouts_(payload) };
        break;
      case 'addWorkout':
        result = { ok: true, workout: addWorkout_(payload) };
        break;
      case 'addWorkouts':
        result = { ok: true, workouts: addWorkouts_(payload) };
        break;
      case 'listMenus':
        result = { ok: true, menus: listMenus_(payload) };
        break;
      case 'upsertMenu':
        result = { ok: true, menu: upsertMenu_(payload) };
        break;
      case 'getMenuByToken':
        result = { ok: true, menu: getMenuByToken_(payload.token) };
        break;
      case 'listExercises':
        result = { ok: true, exercises: listExercises_() };
        break;
      case 'verifyTrainer':
        result = { ok: true, valid: verifyTrainer_(payload.pin) };
        break;
      case 'verifyClient':
        result = { ok: true, client: verifyClient_(payload.code) };
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
    'id',
    'name',
    'code',
    'goal',
    'notes',
    'createdAt',
    'active'
  ]);
  ensureSheet_(ss, SHEETS.WORKOUTS, [
    'id',
    'timestamp',
    'date',
    'clientId',
    'clientName',
    'mode',
    'exercise',
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
  ensureSheet_(ss, SHEETS.EXERCISES, ['name', 'category'], DEFAULT_EXERCISES);
}

function ensureSheet_(ss, name, headers, seedRows) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var needsHeader =
    sheet.getLastRow() === 0 ||
    String(existing[0] || '') !== headers[0];
  if (needsHeader) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    if (seedRows && seedRows.length) {
      sheet.getRange(2, 1, seedRows.length, headers.length).setValues(seedRows);
    }
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

function listClients_() {
  return sheetValues_(SHEETS.CLIENTS)
    .filter(function (c) {
      return String(c.active) !== 'FALSE' && String(c.active) !== 'false';
    })
    .map(normalizeClient_);
}

function normalizeClient_(c) {
  return {
    id: String(c.id || ''),
    name: String(c.name || ''),
    code: String(c.code || ''),
    goal: String(c.goal || ''),
    notes: String(c.notes || ''),
    createdAt: String(c.createdAt || ''),
    active: String(c.active) !== 'FALSE' && String(c.active) !== 'false'
  };
}

function upsertClient_(p) {
  if (!p.name) throw new Error('name is required');
  var now = new Date().toISOString();
  if (p.id) {
    var updated = updateRowById_(SHEETS.CLIENTS, p.id, {
      name: p.name,
      code: p.code || '',
      goal: p.goal || '',
      notes: p.notes || '',
      active: p.active === false ? 'FALSE' : 'TRUE'
    });
    if (!updated) throw new Error('client not found');
    return normalizeClient_(updated);
  }
  var client = {
    id: uid_('cli'),
    name: p.name,
    code: p.code || randomCode_(),
    goal: p.goal || '',
    notes: p.notes || '',
    createdAt: now,
    active: 'TRUE'
  };
  appendRow_(SHEETS.CLIENTS, client);
  return normalizeClient_(client);
}

function randomCode_() {
  var n = Math.floor(Math.random() * 9000) + 1000;
  return String(n);
}

function listWorkouts_(p) {
  var rows = sheetValues_(SHEETS.WORKOUTS).map(normalizeWorkout_);
  if (p.clientId) {
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

function normalizeWorkout_(w) {
  return {
    id: String(w.id || ''),
    timestamp: String(w.timestamp || ''),
    date: String(w.date || ''),
    clientId: String(w.clientId || ''),
    clientName: String(w.clientName || ''),
    mode: String(w.mode || ''),
    exercise: String(w.exercise || ''),
    weight: w.weight === '' || w.weight === null ? null : Number(w.weight),
    reps: w.reps === '' || w.reps === null ? null : Number(w.reps),
    sets: w.sets === '' || w.sets === null ? null : Number(w.sets),
    rpe: w.rpe === '' || w.rpe === null ? null : Number(w.rpe),
    memo: String(w.memo || ''),
    actor: String(w.actor || '')
  };
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
    weight: p.weight === undefined || p.weight === '' ? '' : Number(p.weight),
    reps: p.reps === undefined || p.reps === '' ? '' : Number(p.reps),
    sets: p.sets === undefined || p.sets === '' ? '' : Number(p.sets),
    rpe: p.rpe === undefined || p.rpe === '' ? '' : Number(p.rpe),
    memo: p.memo || '',
    actor: p.actor || ''
  };
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
      weight: item.weight,
      reps: item.reps,
      sets: item.sets,
      rpe: item.rpe,
      memo: item.memo
    });
  });
}

function maybeAddExercise_(name) {
  var existing = listExercises_();
  var found = existing.some(function (e) {
    return e.name === name;
  });
  if (!found) {
    appendRow_(SHEETS.EXERCISES, { name: name, category: 'カスタム' });
  }
}

function listExercises_() {
  return sheetValues_(SHEETS.EXERCISES).map(function (e) {
    return { name: String(e.name || ''), category: String(e.category || '') };
  }).filter(function (e) {
    return e.name;
  });
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

function verifyClient_(code) {
  if (!code) return null;
  var client = listClients_().find(function (c) {
    return c.code === String(code);
  });
  return client || null;
}
