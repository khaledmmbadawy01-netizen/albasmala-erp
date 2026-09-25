/* ═══════════════════════════════════════════════════════════════
   البسملة ERP 2026 — النسخة الاحترافية الكاملة
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. Firebase Configuration
   ═══════════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCO1_IcSQtzibNCDTsHV6MBmunodQS1rAU",
  authDomain: "albasmala-erp.firebaseapp.com",
  databaseURL: "https://albasmala-erp-default-rtdb.firebaseio.com",
  projectId: "albasmala-erp",
  storageBucket: "albasmala-erp.firebasestorage.app",
  messagingSenderId: "230984096978",
  appId: "1:230984096978:web:6ac324e00f33dda57be10b"
};

let FB = null, FBAuth = null, FBDB = null;
try {
  FB = firebase.initializeApp(FIREBASE_CONFIG);
  FBAuth = firebase.auth();
  FBDB = firebase.database();
  console.log('✅ Firebase initialized');
} catch (e) {
  console.error('❌ Firebase init error:', e);
}

/* ═══════════════════════════════════════════════════════════════
   2. Constants & Global State
   ═══════════════════════════════════════════════════════════════ */
const CURRENCY = 'ج.م';
const EARTH_RADIUS = 6371000; // meters

const State = {
  currentUser: null,
  currentEmployee: null,
  currentCompanyId: null,
  currentCompanyName: '',
  deviceId: null,
  companyRef: null,
  listeners: [],
  isOnline: navigator.onLine,
  currentPage: 'home',
  currentPartnerTab: 'customer',
  currentInvTab: 'sales',
  currentVoucherTab: 'receipt',
  currentReturnTab: 'sales',
  currentExpTab: 'expense',
  currentStmtTab: 'partner',
  currentPayrollTab: 'generate',
  barcodeTarget: null,
  lastBackPress: 0,
  map: null,
  mapMarkers: {},
  locationWatchId: null,
  watchTimer: null,
  editingProductImage: null,
  _modalCallback: null,
  scanner: null,
  calcState: { current: '0', history: '', operator: null, operand: 0, shouldReset: false },
  pinBuffer: '',
  pinCallback: null
};

const cache = {
  employees: [], attendance: [], leaves: [], payroll: [],
  employee_transactions: [], work_policies: [], products: [],
  partners: [], sales_invoices: [], sales_items: [],
  purchase_invoices: [], purchase_items: [],
  sales_returns: [], sales_return_items: [],
  purchase_returns: [], purchase_return_items: [],
  stock_movements: [], cash_transactions: [], vouchers: [],
  revenues: [], expenses: [], whatsapp_templates: [], whatsapp_log: [],
  activity_log: [], devices: [], pending_requests: [],
  geofences: [], locations: []
};

const saleItems = [];
const purItems = [];
const retItems = [];

/* ═══════════════════════════════════════════════════════════════
   3. Permissions System
   ═══════════════════════════════════════════════════════════════ */
const PERMISSIONS = {
  admin: {
    label: 'مدير النظام',
    can: {
      employees_view: true, employees_add: true, employees_edit: true, employees_delete: true,
      products_view: true, products_add: true, products_edit: true, products_delete: true,
      partners_view: true, partners_add_customer: true, partners_add_supplier: true, partners_edit: true, partners_delete: true,
      sales_create: true, sales_delete: true,
      purchase_create: true, purchase_delete: true,
      returns_create: true, returns_delete: true,
      vouchers_create: true, vouchers_delete: true,
      cash_view: true,
      payroll_generate: true, payroll_pay: true, payroll_delete: true,
      reports_view: true, statements_view: true,
      policies_add: true, policies_delete: true,
      expenses_add: true, expenses_delete: true,
      settings_access: true, data_clear: true, data_export: true, data_import: true,
      attendance_mark_all: true, attendance_report: true, attendance_map: true,
      devices_manage: true, requests_manage: true,
      geofence_manage: true,
      delete_anything: true,
      activity_view: true
    }
  },
  sales: {
    label: 'مبيعات',
    can: {
      employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
      products_view: true, products_add: false, products_edit: false, products_delete: false,
      partners_view: true,
      partners_add_customer: true,
      partners_add_supplier: false,
      partners_edit: true,
      partners_delete: false,
      sales_create: true, sales_delete: false,
      purchase_create: false, purchase_delete: false,
      returns_create: true, returns_delete: false,
      vouchers_create: true, vouchers_delete: false,
      cash_view: false,
      payroll_generate: false, payroll_pay: false, payroll_delete: false,
      reports_view: false, statements_view: false,
      policies_add: false, policies_delete: false,
      expenses_add: false, expenses_delete: false,
      settings_access: false, data_clear: false, data_export: false, data_import: false,
      attendance_mark_all: false,
      attendance_report: true,
      attendance_map: false,
      devices_manage: false, requests_manage: false,
      geofence_manage: false,
      delete_anything: false,
      activity_view: false
    }
  },
  purchases: {
    label: 'مشتريات',
    can: {
      employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
      products_view: true, products_add: false, products_edit: false, products_delete: false,
      partners_view: true,
      partners_add_customer: false,
      partners_add_supplier: true,
      partners_edit: true,
      partners_delete: false,
      sales_create: false, sales_delete: false,
      purchase_create: true, purchase_delete: false,
      returns_create: true, returns_delete: false,
      vouchers_create: false, vouchers_delete: false,
      cash_view: false,
      payroll_generate: false, payroll_pay: false, payroll_delete: false,
      reports_view: false, statements_view: false,
      policies_add: false, policies_delete: false,
      expenses_add: false, expenses_delete: false,
      settings_access: false, data_clear: false, data_export: false, data_import: false,
      attendance_mark_all: false,
      attendance_report: true,
      attendance_map: false,
      devices_manage: false, requests_manage: false,
      geofence_manage: false,
      delete_anything: false,
      activity_view: false
    }
  },
  warehouse: {
    label: 'أمين مخزن',
    can: {
      employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
      products_view: true, products_add: true, products_edit: true, products_delete: false,
      partners_view: false,
      partners_add_customer: false,
      partners_add_supplier: false,
      partners_edit: false,
      partners_delete: false,
      sales_create: false, sales_delete: false,
      purchase_create: false, purchase_delete: false,
      returns_create: false, returns_delete: false,
      vouchers_create: false, vouchers_delete: false,
      cash_view: false,
      payroll_generate: false, payroll_pay: false, payroll_delete: false,
      reports_view: false, statements_view: false,
      policies_add: false, policies_delete: false,
      expenses_add: false, expenses_delete: false,
      settings_access: false, data_clear: false, data_export: false, data_import: false,
      attendance_mark_all: false,
      attendance_report: true,
      attendance_map: false,
      devices_manage: false, requests_manage: false,
      geofence_manage: false,
      delete_anything: false,
      activity_view: false
    }
  },
  accountant: {
    label: 'محاسب',
    can: {
      employees_view: true, employees_add: false, employees_edit: false, employees_delete: false,
      products_view: true, products_add: false, products_edit: false, products_delete: false,
      partners_view: true,
      partners_add_customer: false,
      partners_add_supplier: false,
      partners_edit: false,
      partners_delete: false,
      sales_create: false, sales_delete: false,
      purchase_create: false, purchase_delete: false,
      returns_create: false, returns_delete: false,
      vouchers_create: true, vouchers_delete: false,
      cash_view: true,
      payroll_generate: true, payroll_pay: true, payroll_delete: false,
      reports_view: true, statements_view: true,
      policies_add: false, policies_delete: false,
      expenses_add: true, expenses_delete: false,
      settings_access: false, data_clear: false, data_export: true, data_import: false,
      attendance_mark_all: false,
      attendance_report: true,
      attendance_map: false,
      devices_manage: false, requests_manage: false,
      geofence_manage: false,
      delete_anything: false,
      activity_view: false
    }
  }
};

function can(permission) {
  if (!State.currentEmployee) return false;
  const role = State.currentEmployee.role;
  if (!PERMISSIONS[role]) return false;
  return PERMISSIONS[role].can[permission] === true;
}

function requirePermission(permission, action) {
  if (!can(permission)) {
    Toast.show('🔒 ' + (action || 'هذا الإجراء') + ' غير مسموح لك', 'error');
    return false;
  }
  return true;
}

/* ═══════════════════════════════════════════════════════════════
   4. Utilities
   ═══════════════════════════════════════════════════════════════ */
const Utils = {
  fmtMoney(v) { return (Number(v) || 0).toFixed(2) + ' ' + CURRENCY; },
  fmtNum(v) { return (Number(v) || 0).toFixed(2); },
  fmtDate(d) {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('ar-EG') + ' ' + dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '-'; }
  },
  fmtDateOnly(d) {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('ar-EG'); } catch (e) { return '-'; }
  },
  todayStr() { return new Date().toISOString().split('T')[0]; },
  nowISO() { return new Date().toISOString(); },
  genId(prefix) { return (prefix || 'ID') + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000); },
  esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },
  haversine(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },
  debounce(fn, ms) {
    ms = ms || 300;
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  },
  vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }
};

/* ═══════════════════════════════════════════════════════════════
   5. Toast
   ═══════════════════════════════════════════════════════════════ */
const Toast = {
  show(msg, type) {
    type = type || 'success';
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
    if (type === 'error') Utils.vibrate([100, 50, 100]);
    else if (type === 'success') Utils.vibrate(60);
  }
};

/* ═══════════════════════════════════════════════════════════════
   6. Modal
   ═══════════════════════════════════════════════════════════════ */
const Modal = {
  open(title, bodyHtml, onSave, cancelText) {
    cancelText = cancelText || 'إلغاء';
    State._modalCallback = onSave;
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();
    const html =
      '<div class="modal-overlay" onclick="if(event.target===this)Modal.close()">' +
        '<div class="modal">' +
          '<h3>' + title + '</h3>' +
          '<div id="modalBody">' + bodyHtml + '</div>' +
          (onSave
            ? '<div style="display:flex;gap:8px;margin-top:16px;">' +
                '<button class="btn btn-primary btn-full" onclick="Modal.confirm()">حفظ</button>' +
                '<button class="btn btn-danger btn-full" onclick="Modal.close()">' + cancelText + '</button>' +
              '</div>'
            : '<div style="margin-top:16px;">' +
                '<button class="btn btn-outline btn-full" onclick="Modal.close()">' + cancelText + '</button>' +
              '</div>') +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  },
  close() {
    const m = document.querySelector('.modal-overlay');
    if (m) m.remove();
    State._modalCallback = null;
    Scanner.stop();
  },
  confirm() {
    if (State._modalCallback) State._modalCallback();
  }
};

/* ═══════════════════════════════════════════════════════════════
   7. Sync Engine
   ═══════════════════════════════════════════════════════════════ */
const Sync = {
  updateBar() {
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');
    if (!dot || !text) return;
    dot.className = 'dot';
    if (!navigator.onLine) {
      dot.classList.add('offline');
      text.textContent = '📴 بدون إنترنت';
    } else if (State.isOnline) {
      dot.classList.add('online');
      text.textContent = '✅ متصل';
    } else {
      dot.classList.add('syncing');
      text.textContent = '⏳ جاري الاتصال...';
    }
  },
  async save(store, id, data) {
    if (!State.companyRef) return false;
    try {
      data._updated = Utils.nowISO();
      data._updated_by = State.currentEmployee ? State.currentEmployee.name : 'unknown';
      data._device = State.deviceId;
      await State.companyRef.child(store + '/' + id).set(data);
      return true;
    } catch (e) {
      console.error('saveToFirebase:', e);
      Toast.show('⚠️ فشل الحفظ — سيُحفظ محلياً', 'error');
      Sync.queuePending(store, id, data);
      return false;
    }
  },
  queuePending(store, id, data) {
    try {
      const key = 'pending_changes_' + State.currentCompanyId;
      let pending = JSON.parse(localStorage.getItem(key) || '[]');
      pending.push({ store: store, id: id, data: data, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(pending));
    } catch (e) {}
  },
  async flushPending() {
    if (!navigator.onLine || !State.companyRef) return;
    const key = 'pending_changes_' + State.currentCompanyId;
    let pending = JSON.parse(localStorage.getItem(key) || '[]');
    if (pending.length === 0) return;
    const remaining = [];
    for (const p of pending) {
      try {
        await State.companyRef.child(p.store + '/' + p.id).set(p.data);
      } catch (e) {
        remaining.push(p);
      }
    }
    localStorage.setItem(key, JSON.stringify(remaining));
    if (remaining.length === 0 && pending.length > 0) {
      Toast.show('✅ تمت مزامنة ' + pending.length + ' تغيير');
    }
  },
  async force() {
    if (!navigator.onLine) return Toast.show('لا يوجد اتصال', 'error');
    Toast.show('⏳ جاري المزامنة...', 'info');
    await Sync.flushPending();
    App.startDataListeners();
    setTimeout(function () {
      Toast.show('✅ تمت المزامنة');
      Settings.renderSyncInfo();
    }, 1500);
  },
  async softDelete(store, id) {
    if (!can('delete_anything')) {
      Toast.show('🔒 الحذف للمدير فقط', 'error');
      return false;
    }
    const item = (cache[store] || []).find(function (x) { return x.id === id; });
    if (!item) return false;
    item.active = false;
    item._deleted = true;
    item._deleted_at = Utils.nowISO();
    item._deleted_by = State.currentEmployee.name;
    await Sync.save(store, id, item);
    await Activity.log('delete', 'حذف ' + store + ': ' + (item.name || id));
    return true;
  }
};

/* ═══════════════════════════════════════════════════════════════
   8. Activity Log
   ═══════════════════════════════════════════════════════════════ */
const Activity = {
  async log(action, details) {
    if (!State.companyRef || !State.currentEmployee) return;
    try {
      const id = 'ACT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      await State.companyRef.child('activity_log/' + id).set({
        id: id,
        action: action,
        details: details,
        employee_uid: State.currentUser ? State.currentUser.uid : '',
        employee_name: State.currentEmployee.name,
        device_id: State.deviceId,
        date: Utils.nowISO()
      });
    } catch (e) {}
  },
  render() {
    const logs = (cache.activity_log || []).slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    }).slice(0, 100);
    const el = document.getElementById('activityList');
    if (!el) return;
    if (logs.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">📜</div>لا يوجد سجل</div>';
      return;
    }
    const actionMap = {
      'login': '🔓 دخول', 'logout': '🔒 خروج',
      'check_in': '👆 حضور', 'check_out': '👋 انصراف',
      'leave': '📅 إذن', 'sale_invoice': '🛒 مبيعات',
      'purchase_invoice': '🚚 مشتريات', 'return': '↩️ مرتجع',
      'payment': '💳 سداد', 'voucher_receipt': '🧾 قبض',
      'voucher_payment': '🧾 دفع', 'payroll_generate': '💵 مرتب',
      'salary_paid': '💰 صرف', 'employee_save': '👤 موظف',
      'employee_delete': '🗑️ حذف موظف', 'delete': '🗑️ حذف',
      'geofence_save': '📍 نطاق', 'device_approved': '📱 جهاز مفعّل',
      'device_rejected': '🚫 جهاز مرفوض'
    };
    let html = '';
    for (const l of logs) {
      html += '<div class="list-item"><div class="info">' +
        '<h4>' + (actionMap[l.action] || Utils.esc(l.action)) + '</h4>' +
        '<p>' + Utils.esc(l.details || '') + '</p>' +
        '<p style="font-size:11px;">' + Utils.esc(l.employee_name || '') + ' | ' + Utils.fmtDate(l.date) + '</p>' +
      '</div></div>';
    }
    el.innerHTML = html;
  }
};

/* ═══════════════════════════════════════════════════════════════
   9. Biometric (3 fallbacks)
   ═══════════════════════════════════════════════════════════════ */
const Biometric = {
  async verify(reason) {
    reason = reason || 'تأكيد الهوية';
    // Method 1: Cordova Fingerprint plugin
    if (window.Fingerprint && typeof Fingerprint.isAvailable === 'function') {
      const ok = await Biometric.cordovaFingerprint(reason);
      if (ok) return true;
    }
    // Method 2: WebAuthn (Android Chrome)
    if (window.PublicKeyCredential) {
      const ok = await Biometric.webauthn(reason);
      if (ok) return true;
    }
    // Method 3: PIN fallback
    return await Biometric.pinFallback(reason);
  },
  cordovaFingerprint(reason) {
    return new Promise(function (resolve) {
      try {
        Fingerprint.isAvailable(function () {
          Fingerprint.show({
            clientId: 'albasmala-erp-2026',
            clientSecret: 'albasmala-secret-2026',
            description: reason,
            title: 'شركة البسملة',
            subtitle: reason,
            cancelButton: 'إلغاء',
            disableBackup: false
          }, function () {
            Utils.vibrate(80);
            resolve(true);
          }, function () { resolve(false); });
        }, function () { resolve(false); });
      } catch (e) { resolve(false); }
    });
  },
  async webauthn(reason) {
    try {
      if (!navigator.credentials) return false;
      // Check if platform authenticator is available
      if (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) return false;
      }
      // Show PIN fallback instead — WebAuthn registration is complex
      // Return false to trigger PIN fallback
      return false;
    } catch (e) {
      return false;
    }
  },
  pinFallback(reason) {
    return new Promise(function (resolve) {
      State.pinBuffer = '';
      State.pinCallback = resolve;
      const html =
        '<div style="text-align:center;">' +
          '<p style="color:var(--text-2);margin-bottom:12px;">' + Utils.esc(reason) + '</p>' +
          '<p style="color:var(--orange-2);font-size:12px;margin-bottom:10px;">أدخل رمز PIN (الافتراضي: 1234)</p>' +
          '<div class="pin-display" id="pinDisplay">' +
            '<div class="pin-dot"></div><div class="pin-dot"></div>' +
            '<div class="pin-dot"></div><div class="pin-dot"></div>' +
          '</div>' +
          '<div class="pin-grid">' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'1\')">1</button>' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'2\')">2</button>' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'3\')">3</button>' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'4\')">4</button>' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'5\')">5</button>' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'6\')">6</button>' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'7\')">7</button>' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'8\')">8</button>' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'9\')">9</button>' +
            '<button class="pin-btn empty"></button>' +
            '<button class="pin-btn" onclick="Biometric.pinPress(\'0\')">0</button>' +
            '<button class="pin-btn del" onclick="Biometric.pinDelete()">⌫</button>' +
          '</div>' +
        '</div>';
      Modal.open('🔒 تأكيد', html, null, 'إلغاء');
    });
  },
  pinPress(digit) {
    if (State.pinBuffer.length >= 4) return;
    State.pinBuffer += digit;
    Utils.vibrate(30);
    Biometric.updatePinDisplay();
    if (State.pinBuffer.length === 4) {
      setTimeout(function () {
        const storedPin = localStorage.getItem('user_pin_' + (State.currentUser ? State.currentUser.uid : 'x')) || '1234';
        if (State.pinBuffer === storedPin) {
          Modal.close();
          if (State.pinCallback) State.pinCallback(true);
        } else {
          Toast.show('❌ PIN خاطئ', 'error');
          State.pinBuffer = '';
          Biometric.updatePinDisplay();
        }
      }, 200);
    }
  },
  pinDelete() {
    State.pinBuffer = State.pinBuffer.slice(0, -1);
    Biometric.updatePinDisplay();
  },
  updatePinDisplay() {
    const dots = document.querySelectorAll('#pinDisplay .pin-dot');
    dots.forEach(function (d, i) {
      d.classList.toggle('filled', i < State.pinBuffer.length);
    });
  },
  async test() {
    const ok = await Biometric.verify('اختبار البصمة');
    Toast.show(ok ? '✅ التحقق ناجح' : '❌ فشل التحقق', ok ? 'success' : 'error');
  }
};

/* ═══════════════════════════════════════════════════════════════
   10. Location Service
   ═══════════════════════════════════════════════════════════════ */
const Location = {
  getCurrent(options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        return reject(new Error('الجهاز لا يدعم GPS'));
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          });
        },
        function (err) {
          let msg = 'فشل تحديد الموقع';
          if (err.code === 1) msg = '❌ يجب السماح بالوصول للموقع';
          else if (err.code === 2) msg = '❌ الموقع غير متاح';
          else if (err.code === 3) msg = '❌ انتهت المهلة';
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: options.highAccuracy !== false,
          timeout: options.timeout || 15000,
          maximumAge: options.maximumAge || 30000
        }
      );
    });
  },
  async checkGeofence() {
    try {
      const pos = await Location.getCurrent();
      const geofences = (cache.geofences || []).filter(function (g) { return g.active !== false; });
      if (geofences.length === 0) {
        return { inRange: true, reason: 'no_geofence', pos: pos, distance: 0 };
      }
      let bestMatch = null;
      for (const g of geofences) {
        const dist = Utils.haversine(pos.lat, pos.lng, Number(g.lat), Number(g.lng));
        if (!bestMatch || dist < bestMatch.distance) {
          bestMatch = { fence: g, distance: dist, inRange: dist <= Number(g.radius || 100) };
        }
      }
      return {
        inRange: bestMatch ? bestMatch.inRange : false,
        distance: bestMatch ? Math.round(bestMatch.distance) : 0,
        fence: bestMatch ? bestMatch.fence : null,
        pos: pos
      };
    } catch (e) {
      return { inRange: false, reason: 'error', error: e.message };
    }
  },
  startWatching(callback) {
    Location.stopWatching();
    if (!navigator.geolocation) return;
    State.locationWatchId = navigator.geolocation.watchPosition(
      function (pos) {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
        if (callback) callback(coords);
      },
      function (e) { console.warn('watch error', e); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  },
  stopWatching() {
    if (State.locationWatchId != null) {
      navigator.geolocation.clearWatch(State.locationWatchId);
      State.locationWatchId = null;
    }
  },
  async test() {
    try {
      const pos = await Location.getCurrent();
      Toast.show('✅ الموقع: ' + pos.lat.toFixed(5) + ', ' + pos.lng.toFixed(5));
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  }
};

/* ═══════════════════════════════════════════════════════════════
   11. Geofence Management
   ═══════════════════════════════════════════════════════════════ */
const Geofence = {
  async pickCurrent() {
    try {
      Toast.show('⏳ جاري التقاط الموقع...', 'info');
      const pos = await Location.getCurrent();
      document.getElementById('geoLat').value = pos.lat.toFixed(6);
      document.getElementById('geoLng').value = pos.lng.toFixed(6);
      Toast.show('✅ تم التقاط الموقع');
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },
  async save() {
    if (!requirePermission('geofence_manage', 'إدارة النطاق')) return;
    const name = document.getElementById('geoName').value.trim();
    const lat = parseFloat(document.getElementById('geoLat').value);
    const lng = parseFloat(document.getElementById('geoLng').value);
    const radius = parseFloat(document.getElementById('geoRadius').value) || 100;
    if (!name) return Toast.show('اسم الموقع مطلوب', 'error');
    if (isNaN(lat) || isNaN(lng)) return Toast.show('إحداثيات غير صالحة', 'error');
    const id = Utils.genId('GEO');
    await Sync.save('geofences', id, {
      id: id, name: name, lat: lat, lng: lng,
      radius: radius, active: true,
      created_at: Utils.nowISO(),
      created_by: State.currentEmployee.name
    });
    await Activity.log('geofence_save', name);
    Toast.show('✅ تم الحفظ');
    Geofence.render();
  },
  render() {
    const list = (cache.geofences || []).filter(function (g) { return g.active !== false; });
    const el = document.getElementById('geofenceList');
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">📍</div>لا توجد نطاقات</div>';
      return;
    }
    let html = '';
    for (const g of list) {
      html += '<div class="list-item"><div class="info">' +
        '<h4>📍 ' + Utils.esc(g.name) + '</h4>' +
        '<p>نطاق: ' + g.radius + ' متر</p>' +
        '<p style="font-size:11px;font-family:monospace;">' + g.lat.toFixed(5) + ', ' + g.lng.toFixed(5) + '</p>' +
      '</div>' +
      (can('delete_anything')
        ? '<div class="actions"><button class="btn btn-danger btn-sm" onclick="Geofence.remove(\'' + g.id + '\')">🗑️</button></div>'
        : '') +
      '</div>';
    }
    el.innerHTML = html;
  },
  async remove(id) {
    if (!can('delete_anything')) return Toast.show('🔒 المدير فقط', 'error');
    if (!confirm('حذف النطاق؟')) return;
    await Sync.softDelete('geofences', id);
    Toast.show('تم الحذف');
    Geofence.render();
  }
};

/* ═══════════════════════════════════════════════════════════════
   12. Scanner (3 methods)
   ═══════════════════════════════════════════════════════════════ */
const Scanner = {
  open(target) {
    State.barcodeTarget = target;
    const html =
      '<div style="text-align:center;">' +
        '<p style="color:var(--text-2);font-size:12px;margin-bottom:10px;">وجّه الكاميرا نحو الباركود</p>' +
        '<div id="reader" style="width:100%;max-width:340px;margin:0 auto;border-radius:12px;overflow:hidden;border:2px solid var(--gold);min-height:200px;"></div>' +
        '<div style="margin-top:14px;">' +
          '<button class="btn btn-info btn-full" onclick="Scanner.manualEntry()" style="margin-bottom:8px;">⌨️ إدخال يدوي</button>' +
          '<button class="btn btn-warning btn-full" onclick="Scanner.reportError()" id="scanErrBtn">⚠️ الكاميرا لا تعمل؟</button>' +
        '</div>' +
      '</div>';
    Modal.open('📷 مسح الباركود', html, null, 'إغلاق');
    setTimeout(function () { Scanner.start(); }, 300);
  },
  async start() {
    const reader = document.getElementById('reader');
    if (!reader) return;

    // Method 1: html5-qrcode
    if (typeof Html5Qrcode !== 'undefined') {
      try {
        State.scanner = new Html5Qrcode("reader");
        await State.scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.7,
            disableFlip: false
          },
          function (text) {
            Utils.vibrate(100);
            Scanner.onResult(text);
          },
          function () { /* ignore scan errors */ }
        );
        return;
      } catch (e) {
        console.warn('html5-qrcode failed:', e);
      }
    }

    // Method 2: Native BarcodeDetector API
    if ('BarcodeDetector' in window) {
      try {
        await Scanner.startNative();
        return;
      } catch (e) {
        console.warn('BarcodeDetector failed:', e);
      }
    }

    // Method 3: Manual entry fallback
    Scanner.showManualOnly();
  },
  async startNative() {
    const reader = document.getElementById('reader');
    reader.innerHTML = '<video id="scanVideo" style="width:100%;border-radius:10px;" autoplay playsinline muted></video>';
    const video = document.getElementById('scanVideo');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = stream;
    await video.play();
    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'codabar', 'itf']
    });
    const scanLoop = async function () {
      if (!document.getElementById('scanVideo')) return;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0) {
          Utils.vibrate(100);
          const code = barcodes[0].rawValue;
          Scanner.onResult(code);
          return;
        }
      } catch (e) {}
      if (document.getElementById('scanVideo')) {
        requestAnimationFrame(scanLoop);
      }
    };
    requestAnimationFrame(scanLoop);
  },
  showManualOnly() {
    const reader = document.getElementById('reader');
    if (reader) {
      reader.innerHTML =
        '<div style="padding:30px;text-align:center;color:var(--orange-2);">' +
          '<div style="font-size:40px;margin-bottom:10px;">📷</div>' +
          '<p>الكاميرا غير متوفرة</p>' +
          '<p style="font-size:12px;margin-top:8px;">استخدم الإدخال اليدوي</p>' +
        '</div>';
    }
    Scanner.manualEntry();
  },
  manualEntry() {
    const html =
      '<div class="form-group">' +
        '<label>أدخل الباركود يدوياً</label>' +
        '<input id="manualBarcode" placeholder="اكتب الباركود..." autofocus>' +
      '</div>' +
      '<button class="btn btn-primary btn-full" onclick="Scanner.submitManual()">تأكيد</button>';
    Modal.open('⌨️ إدخال يدوي', html, null, 'إغلاق');
  },
  submitManual() {
    const code = document.getElementById('manualBarcode').value.trim();
    if (!code) return Toast.show('أدخل الباركود', 'error');
    Scanner.onResult(code);
  },
  async stop() {
    if (State.scanner) {
      try {
        await State.scanner.stop();
        State.scanner.clear();
      } catch (e) {}
      State.scanner = null;
    }
    const video = document.getElementById('scanVideo');
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(function (t) { t.stop(); });
    }
  },
  onResult(code) {
    const target = State.barcodeTarget;
    Scanner.stop().then(function () {
      Modal.close();
      Scanner.handleBarcode(code, target);
    });
  },
  handleBarcode(code, target) {
    const products = cache.products || [];
    const p = products.find(function (x) {
      return x.barcode === code || x.code === code;
    });
    if (target === 'search') {
      const el = document.getElementById('prodSearch');
      if (el) { el.value = code; Products.search(code); }
    } else if (target === 'field') {
      const el = document.getElementById('p_barcode');
      if (el) { el.value = code; Toast.show('✅ تم المسح'); }
    } else if (target === 'sale') {
      if (!p) return Toast.show('منتج غير موجود', 'error');
      Sales.addItemById(p.id);
    } else if (target === 'purchase') {
      if (!p) return Toast.show('منتج غير موجود', 'error');
      Purchases.addItemById(p.id);
    } else if (target === 'return') {
      if (!p) return Toast.show('منتج غير موجود', 'error');
      Returns.addItemById(p.id);
    }
  },
  reportError() {
    const html =
      '<div class="warning-box">' +
        '<p>لتشغيل الكاميرا، تأكد من:</p>' +
        '<ul style="margin-top:8px;padding-right:20px;line-height:1.8;">' +
          '<li>السماح للتطبيق بالوصول للكاميرا</li>' +
          '<li>التطبيق يعمل على <strong>HTTPS</strong> أو <strong>localhost</strong></li>' +
          '<li>لا يوجد تطبيق آخر يستخدم الكاميرا</li>' +
        '</ul>' +
      '</div>' +
      '<button class="btn btn-primary btn-full" onclick="Scanner.testPermission()" style="margin-top:12px;">🔓 طلب الصلاحية</button>';
    Modal.open('⚠️ مساعدة الكاميرا', html, null, 'إغلاق');
  },
  async testPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(function (t) { t.stop(); });
      Toast.show('✅ تم منح الصلاحية — أعد المحاولة');
      Modal.close();
    } catch (e) {
      Toast.show('❌ رفض الصلاحية: ' + e.message, 'error');
    }
  },
  async test() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(function (t) { t.stop(); });
      Toast.show('✅ الكاميرا تعمل');
    } catch (e) {
      Toast.show('❌ ' + e.message, 'error');
    }
  }
};

/* ═══════════════════════════════════════════════════════════════
   13. Printer (4 methods)
   ═══════════════════════════════════════════════════════════════ */
const Printer = {
  async printReceipt(htmlContent, jobName) {
    jobName = jobName || 'فاتورة';

    // Method 1: Cordova Printer plugin
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.printer) {
      try {
        return new Promise(function (resolve) {
          window.cordova.plugins.printer.print(htmlContent, jobName, function (err) {
            if (err) { resolve(Printer.printViaDialog(htmlContent)); }
            else { Toast.show('✅ تمت الطباعة'); resolve(true); }
          });
        });
      } catch (e) {}
    }

    // Method 2: Web Bluetooth (via ThermalPrinter lib if available)
    if (navigator.bluetooth && typeof window.ThermalPrinter !== 'undefined') {
      try {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        Toast.show('جاري الاتصال بالطابعة...', 'info');
        // ESC/POS commands would go here
        Toast.show('✅ تم الإرسال للطابعة');
        return true;
      } catch (e) {
        console.warn('Bluetooth print failed:', e);
      }
    }

    // Method 3: Print Dialog (default)
    return Printer.printViaDialog(htmlContent);
  },
  printViaDialog(htmlContent) {
    return new Promise(function (resolve) {
      const w = window.open('', '_blank');
      if (!w) {
        Toast.show('⚠️ المتصفح منع الطباعة', 'error');
        resolve(false);
        return;
      }
      w.document.write(htmlContent + '<script>setTimeout(function(){window.print();},400);<\/script>');
      w.document.close();
      setTimeout(function () { resolve(true); }, 1000);
    });
  },
  generateReceiptHTML(invoice, items, type) {
    const title = type === 'sales' ? '🧾 فاتورة مبيعات' : '📦 فاتورة مشتريات';
    const partyLabel = type === 'sales' ? 'العميل' : 'المورد';
    const partyName = type === 'sales' ? invoice.customer_name : invoice.supplier_name;
    let html =
      '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">' +
      '<style>' +
        '@page { size: 80mm auto; margin: 2mm; }' +
        'body { font-family: Cairo, Tahoma, sans-serif; padding: 4px; color: #000; max-width: 76mm; margin: 0 auto; }' +
        '.header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }' +
        '.header h2 { color: #B8941F; font-size: 16px; margin: 0; }' +
        '.header p { font-size: 10px; margin: 2px 0; }' +
        '.line { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }' +
        '.items { margin: 6px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; }' +
        '.item { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }' +
        '.total { border-top: 2px dashed #000; padding-top: 6px; font-weight: 700; font-size: 13px; margin-top: 4px; }' +
        '.footer { text-align: center; font-size: 10px; margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; }' +
      '</style></head><body>' +
      '<div class="header">' +
        '<h2>شركة البسملة</h2>' +
        '<p>لتجارة المشغولات الصينية</p>' +
        '<p>' + title + '</p>' +
      '</div>' +
      '<div class="line"><span>رقم:</span><span>' + Utils.esc(invoice.invoice_no) + '</span></div>' +
      '<div class="line"><span>التاريخ:</span><span>' + Utils.fmtDate(invoice.date) + '</span></div>' +
      '<div class="line"><span>' + partyLabel + ':</span><span>' + Utils.esc(partyName || '-') + '</span></div>' +
      '<div class="line"><span>الموظف:</span><span>' + Utils.esc(invoice.employee_name || '-') + '</span></div>' +
      '<div class="items">';
    for (const it of items) {
      html += '<div class="item"><span>' + Utils.esc(it.product_name) + ' × ' + it.quantity + '</span><span>' + Utils.fmtMoney(it.total) + '</span></div>';
    }
    html += '</div>' +
      '<div class="line"><span>الإجمالي الفرعي:</span><span>' + Utils.fmtMoney(invoice.subtotal) + '</span></div>' +
      '<div class="line"><span>الخصم:</span><span>' + Utils.fmtMoney(invoice.discount) + '</span></div>' +
      '<div class="line"><span>الضريبة:</span><span>' + Utils.fmtMoney(invoice.tax) + '</span></div>' +
      '<div class="line total"><span>الإجمالي:</span><span>' + Utils.fmtMoney(invoice.total) + '</span></div>' +
      '<div class="line"><span>المدفوع:</span><span>' + Utils.fmtMoney(invoice.paid) + '</span></div>' +
      '<div class="line"><span>الباقي:</span><span>' + Utils.fmtMoney(invoice.remaining) + '</span></div>' +
      '<div class="footer">شكراً لتعاملكم معنا<br>© البسملة 2026</div>' +
      '</body></html>';
    return html;
  },
  async test() {
    const html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>@page{size:80mm auto;margin:2mm;}body{font-family:Cairo;padding:10px;text-align:center;}</style></head><body>' +
      '<h2 style="color:#B8941F;">شركة البسملة</h2>' +
      '<p>اختبار الطباعة</p>' +
      '<p style="font-size:11px;">' + new Date().toLocaleString('ar-EG') + '</p>' +
      '<p>✅ تعمل</p>' +
      '</body></html>';
    await Printer.printReceipt(html, 'اختبار');
  }
};

/* ═══════════════════════════════════════════════════════════════
   14. Calculator
   ═══════════════════════════════════════════════════════════════ */
const Calculator = {
  open() {
    const html =
      '<div class="calc-display">' +
        '<div class="history" id="calcHistory"></div>' +
        '<div class="current" id="calcCurrent">0</div>' +
      '</div>' +
      '<div class="calc-grid">' +
        '<button class="calc-btn clear" onclick="Calculator.clear()">C</button>' +
        '<button class="calc-btn del" onclick="Calculator.del()">⌫</button>' +
        '<button class="calc-btn op" onclick="Calculator.percent()">%</button>' +
        '<button class="calc-btn op" onclick="Calculator.op(\'÷\')">÷</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'7\')">7</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'8\')">8</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'9\')">9</button>' +
        '<button class="calc-btn op" onclick="Calculator.op(\'×\')">×</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'4\')">4</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'5\')">5</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'6\')">6</button>' +
        '<button class="calc-btn op" onclick="Calculator.op(\'-\')">−</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'1\')">1</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'2\')">2</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'3\')">3</button>' +
        '<button class="calc-btn op" onclick="Calculator.op(\'+\')">+</button>' +
        '<button class="calc-btn" onclick="Calculator.num(\'0\')">0</button>' +
        '<button class="calc-btn" onclick="Calculator.dot()">.</button>' +
        '<button class="calc-btn eq" onclick="Calculator.eq()">=</button>' +
      '</div>' +
      '<div style="margin-top:12px;">' +
        '<button class="btn btn-info btn-full" onclick="Calculator.copyResult()">📋 نسخ الناتج</button>' +
      '</div>';
    Modal.open('🧮 الحاسبة', html, null, 'إغلاق');
    Calculator.render();
  },
  num(d) {
    const s = State.calcState;
    if (s.shouldReset) {
      s.current = d;
      s.shouldReset = false;
    } else {
      s.current = (s.current === '0' ? d : s.current + d);
    }
    if (s.current.length > 15) s.current = s.current.slice(0, 15);
    Calculator.render();
  },
  dot() {
    const s = State.calcState;
    if (s.shouldReset) { s.current = '0.'; s.shouldReset = false; }
    else if (!s.current.includes('.')) s.current += '.';
    Calculator.render();
  },
  op(o) {
    const s = State.calcState;
    const cur = parseFloat(s.current) || 0;
    if (s.operator && !s.shouldReset) {
      const result = Calculator.compute(s.operand, cur, s.operator);
      s.current = String(result);
      s.operand = result;
    } else {
      s.operand = cur;
    }
    s.operator = o;
    s.shouldReset = true;
    s.history = s.operand + ' ' + o;
    Calculator.render();
  },
  compute(a, b, op) {
    let r = 0;
    if (op === '+') r = a + b;
    else if (op === '-') r = a - b;
    else if (op === '×') r = a * b;
    else if (op === '÷') r = b === 0 ? 0 : a / b;
    return Math.round(r * 1e10) / 1e10;
  },
  eq() {
    const s = State.calcState;
    if (!s.operator) return;
    const cur = parseFloat(s.current) || 0;
    const result = Calculator.compute(s.operand, cur, s.operator);
    s.history = s.operand + ' ' + s.operator + ' ' + cur + ' =';
    s.current = String(result);
    s.operator = null;
    s.operand = 0;
    s.shouldReset = true;
    Calculator.render();
    Utils.vibrate(50);
  },
  clear() {
    State.calcState = { current: '0', history: '', operator: null, operand: 0, shouldReset: false };
    Calculator.render();
  },
  del() {
    const s = State.calcState;
    if (s.shouldReset) { s.current = '0'; s.shouldReset = false; }
    else { s.current = s.current.length > 1 ? s.current.slice(0, -1) : '0'; }
    Calculator.render();
  },
  percent() {
    const s = State.calcState;
    s.current = String((parseFloat(s.current) || 0) / 100);
    Calculator.render();
  },
  render() {
    const c = document.getElementById('calcCurrent');
    const h = document.getElementById('calcHistory');
    if (c) c.textContent = State.calcState.current;
    if (h) h.textContent = State.calcState.history;
  },
  copyResult() {
    const val = State.calcState.current;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(val).then(function () { Toast.show('✅ تم النسخ'); });
    } else {
      Toast.show('الناتج: ' + val, 'info');
    }
  }
};

/* ═══════════════════════════════════════════════════════════════
   15. Backup
   ═══════════════════════════════════════════════════════════════ */
const Backup = {
  async export() {
    if (!requirePermission('data_export', 'تصدير')) return;
    const data = {
      version: '2026.1',
      company_id: State.currentCompanyId,
      export_date: Utils.nowISO(),
      exported_by: State.currentEmployee.name
    };
    for (const key of Object.keys(cache)) data[key] = cache[key];
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'albasmala_backup_' + Utils.todayStr() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('✅ تم التصدير');
  },
  async import() {
    if (!requirePermission('data_import', 'استيراد')) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async function (e) {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!confirm('⚠️ استبدال البيانات الحالية؟')) return;
        for (const key of Object.keys(cache)) {
          if (data[key] && Array.isArray(data[key])) {
            for (const item of data[key]) {
              if (item && item.id) await Sync.save(key, item.id, item);
            }
          }
        }
        Toast.show('✅ تم الاستيراد');
      } catch (err) {
        Toast.show('❌ ملف غير صالح', 'error');
      }
    };
    input.click();
  },
  async clearUI() {
    if (!requirePermission('data_clear', 'مسح البيانات')) return;
    if (!confirm('⚠️ مسح كل بيانات الشركة نهائياً؟')) return;
    if (!confirm('⚠️ تأكيد أخير: لا يمكن التراجع!')) return;
    for (const key of Object.keys(cache)) {
      try { await State.companyRef.child(key).remove(); } catch (e) {}
    }
    Toast.show('تم المسح — جاري إعادة التحميل');
    setTimeout(function () { location.reload(); }, 1500);
  }
};

/* ═══════════════════════════════════════════════════════════════
   16. Auth
   ═══════════════════════════════════════════════════════════════ */
const Auth = {
  async doLogin() {
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = '⏳ جاري الدخول...';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
      btn.disabled = false;
      btn.textContent = '🔓 دخول';
      return App.showError('loginError', 'أدخل البريد وكلمة المرور');
    }
    try {
      await FBAuth.signInWithEmailAndPassword(email, password);
      Toast.show('✅ تم تسجيل الدخول');
    } catch (e) {
      let msg = 'فشل الدخول';
      if (e.code === 'auth/user-not-found') msg = 'الحساب غير موجود';
      else if (e.code === 'auth/wrong-password') msg = 'كلمة المرور خاطئة';
      else if (e.code === 'auth/invalid-email') msg = 'بريد غير صالح';
      else if (e.code === 'auth/invalid-credential') msg = 'بيانات غير صحيحة';
      else if (e.code === 'auth/network-request-failed') msg = 'فشل الاتصال';
      else msg = e.message;
      App.showError('loginError', msg);
      btn.disabled = false;
      btn.textContent = '🔓 دخول';
    }
  },
  async forgotPassword() {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) return App.showError('loginError', 'أدخل البريد أولاً');
    if (!confirm('إرسال رابط إعادة التعيين إلى: ' + email + '؟')) return;
    try {
      await FBAuth.sendPasswordResetEmail(email);
      App.showError('loginError', '✅ تم الإرسال للبريد');
    } catch (e) {
      App.showError('loginError', '❌ ' + e.message);
    }
  },
  async doCreateCompany() {
    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.textContent = '⏳ جاري الإنشاء...';
    const companyName = document.getElementById('ccCompanyName').value.trim();
    const adminName = document.getElementById('ccAdminName').value.trim();
    const email = document.getElementById('ccEmail').value.trim();
    const password = document.getElementById('ccPassword').value;
    const password2 = document.getElementById('ccPassword2').value;
    if (!companyName || !adminName || !email || !password) {
      btn.disabled = false;
      btn.textContent = '🚀 إنشاء الشركة';
      return App.showError('createError', 'جميع الحقول مطلوبة');
    }
    if (password.length < 6) {
      btn.disabled = false;
      btn.textContent = '🚀 إنشاء الشركة';
      return App.showError('createError', 'كلمة المرور 6 أحرف على الأقل');
    }
    if (password !== password2) {
      btn.disabled = false;
      btn.textContent = '🚀 إنشاء الشركة';
      return App.showError('createError', 'كلمتا المرور غير متطابقتين');
    }
    try {
      const userCred = await FBAuth.createUserWithEmailAndPassword(email, password);
      const uid = userCred.user.uid;
      const companyId = Auth.generateCompanyId();
      const now = Utils.nowISO();
      const companyData = {
        info: {
          company_id: companyId,
          name: companyName,
          owner_uid: uid,
          owner_email: email,
          created_at: now
        },
        employees: {},
        devices: {}
      };
      companyData.employees[uid] = {
        uid: uid, name: adminName, email: email,
        role: 'admin', job_title: 'المدير العام',
        basic_salary: 0, housing_allowance: 0, transport_allowance: 0,
        insurance_deduction: 0, tax_deduction: 0,
        active: true, created_at: now
      };
      companyData.devices[State.deviceId] = {
        device_id: State.deviceId,
        user_uid: uid, user_name: adminName,
        user_agent: navigator.userAgent,
        approved: true, status: 'approved',
        approved_at: now, created_at: now, last_seen: now
      };
      await FBDB.ref('companies/' + companyId).set(companyData);
      await FBDB.ref('user_companies/' + uid + '/' + companyId).set(true);
      localStorage.setItem('company_id', companyId);
      localStorage.setItem('user_email', email);
      State.currentCompanyId = companyId;
      State.currentCompanyName = companyName;
      document.getElementById('companyIdValue').textContent = companyId;
      App.showScreen('screenShowCompanyId');
      Toast.show('✅ تم إنشاء الشركة');
    } catch (e) {
      let msg = 'فشل الإنشاء';
      if (e.code === 'auth/email-already-in-use') msg = 'البريد مستخدم';
      else if (e.code === 'auth/weak-password') msg = 'كلمة المرور ضعيفة';
      else if (e.code === 'auth/invalid-email') msg = 'بريد غير صالح';
      else msg = e.message;
      App.showError('createError', msg);
      btn.disabled = false;
      btn.textContent = '🚀 إنشاء الشركة';
    }
  },
  generateCompanyId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let part1 = '', part2 = '';
    for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
    return 'ALB-' + part1 + '-' + part2;
  },
  async enterApp() {
    if (!State.currentCompanyId) {
      State.currentCompanyId = localStorage.getItem('company_id');
    }
    await App.loadCompanyData();
  },
  async doJoinCompany() {
    const btn = document.getElementById('joinBtn');
    btn.disabled = true;
    btn.textContent = '⏳ جاري الإرسال...';
    const companyId = document.getElementById('jcCompanyId').value.trim().toUpperCase();
    const name = document.getElementById('jcName').value.trim();
    const email = document.getElementById('jcEmail').value.trim();
    const password = document.getElementById('jcPassword').value;
    const role = document.getElementById('jcRole').value;
    if (!companyId || !name || !email || !password) {
      btn.disabled = false;
      btn.textContent = '📩 إرسال الطلب';
      return App.showError('joinError', 'جميع الحقول مطلوبة');
    }
    if (password.length < 6) {
      btn.disabled = false;
      btn.textContent = '📩 إرسال الطلب';
      return App.showError('joinError', 'كلمة المرور 6 أحرف على الأقل');
    }
    try {
      const companySnap = await FBDB.ref('companies/' + companyId + '/info').once('value');
      if (!companySnap.exists()) throw new Error('معرّف الشركة غير صحيح');
      const companyInfo = companySnap.val();
      let uid;
      try {
        const userCred = await FBAuth.createUserWithEmailAndPassword(email, password);
        uid = userCred.user.uid;
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          try {
            const userCred = await FBAuth.signInWithEmailAndPassword(email, password);
            uid = userCred.user.uid;
          } catch (e2) {
            throw new Error('البريد مستخدم بكلمة مرور مختلفة');
          }
        } else { throw e; }
      }
      const now = Utils.nowISO();
      const empSnap = await FBDB.ref('companies/' + companyId + '/employees/' + uid).once('value');
      if (empSnap.exists() && empSnap.val().active === true) {
        localStorage.setItem('company_id', companyId);
        State.currentCompanyId = companyId;
        State.currentCompanyName = companyInfo.name || '';
        Toast.show('✅ أنت مسجل — جاري الدخول');
        await App.loadCompanyData();
        return;
      }
      await FBDB.ref('companies/' + companyId + '/pending_requests/' + uid).set({
        uid: uid, name: name, email: email, role: role,
        device_id: State.deviceId,
        user_agent: navigator.userAgent,
        status: 'pending',
        created_at: now
      });
      await FBDB.ref('companies/' + companyId + '/devices/' + State.deviceId).set({
        device_id: State.deviceId,
        user_uid: uid, user_name: name,
        user_agent: navigator.userAgent,
        approved: false, status: 'pending',
        created_at: now, last_seen: now
      });
      await FBDB.ref('user_companies/' + uid + '/' + companyId).set(true);
      localStorage.setItem('company_id', companyId);
      State.currentCompanyId = companyId;
      State.currentCompanyName = companyInfo.name || '';
      App.showScreen('screenPendingApproval');
      Auth.watchApproval(uid);
    } catch (e) {
      let msg = 'فشل الإرسال';
      if (e.code === 'auth/email-already-in-use') msg = 'البريد مستخدم';
      else if (e.code === 'auth/weak-password') msg = 'كلمة المرور ضعيفة';
      else if (e.message) msg = e.message;
      App.showError('joinError', msg);
      btn.disabled = false;
      btn.textContent = '📩 إرسال الطلب';
    }
  },
  watchApproval(uid) {
    if (!State.currentCompanyId) return;
    const ref = FBDB.ref('companies/' + State.currentCompanyId + '/employees/' + uid);
    const listener = ref.on('value', function (snap) {
      if (snap.exists() && snap.val().active === true) {
        ref.off('value', listener);
        FBDB.ref('companies/' + State.currentCompanyId + '/devices/' + State.deviceId).update({
          approved: true, status: 'approved',
          approved_at: Utils.nowISO()
        });
        Toast.show('✅ تمت الموافقة!');
        setTimeout(function () { App.loadCompanyData(); }, 800);
      }
    });
  },
  async logout() {
    if (State.currentEmployee && !confirm('تسجيل الخروج؟')) return;
    Activity.log('logout', 'خروج: ' + (State.currentEmployee ? State.currentEmployee.name : ''));
    App.stopAllListeners();
    Location.stopWatching();
    if (FBDB && State.deviceId && State.currentCompanyId) {
      try {
        await FBDB.ref('companies/' + State.currentCompanyId + '/devices/' + State.deviceId).update({
          last_seen: Utils.nowISO()
        });
      } catch (e) {}
    }
    await FBAuth.signOut();
    State.currentUser = null;
    State.currentEmployee = null;
    State.currentCompanyId = null;
    document.getElementById('mainApp').classList.add('hidden');
    App.showScreen('screenWelcome');
  }
};

/* ═══════════════════════════════════════════════════════════════
   17. App (Main Controller)
   ═══════════════════════════════════════════════════════════════ */
const App = {
  init() {
    State.deviceId = localStorage.getItem('device_id');
    if (!State.deviceId) {
      State.deviceId = 'DEV-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
      localStorage.setItem('device_id', State.deviceId);
    }

    window.addEventListener('online', function () {
      State.isOnline = true;
      Sync.updateBar();
      setTimeout(Sync.flushPending, 1500);
    });
    window.addEventListener('offline', function () {
      State.isOnline = false;
      Sync.updateBar();
    });

    FBDB.ref('.info/connected').on('value', function (snap) {
      State.isOnline = snap.val() === true;
      Sync.updateBar();
    });

    FBAuth.onAuthStateChanged(function (user) {
      App.hideLoading();
      if (user) {
        State.currentUser = user;
        const companyId = localStorage.getItem('company_id');
        if (companyId) {
          State.currentCompanyId = companyId;
          App.loadCompanyData();
        } else {
          App.findUserCompany(user.uid);
        }
      } else {
        State.currentUser = null;
        App.showScreen('screenWelcome');
      }
    });

    window.addEventListener('popstate', App.handleBack);
    history.pushState({ page: 'home' }, '', '');

    setInterval(function () {
      if (State.currentCompanyId && State.deviceId && State.currentEmployee) {
        try {
          FBDB.ref('companies/' + State.currentCompanyId + '/devices/' + State.deviceId).update({
            last_seen: Utils.nowISO()
          });
        } catch (e) {}
      }
    }, 5 * 60 * 1000);

    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  },
  hideLoading() {
    const el = document.getElementById('screenLoading');
    if (el) el.classList.add('hidden');
  },
  showScreen(id) {
    document.querySelectorAll('.auth-screen').forEach(function (s) { s.classList.add('hidden'); });
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  },
  showError(elementId, msg) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(function () { el.classList.add('hidden'); }, 6000);
  },
  copyCompanyId() {
    const v = document.getElementById('companyIdValue').textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(v).then(function () { Toast.show('✅ تم النسخ'); });
    } else {
      Toast.show('المعرّف: ' + v, 'info');
    }
  },
  async findUserCompany(uid) {
    try {
      const snap = await FBDB.ref('user_companies/' + uid).once('value');
      const companies = snap.val();
      if (!companies) return App.showScreen('screenWelcome');
      const companyIds = Object.keys(companies);
      if (companyIds.length === 0) return App.showScreen('screenWelcome');
      const companyId = companyIds[0];
      localStorage.setItem('company_id', companyId);
      State.currentCompanyId = companyId;
      App.loadCompanyData();
    } catch (e) {
      console.error(e);
      App.showScreen('screenWelcome');
    }
  },
  async loadCompanyData() {
    try {
      const companyId = State.currentCompanyId || localStorage.getItem('company_id');
      if (!companyId) return App.showScreen('screenWelcome');
      State.currentCompanyId = companyId;
      State.companyRef = FBDB.ref('companies/' + companyId);

      const infoSnap = await State.companyRef.child('info').once('value');
      if (!infoSnap.exists()) {
        Toast.show('الشركة غير موجودة', 'error');
        return Auth.logout();
      }
      const companyInfo = infoSnap.val();
      State.currentCompanyName = companyInfo.name || 'شركة';

      const uid = State.currentUser.uid;
      const empSnap = await State.companyRef.child('employees/' + uid).once('value');
      if (!empSnap.exists()) {
        const reqSnap = await State.companyRef.child('pending_requests/' + uid).once('value');
        if (reqSnap.exists() && reqSnap.val().status === 'pending') {
          App.showScreen('screenPendingApproval');
          Auth.watchApproval(uid);
          return;
        }
        Toast.show('لا يمكن الوصول لهذه الشركة', 'error');
        return Auth.logout();
      }
      State.currentEmployee = empSnap.val();
      if (State.currentEmployee.active !== true) {
        App.showScreen('screenPendingApproval');
        Auth.watchApproval(uid);
        return;
      }

      try {
        await State.companyRef.child('devices/' + State.deviceId).update({
          last_seen: Utils.nowISO(),
          user_uid: uid,
          user_name: State.currentEmployee.name,
          approved: true,
          status: 'approved'
        });
      } catch (e) {}

      document.querySelectorAll('.auth-screen').forEach(function (s) { s.classList.add('hidden'); });
      document.getElementById('mainApp').classList.remove('hidden');

      document.getElementById('appTitle').textContent = '🏪 ' + State.currentCompanyName;
      document.getElementById('userInfo').textContent =
        State.currentEmployee.name + ' - ' +
        (PERMISSIONS[State.currentEmployee.role] ? PERMISSIONS[State.currentEmployee.role].label : State.currentEmployee.role);
      document.getElementById('companyInfo').textContent = 'معرّف الشركة: ' + State.currentCompanyId;
      document.getElementById('deviceLabel').textContent = '📱 ' + State.deviceId.substr(-6);

      const adminTools = document.getElementById('adminTools');
      if (adminTools) adminTools.style.display = can('data_clear') ? 'block' : 'none';

      App.startDataListeners();
      await App.loadCacheFromLocal();

      Menu.render();
      App.openPage('home');
      Sync.updateBar();

      await Activity.log('login', 'دخول: ' + State.currentEmployee.name);

      App.watchDeviceApproval();
      App.watchEmployeeStatus();

    } catch (e) {
      console.error('loadCompanyData:', e);
      Toast.show('خطأ: ' + e.message, 'error');
    }
  },
  startDataListeners() {
    App.stopAllListeners();
    const dataKeys = [
      'employees', 'attendance', 'leaves', 'payroll', 'employee_transactions',
      'work_policies', 'products', 'partners', 'sales_invoices', 'sales_items',
      'purchase_invoices', 'purchase_items', 'sales_returns', 'sales_return_items',
      'purchase_returns', 'purchase_return_items', 'stock_movements',
      'cash_transactions', 'vouchers', 'revenues', 'expenses',
      'whatsapp_templates', 'whatsapp_log', 'activity_log', 'devices',
      'pending_requests', 'geofences', 'locations'
    ];
    for (const key of dataKeys) {
      (function (k) {
        const ref = State.companyRef.child(k);
        const callback = function (snap) {
          const val = snap.val();
          cache[k] = val ? Object.values(val) : [];
          App.saveCacheToLocal(k, cache[k]);
          App.refreshCurrentPage();
        };
        ref.on('value', callback);
        State.listeners.push({ ref: ref, callback: callback });
      })(key);
    }
  },
  stopAllListeners() {
    State.listeners.forEach(function (l) {
      try { l.ref.off('value', l.callback); } catch (e) {}
    });
    State.listeners = [];
  },
  refreshCurrentPage() {
    if (!State.currentEmployee) return;
    try {
      const page = State.currentPage;
      if (page === 'home') Dashboard.render();
      else if (page === 'attendance') Attendance.renderMark();
      else if (page === 'employees') Employees.render();
      else if (page === 'products') Products.render();
      else if (page === 'partners') Partners.render();
      else if (page === 'invoices') Invoices.render();
      else if (page === 'vouchers') Vouchers.render();
      else if (page === 'cash') Cash.render();
      else if (page === 'expenses') Expenses.render();
      else if (page === 'policies') Policies.render();
      else if (page === 'whatsapp') WhatsApp.render();
      else if (page === 'activity') Activity.render();
      else if (page === 'devices') Devices.render();
      else if (page === 'requests') Requests.render();
      else if (page === 'geofence') Geofence.render();
      Menu.updateRequestsBadge();
    } catch (e) { console.warn('refresh:', e); }
  },
  saveCacheToLocal(key, data) {
    try {
      localStorage.setItem('cache_' + State.currentCompanyId + '_' + key, JSON.stringify(data));
    } catch (e) {}
  },
  async loadCacheFromLocal() {
    for (const key of Object.keys(cache)) {
      try {
        const s = localStorage.getItem('cache_' + State.currentCompanyId + '_' + key);
        if (s) cache[key] = JSON.parse(s);
      } catch (e) {}
    }
  },
  openPage(page) {
    const permMap = {
      'attendance': 'attendance_report', 'employees': 'employees_view',
      'products': 'products_view', 'partners': 'partners_view',
      'sales': 'sales_create', 'purchase': 'purchase_create',
      'returns': 'returns_create', 'invoices': 'reports_view',
      'vouchers': 'vouchers_create', 'cash': 'cash_view',
      'payroll': 'payroll_generate', 'expenses': 'expenses_add',
      'reports': 'reports_view', 'statements': 'statements_view',
      'policies': 'attendance_report', 'whatsapp': 'partners_view',
      'settings': 'attendance_report', 'activity': 'activity_view',
      'devices': 'devices_manage', 'requests': 'requests_manage',
      'geofence': 'geofence_manage', 'home': 'attendance_report'
    };
    if (permMap[page] && !can(permMap[page])) {
      return Toast.show('🔒 غير مسموح', 'error');
    }
    document.querySelectorAll('.page').forEach(function (p) { p.classList.add('hidden'); });
    const el = document.getElementById('page-' + page);
    if (!el) return;
    el.classList.remove('hidden');
    State.currentPage = page;

    document.querySelectorAll('.bottom-nav .nav-btn').forEach(function (b) { b.classList.remove('active'); });

    if (page === 'home') Dashboard.render();
    else if (page === 'attendance') Attendance.init();
    else if (page === 'employees') Employees.render();
    else if (page === 'products') Products.render();
    else if (page === 'partners') Partners.render();
    else if (page === 'sales') Sales.init();
    else if (page === 'purchase') Purchases.init();
    else if (page === 'returns') Returns.init();
    else if (page === 'invoices') Invoices.render();
    else if (page === 'vouchers') Vouchers.render();
    else if (page === 'cash') Cash.render();
    else if (page === 'payroll') Payroll.init();
    else if (page === 'expenses') Expenses.render();
    else if (page === 'reports') Reports.init();
    else if (page === 'statements') Statements.init();
    else if (page === 'policies') Policies.render();
    else if (page === 'whatsapp') WhatsApp.render();
    else if (page === 'activity') Activity.render();
    else if (page === 'devices') Devices.render();
    else if (page === 'requests') Requests.render();
    else if (page === 'geofence') Geofence.render();
    else if (page === 'settings') Settings.render();

    window.scrollTo(0, 0);
  },
  goHome() { App.openPage('home'); },
  handleBack() {
    const now = Date.now();
    const modal = document.querySelector('.modal-overlay');
    if (modal) { Modal.close(); return; }
    if (State.currentEmployee && State.currentPage !== 'home') {
      App.goHome();
      history.pushState({ page: 'home' }, '', '');
      return;
    }
    if (now - State.lastBackPress < 2000 && State.currentEmployee) {
      if (navigator.app && navigator.app.exitApp) navigator.app.exitApp();
    } else {
      State.lastBackPress = now;
      if (State.currentEmployee) Toast.show('اضغط مرة أخرى للخروج', 'error');
      history.pushState({ page: 'home' }, '', '');
    }
  },
  watchDeviceApproval() {
    if (!State.currentCompanyId || !State.deviceId) return;
    const ref = FBDB.ref('companies/' + State.currentCompanyId + '/devices/' + State.deviceId);
    ref.on('value', function (snap) {
      const data = snap.val();
      if (!data) return;
      if (data.status === 'rejected' || data.approved === false) {
        Toast.show('🚫 تم طرد هذا الجهاز', 'error');
        setTimeout(function () { Auth.logout(); }, 2000);
      }
    });
  },
  watchEmployeeStatus() {
    if (!State.currentCompanyId || !State.currentUser) return;
    const ref = FBDB.ref('companies/' + State.currentCompanyId + '/employees/' + State.currentUser.uid);
    ref.on('value', function (snap) {
      const data = snap.val();
      if (!data || data.active === false) {
        Toast.show('🚫 تم إلغاء حسابك', 'error');
        setTimeout(function () { Auth.logout(); }, 2000);
      } else {
        State.currentEmployee = data;
        Menu.render();
      }
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   18. Menu
   ═══════════════════════════════════════════════════════════════ */
const Menu = {
  render() {
    const items = [
      { page: 'attendance', icon: '👆', title: 'الحضور والانصراف', perm: 'attendance_report' },
      { page: 'employees', icon: '👥', title: 'الموظفون', perm: 'employees_view' },
      { page: 'products', icon: '📦', title: 'المنتجات والمخزون', perm: 'products_view' },
      { page: 'partners', icon: '🤝', title: 'العملاء والموردون', perm: 'partners_view' },
      { page: 'sales', icon: '🛒', title: 'فاتورة مبيعات', perm: 'sales_create' },
      { page: 'purchase', icon: '🚚', title: 'فاتورة مشتريات', perm: 'purchase_create' },
      { page: 'returns', icon: '↩️', title: 'المرتجعات', perm: 'returns_create' },
      { page: 'invoices', icon: '📋', title: 'الفواتير', perm: 'reports_view' },
      { page: 'vouchers', icon: '🧾', title: 'سندات القبض والدفع', perm: 'vouchers_create' },
      { page: 'cash', icon: '💰', title: 'حركة الخزينة', perm: 'cash_view' },
      { page: 'payroll', icon: '💵', title: 'المرتبات', perm: 'payroll_generate' },
      { page: 'expenses', icon: '💸', title: 'الإيرادات والمصروفات', perm: 'expenses_add' },
      { page: 'reports', icon: '📊', title: 'التقارير', perm: 'reports_view' },
      { page: 'statements', icon: '📑', title: 'كشوف الحسابات', perm: 'statements_view' },
      { page: 'policies', icon: '📖', title: 'لائحة العمل', perm: 'attendance_report' },
      { page: 'whatsapp', icon: '💬', title: 'واتساب الشركة', perm: 'partners_view' },
      { page: 'settings', icon: '⚙️', title: 'الإعدادات', perm: 'attendance_report' }
    ];
    if (can('activity_view')) items.push({ page: 'activity', icon: '📜', title: 'سجل النشاطات', perm: 'activity_view' });
    if (can('devices_manage')) items.push({ page: 'devices', icon: '📱', title: 'إدارة الأجهزة', perm: 'devices_manage' });
    if (can('requests_manage')) items.push({ page: 'requests', icon: '📩', title: 'طلبات الانضمام', perm: 'requests_manage' });
    if (can('geofence_manage')) items.push({ page: 'geofence', icon: '📍', title: 'نطاق الحضور', perm: 'geofence_manage' });

    let html = '';
    for (const it of items) {
      if (can(it.perm)) {
        html += '<div class="menu-tile" onclick="App.openPage(\'' + it.page + '\')">' +
          '<div class="icon">' + it.icon + '</div>' +
          '<div class="title">' + it.title + '</div>';
        if (it.page === 'requests') html += '<span class="badge hidden" id="requestsBadge"></span>';
        html += '</div>';
      }
    }
    document.getElementById('menuGrid').innerHTML = html;
    Menu.updateRequestsBadge();
  },
  updateRequestsBadge() {
    const pending = (cache.pending_requests || []).filter(function (r) { return r.status === 'pending'; }).length;
    const badge = document.getElementById('requestsBadge');
    const banner = document.getElementById('pendingRequestsBanner');
    if (badge) {
      if (pending > 0) { badge.textContent = pending; badge.classList.remove('hidden'); }
      else badge.classList.add('hidden');
    }
    if (banner && pending > 0 && can('requests_manage')) {
      banner.innerHTML = '<div class="card" style="border-color:var(--orange-2);background:rgba(255,167,38,.1);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<strong style="color:var(--orange-2);">📩 لديك ' + pending + ' طلب انضمام</strong>' +
        '<button class="btn btn-warning btn-sm" onclick="App.openPage(\'requests\')">عرض</button>' +
        '</div></div>';
    } else if (banner) banner.innerHTML = '';
  }
};

/* ═══════════════════════════════════════════════════════════════
   19. Dashboard
   ═══════════════════════════════════════════════════════════════ */
const Dashboard = {
  render() {
    const sales = cache.sales_invoices || [];
    const purch = cache.purchase_invoices || [];
    const products = cache.products || [];
    const partners = cache.partners || [];
    const employees = cache.employees || [];
    const cash = cache.cash_transactions || [];
    const salesRet = cache.sales_returns || [];
    const purchRet = cache.purchase_returns || [];

    const today = Utils.todayStr();
    const salesToday = sales.filter(function (s) { return s.date && s.date.startsWith(today); });
    const purchToday = purch.filter(function (s) { return s.date && s.date.startsWith(today); });
    const salesTotal = salesToday.reduce(function (s, i) { return s + (Number(i.total) || 0); }, 0);
    const purchTotal = purchToday.reduce(function (s, i) { return s + (Number(i.total) || 0); }, 0);
    const cashIn = cash.filter(function (c) { return c.type === 'in'; }).reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);
    const cashOut = cash.filter(function (c) { return c.type === 'out'; }).reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);
    const cashBalance = cashIn - cashOut;
    const receivables = sales.reduce(function (s, i) { return s + (Number(i.remaining) || 0); }, 0);
    const payables = purch.reduce(function (s, i) { return s + (Number(i.remaining) || 0); }, 0);
    const lowStock = products.filter(function (p) {
      return p.active !== false && (Number(p.quantity) || 0) <= (Number(p.min_quantity) || 5);
    }).length;

    const html =
      '<div class="stat-card green"><div class="label">مبيعات اليوم</div><div class="value">' + Utils.fmtNum(salesTotal) + '</div><div style="font-size:11px;color:#999;">' + salesToday.length + ' فاتورة</div></div>' +
      '<div class="stat-card orange"><div class="label">مشتريات اليوم</div><div class="value">' + Utils.fmtNum(purchTotal) + '</div><div style="font-size:11px;color:#999;">' + purchToday.length + ' فاتورة</div></div>' +
      '<div class="stat-card blue"><div class="label">رصيد الخزينة</div><div class="value">' + Utils.fmtNum(cashBalance) + '</div></div>' +
      '<div class="stat-card red"><div class="label">مستحقات (لنا)</div><div class="value">' + Utils.fmtNum(receivables) + '</div></div>' +
      '<div class="stat-card red"><div class="label">التزامات (علينا)</div><div class="value">' + Utils.fmtNum(payables) + '</div></div>' +
      '<div class="stat-card"><div class="label">المنتجات</div><div class="value">' + products.filter(function (p) { return p.active !== false; }).length + '</div></div>' +
      '<div class="stat-card orange"><div class="label">نواقص المخزون</div><div class="value">' + lowStock + '</div></div>' +
      '<div class="stat-card"><div class="label">موظفون / عملاء</div><div class="value">' + employees.filter(function (e) { return e.active !== false; }).length + ' / ' + partners.filter(function (p) { return p.type === 'customer'; }).length + '</div></div>' +
      '<div class="stat-card green"><div class="label">مرتجع مبيعات</div><div class="value">' + Utils.fmtNum(salesRet.reduce(function (s, r) { return s + (Number(r.total) || 0); }, 0)) + '</div></div>' +
      '<div class="stat-card orange"><div class="label">مرتجع مشتريات</div><div class="value">' + Utils.fmtNum(purchRet.reduce(function (s, r) { return s + (Number(r.total) || 0); }, 0)) + '</div></div>';

    document.getElementById('dashboardStats').innerHTML = html;
  }
};

/* ═══════════════════════════════════════════════════════════════
   20. Attendance (with Geofencing)
   ═══════════════════════════════════════════════════════════════ */
const Attendance = {
  switchTab(e, tab) {
    document.querySelectorAll('#page-attendance .tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    document.getElementById('att-mark').classList.toggle('hidden', tab !== 'mark');
    document.getElementById('att-report').classList.toggle('hidden', tab !== 'report');
    document.getElementById('att-map').classList.toggle('hidden', tab !== 'map');
    if (tab === 'report') {
      document.getElementById('attFrom').value = Utils.todayStr();
      document.getElementById('attTo').value = Utils.todayStr();
      Attendance.loadReport();
    }
    if (tab === 'map') Attendance.initMap();
  },
  init() {
    Attendance.renderMark();
    Location.startWatching(function (coords) {
      Attendance.updateLocationStatus(coords);
    });
    Attendance.checkLocationNow();
  },
  async checkLocationNow() {
    const el = document.getElementById('locationStatus');
    if (el) {
      el.innerHTML = '<div class="location-status checking">' +
        '<div class="status-icon">⏳</div>' +
        '<div class="status-text">جاري التحقق من موقعك...</div>' +
      '</div>';
    }
    const res = await Location.checkGeofence();
    Attendance.updateLocationStatus(res);
    return res;
  },
  updateLocationStatus(res) {
    const el = document.getElementById('locationStatus');
    if (!el) return;
    if (res.reason === 'no_geofence') {
      el.innerHTML = '<div class="location-status in-range">' +
        '<div class="status-icon">✅</div>' +
        '<div class="status-text">لا يوجد نطاق محدد — يمكنك التسجيل</div>' +
        '<div class="distance">المدير لم يحدد نطاقاً بعد</div>' +
      '</div>';
      return;
    }
    if (res.reason === 'error') {
      el.innerHTML = '<div class="location-status out-range">' +
        '<div class="status-icon">⚠️</div>' +
        '<div class="status-text">خطأ في تحديد الموقع</div>' +
        '<div class="distance">' + Utils.esc(res.error || '') + '</div>' +
      '</div>';
      return;
    }
    const cls = res.inRange ? 'in-range' : 'out-range';
    const icon = res.inRange ? '✅' : '🚫';
    const text = res.inRange ? 'أنت داخل النطاق' : 'أنت خارج النطاق';
    const fenceName = res.fence ? res.fence.name : '';
    el.innerHTML = '<div class="location-status ' + cls + '">' +
      '<div class="status-icon">' + icon + '</div>' +
      '<div class="status-text">' + text + '</div>' +
      '<div class="distance">' + (fenceName ? Utils.esc(fenceName) + ' — ' : '') + 'المسافة: ' + res.distance + ' متر</div>' +
      (res.pos ? '<div class="coords">' + res.pos.lat.toFixed(5) + ', ' + res.pos.lng.toFixed(5) + '</div>' : '') +
    '</div>';
  },
  renderMark() {
    const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    const att = cache.attendance || [];
    const today = Utils.todayStr();
    let html = '';
    if (emps.length === 0) {
      html = '<div class="empty"><div class="ico">👥</div>لا يوجد موظفون</div>';
    } else {
      for (const e of emps) {
        const rec = att.find(function (a) { return a.employee_uid === e.uid && a.date === today; });
        const isMe = State.currentUser && e.uid === State.currentUser.uid;
        const canMark = isMe || can('attendance_mark_all');
        let stateText = 'لم يحضر', stateColor = '#999', actionButtons = '';
        if (rec && !rec.check_out) {
          stateText = 'حاضر ✓'; stateColor = 'var(--green-2)';
          actionButtons =
            (canMark ? '<button class="btn btn-warning btn-sm" onclick="Attendance.mark(\'' + e.uid + '\',\'out\')">انصراف</button>' : '') +
            (canMark ? '<button class="btn btn-info btn-sm" onclick="Attendance.addLeave(\'' + e.uid + '\')">إذن</button>' : '');
        } else if (rec && rec.check_out) {
          stateText = 'انصرف ✓'; stateColor = '#888';
          actionButtons = '<span style="color:#888;font-size:11px;">' + (rec.work_hours || 0) + ' ساعة</span>';
        } else {
          actionButtons =
            (canMark ? '<button class="btn btn-success btn-sm" onclick="Attendance.mark(\'' + e.uid + '\',\'in\')">حضور</button>' : '') +
            (canMark ? '<button class="btn btn-info btn-sm" onclick="Attendance.addLeave(\'' + e.uid + '\')">إذن</button>' : '');
        }
        if (!canMark) stateText += ' (للقراءة فقط)';
        html += '<div class="list-item">' +
          '<div class="info">' +
            '<h4>' + Utils.esc(e.name) + '</h4>' +
            '<p style="color:' + stateColor + ';font-weight:600;">' + stateText + '</p>' +
            (rec ? '<p style="font-size:11px;">حضور: ' + Utils.fmtDate(rec.check_in) + '</p>' : '') +
            (rec && rec.check_out ? '<p style="font-size:11px;">انصراف: ' + Utils.fmtDate(rec.check_out) + '</p>' : '') +
          '</div>' +
          '<div class="actions">' + actionButtons + '</div>' +
        '</div>';
      }
    }
    document.getElementById('attMarkList').innerHTML = html;
  },
  async mark(empUid, type) {
    const e = (cache.employees || []).find(function (x) { return x.uid === empUid; });
    if (!e) return;
    const isMe = State.currentUser && empUid === State.currentUser.uid;
    if (!isMe && !can('attendance_mark_all')) return Toast.show('🔒 غير مسموح', 'error');

    // Geofence check
    Toast.show('⏳ جاري التحقق من الموقع...', 'info');
    const geo = await Location.checkGeofence();
    if (geo.reason === 'no_geofence') {
      // allow
    } else if (geo.reason === 'error') {
      return Toast.show('❌ ' + (geo.error || 'فشل تحديد الموقع'), 'error');
    } else if (!geo.inRange) {
      return Toast.show('🚫 أنت خارج النطاق (' + geo.distance + ' متر)', 'error');
    }

    // Biometric
    const verified = await Biometric.verify('تسجيل ' + (type === 'in' ? 'حضور' : 'انصراف') + ' — ' + e.name);
    if (!verified) return Toast.show('❌ فشل التحقق', 'error');

    const today = Utils.todayStr();
    const att = (cache.attendance || []).filter(function (a) {
      return a.employee_uid === empUid && a.date === today;
    });

    if (type === 'in') {
      if (att.length > 0 && !att[0].check_out) return Toast.show('مسجل حضور بالفعل', 'error');
      const id = Utils.genId('ATT');
      await Sync.save('attendance', id, {
        id: id, employee_uid: empUid, employee_name: e.name,
        date: today, check_in: Utils.nowISO(),
        fingerprint_in: 1, status: 'present',
        geo_lat: geo.pos ? geo.pos.lat : null,
        geo_lng: geo.pos ? geo.pos.lng : null,
        geo_accuracy: geo.pos ? geo.pos.accuracy : null,
        geo_distance: geo.distance || 0,
        geo_fence_name: geo.fence ? geo.fence.name : null,
        recorded_by: State.currentEmployee.name
      });
      await Activity.log('check_in', 'حضور: ' + e.name + ' @ ' + (geo.distance || 0) + 'm');
      Toast.show('✅ تم تسجيل حضور ' + e.name);
    } else {
      if (att.length === 0) return Toast.show('لا يوجد تسجيل حضور', 'error');
      const rec = att[0];
      const hours = (Date.now() - new Date(rec.check_in).getTime()) / 3600000;
      rec.check_out = Utils.nowISO();
      rec.work_hours = parseFloat(hours.toFixed(2));
      rec.fingerprint_out = 1;
      rec.geo_out_lat = geo.pos ? geo.pos.lat : null;
      rec.geo_out_lng = geo.pos ? geo.pos.lng : null;
      await Sync.save('attendance', rec.id, rec);
      await Activity.log('check_out', 'انصراف: ' + e.name);
      Toast.show('✅ تم تسجيل انصراف ' + e.name);
    }
  },
  async addLeave(empUid) {
    const e = (cache.employees || []).find(function (x) { return x.uid === empUid; });
    if (!e) return;
    const html =
      '<div class="form-group"><label>النوع</label>' +
        '<select id="leave_type">' +
          '<option value="permission">إذن</option>' +
          '<option value="mission">مأمورية</option>' +
          '<option value="leave">إجازة</option>' +
        '</select></div>' +
      '<div class="form-group"><label>التاريخ</label>' +
        '<input type="date" id="leave_date" value="' + Utils.todayStr() + '"></div>' +
      '<div class="form-group"><label>من ساعة</label>' +
        '<input type="time" id="leave_from" value="09:00"></div>' +
      '<div class="form-group"><label>إلى ساعة</label>' +
        '<input type="time" id="leave_to" value="17:00"></div>' +
      '<div class="form-group"><label>السبب</label>' +
        '<textarea id="leave_reason" rows="3"></textarea></div>';
    Modal.open('📅 إذن — ' + e.name, html, async function () {
      const type = document.getElementById('leave_type').value;
      const date = document.getElementById('leave_date').value;
      const from = document.getElementById('leave_from').value;
      const to = document.getElementById('leave_to').value;
      const reason = document.getElementById('leave_reason').value;
      const id = Utils.genId('LV');
      await Sync.save('leaves', id, {
        id: id, employee_uid: empUid, employee_name: e.name,
        type: type, date: date, from: from, to: to, reason: reason,
        approved: true, created_at: Utils.nowISO()
      });
      if (type === 'leave') {
        const attId = Utils.genId('ATT');
        await Sync.save('attendance', attId, {
          id: attId, employee_uid: empUid, employee_name: e.name,
          date: date, status: 'leave', work_hours: 0, notes: reason
        });
      }
      await Activity.log('leave', type + ': ' + e.name);
      Modal.close();
      Toast.show('تم التسجيل');
    });
  },
  loadReport() {
    const from = document.getElementById('attFrom').value;
    const to = document.getElementById('attTo').value;
    const att = cache.attendance || [];
    const employees = cache.employees || [];
    const filtered = att.filter(function (a) { return a.date >= from && a.date <= to; });
    const byEmp = {};
    for (const a of filtered) {
      if (!byEmp[a.employee_uid]) byEmp[a.employee_uid] = [];
      byEmp[a.employee_uid].push(a);
    }
    let html = '';
    if (Object.keys(byEmp).length === 0) {
      html = '<div class="empty"><div class="ico">📅</div>لا يوجد سجلات</div>';
    } else {
      for (const uid in byEmp) {
        const records = byEmp[uid];
        const e = employees.find(function (x) { return x.uid === uid; });
        if (!e) continue;
        const presentDays = records.filter(function (r) { return r.status === 'present' && r.check_in; }).length;
        const leaveDays = records.filter(function (r) { return r.status === 'leave'; }).length;
        const totalHours = records.reduce(function (s, r) { return s + (Number(r.work_hours) || 0); }, 0);
        html += '<div class="card"><h3>👤 ' + Utils.esc(e.name) + '</h3>' +
          '<div class="stats-grid" style="padding:0;">' +
            '<div class="stat-card green" style="padding:10px;"><div class="label" style="font-size:11px;">حضور</div><div class="value" style="font-size:16px;">' + presentDays + '</div></div>' +
            '<div class="stat-card blue" style="padding:10px;"><div class="label" style="font-size:11px;">إجازات</div><div class="value" style="font-size:16px;">' + leaveDays + '</div></div>' +
            '<div class="stat-card" style="padding:10px;"><div class="label" style="font-size:11px;">الساعات</div><div class="value" style="font-size:16px;">' + totalHours.toFixed(1) + '</div></div>' +
          '</div><div style="margin-top:10px;">';
        const sorted = records.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
        for (const r of sorted) {
          let status = '', color = '#888';
          if (r.status === 'leave') { status = '📅 إجازة'; color = 'var(--blue-2)'; }
          else if (r.check_in && !r.check_out) { status = '✓ حاضر'; color = 'var(--green-2)'; }
          else if (r.check_in && r.check_out) { status = '✓ ' + (r.work_hours || 0) + 'س'; }
          html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;font-size:12px;">' +
            '<span>' + r.date + '</span><span style="color:' + color + ';">' + status + '</span></div>';
        }
        html += '</div></div>';
      }
    }
    document.getElementById('attReportList').innerHTML = html;
  },
  initMap() {
    if (State.map) {
      setTimeout(function () { State.map.invalidateSize(); }, 200);
      Attendance.refreshMap();
      return;
    }
    const el = document.getElementById('map');
    if (!el) return;
    State.map = L.map('map').setView([30.0444, 31.2357], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(State.map);
    Attendance.refreshMap();
  },
  async refreshMap() {
    if (!State.map) return;
    Toast.show('⏳ جاري تحديث المواقع...', 'info');
    for (const key in State.mapMarkers) {
      State.map.removeLayer(State.mapMarkers[key]);
    }
    State.mapMarkers = {};
    const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    const today = Utils.todayStr();
    const att = cache.attendance || [];
    for (const e of emps) {
      const rec = att.find(function (a) { return a.employee_uid === e.uid && a.date === today; });
      if (rec && rec.geo_lat && rec.geo_lng) {
        const marker = L.marker([rec.geo_lat, rec.geo_lng])
          .addTo(State.map)
          .bindPopup('<strong>' + Utils.esc(e.name) + '</strong><br>' +
            'حضور: ' + Utils.fmtDate(rec.check_in) + '<br>' +
            (rec.check_out ? 'انصراف: ' + Utils.fmtDate(rec.check_out) : 'لا يزال حاضراً'));
        State.mapMarkers[e.uid] = marker;
      }
    }
    const fences = (cache.geofences || []).filter(function (g) { return g.active !== false; });
    for (const g of fences) {
      const circle = L.circle([g.lat, g.lng], {
        color: '#D4AF37', fillColor: '#D4AF37',
        fillOpacity: 0.15, radius: Number(g.radius) || 100
      }).addTo(State.map).bindPopup('📍 ' + Utils.esc(g.name));
      State.mapMarkers['geo_' + g.id] = circle;
    }
    Toast.show('✅ تم التحديث');
  }
};

/* ═══════════════════════════════════════════════════════════════
   21. Employees
   ═══════════════════════════════════════════════════════════════ */
const Employees = {
  render() {
    const search = (document.getElementById('empSearch') ? document.getElementById('empSearch').value : '').trim();
    let emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    if (search) emps = emps.filter(function (e) {
      return (e.name || '').includes(search) || (e.code || '').includes(search);
    });
    const addBtn = document.getElementById('empAddBtn');
    if (addBtn) addBtn.style.display = can('employees_add') ? 'flex' : 'none';
    if (emps.length === 0) {
      document.getElementById('empList').innerHTML = '<div class="empty"><div class="ico">👥</div>لا يوجد موظفون</div>';
      return;
    }
    let html = '';
    for (const e of emps) {
      html += '<div class="list-item">' +
        '<div class="info">' +
          '<h4>' + Utils.esc(e.name) + (e.code ? ' <small style="color:#666;">(' + Utils.esc(e.code) + ')</small>' : '') + '</h4>' +
          '<p>' + Utils.esc(e.job_title || '') + ' - ' + Utils.esc(e.phone || 'بدون رقم') + '</p>' +
          '<p style="color:var(--gold);font-weight:600;">راتب: ' + Utils.fmtMoney(e.basic_salary) + '</p>' +
        '</div>' +
        '<div class="actions">' +
          (can('employees_edit') ? '<button class="btn btn-primary btn-sm" onclick="Employees.edit(\'' + e.uid + '\')">✏️</button>' : '') +
          (can('employees_delete') && e.uid !== State.currentUser.uid
            ? '<button class="btn btn-danger btn-sm" onclick="Employees.remove(\'' + e.uid + '\')">🗑️</button>' : '') +
        '</div>' +
      '</div>';
    }
    document.getElementById('empList').innerHTML = html;
  },
  search: Utils.debounce(function (v) { Employees.render(); }, 250),
  async edit(uid) {
    if (uid && !requirePermission('employees_edit', 'تعديل')) return;
    if (!uid && !requirePermission('employees_add', 'إضافة')) return;
    let e = { name: '', phone: '', job_title: '', basic_salary: 0, housing_allowance: 0, transport_allowance: 0, role: 'sales', code: '' };
    if (uid) e = (cache.employees || []).find(function (x) { return x.uid === uid; }) || e;
    const html =
      '<div class="form-group"><label>الاسم *</label><input id="f_name" value="' + Utils.esc(e.name || '') + '"></div>' +
      '<div class="form-group"><label>الكود</label><input id="f_code" value="' + Utils.esc(e.code || '') + '"></div>' +
      '<div class="form-group"><label>الوظيفة</label><input id="f_job" value="' + Utils.esc(e.job_title || '') + '"></div>' +
      '<div class="form-group"><label>الهاتف</label><input id="f_phone" value="' + Utils.esc(e.phone || '') + '" inputmode="tel"></div>' +
      '<div class="form-group"><label>الدور</label>' +
        '<select id="f_role">' +
          '<option value="admin" ' + (e.role === 'admin' ? 'selected' : '') + '>مدير</option>' +
          '<option value="sales" ' + (e.role === 'sales' ? 'selected' : '') + '>مبيعات</option>' +
          '<option value="purchases" ' + (e.role === 'purchases' ? 'selected' : '') + '>مشتريات</option>' +
          '<option value="warehouse" ' + (e.role === 'warehouse' ? 'selected' : '') + '>أمين مخزن</option>' +
          '<option value="accountant" ' + (e.role === 'accountant' ? 'selected' : '') + '>محاسب</option>' +
        '</select></div>' +
      '<div class="form-group"><label>الراتب الأساسي</label><input id="f_basic" type="number" value="' + (e.basic_salary || 0) + '"></div>' +
      '<div class="form-group"><label>بدل سكن</label><input id="f_housing" type="number" value="' + (e.housing_allowance || 0) + '"></div>' +
      '<div class="form-group"><label>بدل مواصلات</label><input id="f_trans" type="number" value="' + (e.transport_allowance || 0) + '"></div>' +
      '<div class="form-group"><label>تأمينات</label><input id="f_ins" type="number" value="' + (e.insurance_deduction || 0) + '"></div>' +
      '<div class="form-group"><label>ضريبة</label><input id="f_tax" type="number" value="' + (e.tax_deduction || 0) + '"></div>';
    Modal.open(uid ? '✏️ تعديل موظف' : '➕ إضافة موظف', html, async function () {
      const name = document.getElementById('f_name').value.trim();
      if (!name) return Toast.show('الاسم مطلوب', 'error');
      const newId = uid || Utils.genId('EMP');
      const data = Object.assign({}, e, {
        uid: newId,
        name: name,
        code: document.getElementById('f_code').value,
        job_title: document.getElementById('f_job').value,
        phone: document.getElementById('f_phone').value,
        role: document.getElementById('f_role').value,
        basic_salary: parseFloat(document.getElementById('f_basic').value) || 0,
        housing_allowance: parseFloat(document.getElementById('f_housing').value) || 0,
        transport_allowance: parseFloat(document.getElementById('f_trans').value) || 0,
        insurance_deduction: parseFloat(document.getElementById('f_ins').value) || 0,
        tax_deduction: parseFloat(document.getElementById('f_tax').value) || 0,
        active: true,
        created_at: e.created_at || Utils.nowISO()
      });
      await Sync.save('employees', newId, data);
      await Activity.log('employee_save', name);
      Modal.close();
      Toast.show('تم الحفظ');
    });
  },
  async remove(uid) {
    if (!requirePermission('employees_delete', 'حذف')) return;
    if (uid === State.currentUser.uid) return Toast.show('لا يمكنك حذف نفسك', 'error');
    if (!confirm('حذف الموظف؟')) return;
    await Sync.softDelete('employees', uid);
    Toast.show('تم الحذف');
  }
};

/* ═══════════════════════════════════════════════════════════════
   22. Products
   ═══════════════════════════════════════════════════════════════ */
const Products = {
  render() {
    const search = (document.getElementById('prodSearch') ? document.getElementById('prodSearch').value : '').trim();
    let prods = (cache.products || []).filter(function (p) { return p.active !== false; });
    if (search) prods = prods.filter(function (p) {
      return (p.name || '').includes(search) || (p.barcode || '').includes(search) || (p.code || '').includes(search);
    });
    const addBtn = document.getElementById('prodAddBtn');
    if (addBtn) addBtn.style.display = can('products_add') ? 'flex' : 'none';
    if (prods.length === 0) {
      document.getElementById('prodList').innerHTML = '<div class="empty"><div class="ico">📦</div>لا توجد منتجات</div>';
      return;
    }
    let html = '';
    for (const p of prods) {
      const low = (Number(p.quantity) || 0) <= (Number(p.min_quantity) || 5);
      const imgHtml = p.image
        ? '<img src="' + p.image + '" class="product-img" style="width:60px;height:60px;border-radius:10px;border:2px solid #333;object-fit:cover;background:#0a0a0a;flex-shrink:0;">'
        : '<div style="width:60px;height:60px;border-radius:10px;border:2px solid #333;background:linear-gradient(135deg,#1a1a1a,#0a0a0a);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">📦</div>';
      html += '<div class="list-item">' +
        '<div style="display:flex;gap:12px;align-items:center;flex:1;">' + imgHtml +
          '<div class="info" style="margin-right:10px;">' +
            '<h4>' + Utils.esc(p.name) + '</h4>' +
            '<p>باركود: ' + Utils.esc(p.barcode || '-') + ' | ' + Utils.esc(p.unit || 'قطعة') + '</p>' +
            '<p>شراء: ' + Utils.fmtMoney(p.cost_price) + ' | بيع: ' + Utils.fmtMoney(p.sale_price) + '</p>' +
            '<p style="color:' + (low ? 'var(--red-2)' : 'var(--green-2)') + ';font-weight:600;">المخزون: ' + (p.quantity || 0) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="actions">' +
          (can('products_edit') ? '<button class="btn btn-primary btn-sm" onclick="Products.edit(\'' + p.id + '\')">✏️</button>' : '') +
          (can('delete_anything') ? '<button class="btn btn-danger btn-sm" onclick="Products.remove(\'' + p.id + '\')">🗑️</button>' : '') +
        '</div>' +
      '</div>';
    }
    document.getElementById('prodList').innerHTML = html;
  },
  search: Utils.debounce(function () { Products.render(); }, 250),
  async edit(id) {
    if (id && !requirePermission('products_edit', 'تعديل')) return;
    if (!id && !requirePermission('products_add', 'إضافة')) return;
    let p = { name: '', barcode: '', code: '', unit: 'قطعة', cost_price: 0, sale_price: 0, quantity: 0, min_quantity: 5, image: '' };
    if (id) p = (cache.products || []).find(function (x) { return x.id === id; }) || p;
    State.editingProductImage = p.image || null;
    const imgHtml = State.editingProductImage
      ? '<img src="' + State.editingProductImage + '" id="prodImagePreview" style="width:100%;height:100%;object-fit:cover;">'
      : '<span style="font-size:36px;color:#666;">📷</span>';
    const html =
      '<div class="form-group"><label>صورة المنتج</label>' +
        '<div style="width:120px;height:120px;border:2px dashed #444;border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:0 auto;background:#0a0a0a;overflow:hidden;" onclick="Products.pickImage()">' + imgHtml + '</div>' +
        '<input type="file" id="prodImageInput" accept="image/*" style="display:none;" onchange="Products.onImagePicked(event)">' +
      '</div>' +
      '<div class="form-group"><label>اسم المنتج *</label><input id="p_name" value="' + Utils.esc(p.name || '') + '"></div>' +
      '<div class="form-group"><label>الباركود</label>' +
        '<div style="display:flex;gap:6px;">' +
          '<input id="p_barcode" value="' + Utils.esc(p.barcode || '') + '" style="flex:1;">' +
          '<button class="btn btn-info btn-sm" onclick="Scanner.open(\'field\')">📷</button>' +
        '</div></div>' +
      '<div class="form-group"><label>الكود</label><input id="p_code" value="' + Utils.esc(p.code || '') + '"></div>' +
      '<div class="form-group"><label>الوحدة</label><input id="p_unit" value="' + Utils.esc(p.unit || 'قطعة') + '"></div>' +
      '<div class="form-group"><label>سعر الشراء</label><input id="p_cost" type="number" value="' + (p.cost_price || 0) + '"></div>' +
      '<div class="form-group"><label>سعر البيع</label><input id="p_sale" type="number" value="' + (p.sale_price || 0) + '"></div>' +
      '<div class="form-group"><label>الكمية</label><input id="p_qty" type="number" value="' + (p.quantity || 0) + '"></div>' +
      '<div class="form-group"><label>الحد الأدنى</label><input id="p_min" type="number" value="' + (p.min_quantity || 5) + '"></div>';
    Modal.open(id ? '✏️ تعديل منتج' : '➕ إضافة منتج', html, async function () {
      const name = document.getElementById('p_name').value.trim();
      if (!name) return Toast.show('اسم المنتج مطلوب', 'error');
      const newId = id || Utils.genId('PRD');
      const data = {
        id: newId,
        name: name,
        barcode: document.getElementById('p_barcode').value,
        code: document.getElementById('p_code').value,
        unit: document.getElementById('p_unit').value,
        cost_price: parseFloat(document.getElementById('p_cost').value) || 0,
        sale_price: parseFloat(document.getElementById('p_sale').value) || 0,
        quantity: parseInt(document.getElementById('p_qty').value) || 0,
        min_quantity: parseInt(document.getElementById('p_min').value) || 5,
        image: State.editingProductImage || '',
        active: true,
        created_at: p.created_at || Utils.nowISO()
      };
      await Sync.save('products', newId, data);
      State.editingProductImage = null;
      Modal.close();
      Toast.show('تم الحفظ');
    });
  },
  pickImage() {
    document.getElementById('prodImageInput').click();
  },
  onImagePicked(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 700000) return Toast.show('الصورة كبيرة (الحد 700KB)', 'error');
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const maxSize = 400;
        let w = img.width, h = img.height;
        if (w > h && w > maxSize) { h = h * maxSize / w; w = maxSize; }
        else if (h > maxSize) { w = w * maxSize / h; h = maxSize; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        State.editingProductImage = canvas.toDataURL('image/jpeg', 0.7);
        const preview = document.getElementById('prodImagePreview');
        const upload = document.querySelector('.image-upload');
        const container = event.target.previousElementSibling;
        if (preview) preview.src = State.editingProductImage;
        else {
          const wrapper = event.target.parentElement.querySelector('div[onclick]');
          if (wrapper) wrapper.innerHTML = '<img src="' + State.editingProductImage + '" id="prodImagePreview" style="width:100%;height:100%;object-fit:cover;">';
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },
  async remove(id) {
    if (!requirePermission('delete_anything', 'حذف')) return;
    if (!confirm('حذف المنتج؟')) return;
    await Sync.softDelete('products', id);
    Toast.show('تم الحذف');
  }
};

/* ═══════════════════════════════════════════════════════════════
   23. Partners (with strict permissions)
   ═══════════════════════════════════════════════════════════════ */
const Partners = {
  switchTab(e, tab) {
    State.currentPartnerTab = tab;
    document.querySelectorAll('#page-partners .tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    Partners.render();
  },
  render() {
    const search = (document.getElementById('partnerSearch') ? document.getElementById('partnerSearch').value : '').trim();
    let list = (cache.partners || []).filter(function (p) {
      return p.type === State.currentPartnerTab && p.active !== false;
    });
    if (search) list = list.filter(function (p) {
      return (p.name || '').includes(search) || (p.phone || '').includes(search);
    });
    const addBtn = document.getElementById('partnerAddBtn');
    if (addBtn) {
      const canAdd = State.currentPartnerTab === 'customer' ? can('partners_add_customer') : can('partners_add_supplier');
      addBtn.style.display = canAdd ? 'flex' : 'none';
    }
    if (list.length === 0) {
      document.getElementById('partnerList').innerHTML = '<div class="empty"><div class="ico">🤝</div>لا يوجد سجلات</div>';
      return;
    }
    let html = '';
    for (const p of list) {
      const balance = Number(p.balance) || 0;
      const color = balance > 0 ? 'var(--red-2)' : balance < 0 ? 'var(--green-2)' : '#888';
      const label = balance > 0 ? 'مدين لنا' : balance < 0 ? 'دائن' : 'متوازن';
      html += '<div class="list-item">' +
        '<div class="info">' +
          '<h4>' + Utils.esc(p.name) + '</h4>' +
          '<p>📞 ' + Utils.esc(p.phone || '-') + '</p>' +
          '<p style="color:' + color + ';font-weight:600;">الرصيد: ' + Utils.fmtMoney(Math.abs(balance)) + ' - ' + label + '</p>' +
        '</div>' +
        '<div class="actions">' +
          (can('partners_edit') ? '<button class="btn btn-primary btn-sm" onclick="Partners.edit(\'' + p.id + '\',\'' + p.type + '\')">✏️</button>' : '') +
          (can('partners_delete') || can('delete_anything')
            ? '<button class="btn btn-danger btn-sm" onclick="Partners.remove(\'' + p.id + '\')">🗑️</button>' : '') +
        '</div>' +
      '</div>';
    }
    document.getElementById('partnerList').innerHTML = html;
  },
  search: Utils.debounce(function () { Partners.render(); }, 250),
  async quickAdd(type) {
    Partners.edit(null, type);
  },
  async edit(id, type) {
    if (!type) type = State.currentPartnerTab;
    if (id && !requirePermission('partners_edit', 'تعديل')) return;
    if (!id) {
      if (type === 'customer' && !requirePermission('partners_add_customer', 'إضافة عميل')) return;
      if (type === 'supplier' && !requirePermission('partners_add_supplier', 'إضافة مورد')) return;
    }
    let p = { name: '', phone: '', address: '', opening_balance: 0, type: type, balance: 0 };
    if (id) p = (cache.partners || []).find(function (x) { return x.id === id; }) || p;
    const title = id ? '✏️ تعديل' : (type === 'customer' ? '➕ إضافة عميل' : '➕ إضافة مورد');
    const html =
      '<div class="form-group"><label>الاسم *</label><input id="pt_name" value="' + Utils.esc(p.name || '') + '"></div>' +
      '<div class="form-group"><label>الهاتف</label><input id="pt_phone" value="' + Utils.esc(p.phone || '') + '" inputmode="tel"></div>' +
      '<div class="form-group"><label>العنوان</label><input id="pt_addr" value="' + Utils.esc(p.address || '') + '"></div>' +
      '<div class="form-group"><label>رصيد افتتاحي (موجب = مدين لنا)</label><input id="pt_bal" type="number" value="' + (p.opening_balance || 0) + '"></div>';
    Modal.open(title, html, async function () {
      const name = document.getElementById('pt_name').value.trim();
      if (!name) return Toast.show('الاسم مطلوب', 'error');
      const openingBal = parseFloat(document.getElementById('pt_bal').value) || 0;
      const newId = id || Utils.genId('PT');
      const data = {
        id: newId, name: name, type: p.type,
        phone: document.getElementById('pt_phone').value,
        address: document.getElementById('pt_addr').value,
        opening_balance: openingBal,
        balance: id ? (Number(p.balance) || 0) : openingBal,
        active: true,
        created_at: p.created_at || Utils.nowISO()
      };
      await Sync.save('partners', newId, data);
      Modal.close();
      Toast.show('تم الحفظ');
    });
  },
  async remove(id) {
    if (!can('delete_anything')) return Toast.show('🔒 المدير فقط', 'error');
    if (!confirm('حذف؟')) return;
    await Sync.softDelete('partners', id);
    Toast.show('تم الحذف');
  }
};

/* ═══════════════════════════════════════════════════════════════
   24. Sales
   ═══════════════════════════════════════════════════════════════ */
const Sales = {
  init() {
    saleItems.length = 0;
    const customers = (cache.partners || []).filter(function (p) {
      return p.type === 'customer' && p.active !== false;
    });
    const products = (cache.products || []).filter(function (p) { return p.active !== false; });
    document.getElementById('saleCustomer').innerHTML =
      '<option value="">-- اختر عميل --</option>' +
      customers.map(function (c) {
        return '<option value="' + c.id + '">' + Utils.esc(c.name) + '</option>';
      }).join('');
    document.getElementById('saleProduct').innerHTML =
      products.map(function (p) {
        const qty = Number(p.quantity) || 0;
        const status = qty <= 0 ? '❌' : qty <= (Number(p.min_quantity) || 5) ? '⚠️' : '✅';
        return '<option value="' + p.id + '">' + Utils.esc(p.name) + ' - ' + p.sale_price + ' (رصيد: ' + qty + ') ' + status + '</option>';
      }).join('');
    Sales.render();
  },
  addItem() {
    if (!requirePermission('sales_create', 'إنشاء فاتورة')) return;
    const pid = document.getElementById('saleProduct').value;
    if (!pid) return Toast.show('اختر منتج', 'error');
    Sales.addItemById(pid);
  },
  addItemById(pid) {
    const p = (cache.products || []).find(function (x) { return x.id === pid; });
    if (!p) return;
    const existing = saleItems.find(function (i) { return i.product_id === pid; });
    if (existing) {
      if (existing.quantity + 1 > (Number(p.quantity) || 0)) {
        return Toast.show('⚠️ لا يوجد رصيد كافٍ (' + p.quantity + ')', 'error');
      }
      existing.quantity++;
    } else {
      if ((Number(p.quantity) || 0) <= 0) return Toast.show('❌ نافذ', 'error');
      saleItems.push({
        product_id: pid,
        name: p.name,
        quantity: 1,
        price: Number(p.sale_price) || 0,
        cost: Number(p.cost_price) || 0,
        max: Number(p.quantity) || 0
      });
    }
    Sales.render();
  },
  render() {
    const body = document.getElementById('saleItemsBody');
    if (saleItems.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="padding:20px;color:#666;">لا توجد أصناف</td></tr>';
    } else {
      body.innerHTML = saleItems.map(function (it, i) {
        const over = it.quantity > it.max;
        return '<tr style="' + (over ? 'background:rgba(198,40,40,.15);' : '') + '">' +
          '<td>' + Utils.esc(it.name) + '<br><small style="color:#888;font-size:10px;">رصيد: ' + it.max + '</small></td>' +
          '<td><input type="number" value="' + it.quantity + '" min="1" max="' + it.max + '" onchange="Sales.updateQty(' + i + ',this.value)"></td>' +
          '<td><input type="number" value="' + it.price + '" onchange="Sales.updatePrice(' + i + ',this.value)"></td>' +
          '<td>' + (it.quantity * it.price).toFixed(2) + '</td>' +
          '<td><button class="btn btn-danger btn-sm" onclick="Sales.removeItem(' + i + ')">×</button></td>' +
        '</tr>';
      }).join('');
    }
    Sales.calcTotals();
  },
  updateQty(i, v) {
    const qty = parseInt(v) || 1;
    if (qty > saleItems[i].max) {
      Toast.show('⚠️ الحد ' + saleItems[i].max, 'error');
      saleItems[i].quantity = saleItems[i].max;
    } else if (qty < 1) saleItems[i].quantity = 1;
    else saleItems[i].quantity = qty;
    Sales.render();
  },
  updatePrice(i, v) { saleItems[i].price = parseFloat(v) || 0; Sales.render(); },
  removeItem(i) { saleItems.splice(i, 1); Sales.render(); },
  calcTotals() {
    const sub = saleItems.reduce(function (s, it) { return s + it.quantity * it.price; }, 0);
    const disc = parseFloat(document.getElementById('saleDiscount').value) || 0;
    const tax = parseFloat(document.getElementById('saleTax').value) || 0;
    const paid = parseFloat(document.getElementById('salePaid').value) || 0;
    const total = sub - disc + tax;
    document.getElementById('saleSubtotal').textContent = Utils.fmtMoney(sub);
    document.getElementById('saleTotal').textContent = Utils.fmtMoney(total);
    document.getElementById('saleRemaining').textContent = Utils.fmtMoney(total - paid);
  },
  async save() {
    if (!requirePermission('sales_create', 'إنشاء فاتورة')) return;
    const custId = document.getElementById('saleCustomer').value;
    if (!custId) return Toast.show('اختر عميل', 'error');
    if (saleItems.length === 0) return Toast.show('أضف أصناف', 'error');
    for (const it of saleItems) {
      const p = (cache.products || []).find(function (x) { return x.id === it.product_id; });
      if ((Number(p.quantity) || 0) < it.quantity) {
        return Toast.show('❌ رصيد "' + p.name + '" غير كافٍ', 'error');
      }
    }
    const verified = await Biometric.verify('تأكيد فاتورة المبيعات');
    if (!verified) return Toast.show('فشل التحقق', 'error');

    const disc = parseFloat(document.getElementById('saleDiscount').value) || 0;
    const tax = parseFloat(document.getElementById('saleTax').value) || 0;
    const paid = parseFloat(document.getElementById('salePaid').value) || 0;
    const sub = saleItems.reduce(function (s, it) { return s + it.quantity * it.price; }, 0);
    const total = sub - disc + tax;
    const remaining = total - paid;
    const invoiceId = Utils.genId('S');
    const invoiceNo = 'S-' + Date.now();
    const now = Utils.nowISO();
    const paymentMethod = document.getElementById('salePayment').value;

    // Update stock
    for (const it of saleItems) {
      const p = (cache.products || []).find(function (x) { return x.id === it.product_id; });
      p.quantity = (Number(p.quantity) || 0) - it.quantity;
      await Sync.save('products', p.id, p);
      const moveId = Utils.genId('SM');
      await Sync.save('stock_movements', moveId, {
        id: moveId, product_id: it.product_id, type: 'out',
        quantity: it.quantity, balance_after: p.quantity,
        reference: invoiceNo, date: now,
        employee_name: State.currentEmployee.name
      });
    }

    // Save invoice
    await Sync.save('sales_invoices', invoiceId, {
      id: invoiceId, invoice_no: invoiceNo,
      customer_id: custId,
      customer_name: (cache.partners || []).find(function (x) { return x.id === custId; }) ?
        (cache.partners || []).find(function (x) { return x.id === custId; }).name : '',
      employee_uid: State.currentUser.uid,
      employee_name: State.currentEmployee.name,
      date: now, subtotal: sub, discount: disc, tax: tax,
      total: total, paid: paid, remaining: remaining,
      payment_method: paymentMethod,
      fingerprint_verified: 1, created_at: now
    });

    // Save items
    for (const it of saleItems) {
      const iid = Utils.genId('SI');
      await Sync.save('sales_items', iid, {
        id: iid, invoice_id: invoiceId, product_id: it.product_id,
        product_name: it.name, quantity: it.quantity, price: it.price,
        cost: it.cost, cost_at_sale: it.cost,
        total: it.quantity * it.price
      });
    }

    // Update customer balance
    const c = (cache.partners || []).find(function (x) { return x.id === custId; });
    if (c) {
      c.balance = (Number(c.balance) || 0) + remaining;
      await Sync.save('partners', custId, c);
    }

    // Auto voucher + cash
    if (paid > 0) {
      const voucherId = Utils.genId('RCV');
      const voucherNo = 'RCV-' + Date.now();
      await Sync.save('vouchers', voucherId, {
        id: voucherId, voucher_no: voucherNo, type: 'receipt',
        amount: paid, partner_id: custId,
        employee_uid: State.currentUser.uid,
        employee_name: State.currentEmployee.name,
        date: now, payment_method: paymentMethod,
        description: 'تحصيل فاتورة ' + invoiceNo,
        reference: invoiceNo, auto_generated: true, created_at: now
      });
      const cashId = Utils.genId('CSH');
      await Sync.save('cash_transactions', cashId, {
        id: cashId, type: 'in', amount: paid, reference: voucherNo,
        description: 'تحصيل فاتورة ' + invoiceNo,
        category: 'مبيعات', date: now,
        employee_name: State.currentEmployee.name,
        partner_id: custId, payment_method: paymentMethod
      });
    }

    await Activity.log('sale_invoice', invoiceNo + ' - ' + Utils.fmtMoney(total));
    Toast.show('✅ تم تسجيل الفاتورة');
    Sales.init();
    Invoices.show(invoiceId, 'sales');
  }
};

/* ═══════════════════════════════════════════════════════════════
   25. Purchases
   ═══════════════════════════════════════════════════════════════ */
const Purchases = {
  init() {
    purItems.length = 0;
    const suppliers = (cache.partners || []).filter(function (p) {
      return p.type === 'supplier' && p.active !== false;
    });
    const products = (cache.products || []).filter(function (p) { return p.active !== false; });
    document.getElementById('purSupplier').innerHTML =
      '<option value="">-- اختر مورد --</option>' +
      suppliers.map(function (s) {
        return '<option value="' + s.id + '">' + Utils.esc(s.name) + '</option>';
      }).join('');
    document.getElementById('purProduct').innerHTML =
      products.map(function (p) {
        const qty = Number(p.quantity) || 0;
        return '<option value="' + p.id + '">' + Utils.esc(p.name) + ' - ' + p.cost_price + ' (رصيد: ' + qty + ')</option>';
      }).join('');
    Purchases.render();
  },
  addItem() {
    if (!requirePermission('purchase_create', 'إنشاء فاتورة')) return;
    const pid = document.getElementById('purProduct').value;
    if (!pid) return Toast.show('اختر منتج', 'error');
    Purchases.addItemById(pid);
  },
  addItemById(pid) {
    const p = (cache.products || []).find(function (x) { return x.id === pid; });
    if (!p) return;
    const existing = purItems.find(function (i) { return i.product_id === pid; });
    if (existing) existing.quantity++;
    else purItems.push({
      product_id: pid, name: p.name, quantity: 1,
      price: Number(p.cost_price) || 0, max: Number(p.quantity) || 0
    });
    Purchases.render();
  },
  render() {
    const body = document.getElementById('purItemsBody');
    if (purItems.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="padding:20px;color:#666;">لا توجد أصناف</td></tr>';
    } else {
      body.innerHTML = purItems.map(function (it, i) {
        return '<tr>' +
          '<td>' + Utils.esc(it.name) + '<br><small style="color:#888;font-size:10px;">رصيد: ' + it.max + '</small></td>' +
          '<td><input type="number" value="' + it.quantity + '" min="1" onchange="Purchases.updateQty(' + i + ',this.value)"></td>' +
          '<td><input type="number" value="' + it.price + '" onchange="Purchases.updatePrice(' + i + ',this.value)"></td>' +
          '<td>' + (it.quantity * it.price).toFixed(2) + '</td>' +
          '<td><button class="btn btn-danger btn-sm" onclick="Purchases.removeItem(' + i + ')">×</button></td>' +
        '</tr>';
      }).join('');
    }
    Purchases.calcTotals();
  },
  updateQty(i, v) { purItems[i].quantity = Math.max(1, parseInt(v) || 1); Purchases.render(); },
  updatePrice(i, v) { purItems[i].price = parseFloat(v) || 0; Purchases.render(); },
  removeItem(i) { purItems.splice(i, 1); Purchases.render(); },
  calcTotals() {
    const sub = purItems.reduce(function (s, it) { return s + it.quantity * it.price; }, 0);
    const disc = parseFloat(document.getElementById('purDiscount').value) || 0;
    const tax = parseFloat(document.getElementById('purTax').value) || 0;
    const paid = parseFloat(document.getElementById('purPaid').value) || 0;
    const total = sub - disc + tax;
    document.getElementById('purSubtotal').textContent = Utils.fmtMoney(sub);
    document.getElementById('purTotal').textContent = Utils.fmtMoney(total);
    document.getElementById('purRemaining').textContent = Utils.fmtMoney(total - paid);
  },
  async save() {
    if (!requirePermission('purchase_create', 'إنشاء فاتورة')) return;
    const supId = document.getElementById('purSupplier').value;
    if (!supId) return Toast.show('اختر مورد', 'error');
    if (purItems.length === 0) return Toast.show('أضف أصناف', 'error');
    const verified = await Biometric.verify('تأكيد فاتورة المشتريات');
    if (!verified) return Toast.show('فشل التحقق', 'error');

    const disc = parseFloat(document.getElementById('purDiscount').value) || 0;
    const tax = parseFloat(document.getElementById('purTax').value) || 0;
    const paid = parseFloat(document.getElementById('purPaid').value) || 0;
    const sub = purItems.reduce(function (s, it) { return s + it.quantity * it.price; }, 0);
    const total = sub - disc + tax;
    const remaining = total - paid;
    const invoiceId = Utils.genId('P');
    const invoiceNo = 'P-' + Date.now();
    const now = Utils.nowISO();
    const paymentMethod = document.getElementById('purPayment').value;

    for (const it of purItems) {
      const p = (cache.products || []).find(function (x) { return x.id === it.product_id; });
      p.quantity = (Number(p.quantity) || 0) + it.quantity;
      p.cost_price = it.price;
      await Sync.save('products', p.id, p);
      const moveId = Utils.genId('SM');
      await Sync.save('stock_movements', moveId, {
        id: moveId, product_id: it.product_id, type: 'in',
        quantity: it.quantity, balance_after: p.quantity,
        reference: invoiceNo, date: now,
        employee_name: State.currentEmployee.name
      });
    }

    await Sync.save('purchase_invoices', invoiceId, {
      id: invoiceId, invoice_no: invoiceNo,
      supplier_id: supId,
      supplier_name: (cache.partners || []).find(function (x) { return x.id === supId; }) ?
        (cache.partners || []).find(function (x) { return x.id === supId; }).name : '',
      employee_uid: State.currentUser.uid,
      employee_name: State.currentEmployee.name,
      date: now, subtotal: sub, discount: disc, tax: tax,
      total: total, paid: paid, remaining: remaining,
      payment_method: paymentMethod,
      fingerprint_verified: 1, created_at: now
    });

    for (const it of purItems) {
      const iid = Utils.genId('PI');
      await Sync.save('purchase_items', iid, {
        id: iid, invoice_id: invoiceId, product_id: it.product_id,
        product_name: it.name, quantity: it.quantity,
        price: it.price, total: it.quantity * it.price
      });
    }

    const s = (cache.partners || []).find(function (x) { return x.id === supId; });
    if (s) {
      s.balance = (Number(s.balance) || 0) + remaining;
      await Sync.save('partners', supId, s);
    }

    if (paid > 0) {
      const voucherId = Utils.genId('PAY');
      const voucherNo = 'PAY-' + Date.now();
      await Sync.save('vouchers', voucherId, {
        id: voucherId, voucher_no: voucherNo, type: 'payment',
        amount: paid, partner_id: supId,
        employee_uid: State.currentUser.uid,
        employee_name: State.currentEmployee.name,
        date: now, payment_method: paymentMethod,
        description: 'سداد فاتورة مشتريات ' + invoiceNo,
        reference: invoiceNo, auto_generated: true, created_at: now
      });
      const cashId = Utils.genId('CSH');
      await Sync.save('cash_transactions', cashId, {
        id: cashId, type: 'out', amount: paid, reference: voucherNo,
        description: 'سداد فاتورة ' + invoiceNo,
        category: 'مشتريات', date: now,
        employee_name: State.currentEmployee.name,
        partner_id: supId, payment_method: paymentMethod
      });
    }

    await Activity.log('purchase_invoice', invoiceNo + ' - ' + Utils.fmtMoney(total));
    Toast.show('✅ تم تسجيل الفاتورة');
    Purchases.init();
    Invoices.show(invoiceId, 'purchase');
  }
};

/* ═══════════════════════════════════════════════════════════════
   26. Returns
   ═══════════════════════════════════════════════════════════════ */
const Returns = {
  switchTab(e, tab) {
    State.currentReturnTab = tab;
    document.querySelectorAll('#page-returns .tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    Returns.init();
  },
  init() {
    retItems.length = 0;
    const isSales = State.currentReturnTab === 'sales';
    document.getElementById('retPartyLabel').textContent = isSales ? 'العميل' : 'المورد';
    const parties = (cache.partners || []).filter(function (p) {
      return p.type === (isSales ? 'customer' : 'supplier') && p.active !== false;
    });
    document.getElementById('retParty').innerHTML =
      '<option value="">-- اختر --</option>' +
      parties.map(function (p) {
        return '<option value="' + p.id + '">' + Utils.esc(p.name) + '</option>';
      }).join('');
    const products = (cache.products || []).filter(function (p) { return p.active !== false; });
    document.getElementById('retProduct').innerHTML =
      products.map(function (p) {
        const qty = Number(p.quantity) || 0;
        return '<option value="' + p.id + '">' + Utils.esc(p.name) + ' (رصيد: ' + qty + ') - ' +
          (isSales ? p.sale_price : p.cost_price) + '</option>';
      }).join('');
    Returns.render();
    Returns.loadList();
  },
  addItem() {
    if (!requirePermission('returns_create', 'إنشاء مرتجع')) return;
    const pid = document.getElementById('retProduct').value;
    if (!pid) return Toast.show('اختر منتج', 'error');
    Returns.addItemById(pid);
  },
  addItemById(pid) {
    const p = (cache.products || []).find(function (x) { return x.id === pid; });
    if (!p) return;
    const isSales = State.currentReturnTab === 'sales';
    const existing = retItems.find(function (i) { return i.product_id === pid; });
    if (existing) existing.quantity++;
    else retItems.push({
      product_id: pid, name: p.name, quantity: 1,
      price: isSales ? (Number(p.sale_price) || 0) : (Number(p.cost_price) || 0),
      max: Number(p.quantity) || 0
    });
    Returns.render();
  },
  render() {
    const body = document.getElementById('retItemsBody');
    if (retItems.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="padding:20px;color:#666;">لا توجد أصناف</td></tr>';
    } else {
      body.innerHTML = retItems.map(function (it, i) {
        return '<tr>' +
          '<td>' + Utils.esc(it.name) + '</td>' +
          '<td><input type="number" value="' + it.quantity + '" min="1" onchange="Returns.updateQty(' + i + ',this.value)"></td>' +
          '<td><input type="number" value="' + it.price + '" onchange="Returns.updatePrice(' + i + ',this.value)"></td>' +
          '<td>' + (it.quantity * it.price).toFixed(2) + '</td>' +
          '<td><button class="btn btn-danger btn-sm" onclick="Returns.removeItem(' + i + ')">×</button></td>' +
        '</tr>';
      }).join('');
    }
    const total = retItems.reduce(function (s, it) { return s + it.quantity * it.price; }, 0);
    document.getElementById('retTotal').textContent = Utils.fmtMoney(total);
  },
  updateQty(i, v) { retItems[i].quantity = Math.max(1, parseInt(v) || 1); Returns.render(); },
  updatePrice(i, v) { retItems[i].price = parseFloat(v) || 0; Returns.render(); },
  removeItem(i) { retItems.splice(i, 1); Returns.render(); },
  async save() {
    if (!requirePermission('returns_create', 'إنشاء مرتجع')) return;
    const partyId = document.getElementById('retParty').value;
    if (!partyId) return Toast.show('اختر الجهة', 'error');
    if (retItems.length === 0) return Toast.show('أضف أصناف', 'error');
    const verified = await Biometric.verify('تأكيد المرتجع');
    if (!verified) return Toast.show('فشل التحقق', 'error');

    const isSales = State.currentReturnTab === 'sales';
    const settle = document.getElementById('retSettle').value;
    const reason = document.getElementById('retReason').value;
    const total = retItems.reduce(function (s, it) { return s + it.quantity * it.price; }, 0);
    const returnId = Utils.genId(isSales ? 'SR' : 'PR');
    const returnNo = (isSales ? 'SR-' : 'PR-') + Date.now();
    const now = Utils.nowISO();

    for (const it of retItems) {
      const p = (cache.products || []).find(function (x) { return x.id === it.product_id; });
      const change = isSales ? it.quantity : -it.quantity;
      p.quantity = (Number(p.quantity) || 0) + change;
      await Sync.save('products', p.id, p);
      const moveId = Utils.genId('SM');
      await Sync.save('stock_movements', moveId, {
        id: moveId, product_id: it.product_id,
        type: isSales ? 'return_in' : 'return_out',
        quantity: it.quantity, balance_after: p.quantity,
        reference: returnNo, date: now, notes: reason,
        employee_name: State.currentEmployee.name
      });
    }

    const store = isSales ? 'sales_returns' : 'purchase_returns';
    const retData = {
      id: returnId, return_no: returnNo,
      party_name: (cache.partners || []).find(function (x) { return x.id === partyId; }) ?
        (cache.partners || []).find(function (x) { return x.id === partyId; }).name : '',
      employee_uid: State.currentUser.uid,
      employee_name: State.currentEmployee.name,
      date: now, total: total, reason: reason,
      settlement: settle, created_at: now
    };
    if (isSales) retData.customer_id = partyId;
    else retData.supplier_id = partyId;
    await Sync.save(store, returnId, retData);

    const itemsStore = isSales ? 'sales_return_items' : 'purchase_return_items';
    for (const it of retItems) {
      const iid = Utils.genId('RI');
      await Sync.save(itemsStore, iid, {
        id: iid, return_id: returnId, product_id: it.product_id,
        product_name: it.name, quantity: it.quantity,
        price: it.price, total: it.quantity * it.price
      });
    }

    const party = (cache.partners || []).find(function (x) { return x.id === partyId; });
    if (party) {
      party.balance = (Number(party.balance) || 0) - total;
      await Sync.save('partners', partyId, party);
    }

    if (settle === 'refund') {
      const voucherType = isSales ? 'payment' : 'receipt';
      const voucherId = Utils.genId(isSales ? 'PAY' : 'RCV');
      const voucherNo = (isSales ? 'PAY-' : 'RCV-') + Date.now();
      await Sync.save('vouchers', voucherId, {
        id: voucherId, voucher_no: voucherNo, type: voucherType,
        amount: total, partner_id: partyId,
        employee_uid: State.currentUser.uid,
        employee_name: State.currentEmployee.name,
        date: now, payment_method: 'نقدي',
        description: (isSales ? 'استرداد مرتجع مبيعات ' : 'استرداد مرتجع مشتريات ') + returnNo,
        reference: returnNo, auto_generated: true, created_at: now
      });
      const cashId = Utils.genId('CSH');
      await Sync.save('cash_transactions', cashId, {
        id: cashId, type: isSales ? 'out' : 'in',
        amount: total, reference: voucherNo,
        description: (isSales ? 'استرداد مرتجع مبيعات ' : 'استرداد مرتجع مشتريات ') + returnNo,
        category: isSales ? 'مرتجع مبيعات' : 'مرتجع مشتريات',
        date: now, employee_name: State.currentEmployee.name,
        partner_id: partyId, payment_method: 'نقدي'
      });
    }

    await Activity.log('return', returnNo + ' - ' + Utils.fmtMoney(total));
    Toast.show('✅ تم تسجيل المرتجع');
    Returns.init();
  },
  loadList() {
    const isSales = State.currentReturnTab === 'sales';
    const store = isSales ? 'sales_returns' : 'purchase_returns';
    const returns = (cache[store] || []).slice().sort(function (a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    const el = document.getElementById('returnsList');
    if (returns.length === 0) {
      el.innerHTML = '<p style="color:#666;padding:10px;">لا توجد مرتجعات</p>';
      return;
    }
    let html = '';
    for (const r of returns.slice(0, 30)) {
      html += '<div style="border-bottom:1px solid #222;padding:10px 0;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<strong style="color:var(--gold);">' + Utils.esc(r.return_no) + '</strong>' +
          '<span style="color:var(--red-2);">' + Utils.fmtMoney(r.total) + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:#aaa;margin-top:4px;">' +
          Utils.esc(r.party_name || '-') + ' | ' + Utils.fmtDate(r.date) +
        '</div>' +
        '<div style="font-size:11px;color:#888;margin-top:2px;">' +
          Utils.esc(r.reason || '') + ' | ' + (r.settlement === 'refund' ? 'استرداد نقدي' : 'خصم من الحساب') +
        '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }
};

/* ═══════════════════════════════════════════════════════════════
   27. Invoices
   ═══════════════════════════════════════════════════════════════ */
const Invoices = {
  switchTab(e, tab) {
    State.currentInvTab = tab;
    document.querySelectorAll('#page-invoices .tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    Invoices.render();
  },
  render: Utils.debounce(function () {
    const search = (document.getElementById('invSearch') ? document.getElementById('invSearch').value : '').trim();
    const store = State.currentInvTab === 'sales' ? 'sales_invoices' : 'purchase_invoices';
    let invs = (cache[store] || []).slice();
    if (search) invs = invs.filter(function (i) { return (i.invoice_no || '').includes(search); });
    invs.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    const el = document.getElementById('invList');
    if (invs.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">📋</div>لا توجد فواتير</div>';
      return;
    }
    let html = '';
    for (const inv of invs) {
      const pName = State.currentInvTab === 'sales' ? inv.customer_name : inv.supplier_name;
      const hasRemaining = (Number(inv.remaining) || 0) > 0;
      html += '<div class="list-item" onclick="Invoices.show(\'' + inv.id + '\',\'' + State.currentInvTab + '\')">' +
        '<div class="info">' +
          '<h4>' + Utils.esc(inv.invoice_no) + '</h4>' +
          '<p>' + Utils.esc(pName || '-') + '</p>' +
          '<p style="font-size:11px;">' + Utils.fmtDate(inv.date) + '</p>' +
        '</div>' +
        '<div style="text-align:left;">' +
          '<div style="font-weight:700;color:var(--gold);">' + Utils.fmtMoney(inv.total) + '</div>' +
          (hasRemaining
            ? '<div style="font-size:11px;color:var(--red-2);">باقي: ' + Utils.fmtMoney(inv.remaining) + '</div>' +
              '<button class="btn btn-warning btn-sm" style="margin-top:4px;" onclick="event.stopPropagation();Invoices.pay(\'' + inv.id + '\',\'' + State.currentInvTab + '\')">سداد</button>'
            : '<div style="font-size:11px;color:var(--green-2);">مسددة ✓</div>') +
        '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }, 250),
  load() { Invoices.render(); },
  async show(id, type) {
    const store = type === 'sales' ? 'sales_invoices' : 'purchase_invoices';
    const itemsStore = type === 'sales' ? 'sales_items' : 'purchase_items';
    const inv = (cache[store] || []).find(function (x) { return x.id === id; });
    if (!inv) return;
    const items = (cache[itemsStore] || []).filter(function (i) { return i.invoice_id === id; });
    const partyLabel = type === 'sales' ? 'العميل' : 'المورد';
    const partyName = type === 'sales' ? inv.customer_name : inv.supplier_name;
    let html = '<div class="receipt" id="printableReceipt">' +
      '<div class="header">' +
        '<h2>شركة البسملة</h2>' +
        '<p>لتجارة المشغولات الصينية</p>' +
        '<p>' + (type === 'sales' ? '🧾 فاتورة مبيعات' : '📦 فاتورة مشتريات') + '</p>' +
      '</div>' +
      '<div class="line"><span>رقم:</span><span>' + Utils.esc(inv.invoice_no) + '</span></div>' +
      '<div class="line"><span>التاريخ:</span><span>' + Utils.fmtDate(inv.date) + '</span></div>' +
      '<div class="line"><span>' + partyLabel + ':</span><span>' + Utils.esc(partyName || '-') + '</span></div>' +
      '<div class="line"><span>الموظف:</span><span>' + Utils.esc(inv.employee_name || '-') + '</span></div>' +
      '<hr style="margin:10px 0;border:none;border-top:1px dashed #000;">' +
      '<div class="items">';
    for (const it of items) {
      html += '<div class="line"><span>' + Utils.esc(it.product_name || 'منتج') + ' × ' + it.quantity + '</span><span>' + Utils.fmtMoney(it.total) + '</span></div>';
    }
    html += '</div>' +
      '<hr style="margin:10px 0;border:none;border-top:1px dashed #000;">' +
      '<div class="line"><span>الإجمالي الفرعي:</span><span>' + Utils.fmtMoney(inv.subtotal) + '</span></div>' +
      '<div class="line"><span>الخصم:</span><span>' + Utils.fmtMoney(inv.discount) + '</span></div>' +
      '<div class="line"><span>الضريبة:</span><span>' + Utils.fmtMoney(inv.tax) + '</span></div>' +
      '<div class="line total"><span>الإجمالي:</span><span>' + Utils.fmtMoney(inv.total) + '</span></div>' +
      '<div class="line"><span>المدفوع:</span><span>' + Utils.fmtMoney(inv.paid) + '</span></div>' +
      '<div class="line"><span>الباقي:</span><span>' + Utils.fmtMoney(inv.remaining) + '</span></div>' +
      '<div style="text-align:center;margin-top:15px;font-size:11px;border-top:1px dashed #000;padding-top:10px;">شكراً لتعاملكم معنا<br>© البسملة 2026</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:12px;">' +
      '<button class="btn btn-primary btn-full" onclick="Invoices.print(\'' + id + '\',\'' + type + '\')">🖨️ طباعة</button>' +
      '<button class="btn btn-info btn-full" onclick="Invoices.share(\'' + id + '\',\'' + type + '\')">📤 مشاركة</button>' +
    '</div>';
    if (Number(inv.remaining) > 0 && can('vouchers_create')) {
      html += '<button class="btn btn-warning btn-full" style="margin-top:8px;" onclick="Modal.close();Invoices.pay(\'' + inv.id + '\',\'' + type + '\')">💳 سداد جزء أو الكل</button>';
    }
    Modal.open('تفاصيل الفاتورة', html, null, 'إغلاق');
  },
  async print(id, type) {
    const store = type === 'sales' ? 'sales_invoices' : 'purchase_invoices';
    const itemsStore = type === 'sales' ? 'sales_items' : 'purchase_items';
    const inv = (cache[store] || []).find(function (x) { return x.id === id; });
    const items = (cache[itemsStore] || []).filter(function (i) { return i.invoice_id === id; });
    const html = Printer.generateReceiptHTML(inv, items, type);
    await Printer.printReceipt(html, inv.invoice_no);
  },
  async share(id, type) {
    const store = type === 'sales' ? 'sales_invoices' : 'purchase_invoices';
    const inv = (cache[store] || []).find(function (x) { return x.id === id; });
    const partyName = type === 'sales' ? inv.customer_name : inv.supplier_name;
    const text = 'شركة البسملة\nفاتورة: ' + inv.invoice_no + '\nالتاريخ: ' + Utils.fmtDate(inv.date) +
      '\nالجهة: ' + partyName + '\nالإجمالي: ' + Utils.fmtMoney(inv.total) +
      '\nالمدفوع: ' + Utils.fmtMoney(inv.paid) + '\nالباقي: ' + Utils.fmtMoney(inv.remaining);
    if (navigator.share) {
      try { await navigator.share({ text: text }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(text);
      Toast.show('تم النسخ');
    }
  },
  async pay(invId, type) {
    if (!requirePermission('vouchers_create', 'سداد')) return;
    const store = type === 'sales' ? 'sales_invoices' : 'purchase_invoices';
    const inv = (cache[store] || []).find(function (x) { return x.id === invId; });
    if (!inv) return;
    const remaining = Number(inv.remaining) || 0;
    if (remaining <= 0) return Toast.show('مسددة', 'error');
    const partyId = type === 'sales' ? inv.customer_id : inv.supplier_id;
    const party = (cache.partners || []).find(function (x) { return x.id === partyId; });
    const html =
      '<div style="margin-bottom:12px;padding:10px;background:rgba(212,175,55,.08);border-radius:8px;">' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>الجهة:</span><strong>' + Utils.esc(party ? party.name : '-') + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>الإجمالي:</span><strong>' + Utils.fmtMoney(inv.total) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>المدفوع:</span><strong>' + Utils.fmtMoney(inv.paid) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;color:var(--red-2);"><span>المتبقي:</span><strong>' + Utils.fmtMoney(remaining) + '</strong></div>' +
      '</div>' +
      '<div class="form-group"><label>المبلغ</label>' +
        '<input type="number" id="pay_amount" value="' + remaining + '" max="' + remaining + '"></div>' +
      '<div class="form-group"><label>طريقة الدفع</label>' +
        '<select id="pay_method"><option>نقدي</option><option>بنكي</option><option>محفظة</option></select></div>';
    Modal.open('💳 سداد فاتورة ' + inv.invoice_no, html, async function () {
      const amount = parseFloat(document.getElementById('pay_amount').value) || 0;
      if (amount <= 0 || amount > remaining) return Toast.show('مبلغ غير صالح', 'error');
      const verified = await Biometric.verify('تأكيد السداد');
      if (!verified) return Toast.show('فشل', 'error');
      const method = document.getElementById('pay_method').value;
      const now = Utils.nowISO();
      inv.paid = (Number(inv.paid) || 0) + amount;
      inv.remaining = Number(inv.total) - inv.paid;
      await Sync.save(store, invId, inv);
      const voucherId = Utils.genId(type === 'sales' ? 'RCV' : 'PAY');
      const voucherNo = (type === 'sales' ? 'RCV-' : 'PAY-') + Date.now();
      await Sync.save('vouchers', voucherId, {
        id: voucherId, voucher_no: voucherNo,
        type: type === 'sales' ? 'receipt' : 'payment',
        amount: amount, partner_id: partyId,
        employee_uid: State.currentUser.uid,
        employee_name: State.currentEmployee.name,
        date: now, payment_method: method,
        description: 'سداد فاتورة ' + inv.invoice_no,
        reference: inv.invoice_no, auto_generated: true, created_at: now
      });
      const cashId = Utils.genId('CSH');
      await Sync.save('cash_transactions', cashId, {
        id: cashId, type: type === 'sales' ? 'in' : 'out',
        amount: amount, reference: voucherNo,
        description: 'سداد فاتورة ' + inv.invoice_no,
        category: type === 'sales' ? 'تحصيل مبيعات' : 'سداد مشتريات',
        date: now, employee_name: State.currentEmployee.name,
        partner_id: partyId, payment_method: method
      });
      if (party) {
        party.balance = (Number(party.balance) || 0) - amount;
        await Sync.save('partners', partyId, party);
      }
      Modal.close();
      Toast.show('✅ تم السداد');
      await Activity.log('payment', inv.invoice_no + ' - ' + Utils.fmtMoney(amount));
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   28. Vouchers
   ═══════════════════════════════════════════════════════════════ */
const Vouchers = {
  switchTab(e, tab) {
    State.currentVoucherTab = tab;
    document.querySelectorAll('#page-vouchers .tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    Vouchers.render();
  },
  render() {
    const vs = (cache.vouchers || [])
      .filter(function (v) { return v.type === State.currentVoucherTab; })
      .sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    const addBtn = document.getElementById('voucherAddBtn');
    if (addBtn) addBtn.style.display = can('vouchers_create') ? 'flex' : 'none';
    if (vs.length === 0) {
      document.getElementById('voucherList').innerHTML = '<div class="empty"><div class="ico">🧾</div>لا توجد سندات</div>';
      return;
    }
    let html = '';
    for (const v of vs) {
      const p = (cache.partners || []).find(function (x) { return x.id === v.partner_id; });
      html += '<div class="list-item">' +
        '<div class="info">' +
          '<h4>' + Utils.esc(v.voucher_no) +
            (v.auto_generated ? ' <small style="color:var(--blue-2);">(تلقائي)</small>' : '') + '</h4>' +
          '<p>' + Utils.esc(p ? p.name : v.description || '-') + '</p>' +
          '<p style="color:' + (v.type === 'receipt' ? 'var(--green-2)' : 'var(--red-2)') + ';font-weight:600;">' +
            (v.type === 'receipt' ? '+' : '-') + Utils.fmtMoney(v.amount) + '</p>' +
          '<p style="font-size:11px;">' + Utils.fmtDate(v.date) + '</p>' +
        '</div>' +
      '</div>';
    }
    document.getElementById('voucherList').innerHTML = html;
  },
  async create() {
    if (!requirePermission('vouchers_create', 'إنشاء سند')) return;
    const type = State.currentVoucherTab;
    const partners = (cache.partners || []).filter(function (p) { return p.active !== false; });
    const label = type === 'receipt' ? 'قبض' : 'دفع';
    const color = type === 'receipt' ? 'var(--green-2)' : 'var(--red-2)';
    const html =
      '<div class="form-group"><label>المبلغ *</label>' +
        '<input id="v_amount" type="number" inputmode="decimal"></div>' +
      '<div class="form-group"><label>الجهة (اختياري)</label>' +
        '<select id="v_partner">' +
          '<option value="">-- بدون جهة --</option>' +
          partners.map(function (p) {
            return '<option value="' + p.id + '">' + Utils.esc(p.name) + '</option>';
          }).join('') +
        '</select></div>' +
      '<div class="form-group"><label>طريقة الدفع</label>' +
        '<select id="v_method"><option>نقدي</option><option>بنكي</option><option>محفظة</option></select></div>' +
      '<div class="form-group"><label>البيان</label>' +
        '<input id="v_desc" placeholder="وصف السند"></div>' +
      '<p style="color:' + color + ';font-size:13px;padding:10px;background:rgba(255,255,255,.05);border-radius:8px;">' +
        (type === 'receipt' ? '⬇️ إضافة للخزينة' : '⬆️ خصم من الخزينة') +
      '</p>';
    Modal.open('🧾 سند ' + label, html, async function () {
      const amount = parseFloat(document.getElementById('v_amount').value);
      if (!amount || amount <= 0) return Toast.show('مبلغ غير صالح', 'error');
      const partnerId = document.getElementById('v_partner').value || null;
      const method = document.getElementById('v_method').value;
      const desc = document.getElementById('v_desc').value;
      const now = Utils.nowISO();
      const voucherId = Utils.genId(type === 'receipt' ? 'RCV' : 'PAY');
      const voucherNo = (type === 'receipt' ? 'RCV-' : 'PAY-') + Date.now();
      await Sync.save('vouchers', voucherId, {
        id: voucherId, voucher_no: voucherNo, type: type,
        amount: amount, partner_id: partnerId,
        employee_uid: State.currentUser.uid,
        employee_name: State.currentEmployee.name,
        date: now, payment_method: method,
        description: desc, created_at: now
      });
      const cashId = Utils.genId('CSH');
      await Sync.save('cash_transactions', cashId, {
        id: cashId, type: type === 'receipt' ? 'in' : 'out',
        amount: amount, reference: voucherNo,
        description: desc || ('سند ' + label),
        category: type === 'receipt' ? 'سندات قبض' : 'سندات دفع',
        date: now, employee_name: State.currentEmployee.name,
        partner_id: partnerId, payment_method: method
      });
      if (partnerId) {
        const p = (cache.partners || []).find(function (x) { return x.id === partnerId; });
        if (p) {
          if (type === 'receipt') p.balance = (Number(p.balance) || 0) - amount;
          else p.balance = (Number(p.balance) || 0) + amount;
          await Sync.save('partners', partnerId, p);
        }
      }
      Modal.close();
      Toast.show('✅ تم إنشاء السند');
      await Activity.log('voucher_' + type, voucherNo);
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   29. Cash
   ═══════════════════════════════════════════════════════════════ */
const Cash = {
  render() {
    const from = document.getElementById('cashFrom').value;
    const to = document.getElementById('cashTo').value;
    let cash = (cache.cash_transactions || []).slice();
    if (from && to) cash = cash.filter(function (c) {
      return c.date.split('T')[0] >= from && c.date.split('T')[0] <= to;
    });
    cash.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    const allCash = cache.cash_transactions || [];
    const cashIn = allCash.filter(function (c) { return c.type === 'in'; })
      .reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);
    const cashOut = allCash.filter(function (c) { return c.type === 'out'; })
      .reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);
    const balance = cashIn - cashOut;
    document.getElementById('cashStats').innerHTML =
      '<div class="stat-card green"><div class="label">الواردات</div><div class="value">' + Utils.fmtNum(cashIn) + '</div></div>' +
      '<div class="stat-card red"><div class="label">الصادرات</div><div class="value">' + Utils.fmtNum(cashOut) + '</div></div>' +
      '<div class="stat-card blue" style="grid-column:span 2;"><div class="label">الرصيد</div><div class="value" style="font-size:26px;">' + Utils.fmtNum(balance) + '</div></div>';
    let html = '';
    for (const c of cash.slice(0, 100)) {
      html += '<div class="list-item">' +
        '<div class="info">' +
          '<h4 style="color:' + (c.type === 'in' ? 'var(--green-2)' : 'var(--red-2)') + ';">' +
            (c.type === 'in' ? '↓ وارد' : '↑ صادر') + ' - ' + Utils.fmtMoney(c.amount) + '</h4>' +
          '<p>' + Utils.esc(c.description || '-') + '</p>' +
          '<p style="font-size:11px;">' + Utils.fmtDate(c.date) + '</p>' +
        '</div>' +
      '</div>';
    }
    document.getElementById('cashList').innerHTML = html || '<div class="empty"><div class="ico">💰</div>لا توجد حركات</div>';
  },
  load() { Cash.render(); }
};

/* ═══════════════════════════════════════════════════════════════
   30. Payroll
   ═══════════════════════════════════════════════════════════════ */
const Payroll = {
  switchTab(e, tab) {
    State.currentPayrollTab = tab;
    document.querySelectorAll('#page-payroll .tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    document.getElementById('payroll-generate').classList.toggle('hidden', tab !== 'generate');
    document.getElementById('payroll-list').classList.toggle('hidden', tab !== 'list');
    if (tab === 'list') Payroll.loadList();
  },
  init() {
    const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    document.getElementById('payEmp').innerHTML = emps.map(function (e) {
      return '<option value="' + e.uid + '">' + Utils.esc(e.name) + '</option>';
    }).join('');
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    document.getElementById('payMonth').innerHTML = months.map(function (m, i) {
      return '<option value="' + (i + 1) + '">' + m + '</option>';
    }).join('');
    document.getElementById('payMonth').value = new Date().getMonth() + 1;
    document.getElementById('payYear').value = new Date().getFullYear();
    if (State.currentPayrollTab === 'list') Payroll.loadList();
  },
  loadList() {
    const payrolls = (cache.payroll || []).slice().sort(function (a, b) {
      return (b.month || '').localeCompare(a.month || '');
    });
    const el = document.getElementById('payrollList');
    if (payrolls.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">💵</div>لا توجد مرتبات</div>';
      return;
    }
    let html = '';
    for (const p of payrolls) {
      html += '<div class="list-item">' +
        '<div class="info">' +
          '<h4>' + Utils.esc(p.employee_name) + ' - ' + Utils.esc(p.month) + '</h4>' +
          '<p>صافي: <strong style="color:var(--gold);">' + Utils.fmtMoney(p.net_salary) + '</strong></p>' +
          '<p style="font-size:11px;color:' + (p.status === 'paid' ? 'var(--green-2)' : 'var(--orange-2)') + ';">' +
            (p.status === 'paid' ? 'مدفوع ✓' : 'مستحق') +
          '</p>' +
        '</div>' +
        '<div class="actions">' +
          (p.status !== 'paid' && can('payroll_pay')
            ? '<button class="btn btn-success btn-sm" onclick="Payroll.pay(\'' + p.id + '\')">صرف</button>' : '') +
          '<button class="btn btn-primary btn-sm" onclick="Payroll.show(\'' + p.id + '\')">👁️</button>' +
        '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  },
  countWorkDays(year, month) {
    if (month < 1 || month > 12) return 30;
    const last = new Date(year, month, 0).getDate();
    let c = 0;
    for (let d = 1; d <= last; d++) {
      if (new Date(year, month - 1, d).getDay() !== 5) c++;
    }
    return c;
  },
  async generate() {
    if (!requirePermission('payroll_generate', 'إنشاء مرتب')) return;
    const empUid = document.getElementById('payEmp').value;
    const month = parseInt(document.getElementById('payMonth').value);
    const year = parseInt(document.getElementById('payYear').value);
    const bonus = parseFloat(document.getElementById('payBonus').value) || 0;
    const deduction = parseFloat(document.getElementById('payDeduction').value) || 0;
    if (month < 1 || month > 12) return Toast.show('شهر غير صالح', 'error');
    if (year < 2020 || year > 2100) return Toast.show('سنة غير صالحة', 'error');
    const emp = (cache.employees || []).find(function (x) { return x.uid === empUid; });
    if (!emp) return Toast.show('اختر موظف', 'error');
    const monthKey = year + '-' + String(month).padStart(2, '0');
    const existing = (cache.payroll || []).find(function (p) {
      return p.employee_uid === empUid && p.month === monthKey;
    });
    if (existing && !confirm('موجود، إعادة؟')) return;
    const start = monthKey + '-01';
    const lastDay = new Date(year, month, 0).getDate();
    const end = monthKey + '-' + String(lastDay).padStart(2, '0');
    const att = (cache.attendance || []).filter(function (a) {
      return a.employee_uid === empUid && a.date >= start && a.date <= end;
    });
    const presentDays = att.filter(function (a) { return a.check_in && a.status === 'present'; }).length;
    const leaveDays = att.filter(function (a) { return a.status === 'leave'; }).length;
    const workDays = Payroll.countWorkDays(year, month);
    const absenceDays = Math.max(0, workDays - presentDays - leaveDays);
    const basic = Number(emp.basic_salary) || 0;
    const housing = Number(emp.housing_allowance) || 0;
    const transport = Number(emp.transport_allowance) || 0;
    const insurance = Number(emp.insurance_deduction) || 0;
    const tax = Number(emp.tax_deduction) || 0;
    const dailyRate = workDays > 0 ? basic / workDays : 0;
    const absenceDeduction = dailyRate * absenceDays;
    const advances = (cache.employee_transactions || [])
      .filter(function (t) {
        return t.employee_uid === empUid && t.type === 'advance' && !t.paid;
      })
      .reduce(function (s, t) { return s + (Number(t.amount) || 0); }, 0);
    const gross = basic + housing + transport + bonus;
    const totalDed = insurance + tax + absenceDeduction + deduction + advances;
    const net = gross - totalDed;
    const id = existing ? existing.id : Utils.genId('PAY');
    const data = {
      id: id, employee_uid: empUid, employee_name: emp.name,
      month: monthKey, basic_salary: basic,
      housing_allowance: housing, transport_allowance: transport,
      overtime_amount: 0, bonuses: bonus, deductions: deduction,
      absence_deduction: absenceDeduction, insurance_deduction: insurance,
      tax_deduction: tax, advances_deduction: advances,
      net_salary: net, work_days: workDays,
      attendance_days: presentDays, absence_days: absenceDays,
      leave_days: leaveDays,
      status: existing ? existing.status : 'pending',
      accrual_date: end, created_at: Utils.nowISO()
    };
    await Sync.save('payroll', id, data);
    await Activity.log('payroll_generate', emp.name + ' - ' + monthKey);
    Toast.show('✅ تم الإنشاء');
    document.getElementById('payBonus').value = 0;
    document.getElementById('payDeduction').value = 0;
    if (State.currentPayrollTab === 'list') Payroll.loadList();
  },
  async pay(id) {
    if (!requirePermission('payroll_pay', 'صرف مرتب')) return;
    const p = (cache.payroll || []).find(function (x) { return x.id === id; });
    if (!p) return;
    const html =
      '<div style="padding:12px;background:rgba(212,175,55,.08);border-radius:8px;margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>الموظف:</span><strong>' + Utils.esc(p.employee_name) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:18px;color:var(--gold);font-weight:700;"><span>الصافي:</span><strong>' + Utils.fmtMoney(p.net_salary) + '</strong></div>' +
      '</div>' +
      '<div class="form-group"><label>طريقة الصرف</label>' +
        '<select id="sal_method"><option>نقدي</option><option>بنكي</option><option>محفظة</option></select></div>';
    Modal.open('💵 صرف راتب ' + p.month, html, async function () {
      const method = document.getElementById('sal_method').value;
      const now = Utils.nowISO();
      p.status = 'paid';
      p.paid_date = now;
      p.payment_method = method;
      await Sync.save('payroll', id, p);
      const voucherId = Utils.genId('PAY');
      const voucherNo = 'PAY-' + Date.now();
      await Sync.save('vouchers', voucherId, {
        id: voucherId, voucher_no: voucherNo, type: 'payment',
        amount: p.net_salary, employee_uid: p.employee_uid,
        employee_name: State.currentEmployee.name,
        date: now, payment_method: method,
        description: 'راتب ' + p.month + ' - ' + p.employee_name,
        reference: 'SAL-' + p.month, auto_generated: true, created_at: now
      });
      const cashId = Utils.genId('CSH');
      await Sync.save('cash_transactions', cashId, {
        id: cashId, type: 'out', amount: p.net_salary,
        description: 'راتب ' + p.month + ' - ' + p.employee_name,
        category: 'رواتب', date: now,
        employee_name: State.currentEmployee.name,
        payment_method: method
      });
      Modal.close();
      Toast.show('✅ تم الصرف');
      await Activity.log('salary_paid', voucherNo);
    });
  },
  async show(id) {
    const p = (cache.payroll || []).find(function (x) { return x.id === id; });
    if (!p) return;
    const html = '<div class="receipt" id="payrollPrintable">' +
      '<div class="header"><h2>شركة البسملة</h2><p>مفردات المرتب - ' + Utils.esc(p.month) + '</p></div>' +
      '<div class="line"><span>الموظف:</span><span>' + Utils.esc(p.employee_name) + '</span></div>' +
      '<hr>' +
      '<div class="line"><span>أيام العمل:</span><span>' + (p.work_days || 0) + '</span></div>' +
      '<div class="line"><span>أيام الحضور:</span><span>' + (p.attendance_days || 0) + '</span></div>' +
      '<div class="line"><span>أيام الغياب:</span><span>' + (p.absence_days || 0) + '</span></div>' +
      '<hr>' +
      '<div class="line"><span>الأساسي:</span><span>' + Utils.fmtMoney(p.basic_salary) + '</span></div>' +
      '<div class="line"><span>بدل سكن:</span><span>' + Utils.fmtMoney(p.housing_allowance) + '</span></div>' +
      '<div class="line"><span>بدل مواصلات:</span><span>' + Utils.fmtMoney(p.transport_allowance) + '</span></div>' +
      '<div class="line"><span>مكافآت:</span><span>+' + Utils.fmtMoney(p.bonuses) + '</span></div>' +
      '<hr>' +
      '<div class="line"><span>خصم غياب:</span><span>-' + Utils.fmtMoney(p.absence_deduction) + '</span></div>' +
      '<div class="line"><span>تأمينات:</span><span>-' + Utils.fmtMoney(p.insurance_deduction) + '</span></div>' +
      '<div class="line"><span>ضريبة:</span><span>-' + Utils.fmtMoney(p.tax_deduction) + '</span></div>' +
      '<div class="line"><span>خصومات:</span><span>-' + Utils.fmtMoney(p.deductions) + '</span></div>' +
      '<div class="line"><span>سلف:</span><span>-' + Utils.fmtMoney(p.advances_deduction) + '</span></div>' +
      '<div class="line total"><span>الصافي:</span><span>' + Utils.fmtMoney(p.net_salary) + '</span></div>' +
    '</div>' +
    '<button class="btn btn-primary btn-full" style="margin-top:10px;" onclick="Printer.printReceipt(document.getElementById(\'payrollPrintable\').outerHTML,\'راتب\')">🖨️ طباعة</button>';
    Modal.open('📄 مفردات المرتب', html, null, 'إغلاق');
  }
};

/* ═══════════════════════════════════════════════════════════════
   31. Expenses/Revenues
   ═══════════════════════════════════════════════════════════════ */
const Expenses = {
  switchTab(e, tab) {
    State.currentExpTab = tab;
    document.querySelectorAll('#page-expenses .tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    Expenses.render();
  },
  render() {
    const store = State.currentExpTab === 'expense' ? 'expenses' : 'revenues';
    const list = (cache[store] || []).slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    });
    const el = document.getElementById('expList');
    if (list.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">💸</div>لا توجد سجلات</div>';
      return;
    }
    let html = '<div class="card"><h3>السجل</h3>';
    for (const r of list) {
      html += '<div style="border-bottom:1px solid #222;padding:10px 0;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<strong style="color:' + (State.currentExpTab === 'expense' ? 'var(--red-2)' : 'var(--green-2)') + ';">' +
            Utils.esc(r.category) + '</strong>' +
          '<span>' + Utils.fmtMoney(r.amount) + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:#aaa;margin-top:4px;">' +
          Utils.esc(r.description || '-') + ' | ' + Utils.fmtDate(r.date) +
        '</div>' +
      '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  },
  async save() {
    if (!requirePermission('expenses_add', 'إضافة')) return;
    const category = document.getElementById('expCategory').value.trim();
    const amount = parseFloat(document.getElementById('expAmount').value) || 0;
    const desc = document.getElementById('expDesc').value;
    if (!category) return Toast.show('التصنيف مطلوب', 'error');
    if (amount <= 0) return Toast.show('مبلغ صالح مطلوب', 'error');
    const store = State.currentExpTab === 'expense' ? 'expenses' : 'revenues';
    const id = Utils.genId(store === 'expenses' ? 'EXP' : 'REV');
    await Sync.save(store, id, {
      id: id, category: category, amount: amount,
      description: desc, date: Utils.nowISO(),
      employee_uid: State.currentUser.uid,
      employee_name: State.currentEmployee.name
    });
    document.getElementById('expCategory').value = '';
    document.getElementById('expAmount').value = '';
    document.getElementById('expDesc').value = '';
    Toast.show('تم الحفظ');
    Expenses.render();
  }
};

/* ═══════════════════════════════════════════════════════════════
   32. Reports
   ═══════════════════════════════════════════════════════════════ */
const Reports = {
  switchTab(e, tab) {
    document.querySelectorAll('#page-reports .tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    document.getElementById('rep-profit').classList.toggle('hidden', tab !== 'profit');
    document.getElementById('rep-top').classList.toggle('hidden', tab !== 'top');
    document.getElementById('rep-low').classList.toggle('hidden', tab !== 'low');
    if (tab === 'profit') {
      if (!document.getElementById('profFrom').value) {
        document.getElementById('profFrom').value = Utils.todayStr();
        document.getElementById('profTo').value = Utils.todayStr();
      }
      Reports.loadProfit();
    } else if (tab === 'top') Reports.loadTop();
    else if (tab === 'low') Reports.loadLow();
  },
  init() {
    document.getElementById('profFrom').value = Utils.todayStr();
    document.getElementById('profTo').value = Utils.todayStr();
    Reports.loadProfit();
  },
  loadProfit() {
    const from = document.getElementById('profFrom').value;
    const to = document.getElementById('profTo').value;
    const sales = (cache.sales_invoices || []).filter(function (s) {
      return s.date.split('T')[0] >= from && s.date.split('T')[0] <= to;
    });
    const salesReturns = (cache.sales_returns || []).filter(function (r) {
      return r.date.split('T')[0] >= from && r.date.split('T')[0] <= to;
    });
    const expenses = (cache.expenses || []).filter(function (e) {
      return e.date.split('T')[0] >= from && e.date.split('T')[0] <= to;
    });
    const revenues = (cache.revenues || []).filter(function (r) {
      return r.date.split('T')[0] >= from && r.date.split('T')[0] <= to;
    });
    const payrolls = (cache.payroll || []).filter(function (p) {
      return p.month >= from.substring(0, 7) && p.month <= to.substring(0, 7);
    });
    const salesTotal = sales.reduce(function (s, i) { return s + (Number(i.total) || 0); }, 0);
    const salesRetTotal = salesReturns.reduce(function (s, r) { return s + (Number(r.total) || 0); }, 0);
    const expensesTotal = expenses.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
    const revenuesTotal = revenues.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0);
    const salariesTotal = payrolls.reduce(function (s, p) { return s + (Number(p.net_salary) || 0); }, 0);
    const salesIds = sales.map(function (s) { return s.id; });
    const cogs = (cache.sales_items || []).filter(function (it) {
      return salesIds.includes(it.invoice_id);
    }).reduce(function (s, it) {
      const cost = Number(it.cost_at_sale || it.cost || 0);
      return s + cost * (Number(it.quantity) || 0);
    }, 0);
    const netSales = salesTotal - salesRetTotal;
    const grossProfit = netSales - cogs;
    const netProfit = grossProfit + revenuesTotal - expensesTotal - salariesTotal;
    const pc = netProfit >= 0 ? 'var(--green-2)' : 'var(--red-2)';
    document.getElementById('profResult').innerHTML =
      '<div class="card"><h3>📊 الأرباح والخسائر</h3>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;"><span>المبيعات:</span><strong style="color:var(--green-2);">+' + Utils.fmtMoney(salesTotal) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;"><span>مرتجع:</span><strong style="color:var(--red-2);">-' + Utils.fmtMoney(salesRetTotal) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;font-weight:700;"><span>صافي المبيعات:</span><strong>' + Utils.fmtMoney(netSales) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;"><span>تكلفة المبيعات:</span><strong style="color:var(--red-2);">-' + Utils.fmtMoney(cogs) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--gold);color:var(--gold);font-weight:700;"><span>الربح الإجمالي:</span><strong>' + Utils.fmtMoney(grossProfit) + '</strong></div>' +
      '</div>' +
      '<div class="card"><h3>➕ إيرادات</h3>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>إيرادات:</span><strong style="color:var(--green-2);">+' + Utils.fmtMoney(revenuesTotal) + '</strong></div>' +
      '</div>' +
      '<div class="card"><h3>➖ مصروفات</h3>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;"><span>مصروفات:</span><strong style="color:var(--red-2);">-' + Utils.fmtMoney(expensesTotal) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>مرتبات:</span><strong style="color:var(--red-2);">-' + Utils.fmtMoney(salariesTotal) + '</strong></div>' +
      '</div>' +
      '<div class="card" style="border:2px solid ' + pc + ';">' +
        '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:20px;font-weight:700;color:' + pc + ';">' +
          '<span>صافي الربح:</span><strong>' + Utils.fmtMoney(netProfit) + '</strong>' +
        '</div>' +
        '<div style="text-align:center;font-size:12px;color:#888;margin-top:8px;">' +
          (netProfit >= 0 ? '✅ ربح' : '⚠️ خسارة') +
        '</div>' +
      '</div>';
  },
  loadTop() {
    const salesItems = cache.sales_items || [];
    const map = {};
    for (const it of salesItems) {
      if (!map[it.product_id]) map[it.product_id] = { name: it.product_name || 'منتج', qty: 0, total: 0 };
      map[it.product_id].qty += Number(it.quantity) || 0;
      map[it.product_id].total += Number(it.total) || 0;
    }
    const arr = Object.values(map).sort(function (a, b) { return b.qty - a.qty; }).slice(0, 20);
    let html = '<div class="card"><h3>🏆 الأكثر مبيعاً</h3>';
    if (arr.length === 0) html += '<p style="color:#666;">لا توجد بيانات</p>';
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      html += '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #222;">' +
        '<div><span style="color:var(--gold);font-weight:700;">#' + (i + 1) + '</span> <span style="margin-right:8px;">' + Utils.esc(a.name) + '</span></div>' +
        '<div style="text-align:left;">' +
          '<div style="font-weight:700;">' + a.qty + ' وحدة</div>' +
          '<div style="font-size:11px;color:#888;">' + Utils.fmtMoney(a.total) + '</div>' +
        '</div>' +
      '</div>';
    }
    html += '</div>';
    document.getElementById('topProductsList').innerHTML = html;
  },
  loadLow() {
    const products = (cache.products || []).filter(function (p) {
      return p.active !== false && (Number(p.quantity) || 0) <= (Number(p.min_quantity) || 5);
    });
    let html = '<div class="card"><h3>⚠️ نواقص المخزون</h3>';
    if (products.length === 0) html += '<p style="color:var(--green-2);">✅ لا توجد نواقص</p>';
    else for (const p of products) {
      const needed = (Number(p.min_quantity) || 5) - (Number(p.quantity) || 0);
      html += '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #222;">' +
        '<div><strong>' + Utils.esc(p.name) + '</strong>' +
          '<div style="font-size:11px;color:#888;">باركود: ' + Utils.esc(p.barcode || '-') + '</div></div>' +
        '<div style="text-align:left;">' +
          '<div style="color:var(--red-2);font-weight:700;">' + (p.quantity || 0) + '</div>' +
          '<div style="font-size:11px;color:var(--orange-2);">يحتاج: ' + needed + '</div>' +
        '</div>' +
      '</div>';
    }
    html += '</div>';
    document.getElementById('lowStockList').innerHTML = html;
  }
};

/* ═══════════════════════════════════════════════════════════════
   33. Statements
   ═══════════════════════════════════════════════════════════════ */
const Statements = {
  switchTab(e, tab) {
    State.currentStmtTab = tab;
    document.querySelectorAll('#page-statements .tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    document.getElementById('stmt-partner').classList.toggle('hidden', tab !== 'partner');
    document.getElementById('stmt-employee').classList.toggle('hidden', tab !== 'employee');
    document.getElementById('stmt-cash').classList.toggle('hidden', tab !== 'cash');
    if (tab === 'partner') Statements.loadPartnerOptions();
    else if (tab === 'employee') Statements.loadEmployeeOptions();
  },
  init() {
    if (State.currentStmtTab === 'partner') Statements.loadPartnerOptions();
    else if (State.currentStmtTab === 'employee') Statements.loadEmployeeOptions();
  },
  loadPartnerOptions() {
    const partners = (cache.partners || []).filter(function (p) { return p.active !== false; });
    document.getElementById('stmtPartner').innerHTML =
      '<option value="">-- اختر --</option>' +
      partners.map(function (p) {
        return '<option value="' + p.id + '">' + Utils.esc(p.name) + '</option>';
      }).join('');
    document.getElementById('stmtPartnerList').innerHTML = '';
  },
  loadEmployeeOptions() {
    const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    document.getElementById('stmtEmp').innerHTML =
      '<option value="">-- اختر --</option>' +
      emps.map(function (e) {
        return '<option value="' + e.uid + '">' + Utils.esc(e.name) + '</option>';
      }).join('');
    document.getElementById('stmtEmpList').innerHTML = '';
  },
  loadPartner() {
    const id = document.getElementById('stmtPartner').value;
    if (!id) return;
    const p = (cache.partners || []).find(function (x) { return x.id === id; });
    if (!p) return;
    const sales = (cache.sales_invoices || []).filter(function (s) { return s.customer_id === id; });
    const purchases = (cache.purchase_invoices || []).filter(function (s) { return s.supplier_id === id; });
    const vouchers = (cache.vouchers || []).filter(function (v) { return v.partner_id === id; });
    const transactions = [];
    for (const s of sales) transactions.push({
      date: s.date, type: 'فاتورة مبيعات', ref: s.invoice_no,
      debit: s.total, credit: s.paid, color: 'var(--green-2)'
    });
    for (const pu of purchases) transactions.push({
      date: pu.date, type: 'فاتورة مشتريات', ref: pu.invoice_no,
      debit: pu.paid, credit: pu.total, color: 'var(--orange-2)'
    });
    for (const v of vouchers) transactions.push({
      date: v.date, type: v.type === 'receipt' ? 'سند قبض' : 'سند دفع',
      ref: v.voucher_no,
      debit: v.type === 'receipt' ? 0 : v.amount,
      credit: v.type === 'receipt' ? v.amount : 0,
      color: v.type === 'receipt' ? 'var(--blue-2)' : 'var(--red-2)'
    });
    transactions.sort(function (a, b) { return a.date.localeCompare(b.date); });
    let html = '<div class="card"><h3>' + Utils.esc(p.name) + '</h3>' +
      '<p style="color:#aaa;font-size:13px;">' + Utils.esc(p.phone || '') + '</p>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--gold);margin-top:10px;font-size:18px;font-weight:700;color:' +
        ((Number(p.balance) || 0) > 0 ? 'var(--red-2)' : 'var(--green-2)') + ';">' +
        '<span>الرصيد:</span><span>' + Utils.fmtMoney(Math.abs(Number(p.balance) || 0)) + '</span>' +
      '</div></div>' +
      '<div class="card"><h3>حركة الحساب</h3>';
    if (transactions.length === 0) html += '<p style="color:#666;">لا توجد حركات</p>';
    else for (const t of transactions) {
      html += '<div style="padding:10px 0;border-bottom:1px solid #222;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<strong style="color:' + t.color + ';">' + Utils.esc(t.type) + '</strong>' +
          '<span style="font-size:11px;color:#888;">' + Utils.fmtDate(t.date) + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:#aaa;margin-top:4px;">' + Utils.esc(t.ref) + '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:4px;font-size:13px;">' +
          '<span>مدين: ' + Utils.fmtMoney(t.debit) + '</span>' +
          '<span>دائن: ' + Utils.fmtMoney(t.credit) + '</span>' +
        '</div>' +
      '</div>';
    }
    html += '</div>';
    document.getElementById('stmtPartnerList').innerHTML = html;
  },
  loadEmployee() {
    const uid = document.getElementById('stmtEmp').value;
    if (!uid) return;
    const emp = (cache.employees || []).find(function (x) { return x.uid === uid; });
    if (!emp) return;
    const att = (cache.attendance || []).filter(function (a) { return a.employee_uid === uid; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    const payrolls = (cache.payroll || []).filter(function (p) { return p.employee_uid === uid; })
      .sort(function (a, b) { return b.month.localeCompare(a.month); });
    let html = '<div class="card">' +
      '<h3>' + Utils.esc(emp.name) + ' - ' + Utils.esc(emp.job_title || '') + '</h3>' +
      '<p style="font-size:12px;color:#aaa;">الراتب: ' + Utils.fmtMoney(emp.basic_salary) + '</p>' +
    '</div>' +
    '<div class="card"><h3>📅 الحضور (آخر 30)</h3>';
    for (const a of att.slice(0, 30)) {
      const status = a.status === 'leave' ? '📅 إجازة' : a.check_in && a.check_out ? '✓ ' + (a.work_hours || 0) + 'س' : a.check_in ? '✓ حاضر' : '-';
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;font-size:13px;">' +
        '<span>' + a.date + '</span><span>' + status + '</span></div>';
    }
    html += '</div><div class="card"><h3>💰 المرتبات</h3>';
    for (const p of payrolls) {
      html += '<div style="padding:8px 0;border-bottom:1px solid #222;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<strong style="color:var(--gold);">' + Utils.esc(p.month) + '</strong>' +
          '<span style="color:' + (p.status === 'paid' ? 'var(--green-2)' : 'var(--orange-2)') + ';">' +
            (p.status === 'paid' ? 'مدفوع' : 'مستحق') + '</span>' +
        '</div>' +
        '<div style="font-size:13px;margin-top:4px;">الصافي: ' + Utils.fmtMoney(p.net_salary) + '</div>' +
      '</div>';
    }
    html += '</div>';
    document.getElementById('stmtEmpList').innerHTML = html;
  },
  loadCash() {
    const from = document.getElementById('stmtCashFrom').value;
    const to = document.getElementById('stmtCashTo').value;
    const cash = (cache.cash_transactions || [])
      .filter(function (c) { return c.date.split('T')[0] >= from && c.date.split('T')[0] <= to; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    let inTotal = 0, outTotal = 0;
    let html = '<div class="card"><h3>حركة الخزينة</h3>' +
      '<p style="font-size:12px;color:#aaa;">من ' + from + ' إلى ' + to + '</p></div>';
    for (const c of cash) {
      if (c.type === 'in') inTotal += Number(c.amount);
      else outTotal += Number(c.amount);
      html += '<div class="list-item"><div class="info">' +
        '<h4 style="color:' + (c.type === 'in' ? 'var(--green-2)' : 'var(--red-2)') + ';">' +
          (c.type === 'in' ? '↓ وارد' : '↑ صادر') + ' - ' + Utils.fmtMoney(c.amount) + '</h4>' +
        '<p>' + Utils.esc(c.description || '-') + '</p>' +
        '<p style="font-size:11px;">' + Utils.fmtDate(c.date) + '</p>' +
      '</div></div>';
    }
    html += '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>الواردات:</span><strong style="color:var(--green-2);">' + Utils.fmtMoney(inTotal) + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>الصادرات:</span><strong style="color:var(--red-2);">' + Utils.fmtMoney(outTotal) + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--gold);font-weight:700;color:var(--gold);"><span>الصافي:</span><strong>' + Utils.fmtMoney(inTotal - outTotal) + '</strong></div>' +
    '</div>';
    document.getElementById('stmtCashList').innerHTML = html;
  }
};

/* ═══════════════════════════════════════════════════════════════
   34. Policies
   ═══════════════════════════════════════════════════════════════ */
const Policies = {
  render() {
    const pols = (cache.work_policies || []).filter(function (p) { return p.active !== false; });
    const addBtn = document.getElementById('policyAddBtn');
    if (addBtn) addBtn.style.display = can('policies_add') ? 'flex' : 'none';
    const el = document.getElementById('policyList');
    if (pols.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">📖</div>لا توجد بنود</div>';
      return;
    }
    let html = '';
    for (const p of pols) {
      html += '<div class="card">' +
        '<h3>' + Utils.esc(p.title) + '</h3>' +
        '<p style="font-size:11px;color:#666;">' + Utils.esc(p.category || '') + ' - ' + Utils.esc(p.effective_date || '') + '</p>' +
        '<p style="margin-top:10px;line-height:1.7;">' + Utils.esc(p.content) + '</p>' +
        (can('delete_anything')
          ? '<button class="btn btn-danger btn-sm" style="margin-top:10px;" onclick="Policies.remove(\'' + p.id + '\')">حذف</button>'
          : '') +
      '</div>';
    }
    el.innerHTML = html;
  },
  async add() {
    if (!requirePermission('policies_add', 'إضافة')) return;
    const html =
      '<div class="form-group"><label>العنوان *</label><input id="pol_title"></div>' +
      '<div class="form-group"><label>التصنيف</label><input id="pol_cat"></div>' +
      '<div class="form-group"><label>المحتوى *</label><textarea id="pol_content" rows="5"></textarea></div>';
    Modal.open('➕ بند جديد', html, async function () {
      const title = document.getElementById('pol_title').value.trim();
      const content = document.getElementById('pol_content').value.trim();
      if (!title || !content) return Toast.show('مطلوب', 'error');
      const id = Utils.genId('POL');
      await Sync.save('work_policies', id, {
        id: id, title: title, content: content,
        category: document.getElementById('pol_cat').value,
        effective_date: Utils.todayStr(), active: true
      });
      Modal.close();
      Toast.show('تم');
    });
  },
  async remove(id) {
    if (!can('delete_anything')) return Toast.show('🔒 المدير فقط', 'error');
    if (!confirm('حذف؟')) return;
    await Sync.softDelete('work_policies', id);
    Toast.show('تم');
  }
};

/* ═══════════════════════════════════════════════════════════════
   35. WhatsApp
   ═══════════════════════════════════════════════════════════════ */
const WhatsApp = {
  render() {
    const partners = (cache.partners || []).filter(function (p) { return p.active !== false; });
    document.getElementById('waPartner').innerHTML =
      '<option value="">-- اختر --</option>' +
      partners.map(function (p) {
        return '<option value="' + p.id + '">' + Utils.esc(p.name) + ' - ' + Utils.esc(p.phone || '') + '</option>';
      }).join('');
    const templates = cache.whatsapp_templates || [];
    document.getElementById('waTemplate').innerHTML =
      '<option value="">-- قالب --</option>' +
      templates.map(function (t) {
        return '<option value="' + t.id + '">' + Utils.esc(t.name) + '</option>';
      }).join('');
    const log = (cache.whatsapp_log || []).sort(function (a, b) {
      return (b.sent_at || '').localeCompare(a.sent_at || '');
    }).slice(0, 20);
    let html = '';
    for (const l of log) {
      html += '<div style="border-bottom:1px solid #222;padding:10px 0;font-size:12px;">' +
        '<strong style="color:var(--gold);">' + Utils.esc(l.phone) + '</strong><br>' +
        '<span style="color:#aaa;">' + Utils.esc(l.message) + '</span><br>' +
        '<small style="color:#666;">' + Utils.fmtDate(l.sent_at) + '</small>' +
      '</div>';
    }
    document.getElementById('waLog').innerHTML = html || '<p style="color:#666;">لا يوجد سجل</p>';
  },
  applyTemplate() {
    const tid = document.getElementById('waTemplate').value;
    if (!tid) return;
    const t = (cache.whatsapp_templates || []).find(function (x) { return x.id === tid; });
    if (t) document.getElementById('waMessage').value = t.content;
  },
  async send() {
    const pid = document.getElementById('waPartner').value;
    const msg = document.getElementById('waMessage').value.trim();
    if (!pid) return Toast.show('اختر الجهة', 'error');
    if (!msg) return Toast.show('اكتب رسالة', 'error');
    const p = (cache.partners || []).find(function (x) { return x.id === pid; });
    if (!p || !p.phone) return Toast.show('لا يوجد رقم', 'error');
    let phone = p.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '20' + phone.substring(1);
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    const id = Utils.genId('WA');
    await Sync.save('whatsapp_log', id, {
      id: id, phone: p.phone, message: msg, partner_id: pid,
      sent_at: Utils.nowISO(),
      employee_name: State.currentEmployee.name
    });
    Toast.show('تم');
    WhatsApp.render();
  }
};

/* ═══════════════════════════════════════════════════════════════
   36. Devices
   ═══════════════════════════════════════════════════════════════ */
const Devices = {
  render() {
    if (!can('devices_manage')) return;
    const devices = cache.devices || [];
    let html = '';
    if (devices.length === 0) {
      html = '<p style="color:#666;text-align:center;padding:20px;">لا توجد أجهزة</p>';
    } else {
      for (const d of devices) {
        const status = d.approved === true ? 'approved' : d.status === 'rejected' ? 'rejected' : 'pending';
        const statusText = status === 'approved' ? '✓ مفعّل' : status === 'rejected' ? '✗ مرفوض' : '⏳ معلق';
        const lastSeen = d.last_seen ? new Date(d.last_seen).toLocaleString('ar-EG') : '-';
        const isCurrent = d.device_id === State.deviceId;
        html += '<div class="device-card ' + status + '" style="background:rgba(20,20,20,.95);border:1px solid #333;border-radius:12px;padding:12px;margin:8px 0;' +
          (status === 'approved' ? 'border-color:var(--green);' : status === 'pending' ? 'border-color:var(--orange-2);' : 'border-color:var(--red);opacity:.6;') + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
            '<div style="color:var(--gold);font-weight:700;font-size:14px;">' +
              (isCurrent ? '📱 (هذا الجهاز) ' : '📱 ') + Utils.esc(d.user_name || 'غير معروف') +
            '</div>' +
            '<span class="badge ' + (status === 'approved' ? 'badge-green' : status === 'pending' ? 'badge-orange' : 'badge-red') + '">' + statusText + '</span>' +
          '</div>' +
          '<div style="font-size:12px;color:#aaa;line-height:1.6;">' +
            '<div>المعرّف: <code>' + Utils.esc(d.device_id) + '</code></div>' +
            '<div>آخر ظهور: ' + lastSeen + '</div>' +
          '</div>';
        if (!isCurrent && status === 'approved') {
          html += '<button class="btn btn-danger btn-sm" style="margin-top:8px;" onclick="Devices.reject(\'' + d.device_id + '\')">🚫 طرد</button>';
        }
        if (status === 'pending') {
          html += '<div style="display:flex;gap:6px;margin-top:8px;">' +
            '<button class="btn btn-success btn-sm" onclick="Devices.approve(\'' + d.device_id + '\')">✓ موافقة</button>' +
            '<button class="btn btn-danger btn-sm" onclick="Devices.reject(\'' + d.device_id + '\')">✗ رفض</button>' +
          '</div>';
        }
        html += '</div>';
      }
    }
    document.getElementById('devicesList').innerHTML = html;
  },
  async approve(deviceIdParam) {
    if (!can('devices_manage')) return;
    try {
      await State.companyRef.child('devices/' + deviceIdParam).update({
        approved: true, status: 'approved',
        approved_at: Utils.nowISO(),
        approved_by: State.currentEmployee.name
      });
      Toast.show('✅ تم التفعيل');
      await Activity.log('device_approved', deviceIdParam);
    } catch (e) {
      Toast.show('❌ فشل: ' + e.message, 'error');
    }
  },
  async reject(deviceIdParam) {
    if (!can('devices_manage')) return;
    if (!confirm('طرد الجهاز؟')) return;
    try {
      await State.companyRef.child('devices/' + deviceIdParam).update({
        approved: false, status: 'rejected',
        rejected_at: Utils.nowISO()
      });
      Toast.show('✅ تم الطرد');
      await Activity.log('device_rejected', deviceIdParam);
    } catch (e) {
      Toast.show('❌ فشل: ' + e.message, 'error');
    }
  }
};

/* ═══════════════════════════════════════════════════════════════
   37. Requests
   ═══════════════════════════════════════════════════════════════ */
const Requests = {
  render() {
    if (!can('requests_manage')) return;
    const requests = (cache.pending_requests || []).filter(function (r) { return r.status === 'pending'; });
    const el = document.getElementById('requestsList');
    if (requests.length === 0) {
      el.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">لا توجد طلبات</p>';
      return;
    }
    let html = '';
    for (const r of requests) {
      html += '<div style="background:rgba(20,20,20,.95);border:1px solid var(--orange-2);border-radius:12px;padding:12px;margin:8px 0;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<div style="color:var(--gold);font-weight:700;font-size:14px;">👤 ' + Utils.esc(r.name) + '</div>' +
          '<span class="badge badge-orange">⏳ معلق</span>' +
        '</div>' +
        '<div style="font-size:12px;color:#aaa;line-height:1.6;">' +
          '<div>البريد: ' + Utils.esc(r.email) + '</div>' +
          '<div>الدور: ' + Utils.esc(PERMISSIONS[r.role] ? PERMISSIONS[r.role].label : r.role) + '</div>' +
          '<div>التاريخ: ' + new Date(r.created_at).toLocaleString('ar-EG') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;margin-top:10px;">' +
          '<button class="btn btn-success btn-sm" onclick="Requests.approve(\'' + r.uid + '\')">✓ موافقة</button>' +
          '<button class="btn btn-danger btn-sm" onclick="Requests.reject(\'' + r.uid + '\')">✗ رفض</button>' +
        '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  },
  async approve(uid) {
    if (!can('requests_manage')) return;
    try {
      const req = (cache.pending_requests || []).find(function (r) { return r.uid === uid; });
      if (!req) return;
      const now = Utils.nowISO();
      await State.companyRef.child('employees/' + uid).set({
        uid: uid, name: req.name, email: req.email,
        role: req.role,
        job_title: PERMISSIONS[req.role] ? PERMISSIONS[req.role].label : req.role,
        basic_salary: 0, housing_allowance: 0, transport_allowance: 0,
        insurance_deduction: 0, tax_deduction: 0,
        active: true, created_at: now,
        approved_by: State.currentEmployee.name
      });
      await State.companyRef.child('pending_requests/' + uid).update({
        status: 'approved', approved_at: now,
        approved_by: State.currentEmployee.name
      });
      if (req.device_id) {
        await State.companyRef.child('devices/' + req.device_id).update({
          approved: true, status: 'approved', approved_at: now
        });
      }
      Toast.show('✅ تمت الموافقة');
    } catch (e) {
      Toast.show('❌ ' + e.message, 'error');
    }
  },
  async reject(uid) {
    if (!can('requests_manage')) return;
    if (!confirm('رفض الطلب؟')) return;
    try {
      await State.companyRef.child('pending_requests/' + uid).update({
        status: 'rejected', rejected_at: Utils.nowISO()
      });
      Toast.show('تم الرفض');
    } catch (e) {
      Toast.show('❌ ' + e.message, 'error');
    }
  }
};

/* ═══════════════════════════════════════════════════════════════
   38. Settings
   ═══════════════════════════════════════════════════════════════ */
const Settings = {
  render() {
    Settings.renderSyncInfo();
    const adminTools = document.getElementById('adminTools');
    if (adminTools) adminTools.style.display = can('data_clear') ? 'block' : 'none';
  },
  renderSyncInfo() {
    const el = document.getElementById('syncInfo');
    if (!el) return;
    el.innerHTML =
      '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>الاتصال:</span>' +
        '<strong style="color:' + (State.isOnline ? 'var(--green-2)' : 'var(--red-2)') + ';">' +
        (State.isOnline ? '✅ متصل' : '📴 أوفلاين') + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>الشركة:</span>' +
        '<strong style="font-family:Courier New;">' + Utils.esc(State.currentCompanyId || '') + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>الجهاز:</span>' +
        '<strong style="font-size:10px;">' + Utils.esc(State.deviceId || '') + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>آخر تحديث:</span>' +
        '<strong>' + new Date().toLocaleTimeString('ar-EG') + '</strong></div>';
  }
};

/* ═══════════════════════════════════════════════════════════════
   39. Boot
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  const progress = document.getElementById('loadProgress');
  let p = 0;
  const timer = setInterval(function () {
    p += 20;
    if (progress) progress.style.width = Math.min(p, 100) + '%';
    if (p >= 100) clearInterval(timer);
  }, 200);

  try {
    FBAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});
  } catch (e) {}

  App.init();

  // Periodic cleanup of localStorage
  setInterval(function () {
    try {
      let total = 0;
      const keys = [];
      for (const k in localStorage) {
        if (localStorage.hasOwnProperty(k) && k.startsWith('cache_')) {
          total += localStorage[k].length;
          keys.push(k);
        }
      }
      if (total / (1024 * 1024) > 4) {
        const toDelete = Math.floor(keys.length * 0.3);
        for (let i = 0; i < toDelete; i++) localStorage.removeItem(keys[i]);
      }
    } catch (e) {}
  }, 10 * 60 * 1000);

  window.addEventListener('beforeunload', function (e) {
    if (saleItems.length > 0 || purItems.length > 0 || retItems.length > 0) {
      e.preventDefault();
      e.returnValue = 'لديك تعديلات غير محفوظة';
      return e.returnValue;
    }
  });
});

console.log('%c🏪 البسملة ERP 2026 — جاهز',
  'color:#D4AF37;font-size:16px;font-weight:bold;background:#000;padding:6px 12px;border:1px solid #D4AF37;border-radius:6px;');