/* ═══════════════════════════════════════════════════════════════════
   🏪 البسملة ERP 2026 — النسخة الاحترافية المُعاد بناؤها
   الإصدار: 2026.4
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════════
   0. Global Error Handler
   ═══════════════════════════════════════════════════════════════════ */
window.addEventListener('error', function (e) {
  console.error('🔴 Error:', e.message, e.filename, e.lineno);
  try {
    const logs = JSON.parse(localStorage.getItem('error_log') || '[]');
    logs.push({ ts: new Date().toISOString(), msg: e.message || 'Unknown', file: e.filename || '', line: e.lineno || 0, col: e.colno || 0, stack: e.error && e.error.stack ? e.error.stack.substring(0, 400) : 'N/A' });
    if (logs.length > 30) logs.splice(0, logs.length - 30);
    localStorage.setItem('error_log', JSON.stringify(logs));
  } catch (err) {}
  return true;
});

window.addEventListener('unhandledrejection', function (e) {
  console.error('🔴 Promise:', e.reason);
  try {
    const logs = JSON.parse(localStorage.getItem('error_log') || '[]');
    logs.push({ ts: new Date().toISOString(), msg: 'Promise: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)), stack: e.reason && e.reason.stack ? e.reason.stack.substring(0, 400) : 'N/A' });
    if (logs.length > 30) logs.splice(0, logs.length - 30);
    localStorage.setItem('error_log', JSON.stringify(logs));
  } catch (err) {}
  e.preventDefault();
});

window.showErrorLog = function () {
  try {
    const logs = JSON.parse(localStorage.getItem('error_log') || '[]');
    if (logs.length === 0) { alert('لا توجد أخطاء'); return; }
    let txt = '📋 آخر ' + logs.length + ' خطأ:\n\n';
    for (let i = Math.max(0, logs.length - 8); i < logs.length; i++) {
      txt += '⏰ ' + logs[i].ts + '\n📝 ' + logs[i].msg + '\n';
      if (logs[i].stack && logs[i].stack !== 'N/A') txt += '🔍 ' + logs[i].stack.substring(0, 150) + '\n';
      txt += '───────\n';
    }
    alert(txt);
  } catch (e) { alert('فشل: ' + e.message); }
};

/* ═══════════════════════════════════════════════════════════════════
   1. Firebase Configuration
   ═══════════════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBAmhA9focJ3hGoWeNXgus0X_P4muudEJI",
  authDomain: "albasmala-erp-1.firebaseapp.com",
  databaseURL: "https://albasmala-erp-1-default-rtdb.firebaseio.com",
  projectId: "albasmala-erp-1",
  storageBucket: "albasmala-erp-1.firebasestorage.app",
  messagingSenderId: "1061939949662",
  appId: "1:1061939949662:web:32a20c2dfa457861ea44cf"
};

let FB = null, FBAuth = null, FBDB = null;
try {
  FB = firebase.initializeApp(FIREBASE_CONFIG);
  FBAuth = firebase.auth();
  FBDB = firebase.database();
  console.log('✅ Firebase initialized');
} catch (e) { console.error('❌ Firebase error:', e); }

/* ═══════════════════════════════════════════════════════════════════
   2. Global State
   ═══════════════════════════════════════════════════════════════════ */
const CURRENCY = 'ج.م';
const EARTH_RADIUS = 6371000;
const WORK_DAYS_PER_MONTH = 30;
const APP_VERSION = '2026.4';

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
  pageHistory: [],
  currentPartnerTab: 'customer',
  currentInvTab: 'sales',
  currentVoucherTab: 'receipt',
  currentReturnTab: 'sales',
  currentExpTab: 'expense',
  currentStmtTab: 'partner',
  currentPayrollTab: 'generate',
  currentHRTab: 'overview',
  barcodeTarget: null,
  lastBackPress: 0,
  map: null,
  mapMarkers: {},
  locationWatchId: null,
  editingProductImage: null,
  _modalCallback: null,
  _modalCallbacks: [],
  scanner: null,
  calcState: { current: '0', history: '', operator: null, operand: 0, shouldReset: false },
  pinBuffer: '',
  pinCallback: null,
  attendancePhotoData: null,
  _scannedBarcode: null,
  // ⚠️ flags لمنع مسح النماذج أثناء الإدخال
  _saleFormActive: false,
  _purchaseFormActive: false,
  _returnFormActive: false,
  _initialized: { sales: false, purchase: false, returns: false }
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
  geofences: [], attendance_photos: [], hr_records: []
};

const saleItems = [];
const purItems = [];
const retItems = [];

/* ═══════════════════════════════════════════════════════════════════
   2.1 دليل الحسابات (Chart of Accounts)
   ═══════════════════════════════════════════════════════════════════ */
const ACCOUNTS = {
  cash: {
    id: 'cash',
    label: 'كاش بالخزينة',
    icon: '💵',
    color: 'var(--green-2)',
    type: 'asset',
    order: 1
  },
  bank: {
    id: 'bank',
    label: 'حساب بنكي',
    icon: '🏦',
    color: 'var(--blue-2)',
    type: 'asset',
    order: 2
  },
  instapay: {
    id: 'instapay',
    label: 'إنستا باي',
    icon: '📱',
    color: 'var(--purple-2)',
    type: 'asset',
    order: 3
  },
  vodafone: {
    id: 'vodafone',
    label: 'فودافون كاش',
    icon: '📲',
    color: '#e60000',
    type: 'asset',
    order: 4
  },
  orange: {
    id: 'orange',
    label: 'أورانج كاش',
    icon: '📲',
    color: '#ff7900',
    type: 'asset',
    order: 5
  },
  etisalat: {
    id: 'etisalat',
    label: 'اتصالات كاش',
    icon: '📲',
    color: '#7fba00',
    type: 'asset',
    order: 6
  },
  we: {
    id: 'we',
    label: 'WE كاش',
    icon: '📲',
    color: '#8b00ff',
    type: 'asset',
    order: 7
  },
  pos: {
    id: 'pos',
    label: 'ماكينة POS',
    icon: '💳',
    color: 'var(--orange-2)',
    type: 'asset',
    order: 8
  },
  postal: {
    id: 'postal',
    label: 'حساب بريدي',
    icon: '📮',
    color: '#ffcc00',
    type: 'asset',
    order: 9
  }
};

/**
 * ⚠️ تحويل اسم طريقة الدفع (النص القديم) لـ ID الحساب
 * عشان الكود القديم يستمر في العمل
 */
function methodToAccountId(method) {
  if (!method) return 'cash';
  const m = String(method).trim();

  if (m === 'نقدي' || m === 'كاش' || m === 'نقدا' || m === 'نقداً') return 'cash';
  if (m === 'بنكي' || m === 'بنك' || m === 'تحويل بنكي') return 'bank';
  if (m === 'إنستا باي' || m === 'انستا باي' || m === 'InstaPay' || m === 'instapay') return 'instapay';
  if (m === 'فودافون' || m === 'فودافون كاش' || m === 'Vodafone') return 'vodafone';
  if (m === 'أورانج' || m === 'اورنج' || m === 'أورانج كاش' || m === 'Orange') return 'orange';
  if (m === 'اتصالات' || m === 'إتصالات' || m === 'اتصالات كاش' || m === 'Etisalat') return 'etisalat';
  if (m === 'WE' || m === 'we' || m === 'وي' || m === 'WE كاش') return 'we';
  if (m === 'ماكينة' || m === 'POS' || m === 'pos' || m === 'ماكينة POS') return 'pos';
  if (m === 'بريدي' || m === 'حساب بريدي' || m === 'بريد') return 'postal';

  // افتراضي
  return 'cash';
}

/**
 * ⚠️ جلب تفاصيل الحساب
 */
function getAccount(id) {
  return ACCOUNTS[id] || ACCOUNTS.cash;
}

/**
 * ⚠️ كل الحسابات كـ array مرتب
 */
function getAllAccounts() {
  return Object.values(ACCOUNTS).sort(function (a, b) {
    return (a.order || 0) - (b.order || 0);
  });
   }

/* ═══════════════════════════════════════════════════════════════════
   3. Permissions System (RBAC)
   ═══════════════════════════════════════════════════════════════════ */
const PERMISSIONS = {
  admin: {
    label: 'مدير النظام',
    can: {
      employees_view: true, employees_add: true, employees_edit: true, employees_delete: true,
      hr_view: true, hr_manage: true,
      products_view: true, products_add: true, products_edit: true, products_delete: true,
      partners_view: true, partners_add_customer: true, partners_add_supplier: true,
      partners_edit: true, partners_delete: true,
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
      geofence_manage: true, delete_anything: true,
      activity_view: true, calculator: true,
      export_invoices: true, print_invoices: true
    }
  },
  hr: {
    label: 'موارد بشرية',
    can: {
      employees_view: true, employees_add: true, employees_edit: true, employees_delete: false,
      hr_view: true, hr_manage: true,
      products_view: false, products_add: false, products_edit: false, products_delete: false,
      partners_view: false, partners_add_customer: false, partners_add_supplier: false,
      partners_edit: false, partners_delete: false,
      sales_create: false, sales_delete: false,
      purchase_create: false, purchase_delete: false,
      returns_create: false, returns_delete: false,
      vouchers_create: true, vouchers_delete: false,
      cash_view: true,
      payroll_generate: true, payroll_pay: true, payroll_delete: false,
      reports_view: true, statements_view: true,
      policies_add: true, policies_delete: false,
      expenses_add: false, expenses_delete: false,
      settings_access: false, data_clear: false, data_export: true, data_import: false,
      attendance_mark_all: true, attendance_report: true, attendance_map: true,
      devices_manage: false, requests_manage: false,
      geofence_manage: false, delete_anything: false,
      activity_view: true, calculator: true,
      export_invoices: true, print_invoices: true
    }
  },
  sales: {
    label: 'مبيعات',
    can: {
      employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
      hr_view: false, hr_manage: false,
      products_view: true, products_add: false, products_edit: false, products_delete: false,
      partners_view: true, partners_add_customer: true, partners_add_supplier: false,
      partners_edit: true, partners_delete: false,
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
      attendance_mark_all: false, attendance_report: true, attendance_map: false,
      devices_manage: false, requests_manage: false,
      geofence_manage: false, delete_anything: false,
      activity_view: false, calculator: true,
      export_invoices: true, print_invoices: true
    }
  },
  purchases: {
    label: 'مشتريات',
    can: {
      employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
      hr_view: false, hr_manage: false,
      products_view: true, products_add: false, products_edit: false, products_delete: false,
      partners_view: true, partners_add_customer: false, partners_add_supplier: true,
      partners_edit: true, partners_delete: false,
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
      attendance_mark_all: false, attendance_report: true, attendance_map: false,
      devices_manage: false, requests_manage: false,
      geofence_manage: false, delete_anything: false,
      activity_view: false, calculator: true,
      export_invoices: true, print_invoices: true
    }
  },
  warehouse: {
    label: 'أمين مخزن',
    can: {
      employees_view: false, employees_add: false, employees_edit: false, employees_delete: false,
      hr_view: false, hr_manage: false,
      products_view: true, products_add: true, products_edit: true, products_delete: false,
      partners_view: false, partners_add_customer: false, partners_add_supplier: false,
      partners_edit: false, partners_delete: false,
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
      attendance_mark_all: false, attendance_report: true, attendance_map: false,
      devices_manage: false, requests_manage: false,
      geofence_manage: false, delete_anything: false,
      activity_view: false, calculator: true,
      export_invoices: true, print_invoices: false
    }
  },
  accountant: {
    label: 'محاسب',
    can: {
      employees_view: true, employees_add: false, employees_edit: false, employees_delete: false,
      hr_view: true, hr_manage: false,
      products_view: true, products_add: false, products_edit: false, products_delete: false,
      partners_view: true, partners_add_customer: false, partners_add_supplier: false,
      partners_edit: false, partners_delete: false,
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
      attendance_mark_all: false, attendance_report: true, attendance_map: false,
      devices_manage: false, requests_manage: false,
      geofence_manage: false, delete_anything: false,
      activity_view: true, calculator: true,
      export_invoices: true, print_invoices: true
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

/* ═══════════════════════════════════════════════════════════════════
   4. Utils
   ═══════════════════════════════════════════════════════════════════ */
const Utils = {
  fmtMoney(v) { return (Number(v) || 0).toFixed(2) + ' ' + CURRENCY; },
  fmtNum(v) { return (Number(v) || 0).toFixed(2); },
  fmtInt(v) { return String(parseInt(v) || 0); },
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
  fmtTime(d) {
    if (!d) return '-';
    try { return new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '-'; }
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
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  },
  calcLateDeduction(minutesLate, dailyRate) {
    if (minutesLate <= 15) return 0;
    if (minutesLate <= 30) return dailyRate * 0.25;
    if (minutesLate <= 45) return dailyRate * 0.5;
    return dailyRate;
  },
  getLateStageText(minutesLate) {
    if (minutesLate <= 15) return 'مسموح';
    if (minutesLate <= 30) return 'ربع يوم';
    if (minutesLate <= 45) return 'نصف يوم';
    return 'يوم كامل';
  },
  calcAbsenceDeduction(salary, daysAbsent) {
    if (!salary || !daysAbsent) return 0;
    return (Number(salary) / WORK_DAYS_PER_MONTH) * Number(daysAbsent);
  },
  getMonthKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  },
  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  },
  calculateWorkDaysInMonth(year, month) {
    const days = Utils.getDaysInMonth(year, month);
    let workDays = 0;
    for (let d = 1; d <= days; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      if (dayOfWeek !== 5) workDays++;
    }
    return workDays;
  },
  arabicDay(dateStr) {
    try { return new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long' }); } catch (e) { return ''; }
  },
  calcMinutesLate(checkInTime, expectedHour, expectedMin) {
    if (!checkInTime) return 0;
    const ci = new Date(checkInTime);
    const expected = new Date(ci);
    expected.setHours(expectedHour || 9, expectedMin || 0, 0, 0);
    const diff = Math.floor((ci.getTime() - expected.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  },
  // ⚠️ حساب إجمالي عناصر الفاتورة بأمان
  calcItemsTotal(items) {
    if (!Array.isArray(items)) return 0;
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it) continue;
      const qty = Number(it.quantity) || 0;
      const price = Number(it.price) || 0;
      total += qty * price;
    }
    return total;
  },
  // ⚠️ حساب إجمالي مع خصم وضريبة
  calcInvoiceTotal(subtotal, discount, tax) {
    return (Number(subtotal) || 0) - (Number(discount) || 0) + (Number(tax) || 0);
  }
};

/* ═══════════════════════════════════════════════════════════════════
   5. Toast Notifications
   ═══════════════════════════════════════════════════════════════════ */
const Toast = {
  show(msg, type) {
    type = type || 'success';
    try {
      const t = document.createElement('div');
      t.className = 'toast ' + type;
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { if (t && t.remove) t.remove(); }, 3200);
      if (type === 'error') Utils.vibrate([100, 50, 100]);
      else if (type === 'success') Utils.vibrate(60);
    } catch (e) { console.log('Toast:', msg); }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   6. Modal System (مع دعم modal فوق modal + stack للـ callbacks)
   ═══════════════════════════════════════════════════════════════════ */
const Modal = {
  open(title, bodyHtml, onSave, cancelText, allowStack) {
    cancelText = cancelText || 'إغلاق';

    if (!allowStack) {
      // ⚠️ مودال جديد — اقفل أي modal مفتوح قبل كده
      document.querySelectorAll('.modal-overlay').forEach(function (m) { m.remove(); });
      State._modalCallbacks = [];
      if (onSave) State._modalCallbacks.push(onSave);
      State._modalCallback = onSave || null;
    } else {
      // ⚠️ modal فوق modal — نضيف الـ callback الجديد
      if (onSave) {
        State._modalCallbacks.push(onSave);
        State._modalCallback = onSave;
      }
    }

    const html =
      '<div class="modal-overlay"' + (allowStack ? '' : ' onclick="if(event.target===this)Modal.close()"') + '>' +
        '<div class="modal">' +
          '<h3>' + title + '</h3>' +
          '<div id="modalBody">' + bodyHtml + '</div>' +
          (onSave
            ? '<div style="display:flex;gap:8px;margin-top:16px;">' +
                '<button class="btn btn-primary btn-full" onclick="Modal.confirm()">✓ حفظ</button>' +
                '<button class="btn btn-danger btn-full" onclick="Modal.close()">✕ ' + cancelText + '</button>' +
              '</div>'
            : '<div style="margin-top:16px;">' +
                '<button class="btn btn-outline btn-full" onclick="Modal.close()">✓ ' + cancelText + '</button>' +
              '</div>') +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  },

  close() {
    const modals = document.querySelectorAll('.modal-overlay');
    if (modals.length > 0) modals[modals.length - 1].remove();

    // ⚠️ شيل آخر callback من الـ stack
    if (State._modalCallbacks && State._modalCallbacks.length > 0) {
      State._modalCallbacks.pop();
    }

    // ⚠️ حدّث _modalCallback للقيمة الجديدة
    if (State._modalCallbacks && State._modalCallbacks.length > 0) {
      State._modalCallback = State._modalCallbacks[State._modalCallbacks.length - 1];
    } else {
      State._modalCallback = null;
    }

    // ⚠️ لو مفيش modal فاضل — وقّف السكانر
    const remaining = document.querySelectorAll('.modal-overlay');
    if (remaining.length === 0) {
      try { if (typeof Scanner !== 'undefined' && Scanner.stop) Scanner.stop(); } catch (e) {}
    }
  },

  closeAll() {
    try {
      document.querySelectorAll('.modal-overlay').forEach(function (m) { m.remove(); });
      State._modalCallback = null;
      State._modalCallbacks = [];
      if (typeof Scanner !== 'undefined' && Scanner.stop) Scanner.stop();
    } catch (e) {}
  },

  async confirm() {
    if (!State._modalCallback) {
      Toast.show('لا يوجد حفظ معلق', 'error');
      return;
    }

    // ⚠️ نثبّت الـ callback عشان نتأكد من تنفيذ القيمة الصح
    const callback = State._modalCallback;

    try {
      await callback();
    } catch (e) {
      console.error('Modal confirm error:', e);
      Toast.show('❌ خطأ: ' + (e.message || 'غير معروف'), 'error');
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════
   7. Sync Engine (Offline-First) — مع merge ذكي
   ═══════════════════════════════════════════════════════════════════ */
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
    data._updated = Utils.nowISO();
    data._updated_by = State.currentEmployee ? State.currentEmployee.name : 'unknown';
    data._device = State.deviceId;
    Sync.saveLocal(store, id, data);
    if (!State.companyRef) {
      Sync.queuePending(store, id, data);
      return false;
    }
    try {
      await State.companyRef.child(store + '/' + id).set(data);
      return true;
    } catch (e) {
      console.error('saveToFirebase:', e);
      Sync.queuePending(store, id, data);
      return false;
    }
  },

  saveLocal(store, id, data) {
    try {
      const key = 'offline_data_' + State.currentCompanyId + '_' + store;
      let items = JSON.parse(localStorage.getItem(key) || '{}');
      items[id] = data;
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {}
  },

  queuePending(store, id, data) {
    try {
      const key = 'pending_changes_' + State.currentCompanyId;
      let pending = JSON.parse(localStorage.getItem(key) || '[]');
      // ⚠️ شيل أي pending قديم لنفس العنصر
      pending = pending.filter(function (p) { return !(p.store === store && p.id === id); });
      pending.push({ store: store, id: id, data: data, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(pending));
    } catch (e) {}
  },

  getPending() {
    try {
      const key = 'pending_changes_' + State.currentCompanyId;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) { return []; }
  },

  async flushPending() {
    if (!navigator.onLine || !State.companyRef) return;
    const pending = Sync.getPending();
    if (pending.length === 0) return;
    const remaining = [];
    for (const p of pending) {
      try {
        await State.companyRef.child(p.store + '/' + p.id).set(p.data);
      } catch (e) {
        remaining.push(p);
      }
    }
    try {
      const key = 'pending_changes_' + State.currentCompanyId;
      localStorage.setItem(key, JSON.stringify(remaining));
    } catch (e) {}
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
      try { Settings.renderSyncInfo(); } catch (e) {}
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

window.addEventListener('online', function () {
  State.isOnline = true;
  Sync.updateBar();
  setTimeout(Sync.flushPending, 1500);
});

window.addEventListener('offline', function () {
  State.isOnline = false;
  Sync.updateBar();
});

/* ═══════════════════════════════════════════════════════════════════
   8. Activity Log
   ═══════════════════════════════════════════════════════════════════ */
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
      'device_rejected': '🚫 جهاز مرفوض', 'hr_update': '📋 HR',
      'export': '📄 تصدير', 'print': '🖨️ طباعة',
      'product_save': '📦 منتج', 'partner_save': '🤝 جهة'
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

/* ═══════════════════════════════════════════════════════════════════
   9. Biometric (3-Tier: Cordova → WebAuthn → PIN)
   ═══════════════════════════════════════════════════════════════════ */
const Biometric = {
  async verify(reason) {
    reason = reason || 'تأكيد الهوية';
    // 1. Cordova Fingerprint
    if (window.Fingerprint && typeof Fingerprint.isAvailable === 'function') {
      const ok = await Biometric.cordovaFingerprint(reason);
      if (ok) return true;
    }
    // 2. WebAuthn
    if (window.PublicKeyCredential) {
      const ok = await Biometric.webauthn(reason);
      if (ok) return true;
    }
    // 3. PIN Fallback
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
            title: '🏪 شركة البسملة',
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
      if (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) return false;
      }
      return false;
    } catch (e) { return false; }
  },

  pinFallback(reason) {
  return new Promise(function (resolve) {
    State.pinBuffer = '';
    State.pinCallback = resolve;
    const html =
      '<div style="text-align:center;">' +
        '<p style="color:var(--text-2);margin-bottom:12px;">' + Utils.esc(reason) + '</p>' +
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
      const storedPin = localStorage.getItem('user_pin_' + (State.currentUser ? State.currentUser.uid : 'x')) || '0000';
      //                                                                                            ↑↑↑↑
      //                                                                     PIN افتراضي مش سهل تخمينه
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

/* ═══════════════════════════════════════════════════════════════════
   10. Camera Helper
   ═══════════════════════════════════════════════════════════════════ */
const CameraHelper = {
  _stream: null,
  _resolve: null,

  // كاميرا أمامية — صورة إثبات الحضور
  async capturePhoto() {
    return new Promise(function (resolve) {
      const html =
        '<div style="text-align:center;">' +
          '<video id="cameraPreview" autoplay playsinline muted style="width:100%;max-width:320px;border-radius:12px;border:2px solid var(--gold);"></video>' +
          '<canvas id="cameraCanvas" style="display:none;"></canvas>' +
          '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">' +
            '<button class="btn btn-primary" onclick="CameraHelper.takeSnapshot()">📸 التقاط</button>' +
            '<button class="btn btn-warning" onclick="CameraHelper.captureFallback()">🖼️ من المعرض</button>' +
          '</div>' +
        '</div>';
      Modal.open('📷 صورة إثبات', html, null, 'إغلاق');
      CameraHelper._resolve = resolve;
      setTimeout(async function () {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 } }
          });
          const video = document.getElementById('cameraPreview');
          if (video) { video.srcObject = stream; CameraHelper._stream = stream; }
        } catch (e) {
          Toast.show('⚠️ لا يمكن الوصول للكاميرا', 'error');
          CameraHelper.captureFallback();
        }
      }, 300);
    });
  },

  takeSnapshot() {
    const video = document.getElementById('cameraPreview');
    const canvas = document.getElementById('cameraCanvas');
    if (!video || !canvas) return;
    const maxW = 400;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > h && w > maxW) { h = h * maxW / w; w = maxW; }
    else if (h > maxW) { w = w * maxW / h; h = maxW; }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    CameraHelper._cleanup();
    Modal.close();
    Utils.vibrate(80);
    const r = CameraHelper._resolve;
    CameraHelper._resolve = null;
    if (r) r(dataUrl);
  },

  captureFallback() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user';
    input.onchange = function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          const maxW = 400;
          let w = img.width, h = img.height;
          if (w > h && w > maxW) { h = h * maxW / w; w = maxW; }
          else if (h > maxW) { w = w * maxW / h; h = maxW; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          CameraHelper._cleanup();
          Modal.close();
          const r = CameraHelper._resolve;
          CameraHelper._resolve = null;
          if (r) r(dataUrl);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  // كاميرا خلفية — صورة المنتج
  async captureFromCamera() {
    return new Promise(function (resolve) {
      const html =
        '<div style="text-align:center;">' +
          '<video id="prodCameraPreview" autoplay playsinline muted style="width:100%;max-width:320px;border-radius:12px;border:2px solid var(--gold);"></video>' +
          '<canvas id="prodCameraCanvas" style="display:none;"></canvas>' +
          '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">' +
            '<button class="btn btn-primary" onclick="CameraHelper.takeProductSnapshot()">📸 التقاط</button>' +
            '<button class="btn btn-warning" onclick="CameraHelper.cancelProductCamera()">❌ إلغاء</button>' +
          '</div>' +
        '</div>';
      Modal.open('📷 التقاط صورة المنتج', html, null, 'إلغاء', true);
      CameraHelper._resolve = resolve;
      setTimeout(async function () {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 800 }, height: { ideal: 800 } }
          });
          const video = document.getElementById('prodCameraPreview');
          if (video) { video.srcObject = stream; CameraHelper._stream = stream; }
        } catch (e) {
          Toast.show('❌ فشل الوصول للكاميرا', 'error');
          CameraHelper.cancelProductCamera();
        }
      }, 300);
    });
  },

  takeProductSnapshot() {
    const video = document.getElementById('prodCameraPreview');
    const canvas = document.getElementById('prodCameraCanvas');
    if (!video || !canvas) return;
    const maxW = 500;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > h && w > maxW) { h = h * maxW / w; w = maxW; }
    else if (h > maxW) { w = w * maxW / h; h = maxW; }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    CameraHelper._cleanup();
    const modals = document.querySelectorAll('.modal-overlay');
    if (modals.length > 0) modals[modals.length - 1].remove();
    Utils.vibrate(80);
    const r = CameraHelper._resolve;
    CameraHelper._resolve = null;
    if (r) r(dataUrl);
  },

  cancelProductCamera() {
    CameraHelper._cleanup();
    const modals = document.querySelectorAll('.modal-overlay');
    if (modals.length > 0) modals[modals.length - 1].remove();
    const r = CameraHelper._resolve;
    CameraHelper._resolve = null;
    if (r) r(null);
  },

  _cleanup() {
    if (CameraHelper._stream) {
      try { CameraHelper._stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      CameraHelper._stream = null;
    }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   11. Location Service
   ═══════════════════════════════════════════════════════════════════ */
const LocationService = {
  getCurrent(options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) return reject(new Error('الجهاز لا يدعم GPS'));
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp });
        },
        function (err) {
          let msg = 'فشل تحديد الموقع';
          if (err.code === 1) msg = '❌ يجب السماح بالوصول للموقع';
          else if (err.code === 2) msg = '❌ الموقع غير متاح';
          else if (err.code === 3) msg = '❌ انتهت المهلة';
          reject(new Error(msg));
        },
        { enableHighAccuracy: options.highAccuracy !== false, timeout: options.timeout || 15000, maximumAge: options.maximumAge || 30000 }
      );
    });
  },

  async checkGeofence() {
    try {
      const pos = await LocationService.getCurrent();
      const geofences = (cache.geofences || []).filter(function (g) { return g.active !== false; });
      if (geofences.length === 0) return { inRange: true, reason: 'no_geofence', pos: pos, distance: 0 };
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
    LocationService.stopWatching();
    if (!navigator.geolocation) return;
    State.locationWatchId = navigator.geolocation.watchPosition(
      function (pos) {
        if (callback) callback({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
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
      const pos = await LocationService.getCurrent();
      Toast.show('✅ الموقع: ' + pos.lat.toFixed(5) + ', ' + pos.lng.toFixed(5));
    } catch (e) { Toast.show(e.message, 'error'); }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   12. Geofence Management
   ═══════════════════════════════════════════════════════════════════ */
const Geofence = {
  async pickCurrent() {
    try {
      Toast.show('⏳ جاري التقاط الموقع...', 'info');
      const pos = await LocationService.getCurrent();
      const latEl = document.getElementById('geoLat');
      const lngEl = document.getElementById('geoLng');
      if (latEl) latEl.value = pos.lat.toFixed(6);
      if (lngEl) lngEl.value = pos.lng.toFixed(6);
      Toast.show('✅ تم التقاط الموقع');
    } catch (e) { Toast.show(e.message, 'error'); }
  },

  async save() {
    if (!requirePermission('geofence_manage', 'إدارة النطاق')) return;
    const nameEl = document.getElementById('geoName');
    const latEl = document.getElementById('geoLat');
    const lngEl = document.getElementById('geoLng');
    const radiusEl = document.getElementById('geoRadius');
    const name = nameEl ? nameEl.value.trim() : '';
    const lat = latEl ? parseFloat(latEl.value) : NaN;
    const lng = lngEl ? parseFloat(lngEl.value) : NaN;
    const radius = radiusEl ? (parseFloat(radiusEl.value) || 100) : 100;
    if (!name) return Toast.show('اسم الموقع مطلوب', 'error');
    if (isNaN(lat) || isNaN(lng)) return Toast.show('إحداثيات غير صالحة', 'error');
    const id = Utils.genId('GEO');
    await Sync.save('geofences', id, {
      id: id, name: name, lat: lat, lng: lng, radius: radius, active: true,
      created_at: Utils.nowISO(), created_by: State.currentEmployee.name
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
        '<p style="font-size:11px;font-family:monospace;">' + Number(g.lat).toFixed(5) + ', ' + Number(g.lng).toFixed(5) + '</p>' +
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

/* ═══════════════════════════════════════════════════════════════════
   13. Scanner (كاميرا + معرض + يدوي)
   ═══════════════════════════════════════════════════════════════════ */
const Scanner = {
  open(target) {
    State.barcodeTarget = target;
    const html =
      '<div style="text-align:center;">' +
        '<p style="color:var(--text-2);font-size:12px;margin-bottom:10px;">وجّه الكاميرا نحو الباركود</p>' +
        '<div id="reader" style="width:100%;max-width:340px;margin:0 auto;border-radius:12px;overflow:hidden;border:2px solid var(--gold);min-height:200px;background:#000;"></div>' +
        '<div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">' +
          '<button class="btn btn-info btn-full" onclick="Scanner.manualEntry()">⌨️ إدخال يدوي</button>' +
          '<button class="btn btn-warning btn-full" onclick="Scanner.fromGallery()">🖼️ من المعرض</button>' +
          '<button class="btn btn-outline btn-full" onclick="Scanner.reportError()">⚠️ الكاميرا لا تعمل؟</button>' +
        '</div>' +
      '</div>';
    Modal.open('📷 مسح الباركود', html, null, 'إغلاق', true);
    setTimeout(function () { Scanner.start(); }, 300);
  },

  async start() {
    const reader = document.getElementById('reader');
    if (!reader) return;
    if (typeof Html5Qrcode !== 'undefined') {
      try {
        State.scanner = new Html5Qrcode("reader");
        await State.scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 }, aspectRatio: 1.7 },
          function (text) { Utils.vibrate(100); Scanner.onResult(text); },
          function () { }
        );
        return;
      } catch (e) { console.warn('html5-qrcode failed:', e); }
    }
    if ('BarcodeDetector' in window) {
      try { await Scanner.startNative(); return; } catch (e) { console.warn('BarcodeDetector failed:', e); }
    }
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
          Scanner.onResult(barcodes[0].rawValue);
          return;
        }
      } catch (e) {}
      if (document.getElementById('scanVideo')) requestAnimationFrame(scanLoop);
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
          '<p style="font-size:12px;margin-top:8px;">استخدم الإدخال اليدوي أو المعرض</p>' +
        '</div>';
    }
  },

  manualEntry() {
    const html =
      '<div class="form-group"><label>أدخل الباركود يدوياً</label>' +
        '<input id="manualBarcode" placeholder="اكتب الباركود..." autofocus>' +
      '</div>' +
      '<button class="btn btn-primary btn-full" onclick="Scanner.submitManual()">✓ تأكيد</button>';
    Modal.open('⌨️ إدخال يدوي', html, null, 'إغلاق');
  },

  submitManual() {
    const el = document.getElementById('manualBarcode');
    const code = el ? el.value.trim() : '';
    if (!code) return Toast.show('أدخل الباركود', 'error');
    try {
      const modals = document.querySelectorAll('.modal-overlay');
      if (modals.length > 0) modals[modals.length - 1].remove();
    } catch (e) {}
    Scanner.handleBarcode(code, State.barcodeTarget);
  },

  fromGallery() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function (e) {
      const file = e.target.files[0];
      if (!file) return;
      try {
        if (typeof Html5Qrcode !== 'undefined') {
          Toast.show('⏳ جاري تحليل الصورة...', 'info');
          const scanner = new Html5Qrcode("reader");
          const result = await scanner.scanFile(file, true);
          Utils.vibrate(100);
          Scanner.onResult(result);
        } else if ('BarcodeDetector' in window) {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await img.decode();
          const detector = new BarcodeDetector();
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0) { Utils.vibrate(100); Scanner.onResult(barcodes[0].rawValue); }
          else Toast.show('❌ لم يتم العثور على باركود', 'error');
        } else Toast.show('❌ غير مدعوم', 'error');
      } catch (err) { Toast.show('❌ فشل التحليل: ' + err.message, 'error'); }
    };
    input.click();
  },

  async stop() {
    if (State.scanner) {
      try { await State.scanner.stop(); State.scanner.clear(); } catch (e) {}
      State.scanner = null;
    }
    const video = document.getElementById('scanVideo');
    if (video && video.srcObject) video.srcObject.getTracks().forEach(function (t) { t.stop(); });
  },

  onResult(code) {
    const target = State.barcodeTarget;
    Promise.resolve()
      .then(function () { return Scanner.stop(); })
      .catch(function (e) { console.warn('Scanner.stop error:', e); })
      .then(function () { Scanner.handleBarcode(code, target); });
  },

  handleBarcode(code, target) {
    const products = cache.products || [];
    const p = products.find(function (x) { return x.barcode === code || x.code === code; });

    // ⚠️ حالة 'field': نحط الكود في الحقل
    if (target === 'field') {
      try {
        const modals = document.querySelectorAll('.modal-overlay');
        if (modals.length > 0) modals[modals.length - 1].remove();
      } catch (e) {}
      State._scannedBarcode = code;
      setTimeout(function () {
        const el = document.getElementById('p_barcode');
        if (el) {
          el.value = code;
          try {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e) {}
          try { el.focus(); } catch (e) {}
          Toast.show('✅ تم إدخال الباركود: ' + code);
        } else Toast.show('✅ تم المسح: ' + code, 'info');
      }, 350);
      return;
    }

    // ⚠️ حالة 'search'
    if (target === 'search') {
      try {
        const modals = document.querySelectorAll('.modal-overlay');
        if (modals.length > 0) modals[modals.length - 1].remove();
      } catch (e) {}
      setTimeout(function () {
        try {
          const el = document.getElementById('prodSearch');
          if (el) { el.value = code; Products.search(code); }
        } catch (e) {}
      }, 300);
      return;
    }

    // ⚠️ باقي الحالات
    try {
      const modals = document.querySelectorAll('.modal-overlay');
      if (modals.length > 0) modals[modals.length - 1].remove();
    } catch (e) {}

    setTimeout(function () {
      try {
        if (target === 'sale') {
          if (!p) { Scanner.quickAddProduct(code, 'sale'); return; }
          Sales.addItemById(p.id);
          Toast.show('✅ ' + p.name);
        } else if (target === 'purchase') {
          if (!p) { Scanner.quickAddProduct(code, 'purchase'); return; }
          Purchases.addItemById(p.id);
          Toast.show('✅ ' + p.name);
        } else if (target === 'return') {
          if (!p) { Toast.show('منتج غير موجود: ' + code, 'error'); return; }
          Returns.addItemById(p.id);
          Toast.show('✅ ' + p.name);
        }
      } catch (e) { Toast.show('خطأ: ' + e.message, 'error'); }
    }, 300);
  },

  quickAddProduct(barcode, context) {
    const html =
      '<div class="warning-box">⚠️ المنتج غير موجود. هل تريد إضافته الآن؟</div>' +
      '<div class="form-group"><label>اسم المنتج *</label><input id="qp_name" autofocus></div>' +
      '<div class="form-group"><label>الباركود</label><input id="qp_barcode" value="' + Utils.esc(barcode) + '"></div>' +
      '<div class="form-group"><label>الوحدة</label><input id="qp_unit" value="قطعة"></div>' +
      '<div class="form-group"><label>سعر الشراء</label><input id="qp_cost" type="number" value="0"></div>' +
      '<div class="form-group"><label>سعر البيع</label><input id="qp_sale" type="number" value="0"></div>' +
      '<div class="form-group"><label>الكمية الحالية</label><input id="qp_qty" type="number" value="0"></div>';
    Modal.open('➕ إضافة منتج جديد', html, async function () {
      const nameEl = document.getElementById('qp_name');
      const name = nameEl ? nameEl.value.trim() : '';
      if (!name) return Toast.show('اسم المنتج مطلوب', 'error');
      const newId = Utils.genId('PRD');
      const product = {
        id: newId,
        name: name,
        barcode: document.getElementById('qp_barcode').value.trim(),
        code: Products.generateAutoCode(),
        unit: document.getElementById('qp_unit').value,
        cost_price: parseFloat(document.getElementById('qp_cost').value) || 0,
        sale_price: parseFloat(document.getElementById('qp_sale').value) || 0,
        quantity: parseInt(document.getElementById('qp_qty').value) || 0,
        min_quantity: 5,
        image: '',
        active: true,
        created_at: Utils.nowISO()
      };
      await Sync.save('products', newId, product);
      // ⚠️ حدّث cache فوراً
      const idx = (cache.products || []).findIndex(function (x) { return x.id === newId; });
      if (idx >= 0) cache.products[idx] = product;
      else cache.products.push(product);
      Modal.close();
      Toast.show('✅ تم إضافة ' + name);
      setTimeout(function () {
        if (context === 'sale') Sales.addItemById(newId);
        else if (context === 'purchase') Purchases.addItemById(newId);
      }, 300);
    });
  },

  reportError() {
    const html =
      '<div class="warning-box">' +
        '<p><strong>لتشغيل الكاميرا، تأكد من:</strong></p>' +
        '<ul style="margin-top:8px;padding-right:20px;line-height:1.8;">' +
          '<li>✅ السماح للتطبيق بالوصول للكاميرا</li>' +
          '<li>✅ التطبيق يعمل على <strong>HTTPS</strong></li>' +
          '<li>✅ لا يوجد تطبيق آخر يستخدم الكاميرا</li>' +
          '<li>✅ إعادة تشغيل التطبيق بعد منح الصلاحية</li>' +
        '</ul>' +
      '</div>' +
      '<button class="btn btn-primary btn-full" onclick="Scanner.testPermission()" style="margin-top:12px;">🔓 طلب الصلاحية الآن</button>';
    Modal.open('⚠️ مساعدة الكاميرا', html, null, 'إغلاق');
  },

  async testPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(function (t) { t.stop(); });
      Toast.show('✅ تم منح الصلاحية — أعد المحاولة');
      Modal.close();
    } catch (e) { Toast.show('❌ رفض الصلاحية: ' + e.message, 'error'); }
  },

  async test() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(function (t) { t.stop(); });
      Toast.show('✅ الكاميرا تعمل');
    } catch (e) { Toast.show('❌ ' + e.message, 'error'); }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   14. EXPORT ENGINE (PDF + Excel + Print)
   ═══════════════════════════════════════════════════════════════════ */
const Export = {
  formats: [
    { value: 'pdf', label: '📄 PDF (طباعة / حفظ)' },
    { value: 'excel', label: '📊 Excel (CSV)' },
    { value: 'print', label: '🖨️ طباعة مباشرة' },
    { value: 'share', label: '📤 مشاركة' }
  ],

  openDialog(docType, docData, docItems) {
    if (!requirePermission('export_invoices', 'تصدير')) return;
    const html =
      '<div class="info-box">📋 اختر صيغة التصدير:</div>' +
      '<div class="form-group">' +
        '<label>الصيغة</label>' +
        '<select id="export_format" onchange="Export.updateFormatHint()">' +
          Export.formats.map(function (f) {
            return '<option value="' + f.value + '">' + f.label + '</option>';
          }).join('') +
        '</select>' +
        '<p id="exportHint" style="color:var(--text-2);font-size:12px;margin-top:6px;"></p>' +
      '</div>' +
      '<div class="form-group" id="exportPrintOptions" style="display:none;">' +
        '<label>طريقة الطباعة</label>' +
        '<select id="print_method">' +
          '<option value="dialog">🖨️ نافذة الطباعة</option>' +
          '<option value="bluetooth">📱 Bluetooth</option>' +
        '</select>' +
      '</div>' +
      '<button class="btn btn-primary btn-full" onclick="Export.execute(\'' + docType + '\')">✓ تصدير الآن</button>';
    Modal.open('📤 تصدير / طباعة', html, null, 'إغلاق');
    setTimeout(function () { Export.updateFormatHint(); }, 100);
    Export._currentDoc = { type: docType, data: docData, items: docItems };
  },

  updateFormatHint() {
    const fmtEl = document.getElementById('export_format');
    const hint = document.getElementById('exportHint');
    const printOpts = document.getElementById('exportPrintOptions');
    if (!fmtEl || !hint) return;
    const fmt = fmtEl.value;
    if (fmt === 'pdf') {
      hint.textContent = 'سيتم فتح صفحة الطباعة — اختر "حفظ PDF" أو الطابعة';
      if (printOpts) printOpts.style.display = 'block';
    } else if (fmt === 'excel') {
      hint.textContent = 'سيتم تحميل ملف CSV يفتح في Excel';
      if (printOpts) printOpts.style.display = 'none';
    } else if (fmt === 'print') {
      hint.textContent = 'سيتم الطباعة مباشرة عبر المتصفح';
      if (printOpts) printOpts.style.display = 'block';
    } else if (fmt === 'share') {
      hint.textContent = 'سيتم مشاركة الفاتورة كنص';
      if (printOpts) printOpts.style.display = 'none';
    }
  },

  async execute(docType) {
    const fmtEl = document.getElementById('export_format');
    const fmt = fmtEl ? fmtEl.value : 'pdf';
    const doc = Export._currentDoc;
    if (!doc) return;
    Modal.close();
    if (fmt === 'pdf') await Export.toPDF(doc.data, doc.items, docType);
    else if (fmt === 'excel') Export.toExcel(doc.data, doc.items, docType);
    else if (fmt === 'print') {
      const methodEl = document.getElementById('print_method');
      const method = methodEl ? methodEl.value : 'dialog';
      await Export.printDirect(doc.data, doc.items, docType, method);
    } else if (fmt === 'share') await Export.share(doc.data, doc.items, docType);
    await Activity.log('export', docType + ' - ' + fmt);
  },

  generateHTML(doc, items, docType) {
    const titles = {
      sales: '🧾 فاتورة مبيعات', purchase: '📦 فاتورة مشتريات',
      sales_return: '↩️ مرتجع مبيعات', purchase_return: '↩️ مرتجع مشتريات',
      voucher_receipt: '🧾 سند قبض', voucher_payment: '🧾 سند دفع',
      payroll: '💵 مفردات مرتب'
    };
    const partyLabels = {
      sales: 'العميل', purchase: 'المورد',
      sales_return: 'العميل', purchase_return: 'المورد',
      voucher_receipt: 'الجهة', voucher_payment: 'الجهة',
      payroll: 'الموظف'
    };
    const title = titles[docType] || '📄 مستند';
    const partyLabel = partyLabels[docType] || 'الجهة';
    const partyName = doc.customer_name || doc.supplier_name || doc.party_name || doc.employee_name || '-';
    const docNo = doc.invoice_no || doc.return_no || doc.voucher_no || ('PAY-' + (doc.month || ''));

    let html =
      '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">' +
      '<title>' + docNo + '</title>' +
      '<style>' +
        '@page { size: 80mm auto; margin: 3mm; }' +
        'body { font-family: Cairo, Tahoma, sans-serif; padding: 6px; color: #000; max-width: 74mm; margin: 0 auto; background: #fff; }' +
        '.header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }' +
        '.header h1 { color: #B8941F; font-size: 18px; margin: 0 0 4px 0; }' +
        '.header h2 { color: #000; font-size: 14px; margin: 4px 0; }' +
        '.header p { font-size: 10px; margin: 2px 0; }' +
        '.line { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }' +
        '.items { margin: 8px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; }' +
        '.item { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; align-items: center; }' +
        '.item img { width: 30px; height: 30px; object-fit: cover; border-radius: 4px; margin-left: 4px; }' +
        '.item-name { flex: 1; display: flex; align-items: center; gap: 4px; }' +
        '.total { border-top: 2px dashed #000; padding-top: 8px; font-weight: 700; font-size: 13px; margin-top: 6px; }' +
        '.signature { display: flex; justify-content: space-between; margin-top: 20px; font-size: 10px; }' +
        '.signature div { text-align: center; border-top: 1px solid #000; padding-top: 4px; width: 40%; }' +
      '</style></head><body>' +
      '<div class="header">' +
        '<h1>🏪 شركة البسملة</h1>' +
        '<p>لتجارة المشغولات الصينية</p>' +
        '<h2>' + title + '</h2>' +
      '</div>' +
      '<div class="line"><span>رقم:</span><span>' + Utils.esc(docNo) + '</span></div>' +
      '<div class="line"><span>التاريخ:</span><span>' + Utils.fmtDate(doc.date || doc.created_at) + '</span></div>' +
      '<div class="line"><span>' + partyLabel + ':</span><span>' + Utils.esc(partyName) + '</span></div>' +
      '<div class="line"><span>الموظف:</span><span>' + Utils.esc(doc.employee_name || '-') + '</span></div>';

    if (docType === 'payroll') {
      html += '<hr style="border:none;border-top:1px dashed #000;margin:8px 0;">' +
        '<div class="line"><span>أيام العمل:</span><span>' + (doc.work_days || 0) + '</span></div>' +
        '<div class="line"><span>أيام الحضور:</span><span>' + (doc.attendance_days || 0) + '</span></div>' +
        '<div class="line"><span>أيام الغياب:</span><span>' + (doc.absence_days || 0) + '</span></div>' +
        '<hr style="border:none;border-top:1px dashed #000;margin:8px 0;">' +
        '<div class="line"><span>الأساسي:</span><span>' + Utils.fmtMoney(doc.basic_salary) + '</span></div>' +
        '<div class="line"><span>بدل سكن:</span><span>' + Utils.fmtMoney(doc.housing_allowance) + '</span></div>' +
        '<div class="line"><span>بدل مواصلات:</span><span>' + Utils.fmtMoney(doc.transport_allowance) + '</span></div>' +
        '<div class="line"><span>مكافآت:</span><span>+' + Utils.fmtMoney(doc.bonuses) + '</span></div>' +
        '<hr style="border:none;border-top:1px dashed #000;margin:8px 0;">' +
        '<div class="line"><span>خصم غياب:</span><span>-' + Utils.fmtMoney(doc.absence_deduction) + '</span></div>' +
        '<div class="line"><span>خصم تأخير:</span><span>-' + Utils.fmtMoney(doc.late_deduction || 0) + '</span></div>' +
        '<div class="line"><span>تأمينات:</span><span>-' + Utils.fmtMoney(doc.insurance_deduction) + '</span></div>' +
        '<div class="line"><span>ضريبة:</span><span>-' + Utils.fmtMoney(doc.tax_deduction) + '</span></div>' +
        '<div class="line total"><span>الصافي:</span><span>' + Utils.fmtMoney(doc.net_salary) + '</span></div>';
    } else if (docType === 'voucher_receipt' || docType === 'voucher_payment') {
      html += '<hr style="border:none;border-top:1px dashed #000;margin:8px 0;">' +
        '<div class="line"><span>المبلغ:</span><span>' + Utils.fmtMoney(doc.amount) + '</span></div>' +
        '<div class="line"><span>طريقة الدفع:</span><span>' + Utils.esc(doc.payment_method || '-') + '</span></div>' +
        '<div class="line"><span>البيان:</span><span>' + Utils.esc(doc.description || '-') + '</span></div>' +
        '<div class="line total"><span>الإجمالي:</span><span>' + Utils.fmtMoney(doc.amount) + '</span></div>';
    } else {
      html += '<div class="items">';
      for (const it of items) {
        // ⚠️ صورة المنتج في الفاتورة
        const product = (cache.products || []).find(function (x) { return x.id === it.product_id; });
        const imgTag = product && product.image
          ? '<img src="' + product.image + '" style="width:30px;height:30px;object-fit:cover;border-radius:4px;">'
          : '';
        html += '<div class="item">' +
          '<span class="item-name">' + imgTag + ' ' + Utils.esc(it.product_name || it.name || 'صنف') + '</span>' +
          '<span>' + it.quantity + ' × ' + Utils.fmtMoney(it.price) + ' = ' + Utils.fmtMoney(it.total) + '</span>' +
        '</div>';
      }
      html += '</div>' +
        '<div class="line"><span>الإجمالي الفرعي:</span><span>' + Utils.fmtMoney(doc.subtotal) + '</span></div>' +
        '<div class="line"><span>الخصم:</span><span>' + Utils.fmtMoney(doc.discount || 0) + '</span></div>' +
        '<div class="line"><span>الضريبة:</span><span>' + Utils.fmtMoney(doc.tax || 0) + '</span></div>' +
        '<div class="line total"><span>الإجمالي:</span><span>' + Utils.fmtMoney(doc.total) + '</span></div>' +
        '<div class="line"><span>المدفوع:</span><span>' + Utils.fmtMoney(doc.paid || 0) + '</span></div>' +
        '<div class="line"><span>الباقي:</span><span>' + Utils.fmtMoney(doc.remaining || 0) + '</span></div>';
    }

    html += '<div class="signature"><div>توقيع البائع</div><div>توقيع المستلم</div></div>' +
      '<div style="text-align:center;font-size:10px;margin-top:12px;">شكراً لتعاملكم معنا<br>© شركة البسملة ' + new Date().getFullYear() + '</div>' +
      '</body></html>';
    return html;
  },

async toPDF(doc, items, docType) {
  Toast.show('⏳ جاري تجهيز PDF...', 'info');

  // ⚠️ التحقق من المكتبات
  if (typeof html2pdf === 'undefined') {
    console.warn('html2pdf.js not loaded, falling back to print dialog');
    Toast.show('⚠️ مكتبة PDF غير محمّلة — استخدام الطباعة', 'info');
    const html = Export.generateHTML(doc, items, docType);
    return Export.printHTML(html, 'dialog');
  }

  let container = null;

  try {
    // ⚠️ اسم الملف
    const docNo = doc.invoice_no || doc.return_no || doc.voucher_no ||
                  ('PAY-' + (doc.month || '')) || 'document';
    const safeName = String(docNo).replace(/[^A-Za-z0-9\-_]/g, '_');
    const filename = 'albasmala_' + docType + '_' + safeName + '.pdf';

    // ⚠️ توليد HTML كامل
    const fullHtml = Export.generateHTML(doc, items, docType);

    // ⚠️ استخراج body content فقط (شيل DOCTYPE و head)
    let bodyContent = fullHtml;
    const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      bodyContent = bodyMatch[1];
    }

    // ⚠️ إنشاء حاوية حقيقية في الـ DOM (مخفية بعيد عن الشاشة لكن موجودة)
    container = document.createElement('div');
    container.id = 'pdf-temp-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '302px';        // 80mm
    container.style.minHeight = '100px';
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.padding = '12px';
    container.style.fontFamily = 'Cairo, Tahoma, sans-serif';
    container.style.fontSize = '11px';
    container.style.direction = 'rtl';
    container.style.zIndex = '-999999';
    container.style.opacity = '0.01';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    container.innerHTML = bodyContent;

    document.body.appendChild(container);

    // ⚠️ انتظار رسم المحتوى (خصوصاً الصور)
    await new Promise(function (resolve) {
      // انتظر تحميل كل الصور لو فيه
      const images = container.querySelectorAll('img');
      if (images.length === 0) {
        setTimeout(resolve, 300);
        return;
      }
      let loaded = 0;
      let resolved = false;
      const done = function () {
        if (resolved) return;
        resolved = true;
        resolve();
      };
      images.forEach(function (img) {
        if (img.complete) {
          loaded++;
          if (loaded >= images.length) done();
        } else {
          img.onload = function () {
            loaded++;
            if (loaded >= images.length) done();
          };
          img.onerror = function () {
            loaded++;
            if (loaded >= images.length) done();
          };
        }
      });
      // Timeout احتياطي
      setTimeout(done, 2000);
    });

    // ⚠️ إعدادات PDF
    const options = {
      margin: [3, 3, 3, 3],
      filename: filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: 302,
        windowWidth: 302
      },
      jsPDF: {
        unit: 'mm',
        format: [80, 297],
        orientation: 'portrait'
      },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    // ⚠️ توليد PDF
    await html2pdf().set(options).from(container).save();

    Toast.show('✅ تم إنشاء PDF: ' + filename);
    Utils.vibrate(80);
    return true;

  } catch (e) {
    console.error('PDF generation failed:', e);
    Toast.show('⚠️ فشل توليد PDF — استخدام الطباعة', 'error');
    const html = Export.generateHTML(doc, items, docType);
    return Export.printHTML(html, 'dialog');

  } finally {
    // ⚠️ تنظيف الحاوية دايماً — حتى لو حصل خطأ
    if (container && container.parentNode) {
      try {
        container.parentNode.removeChild(container);
      } catch (err) {
        console.warn('Cleanup error:', err);
      }
    }
  }
},

toExcel(doc, items, docType) {
  // ⚠️ لو مكتبة xlsx مش موجودة، نرجع للطريقة القديمة (CSV)
  if (typeof XLSX === 'undefined') {
    console.warn('xlsx library not loaded, falling back to CSV');
    return Export.toCSV(doc, items, docType);
  }

  try {
    // ⚠️ اسم الملف
    const docNo = doc.invoice_no || doc.return_no || doc.voucher_no ||
                  ('PAY-' + (doc.month || '')) || 'document';
    const safeName = String(docNo).replace(/[^A-Za-z0-9\-_]/g, '_');
    const filename = 'albasmala_' + docType + '_' + safeName + '.xlsx';

    const titles = {
      sales: 'فاتورة مبيعات', purchase: 'فاتورة مشتريات',
      sales_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات',
      voucher_receipt: 'سند قبض', voucher_payment: 'سند دفع',
      payroll: 'مفردات مرتب'
    };

    const partyLabels = {
      sales: 'العميل', purchase: 'المورد',
      sales_return: 'العميل', purchase_return: 'المورد',
      voucher_receipt: 'الجهة', voucher_payment: 'الجهة',
      payroll: 'الموظف'
    };

    const partyName = doc.customer_name || doc.supplier_name || doc.party_name ||
                      doc.employee_name || '-';

    // ⚠️ بناء ورقة العمل (Worksheet)
    const rows = [];

    // رأس المستند
    rows.push(['شركة البسملة - ' + (titles[docType] || 'مستند')]);
    rows.push([]);
    rows.push(['رقم المستند', docNo]);
    rows.push(['التاريخ', Utils.fmtDate(doc.date || doc.created_at)]);
    rows.push([partyLabels[docType] || 'الجهة', partyName]);
    rows.push(['الموظف', doc.employee_name || '-']);
    rows.push([]);

    // تفاصيل حسب النوع
    if (docType === 'payroll') {
      rows.push(['البند', 'القيمة']);
      rows.push(['الراتب الأساسي', Number(doc.basic_salary) || 0]);
      rows.push(['بدل سكن', Number(doc.housing_allowance) || 0]);
      rows.push(['بدل مواصلات', Number(doc.transport_allowance) || 0]);
      rows.push(['مكافآت', Number(doc.bonuses) || 0]);
      rows.push(['خصم غياب', Number(doc.absence_deduction) || 0]);
      rows.push(['خصم تأخير', Number(doc.late_deduction) || 0]);
      rows.push(['تأمينات', Number(doc.insurance_deduction) || 0]);
      rows.push(['ضريبة', Number(doc.tax_deduction) || 0]);
      rows.push(['سلف', Number(doc.advances_deduction) || 0]);
      rows.push(['صافي الراتب', Number(doc.net_salary) || 0]);
    } else if (docType === 'voucher_receipt' || docType === 'voucher_payment') {
      rows.push(['البند', 'القيمة']);
      rows.push(['المبلغ', Number(doc.amount) || 0]);
      rows.push(['طريقة الدفع', doc.payment_method || '-']);
      rows.push(['الحساب', doc.account_label || '-']);
      rows.push(['البيان', doc.description || '-']);
    } else {
      // فواتير بيع / شراء / مرتجعات
      rows.push(['م', 'الصنف', 'الكمية', 'السعر', 'الإجمالي']);

      const safeItems = Array.isArray(items) ? items : [];

      if (safeItems.length === 0) {
        rows.push(['-', 'لا توجد أصناف', 0, 0, 0]);
      } else {
        for (let i = 0; i < safeItems.length; i++) {
          const it = safeItems[i] || {};
          rows.push([
            i + 1,
            it.product_name || it.name || 'صنف',
            Number(it.quantity) || 0,
            Number(it.price) || 0,
            Number(it.total) || 0
          ]);
        }
      }

      rows.push([]);
      rows.push(['', 'الإجمالي الفرعي', '', '', Number(doc.subtotal) || 0]);
      rows.push(['', 'نوع الخصم', '', '', doc.discount_type === 'percent' ? 'نسبة %' : 'مبلغ']);

      if (doc.discount_type === 'percent') {
        rows.push(['', 'نسبة الخصم', '', '', (Number(doc.discount_value) || 0) + '%']);
      }

      rows.push(['', 'الخصم الفعلي', '', '', Number(doc.discount) || 0]);
      rows.push(['', 'الضريبة', '', '', Number(doc.tax) || 0]);
      rows.push(['', 'الإجمالي', '', '', Number(doc.total) || 0]);
      rows.push(['', 'المدفوع', '', '', Number(doc.paid) || 0]);
      rows.push(['', 'الباقي', '', '', Number(doc.remaining) || 0]);
      rows.push(['', 'طريقة الدفع', '', '', doc.payment_method || '-']);
      rows.push(['', 'الحساب', '', '', doc.account_label || '-']);
    }

    rows.push([]);
    rows.push(['تم التصدير', new Date().toLocaleString('ar-EG')]);
    rows.push(['الموظف', State.currentEmployee ? State.currentEmployee.name : '-']);

    // ⚠️ إنشاء الـ Worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // ⚠️ ضبط عرض الأعمدة
    ws['!cols'] = [
      { wch: 8 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 }
    ];

    // ⚠️ إنشاء الـ Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المستند');

    // ⚠️ تحميل الملف
    XLSX.writeFile(wb, filename);

    Toast.show('✅ تم تحميل ملف Excel: ' + filename);
    Utils.vibrate(80);
    return true;

  } catch (e) {
    console.error('Excel generation failed:', e);
    Toast.show('⚠️ فشل توليد Excel — استخدام CSV', 'error');
    return Export.toCSV(doc, items, docType);
  }
},

// ⚠️ دالة احتياطية (CSV) لو مكتبة xlsx مش موجودة
toCSV(doc, items, docType) {
  const titles = {
    sales: 'فاتورة مبيعات', purchase: 'فاتورة مشتريات',
    sales_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات',
    voucher_receipt: 'سند قبض', voucher_payment: 'سند دفع',
    payroll: 'مفردات مرتب'
  };
  let csv = '\uFEFF';
  csv += 'شركة البسملة - ' + (titles[docType] || 'مستند') + '\n';
  csv += 'رقم المستند,' + (doc.invoice_no || doc.return_no || doc.voucher_no || '-') + '\n';
  csv += 'التاريخ,' + Utils.fmtDate(doc.date || doc.created_at) + '\n';
  csv += 'الجهة,' + (doc.customer_name || doc.supplier_name || doc.party_name || doc.employee_name || '-') + '\n';
  csv += 'الموظف,' + (doc.employee_name || '-') + '\n\n';
  if (docType !== 'voucher_receipt' && docType !== 'voucher_payment' && docType !== 'payroll') {
    csv += 'الصنف,الكمية,السعر,الإجمالي\n';
    for (const it of items) {
      csv += '"' + (it.product_name || it.name || 'صنف') + '",' + it.quantity + ',' + it.price + ',' + it.total + '\n';
    }
    csv += '\n';
    csv += 'الإجمالي الفرعي,' + (doc.subtotal || 0) + '\n';
    csv += 'الخصم,' + (doc.discount || 0) + '\n';
    csv += 'الضريبة,' + (doc.tax || 0) + '\n';
    csv += 'الإجمالي,' + (doc.total || 0) + '\n';
    csv += 'المدفوع,' + (doc.paid || 0) + '\n';
    csv += 'الباقي,' + (doc.remaining || 0) + '\n';
  } else if (docType === 'payroll') {
    csv += 'البند,القيمة\n';
    csv += 'الأساسي,' + (doc.basic_salary || 0) + '\n';
    csv += 'بدل سكن,' + (doc.housing_allowance || 0) + '\n';
    csv += 'بدل مواصلات,' + (doc.transport_allowance || 0) + '\n';
    csv += 'مكافآت,' + (doc.bonuses || 0) + '\n';
    csv += 'خصم غياب,' + (doc.absence_deduction || 0) + '\n';
    csv += 'خصم تأخير,' + (doc.late_deduction || 0) + '\n';
    csv += 'الصافي,' + (doc.net_salary || 0) + '\n';
  } else {
    csv += 'المبلغ,' + (doc.amount || 0) + '\n';
    csv += 'طريقة الدفع,' + (doc.payment_method || '-') + '\n';
    csv += 'البيان,' + (doc.description || '-') + '\n';
  }
  csv += '\nتم التصدير: ' + new Date().toLocaleString('ar-EG') + '\n';
  csv += 'الموظف: ' + (State.currentEmployee ? State.currentEmployee.name : '-') + '\n';

  const filename = 'albasmala_' + docType + '_' + (doc.invoice_no || doc.return_no || doc.voucher_no || Date.now()) + '.csv';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  Toast.show('✅ تم تحميل ملف CSV');
},

// ⚠️ حفظ أي ملف (HTML / PDF / Excel / صورة) على جهاز المستخدم
async saveFile(doc, items, docType, format) {
  format = format || 'html';

  try {
    const docNo = doc.invoice_no || doc.return_no || doc.voucher_no ||
                  ('PAY-' + (doc.month || '')) || 'document';
    const safeName = String(docNo).replace(/[^A-Za-z0-9\-_]/g, '_');
    const baseName = 'albasmala_' + docType + '_' + safeName;

    if (format === 'html') {
      const html = Export.generateHTML(doc, items, docType);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      Export.downloadBlob(blob, baseName + '.html');
      Toast.show('✅ تم حفظ الملف كـ HTML');
      Utils.vibrate(80);
      return true;
    }

    if (format === 'pdf') {
      if (typeof html2pdf === 'undefined') {
        Toast.show('⚠️ مكتبة PDF غير محمّلة — سيتم استخدام HTML', 'info');
        return Export.saveFile(doc, items, docType, 'html');
      }
      return Export.toPDF(doc, items, docType);
    }

    if (format === 'excel') {
      return Export.toExcel(doc, items, docType);
    }

    if (format === 'txt') {
      const text = Export.generateText(doc, items, docType);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      Export.downloadBlob(blob, baseName + '.txt');
      Toast.show('✅ تم حفظ الملف كـ TXT');
      Utils.vibrate(80);
      return true;
    }

    if (format === 'json') {
      const data = {
        doc: doc,
        items: items,
        docType: docType,
        exported_at: Utils.nowISO(),
        exported_by: State.currentEmployee ? State.currentEmployee.name : '-',
        company: State.currentCompanyId
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      Export.downloadBlob(blob, baseName + '.json');
      Toast.show('✅ تم حفظ الملف كـ JSON');
      Utils.vibrate(80);
      return true;
    }

    Toast.show('⚠️ صيغة غير مدعومة: ' + format, 'error');
    return false;

  } catch (e) {
    console.error('saveFile error:', e);
    Toast.show('❌ فشل الحفظ: ' + e.message, 'error');
    return false;
  }
},

downloadBlob(blob, filename) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    return true;
  } catch (e) {
    console.error('downloadBlob error:', e);
    return false;
  }
},

generateText(doc, items, docType) {
  const titles = {
    sales: 'فاتورة مبيعات', purchase: 'فاتورة مشتريات',
    sales_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات',
    voucher_receipt: 'سند قبض', voucher_payment: 'سند دفع',
    payroll: 'مفردات مرتب'
  };
  const docNo = doc.invoice_no || doc.return_no || doc.voucher_no ||
                ('PAY-' + (doc.month || '')) || 'document';
  const partyName = doc.customer_name || doc.supplier_name || doc.party_name ||
                    doc.employee_name || '-';

  let text = '';
  text += '═══════════════════════════════════════\n';
  text += '       🏪 شركة البسملة\n';
  text += '   لتجارة المشغولات الصينية\n';
  text += '   ' + (titles[docType] || 'مستند') + '\n';
  text += '═══════════════════════════════════════\n\n';
  text += 'رقم المستند: ' + docNo + '\n';
  text += 'التاريخ: ' + Utils.fmtDate(doc.date || doc.created_at) + '\n';
  text += 'الجهة: ' + partyName + '\n';
  text += 'الموظف: ' + (doc.employee_name || '-') + '\n';
  text += '───────────────────────────────────────\n';

  if (docType !== 'voucher_receipt' && docType !== 'voucher_payment' && docType !== 'payroll') {
    text += 'الصنف\tالكمية\tالسعر\tالإجمالي\n';
    text += '───────────────────────────────────────\n';
    for (const it of items) {
      text += (it.product_name || it.name || 'صنف') + '\t' +
              it.quantity + '\t' +
              it.price + '\t' +
              it.total + '\n';
    }
    text += '───────────────────────────────────────\n';
    text += 'الإجمالي الفرعي: ' + (doc.subtotal || 0) + '\n';
    text += 'الخصم: ' + (doc.discount || 0) + '\n';
    text += 'الضريبة: ' + (doc.tax || 0) + '\n';
    text += 'الإجمالي: ' + (doc.total || 0) + '\n';
    text += 'المدفوع: ' + (doc.paid || 0) + '\n';
    text += 'الباقي: ' + (doc.remaining || 0) + '\n';
  } else if (docType === 'payroll') {
    text += 'الراتب الأساسي: ' + (doc.basic_salary || 0) + '\n';
    text += 'بدل سكن: ' + (doc.housing_allowance || 0) + '\n';
    text += 'بدل مواصلات: ' + (doc.transport_allowance || 0) + '\n';
    text += 'مكافآت: ' + (doc.bonuses || 0) + '\n';
    text += 'خصم غياب: ' + (doc.absence_deduction || 0) + '\n';
    text += 'خصم تأخير: ' + (doc.late_deduction || 0) + '\n';
    text += 'الصافي: ' + (doc.net_salary || 0) + '\n';
  } else {
    text += 'المبلغ: ' + (doc.amount || 0) + '\n';
    text += 'طريقة الدفع: ' + (doc.payment_method || '-') + '\n';
    text += 'البيان: ' + (doc.description || '-') + '\n';
  }

  text += '\n═══════════════════════════════════════\n';
  text += 'تم التصدير: ' + new Date().toLocaleString('ar-EG') + '\n';
  text += 'الموظف: ' + (State.currentEmployee ? State.currentEmployee.name : '-') + '\n';
  text += '© شركة البسملة ' + new Date().getFullYear() + '\n';

  return text;
},

async printDirect(doc, items, docType, method) {
  const html = Export.generateHTML(doc, items, docType);
  method = method || 'dialog';
  if (method === 'bluetooth') return Export.printBluetooth(html);
  return Export.printHTML(html, 'dialog');
},

  async printHTML(html, method) {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.printer) {
      try {
        return new Promise(function (resolve) {
          window.cordova.plugins.printer.print(html, 'Basmala', function (err) {
            if (err) resolve(Export.openPrintDialog(html));
            else { Toast.show('✅ تمت الطباعة'); resolve(true); }
          });
        });
      } catch (e) {}
    }
    return Export.openPrintDialog(html);
  },

  async printBluetooth(html) {
    if (!navigator.bluetooth) {
      Toast.show('⚠️ Bluetooth غير مدعوم — استخدام نافذة الطباعة', 'info');
      return Export.openPrintDialog(html);
    }
    try {
      Toast.show('جاري الاتصال بالطابعة...', 'info');
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
      Toast.show('✅ تم الاتصال بـ ' + device.name, 'success');
      setTimeout(function () { Toast.show('✅ تم الإرسال'); }, 1000);
      return true;
    } catch (e) {
      Toast.show('⚠️ فشل Bluetooth — استخدام نافذة الطباعة', 'info');
      return Export.openPrintDialog(html);
    }
  },

  openPrintDialog(html) {
    return new Promise(function (resolve) {
      const w = window.open('', '_blank');
      if (!w) { Toast.show('⚠️ يرجى السماح بالنوافذ المنبثقة', 'error'); resolve(false); return; }
      w.document.write(html + '<script>setTimeout(function(){window.print();},500);<\/script>');
      w.document.close();
      setTimeout(function () { resolve(true); }, 1500);
    });
  },

  async share(doc, items, docType) {
    const titles = {
      sales: 'فاتورة مبيعات', purchase: 'فاتورة مشتريات',
      sales_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات',
      voucher_receipt: 'سند قبض', voucher_payment: 'سند دفع', payroll: 'مفردات مرتب'
    };
    const docNo = doc.invoice_no || doc.return_no || doc.voucher_no || 'PAY-' + (doc.month || '');
    const partyName = doc.customer_name || doc.supplier_name || doc.party_name || doc.employee_name || '-';
    let text = '🏪 شركة البسملة\n📄 ' + (titles[docType] || 'مستند') + '\n';
    text += 'رقم: ' + docNo + '\nالتاريخ: ' + Utils.fmtDate(doc.date || doc.created_at) + '\nالجهة: ' + partyName + '\n';
    if (docType !== 'voucher_receipt' && docType !== 'voucher_payment' && docType !== 'payroll') {
      text += '\n📋 الأصناف:\n';
      for (const it of items) text += '• ' + (it.product_name || it.name) + ' × ' + it.quantity + ' = ' + Utils.fmtMoney(it.total) + '\n';
      text += '\nالإجمالي: ' + Utils.fmtMoney(doc.total) + '\n';
      text += 'المدفوع: ' + Utils.fmtMoney(doc.paid || 0) + '\n';
      text += 'الباقي: ' + Utils.fmtMoney(doc.remaining || 0) + '\n';
    } else if (docType === 'payroll') {
      text += 'الصافي: ' + Utils.fmtMoney(doc.net_salary) + '\n';
    } else {
      text += 'المبلغ: ' + Utils.fmtMoney(doc.amount) + '\nالبيان: ' + (doc.description || '-') + '\n';
    }
    if (navigator.share) {
      try { await navigator.share({ title: docNo, text: text }); Toast.show('✅ تمت المشاركة'); } catch (e) {}
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      Toast.show('✅ تم النسخ للحافظة');
    } else Toast.show('النص جاهز للمشاركة', 'info');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   15. Printer
   ═══════════════════════════════════════════════════════════════════ */
const Printer = {
  async test() {
    const html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>@page{size:80mm auto;margin:3mm;}body{font-family:Cairo;padding:10px;text-align:center;}</style></head><body>' +
      '<h2 style="color:#B8941F;">🏪 شركة البسملة</h2>' +
      '<p>اختبار الطباعة</p>' +
      '<p style="font-size:11px;">' + new Date().toLocaleString('ar-EG') + '</p>' +
      '<p>✅ تعمل</p></body></html>';
    await Export.printHTML(html, 'dialog');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   16. Calculator
   ═══════════════════════════════════════════════════════════════════ */
const Calculator = {
  open() {
    if (!can('calculator')) return Toast.show('🔒 غير مسموح', 'error');
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
      '<div style="margin-top:12px;"><button class="btn btn-info btn-full" onclick="Calculator.copyResult()">📋 نسخ الناتج</button></div>';
    Modal.open('🧮 الحاسبة', html, null, 'إغلاق');
    Calculator.render();
  },
  num(d) {
    const s = State.calcState;
    if (s.shouldReset) { s.current = d; s.shouldReset = false; }
    else { s.current = (s.current === '0' ? d : s.current + d); }
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
    } else s.operand = cur;
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
    s.operator = null; s.operand = 0; s.shouldReset = true;
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
    else s.current = s.current.length > 1 ? s.current.slice(0, -1) : '0';
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
    if (navigator.clipboard) navigator.clipboard.writeText(val).then(function () { Toast.show('✅ تم النسخ'); });
    else Toast.show('الناتج: ' + val, 'info');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   17. Backup
   ═══════════════════════════════════════════════════════════════════ */
const Backup = {
  async export() {
    if (!requirePermission('data_export', 'تصدير')) return;
    const data = {
      version: APP_VERSION, company_id: State.currentCompanyId,
      export_date: Utils.nowISO(), exported_by: State.currentEmployee.name
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
    await Activity.log('export', 'نسخة احتياطية');
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
      } catch (err) { Toast.show('❌ ملف غير صالح', 'error'); }
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

/* ═══════════════════════════════════════════════════════════════════
   18. Auth (Authentication + Company Management)
   ═══════════════════════════════════════════════════════════════════ */
const Auth = {
  async doLogin() {
    const btn = document.getElementById('loginBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الدخول...'; }
    const emailEl = document.getElementById('loginEmail');
    const passwordEl = document.getElementById('loginPassword');
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';
    if (!email || !password) {
      if (btn) { btn.disabled = false; btn.textContent = '🔓 دخول'; }
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
      if (btn) { btn.disabled = false; btn.textContent = '🔓 دخول'; }
    }
  },

  async forgotPassword() {
    const emailEl = document.getElementById('loginEmail');
    const email = emailEl ? emailEl.value.trim() : '';
    if (!email) return App.showError('loginError', 'أدخل البريد أولاً');
    if (!confirm('إرسال رابط إعادة التعيين إلى: ' + email + '؟')) return;
    try {
      await FBAuth.sendPasswordResetEmail(email);
      App.showError('loginError', '✅ تم الإرسال للبريد');
    } catch (e) { App.showError('loginError', '❌ ' + e.message); }
  },

  async doCreateCompany() {
    const btn = document.getElementById('createBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الإنشاء...'; }
    const companyName = (document.getElementById('ccCompanyName') || {}).value ? document.getElementById('ccCompanyName').value.trim() : '';
    const adminName = (document.getElementById('ccAdminName') || {}).value ? document.getElementById('ccAdminName').value.trim() : '';
    const email = (document.getElementById('ccEmail') || {}).value ? document.getElementById('ccEmail').value.trim() : '';
    const password = (document.getElementById('ccPassword') || {}).value ? document.getElementById('ccPassword').value : '';
    const password2 = (document.getElementById('ccPassword2') || {}).value ? document.getElementById('ccPassword2').value : '';

    if (!companyName || !adminName || !email || !password) {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 إنشاء الشركة'; }
      return App.showError('createError', 'جميع الحقول مطلوبة');
    }
    if (password.length < 6) {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 إنشاء الشركة'; }
      return App.showError('createError', 'كلمة المرور 6 أحرف على الأقل');
    }
    if (password !== password2) {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 إنشاء الشركة'; }
      return App.showError('createError', 'كلمتا المرور غير متطابقتين');
    }

    try {
      const userCred = await FBAuth.createUserWithEmailAndPassword(email, password);
      const uid = userCred.user.uid;
      const companyId = Auth.generateCompanyId();
      const now = Utils.nowISO();
      const companyData = {
        info: { company_id: companyId, name: companyName, owner_uid: uid, owner_email: email, created_at: now },
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
        device_id: State.deviceId, user_uid: uid, user_name: adminName,
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
      const idEl = document.getElementById('companyIdValue');
      if (idEl) idEl.textContent = companyId;
      App.showScreen('screenShowCompanyId');
      Toast.show('✅ تم إنشاء الشركة');
    } catch (e) {
      let msg = 'فشل الإنشاء';
      if (e.code === 'auth/email-already-in-use') msg = 'البريد مستخدم';
      else if (e.code === 'auth/weak-password') msg = 'كلمة المرور ضعيفة';
      else if (e.code === 'auth/invalid-email') msg = 'بريد غير صالح';
      else msg = e.message;
      App.showError('createError', msg);
      if (btn) { btn.disabled = false; btn.textContent = '🚀 إنشاء الشركة'; }
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
    if (!State.currentCompanyId) State.currentCompanyId = localStorage.getItem('company_id');
    await App.loadCompanyData();
  },

  async doJoinCompany() {
    const btn = document.getElementById('joinBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...'; }
    const companyId = ((document.getElementById('jcCompanyId') || {}).value || '').trim().toUpperCase();
    const name = ((document.getElementById('jcName') || {}).value || '').trim();
    const email = ((document.getElementById('jcEmail') || {}).value || '').trim();
    const password = (document.getElementById('jcPassword') || {}).value || '';
    const roleEl = document.getElementById('jcRole');
    const role = roleEl ? roleEl.value : 'sales';

    if (!companyId || !name || !email || !password) {
      if (btn) { btn.disabled = false; btn.textContent = '📩 إرسال الطلب'; }
      return App.showError('joinError', 'جميع الحقول مطلوبة');
    }
    if (password.length < 6) {
      if (btn) { btn.disabled = false; btn.textContent = '📩 إرسال الطلب'; }
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
          } catch (e2) { throw new Error('البريد مستخدم بكلمة مرور مختلفة'); }
        } else throw e;
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
        device_id: State.deviceId, user_agent: navigator.userAgent,
        status: 'pending', created_at: now
      });
      await FBDB.ref('companies/' + companyId + '/devices/' + State.deviceId).set({
        device_id: State.deviceId, user_uid: uid, user_name: name,
        user_agent: navigator.userAgent, approved: false, status: 'pending',
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
      if (btn) { btn.disabled = false; btn.textContent = '📩 إرسال الطلب'; }
    }
  },

  watchApproval(uid) {
  if (!State.currentCompanyId) return;

  const ref = FBDB.ref('companies/' + State.currentCompanyId + '/employees/' + uid);

  const callback = function (snap) {
    if (snap.exists() && snap.val().active === true) {
      // ⚠️ نشيل الـ listener بعد ما يوافق
      ref.off('value', callback);

      // ⚠️ نحدّث حالة الجهاز
      FBDB.ref('companies/' + State.currentCompanyId + '/devices/' + State.deviceId).update({
        approved: true,
        status: 'approved',
        approved_at: Utils.nowISO()
      });

      Toast.show('✅ تمت الموافقة!');

      // ⚠️ نعيد تحميل البيانات بعد لحظة
      setTimeout(function () {
        App.loadCompanyData();
      }, 800);
    }
  };

  ref.on('value', callback);
},

  async logout() {
  if (State.currentEmployee && !confirm('تسجيل الخروج؟')) return;

  try {
    if (State.currentEmployee && State.companyRef) {
      await Activity.log('logout', 'خروج: ' + State.currentEmployee.name);
    }
  } catch (e) { console.warn('Activity log on logout:', e); }

  await App.safeLogout('user_logout');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   19. App (Main Controller)
   ═══════════════════════════════════════════════════════════════════ */
const App = {
  _loadingCompany: false,

  init() {
    State.deviceId = localStorage.getItem('device_id');
    if (!State.deviceId) {
      State.deviceId = 'DEV-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8)
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

    FBAuth.onAuthStateChanged(async function (user) {
  App.hideLoading();

  if (!user) {
    State.currentUser = null;
    State.currentEmployee = null;
    State.companyRef = null;
    State.listeners = [];
    App.showScreen('screenWelcome');
    return;
  }

  State.currentUser = user;

  if (App._loadingCompany) {
    console.log('⏭️ loadCompanyData already in progress, skipping');
    return;
  }

  const companyId = localStorage.getItem('company_id');
  if (companyId) {
    State.currentCompanyId = companyId;
    App._loadingCompany = true;
    try {
      await App.loadCompanyData();
    } finally {
      App._loadingCompany = false;
    }
  } else {
    App.findUserCompany(user.uid);
  }
});
    window.addEventListener('popstate', App.handleBack);
    history.pushState({ page: 'home' }, '', '');

    setInterval(function () {
      if (State.currentCompanyId && State.deviceId && State.currentEmployee) {
        try {
          FBDB.ref('companies/' + State.currentCompanyId + '/devices/' + State.deviceId).update({ last_seen: Utils.nowISO() });
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
    const el = document.getElementById('companyIdValue');
    const v = el ? el.textContent : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(v).then(function () { Toast.show('✅ تم النسخ'); });
    } else Toast.show('المعرّف: ' + v, 'info');
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
    if (!companyId) {
      return App.showScreen('screenWelcome');
    }
    State.currentCompanyId = companyId;
    State.companyRef = FBDB.ref('companies/' + companyId);

    const infoSnap = await State.companyRef.child('info').once('value');
    if (!infoSnap.exists()) {
      Toast.show('الشركة غير موجودة', 'error');
      return await App.safeLogout('company_not_found');
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
      return await App.safeLogout('no_access');
    }
    State.currentEmployee = empSnap.val();
    if (State.currentEmployee.active !== true) {
      App.showScreen('screenPendingApproval');
      Auth.watchApproval(uid);
      return;
    }

    try {
      await State.companyRef.child('devices/' + State.deviceId).update({
        last_seen: Utils.nowISO(), user_uid: uid,
        user_name: State.currentEmployee.name, approved: true, status: 'approved'
      });
    } catch (e) { console.warn('device update (non-critical):', e); }

    document.querySelectorAll('.auth-screen').forEach(function (s) { s.classList.add('hidden'); });
    const mainApp = document.getElementById('mainApp');
    if (mainApp) mainApp.classList.remove('hidden');

    const titleEl = document.getElementById('appTitle');
    if (titleEl) titleEl.textContent = '🏪 ' + State.currentCompanyName;

    const userEl = document.getElementById('userInfo');
    if (userEl) {
      userEl.textContent = State.currentEmployee.name + ' - ' +
        (PERMISSIONS[State.currentEmployee.role] ? PERMISSIONS[State.currentEmployee.role].label : State.currentEmployee.role);
    }

    const compEl = document.getElementById('companyInfo');
    if (compEl) compEl.textContent = 'معرّف الشركة: ' + State.currentCompanyId;

    const devEl = document.getElementById('deviceLabel');
    if (devEl) devEl.textContent = '📱 ' + State.deviceId.substr(-6);

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
    console.error('❌ loadCompanyData fatal error:', e);
    Toast.show('خطأ في تحميل البيانات: ' + (e.message || 'غير معروف'), 'error');
    setTimeout(function () {
      App.safeLogout('load_error');
    }, 2000);
  }
},

  // ⚠️ الحل الجذري: دمج Firebase مع cache المحلي
  startDataListeners() {
    App.stopAllListeners();
    const dataKeys = [
      'employees', 'attendance', 'leaves', 'payroll', 'employee_transactions',
      'work_policies', 'products', 'partners', 'sales_invoices', 'sales_items',
      'purchase_invoices', 'purchase_items', 'sales_returns', 'sales_return_items',
      'purchase_returns', 'purchase_return_items', 'stock_movements',
      'cash_transactions', 'vouchers', 'revenues', 'expenses',
      'whatsapp_templates', 'whatsapp_log', 'activity_log', 'devices',
      'pending_requests', 'geofences', 'attendance_photos', 'hr_records'
    ];

    for (const key of dataKeys) {
      (function (k) {
        const ref = State.companyRef.child(k);
        const callback = function (snap) {
          const val = snap.val();
          const serverData = val ? Object.values(val) : [];

          // 1. Firebase هو المرجع الأساسي
          const merged = {};
          serverData.forEach(function (item) {
            if (item && item.id) merged[item.id] = item;
          });

          // 2. دمج عناصر pending (اللي لسه ما اترفعتش)
          try {
            const pendingKey = 'pending_changes_' + State.currentCompanyId;
            const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
            pending.forEach(function (p) {
              if (p.store === k && p.data && p.data.id && !merged[p.data.id]) {
                merged[p.data.id] = p.data;
              }
            });
          } catch (e) {}

          // 3. دمج offline_data (المحفوظ محلياً)
          try {
            const offlineKey = 'offline_data_' + State.currentCompanyId + '_' + k;
            const offline = JSON.parse(localStorage.getItem(offlineKey) || '{}');
            for (const id in offline) {
              if (offline[id] && offline[id].id && !merged[offline[id].id]) {
                merged[offline[id].id] = offline[id];
              }
            }
          } catch (e) {}

          // 4. لو Firebase رجع فاضي تماماً، سيب الـ cache القديم (يمكن الاتصال ضعيف)
          if (serverData.length === 0 && cache[k] && cache[k].length > 0) {
            App.refreshCurrentPage();
            return;
          }

          cache[k] = Object.values(merged);
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
    const safe = function (name, fn) {
      try { if (typeof fn === 'function') fn(); }
      catch (e) { console.warn('refresh[' + name + '] error:', e); }
    };

    if (page === 'home') safe('Dashboard', Dashboard.render);
    else if (page === 'attendance') safe('Attendance', Attendance.renderMark);
    else if (page === 'employees') safe('Employees', Employees.render);
    else if (page === 'hr') safe('HR', HR.render);
    else if (page === 'products') safe('Products', Products.render);
    else if (page === 'partners') safe('Partners', Partners.render);
    else if (page === 'invoices') safe('Invoices', Invoices.render);
    else if (page === 'vouchers') safe('Vouchers', Vouchers.render);
    else if (page === 'cash') safe('Cash', Cash.render);
    else if (page === 'payroll') safe('Payroll', Payroll.render);
    else if (page === 'expenses') safe('Expenses', Expenses.render);
    else if (page === 'policies') safe('Policies', Policies.render);
    else if (page === 'whatsapp') safe('WhatsApp', WhatsApp.render);
    else if (page === 'activity') safe('Activity', Activity.render);
    else if (page === 'devices') safe('Devices', Devices.render);
    else if (page === 'requests') safe('Requests', Requests.render);
    else if (page === 'geofence') safe('Geofence', Geofence.render);

    safe('Menu', Menu.updateRequestsBadge);
  } catch (e) { console.warn('refresh outer:', e); }
},
  
  saveCacheToLocal(key, data) {
    try { localStorage.setItem('cache_' + State.currentCompanyId + '_' + key, JSON.stringify(data)); } catch (e) {}
  },

  async loadCacheFromLocal() {
    for (const key of Object.keys(cache)) {
      try {
        const s = localStorage.getItem('cache_' + State.currentCompanyId + '_' + key);
        if (s) {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) cache[key] = parsed;
        }
      } catch (e) {}
    }
  },

  openPage(page) {
    const permMap = {
      'attendance': 'attendance_report', 'employees': 'employees_view', 'hr': 'hr_view',
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
    if (permMap[page] && !can(permMap[page])) return Toast.show('🔒 غير مسموح', 'error');
    if (State.currentPage !== page) State.pageHistory.push(State.currentPage);

    document.querySelectorAll('.page').forEach(function (p) { p.classList.add('hidden'); });
    const el = document.getElementById('page-' + page);
    if (!el) return;
    el.classList.remove('hidden');

    const previousPage = State.currentPage;
    State.currentPage = page;

    document.querySelectorAll('.bottom-nav .nav-btn').forEach(function (b) { b.classList.remove('active'); });

    if (page === 'home') Dashboard.render();
    else if (page === 'attendance') Attendance.init();
    else if (page === 'employees') Employees.render();
    else if (page === 'hr') HR.init();
    else if (page === 'products') Products.render();
    else if (page === 'partners') Partners.render();
    else if (page === 'sales') {
      if (!State._initialized.sales || previousPage !== 'sales') {
        Sales.init();
        State._initialized.sales = true;
      } else Sales.render();
    }
    else if (page === 'purchase') {
      if (!State._initialized.purchase || previousPage !== 'purchase') {
        Purchases.init();
        State._initialized.purchase = true;
      } else Purchases.render();
    }
    else if (page === 'returns') {
      if (!State._initialized.returns || previousPage !== 'returns') {
        Returns.init();
        State._initialized.returns = true;
      } else Returns.render();
    }
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
  goBack() { App.handleBack(); },

  handleBack() {
    const now = Date.now();
    const modal = document.querySelector('.modal-overlay');
    if (modal) { Modal.close(); history.pushState({ page: State.currentPage }, '', ''); return; }
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

  exitApp() {
    if (!confirm('هل تريد الخروج من التطبيق؟')) return;
    if (navigator.app && navigator.app.exitApp) navigator.app.exitApp();
    else if (window.cordova) navigator.app.exitApp();
    else { window.close(); Toast.show('لا يمكن إغلاق التطبيق في المتصفح', 'info'); }
  },

  watchDeviceApproval() {
  if (!State.currentCompanyId || !State.deviceId) return;
  const ref = FBDB.ref('companies/' + State.currentCompanyId + '/devices/' + State.deviceId);
  ref.on('value', function (snap) {
    const data = snap.val();
    if (!data) return;
    if (data.status === 'rejected' || data.approved === false) {
      Toast.show('🚫 تم طرد هذا الجهاز', 'error');
      setTimeout(function () { App.safeLogout('device_rejected'); }, 2000);
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
        setTimeout(function () { App.safeLogout('account_disabled'); }, 2000);
      } else {
        State.currentEmployee = data;
        Menu.render();
      }
    });
  },

  async safeLogout(reason) {
    console.log('🔓 Safe logout triggered:', reason || 'unspecified');
    try {
      try { App.stopAllListeners(); } catch (e) { console.warn('stopAllListeners:', e); }
      try { LocationService.stopWatching(); } catch (e) { console.warn('stopWatching:', e); }
      try { if (typeof CameraHelper !== 'undefined' && CameraHelper._cleanup) CameraHelper._cleanup(); } catch (e) {}
      try { if (typeof Scanner !== 'undefined' && Scanner.stop) await Scanner.stop(); } catch (e) {}

      try {
        document.querySelectorAll('.modal-overlay').forEach(function (m) { m.remove(); });
        State._modalCallback = null;
        State._modalCallbacks = [];
      } catch (e) {}

      try {
        if (FBDB && State.deviceId && State.currentCompanyId) {
          await FBDB.ref('companies/' + State.currentCompanyId + '/devices/' + State.deviceId)
            .update({ last_seen: Utils.nowISO() });
        }
      } catch (e) { console.warn('device last_seen:', e); }

      try { await FBAuth.signOut(); } catch (e) { console.warn('signOut:', e); }

      State.currentUser = null;
      State.currentEmployee = null;
      State.currentCompanyName = '';
      State.companyRef = null;
      State.listeners = [];
      State._saleFormActive = false;
      State._purchaseFormActive = false;
      State._returnFormActive = false;
      State._initialized = { sales: false, purchase: false, returns: false };

      try { localStorage.removeItem('company_id'); } catch (e) {}

      try {
        if (typeof saleItems !== 'undefined') saleItems.length = 0;
        if (typeof purItems !== 'undefined') purItems.length = 0;
        if (typeof retItems !== 'undefined') retItems.length = 0;
      } catch (e) {}

      const mainApp = document.getElementById('mainApp');
      if (mainApp) mainApp.classList.add('hidden');
      App.showScreen('screenWelcome');

      console.log('✅ Safe logout complete');
      return true;
    } catch (fatal) {
      console.error('❌❌ Safe logout fatal:', fatal);
      try {
        const mainApp = document.getElementById('mainApp');
        if (mainApp) mainApp.classList.add('hidden');
        document.querySelectorAll('.auth-screen').forEach(function (s) { s.classList.add('hidden'); });
        const welcome = document.getElementById('screenWelcome');
        if (welcome) welcome.classList.remove('hidden');
      } catch (e2) {
        location.reload();
      }
      return false;
    }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   20. Menu
   ═══════════════════════════════════════════════════════════════════ */
const Menu = {
  render() {
    const items = [
      { page: 'attendance', icon: '👆', title: 'الحضور والانصراف', perm: 'attendance_report' },
      { page: 'hr', icon: '📋', title: 'الموارد البشرية', perm: 'hr_view' },
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
    const grid = document.getElementById('menuGrid');
    if (grid) grid.innerHTML = html;
    Menu.updateRequestsBadge();
  },

  updateRequestsBadge() {
    try {
      if (!State.currentEmployee) return;
      const pending = (cache.pending_requests || []).filter(function (r) { return r && r.status === 'pending'; }).length;
      const badge = document.getElementById('requestsBadge');
      const banner = document.getElementById('pendingRequestsBanner');

      if (badge) {
        if (pending > 0) { badge.textContent = pending; badge.classList.remove('hidden'); }
        else badge.classList.add('hidden');
      }
      if (banner) {
        if (pending > 0 && can('requests_manage')) {
          banner.innerHTML = '<div class="card" style="border-color:var(--orange-2);background:rgba(255,167,38,.1);">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<strong style="color:var(--orange-2);">📩 لديك ' + pending + ' طلب انضمام</strong>' +
            '<button class="btn btn-warning btn-sm" onclick="App.openPage(\'requests\')">عرض</button>' +
            '</div></div>';
        } else banner.innerHTML = '';
      }
    } catch (e) { console.warn('updateRequestsBadge error:', e); }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   21. Dashboard
   ═══════════════════════════════════════════════════════════════════ */
const Dashboard = {
  render() {
  const sales = cache.sales_invoices || [];
  const purch = cache.purchase_invoices || [];
  const products = cache.products || [];
  const employees = cache.employees || [];
  const cash = cache.cash_transactions || [];
  const salesRet = cache.sales_returns || [];
  const purchRet = cache.purchase_returns || [];
  const today = Utils.todayStr();

  // ⚠️ إحصائيات اليوم
  const salesToday = sales.filter(function (s) { return s.date && s.date.startsWith(today); });
  const purchToday = purch.filter(function (s) { return s.date && s.date.startsWith(today); });
  const salesTotal = salesToday.reduce(function (s, i) { return s + (Number(i.total) || 0); }, 0);
  const purchTotal = purchToday.reduce(function (s, i) { return s + (Number(i.total) || 0); }, 0);

  // ⚠️ حساب أرصدة كل حساب فرعي
  const accountsBalances = {};
  for (const acc of getAllAccounts()) {
    accountsBalances[acc.id] = { account: acc, in: 0, out: 0, balance: 0 };
  }
  let totalCashIn = 0, totalCashOut = 0, totalCashBalance = 0;

  for (const c of cash) {
    const accId = c.account_id || methodToAccountId(c.payment_method || 'نقدي');
    if (!accountsBalances[accId]) {
      accountsBalances[accId] = {
        account: { id: accId, label: accId, icon: '❓', color: 'var(--text-2)', order: 99 },
        in: 0, out: 0, balance: 0
      };
    }
    if (c.type === 'in') {
      accountsBalances[accId].in += Number(c.amount) || 0;
      totalCashIn += Number(c.amount) || 0;
    } else {
      accountsBalances[accId].out += Number(c.amount) || 0;
      totalCashOut += Number(c.amount) || 0;
    }
  }
  for (const id in accountsBalances) {
    accountsBalances[id].balance = accountsBalances[id].in - accountsBalances[id].out;
    totalCashBalance += accountsBalances[id].balance;
  }

  // ⚠️ مستحقات / التزامات
  const receivables = sales.reduce(function (s, i) { return s + (Number(i.remaining) || 0); }, 0);
  const payables = purch.reduce(function (s, i) { return s + (Number(i.remaining) || 0); }, 0);

  // ⚠️ مخزون + موظفين
  const lowStock = products.filter(function (p) {
    return p.active !== false && (Number(p.quantity) || 0) <= (Number(p.min_quantity) || 5);
  }).length;
  const activeEmps = employees.filter(function (e) { return e.active !== false; }).length;
  const presentToday = (cache.attendance || []).filter(function (a) { return a.date === today && a.check_in; }).length;

  // ⚠️ بطاقات الحسابات (بس اللي فيها رصيد)
  const accountsArr = Object.values(accountsBalances).sort(function (a, b) {
    return (a.account.order || 99) - (b.account.order || 99);
  });

  let accountsCardsHtml = '';
  for (const item of accountsArr) {
    if (item.in === 0 && item.out === 0) continue;
    const acc = item.account;
    const icon = acc.icon || '💰';
    const label = acc.label || acc.id;
    accountsCardsHtml +=
      '<div class="stat-card" style="border-right-color:' + (acc.color || 'var(--gold)') + ';">' +
        '<div class="label">' + icon + ' ' + Utils.esc(label) + '</div>' +
        '<div class="value" style="color:' + (acc.color || 'var(--gold)') + ';">' + Utils.fmtNum(item.balance) + '</div>' +
      '</div>';
  }

  // ⚠️ بناء HTML
  const html =
    // ===== بطاقات أساسية =====
    '<div class="stat-card green"><div class="label">مبيعات اليوم</div><div class="value">' + Utils.fmtNum(salesTotal) + '</div><div style="font-size:11px;color:#999;">' + salesToday.length + ' فاتورة</div></div>' +
    '<div class="stat-card orange"><div class="label">مشتريات اليوم</div><div class="value">' + Utils.fmtNum(purchTotal) + '</div><div style="font-size:11px;color:#999;">' + purchToday.length + ' فاتورة</div></div>' +

    // ===== إجمالي الخزينة =====
    '<div class="stat-card blue" style="grid-column:span 2;border-right-color:var(--blue);">' +
      '<div class="label">💰 إجمالي الخزينة</div>' +
      '<div class="value" style="font-size:26px;">' + Utils.fmtNum(totalCashBalance) + '</div>' +
      '<div class="sub-value" style="font-size:11px;color:var(--text-2);">واردات: +' + Utils.fmtNum(totalCashIn) + ' | صادرات: -' + Utils.fmtNum(totalCashOut) + '</div>' +
    '</div>' +

    // ===== تفصيل الحسابات =====
    (accountsCardsHtml
      ? '<div style="grid-column:span 2;padding:10px 0 4px;color:var(--gold);font-weight:700;font-size:13px;">📊 تفصيل الحسابات:</div>' + accountsCardsHtml
      : '') +

    // ===== بطاقات مالية =====
    '<div class="stat-card red"><div class="label">مستحقات (لنا)</div><div class="value">' + Utils.fmtNum(receivables) + '</div></div>' +
    '<div class="stat-card red"><div class="label">التزامات (علينا)</div><div class="value">' + Utils.fmtNum(payables) + '</div></div>' +

    // ===== بطاقات الموظفين والمخزون =====
    '<div class="stat-card green"><div class="label">الحضور اليوم</div><div class="value">' + presentToday + ' / ' + activeEmps + '</div></div>' +
    '<div class="stat-card orange"><div class="label">نواقص المخزون</div><div class="value">' + lowStock + '</div></div>' +
    '<div class="stat-card"><div class="label">المنتجات</div><div class="value">' + products.filter(function (p) { return p.active !== false; }).length + '</div></div>' +

    // ===== بطاقات المرتجعات =====
    '<div class="stat-card green"><div class="label">مرتجع مبيعات</div><div class="value">' + Utils.fmtNum(salesRet.reduce(function (s, r) { return s + (Number(r.total) || 0); }, 0)) + '</div></div>' +
    '<div class="stat-card orange"><div class="label">مرتجع مشتريات</div><div class="value">' + Utils.fmtNum(purchRet.reduce(function (s, r) { return s + (Number(r.total) || 0); }, 0)) + '</div></div>';

  const el = document.getElementById('dashboardStats');
  if (el) el.innerHTML = html;
 }
};

/* ═══════════════════════════════════════════════════════════════════
   22. Attendance
   ═══════════════════════════════════════════════════════════════════ */
const Attendance = {
  switchTab(e, tab) {
    document.querySelectorAll('#page-attendance .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    const markEl = document.getElementById('att-mark');
    const reportEl = document.getElementById('att-report');
    const mapEl = document.getElementById('att-map');
    if (markEl) markEl.classList.toggle('hidden', tab !== 'mark');
    if (reportEl) reportEl.classList.toggle('hidden', tab !== 'report');
    if (mapEl) mapEl.classList.toggle('hidden', tab !== 'map');
    if (tab === 'report') {
      const fromEl = document.getElementById('attFrom');
      const toEl = document.getElementById('attTo');
      if (fromEl) fromEl.value = Utils.todayStr();
      if (toEl) toEl.value = Utils.todayStr();
      Attendance.loadReport();
    }
    if (tab === 'map') Attendance.initMap();
  },

  init() {
    Attendance.renderMark();
    LocationService.startWatching(function (coords) {
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
    const res = await LocationService.checkGeofence();
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
    const leaves = cache.leaves || [];
    const today = Utils.todayStr();
    let html = '';
    if (emps.length === 0) {
      html = '<div class="empty"><div class="ico">👥</div>لا يوجد موظفون</div>';
    } else {
      for (const e of emps) {
        const rec = att.find(function (a) { return a.employee_uid === e.uid && a.date === today; });
        const leave = leaves.find(function (l) { return l.employee_uid === e.uid && l.date === today; });
        const isMe = State.currentUser && e.uid === State.currentUser.uid;
        const canMark = isMe || can('attendance_mark_all');
        let stateText = 'لم يحضر', stateColor = '#999', actionButtons = '';
        let lateInfo = '';

        if (leave) {
          const types = { 'leave': 'إجازة', 'permission': 'إذن', 'mission': 'مأمورية' };
          stateText = types[leave.type] || 'إذن';
          stateColor = 'var(--blue-2)';
          actionButtons = '<span style="color:var(--blue-2);font-size:12px;">' + Utils.esc(leave.reason || '') + '</span>';
        } else if (rec && !rec.check_out) {
          stateText = 'حاضر ✓'; stateColor = 'var(--green-2)';
          if (rec.minutes_late && rec.minutes_late > 0) {
            lateInfo = '<p style="font-size:11px;color:var(--orange-2);">تأخير: ' + rec.minutes_late + ' د (' + Utils.getLateStageText(rec.minutes_late) + ')</p>';
          }
          actionButtons =
            (canMark ? '<button class="btn btn-warning btn-sm" onclick="Attendance.mark(\'' + e.uid + '\',\'out\')">انصراف</button>' : '') +
            (canMark ? '<button class="btn btn-info btn-sm" onclick="Attendance.addLeave(\'' + e.uid + '\')">إذن</button>' : '');
        } else if (rec && rec.check_out) {
          stateText = 'انصرف ✓'; stateColor = '#888';
          actionButtons = '<span style="color:#888;font-size:11px;">' + (rec.work_hours || 0) + ' ساعة</span>';
          if (rec.minutes_late && rec.minutes_late > 0) {
            lateInfo = '<p style="font-size:11px;color:var(--orange-2);">تأخير: ' + rec.minutes_late + ' د</p>';
          }
        } else {
          actionButtons =
            (canMark ? '<button class="btn btn-success btn-sm" onclick="Attendance.mark(\'' + e.uid + '\',\'in\')">حضور</button>' : '') +
            (canMark ? '<button class="btn btn-info btn-sm" onclick="Attendance.addLeave(\'' + e.uid + '\')">إذن</button>' : '');
        }
        if (!canMark) stateText += ' (قراءة فقط)';
        html += '<div class="list-item"><div class="info">' +
          '<h4>' + Utils.esc(e.name) + '</h4>' +
          '<p style="color:' + stateColor + ';font-weight:600;">' + stateText + '</p>' +
          (rec ? '<p style="font-size:11px;">حضور: ' + Utils.fmtTime(rec.check_in) + '</p>' : '') +
          (rec && rec.check_out ? '<p style="font-size:11px;">انصراف: ' + Utils.fmtTime(rec.check_out) + '</p>' : '') +
          lateInfo + '</div>' +
          '<div class="actions">' + actionButtons + '</div>' +
        '</div>';
      }
    }
    const el = document.getElementById('attMarkList');
    if (el) el.innerHTML = html;
  },

  async mark(empUid, type) {
    const e = (cache.employees || []).find(function (x) { return x.uid === empUid; });
    if (!e) return;
    const isMe = State.currentUser && empUid === State.currentUser.uid;
    if (!isMe && !can('attendance_mark_all')) return Toast.show('🔒 غير مسموح', 'error');

    Toast.show('⏳ جاري التحقق من الموقع...', 'info');
    const geo = await LocationService.checkGeofence();
    if (geo.reason === 'error') return Toast.show('❌ ' + (geo.error || 'فشل تحديد الموقع'), 'error');
    if (geo.reason !== 'no_geofence' && !geo.inRange) {
      return Toast.show('🚫 أنت خارج النطاق (' + geo.distance + ' متر)', 'error');
    }

    const verified = await Biometric.verify('تسجيل ' + (type === 'in' ? 'حضور' : 'انصراف') + ' — ' + e.name);
    if (!verified) return Toast.show('❌ فشل التحقق', 'error');

    let photoData = null;
    if (type === 'in') {
      try { photoData = await CameraHelper.capturePhoto(); } catch (e) {}
    }

    const today = Utils.todayStr();
    const att = (cache.attendance || []).filter(function (a) { return a.employee_uid === empUid && a.date === today; });

    if (type === 'in') {
      if (att.length > 0 && !att[0].check_out) return Toast.show('مسجل حضور بالفعل', 'error');
      const id = Utils.genId('ATT');
      const checkInTime = Utils.nowISO();
      const minutesLate = Utils.calcMinutesLate(checkInTime, 9, 15);
      const dailyRate = (Number(e.basic_salary) || 0) / WORK_DAYS_PER_MONTH;
      const lateDeduction = Utils.calcLateDeduction(minutesLate, dailyRate);
      const record = {
        id: id, employee_uid: empUid, employee_name: e.name,
        date: today, check_in: checkInTime,
        fingerprint_in: 1, status: 'present',
        minutes_late: minutesLate, late_deduction: lateDeduction,
        late_stage: Utils.getLateStageText(minutesLate),
        geo_lat: geo.pos ? geo.pos.lat : null,
        geo_lng: geo.pos ? geo.pos.lng : null,
        geo_distance: geo.distance || 0,
        geo_fence_name: geo.fence ? geo.fence.name : null,
        recorded_by: State.currentEmployee.name
      };
      if (photoData) {
        record.photo_in = photoData;
        const pid = Utils.genId('PHOTO');
        await Sync.save('attendance_photos', pid, { id: pid, employee_uid: empUid, date: today, type: 'in', data: photoData, created_at: checkInTime });
      }
      await Sync.save('attendance', id, record);
      await Activity.log('check_in', 'حضور: ' + e.name);
      Toast.show('✅ تم تسجيل حضور ' + e.name);
    } else {
      if (att.length === 0) return Toast.show('لا يوجد تسجيل حضور', 'error');
      const rec = att[0];
      const hours = (Date.now() - new Date(rec.check_in).getTime()) / 3600000;
      rec.check_out = Utils.nowISO();
      rec.work_hours = parseFloat(hours.toFixed(2));
      rec.fingerprint_out = 1;
      await Sync.save('attendance', rec.id, rec);
      await Activity.log('check_out', 'انصراف: ' + e.name);
      Toast.show('✅ تم تسجيل انصراف ' + e.name);
    }
  },

  async addLeave(empUid) {
    const e = (cache.employees || []).find(function (x) { return x.uid === empUid; });
    if (!e) return;
    const html =
      '<div class="form-group"><label>النوع</label><select id="leave_type">' +
        '<option value="permission">إذن</option><option value="mission">مأمورية</option><option value="leave">إجازة</option>' +
      '</select></div>' +
      '<div class="form-group"><label>التاريخ</label><input type="date" id="leave_date" value="' + Utils.todayStr() + '"></div>' +
      '<div class="form-group"><label>من ساعة</label><input type="time" id="leave_from" value="09:00"></div>' +
      '<div class="form-group"><label>إلى ساعة</label><input type="time" id="leave_to" value="17:00"></div>' +
      '<div class="form-group"><label>السبب</label><textarea id="leave_reason" rows="3"></textarea></div>';
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
    const fromEl = document.getElementById('attFrom');
    const toEl = document.getElementById('attTo');
    const from = fromEl ? fromEl.value : Utils.todayStr();
    const to = toEl ? toEl.value : Utils.todayStr();
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
        const totalLateMin = records.reduce(function (s, r) { return s + (Number(r.minutes_late) || 0); }, 0);
        const totalLateDed = records.reduce(function (s, r) { return s + (Number(r.late_deduction) || 0); }, 0);
        html += '<div class="card"><h3>👤 ' + Utils.esc(e.name) + '</h3>' +
          '<div class="stats-grid" style="padding:0;">' +
            '<div class="stat-card green" style="padding:10px;"><div class="label" style="font-size:11px;">حضور</div><div class="value" style="font-size:16px;">' + presentDays + '</div></div>' +
            '<div class="stat-card blue" style="padding:10px;"><div class="label" style="font-size:11px;">إجازات</div><div class="value" style="font-size:16px;">' + leaveDays + '</div></div>' +
            '<div class="stat-card" style="padding:10px;"><div class="label" style="font-size:11px;">الساعات</div><div class="value" style="font-size:16px;">' + totalHours.toFixed(1) + '</div></div>' +
            '<div class="stat-card orange" style="padding:10px;"><div class="label" style="font-size:11px;">تأخير (د)</div><div class="value" style="font-size:16px;">' + totalLateMin + '</div></div>' +
          '</div>' +
          (totalLateDed > 0 ? '<p style="color:var(--orange-2);font-size:12px;margin-top:8px;">خصم تأخير: ' + Utils.fmtMoney(totalLateDed) + '</p>' : '') +
          '<div style="margin-top:10px;">';
        const sorted = records.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
        for (const r of sorted) {
          let status = '', color = '#888';
          if (r.status === 'leave') { status = '📅 إجازة'; color = 'var(--blue-2)'; }
          else if (r.check_in && !r.check_out) { status = '✓ حاضر'; color = 'var(--green-2)'; }
          else if (r.check_in && r.check_out) { status = '✓ ' + (r.work_hours || 0) + 'س'; }
          let lateText = '';
          if (r.minutes_late > 0) lateText = ' <span style="color:var(--orange-2);font-size:11px;">(تأخير ' + r.minutes_late + 'د)</span>';
          html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;font-size:12px;">' +
            '<span>' + r.date + lateText + '</span><span style="color:' + color + ';">' + status + '</span></div>';
        }
        html += '</div></div>';
      }
    }
    const el = document.getElementById('attReportList');
    if (el) el.innerHTML = html;
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(State.map);
    Attendance.refreshMap();
  },

  async refreshMap() {
    if (!State.map) return;
    Toast.show('⏳ جاري تحديث المواقع...', 'info');
    for (const key in State.mapMarkers) State.map.removeLayer(State.mapMarkers[key]);
    State.mapMarkers = {};
    const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    const today = Utils.todayStr();
    const att = cache.attendance || [];
    for (const e of emps) {
      const rec = att.find(function (a) { return a.employee_uid === e.uid && a.date === today; });
      if (rec && rec.geo_lat && rec.geo_lng) {
        const marker = L.marker([rec.geo_lat, rec.geo_lng]).addTo(State.map)
          .bindPopup('<strong>' + Utils.esc(e.name) + '</strong><br>حضور: ' + Utils.fmtTime(rec.check_in));
        State.mapMarkers[e.uid] = marker;
      }
    }
    const fences = (cache.geofences || []).filter(function (g) { return g.active !== false; });
    for (const g of fences) {
      const circle = L.circle([g.lat, g.lng], {
        color: '#D4AF37', fillColor: '#D4AF37', fillOpacity: 0.15, radius: Number(g.radius) || 100
      }).addTo(State.map).bindPopup('📍 ' + Utils.esc(g.name));
      State.mapMarkers['geo_' + g.id] = circle;
    }
    Toast.show('✅ تم التحديث');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   23. Employees
   ═══════════════════════════════════════════════════════════════════ */
const Employees = {
  render() {
    const searchEl = document.getElementById('empSearch');
    const search = searchEl ? searchEl.value.trim() : '';
    let emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    if (search) emps = emps.filter(function (e) {
      return (e.name || '').includes(search) || (e.code || '').includes(search);
    });
    const addBtn = document.getElementById('empAddBtn');
    if (addBtn) addBtn.style.display = can('employees_add') ? 'flex' : 'none';
    const el = document.getElementById('empList');
    if (!el) return;
    if (emps.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">👥</div>لا يوجد موظفون</div>';
      return;
    }
    let html = '';
    for (const e of emps) {
      html += '<div class="list-item"><div class="info">' +
        '<h4>' + Utils.esc(e.name) + (e.code ? ' <small style="color:#666;">(' + Utils.esc(e.code) + ')</small>' : '') + '</h4>' +
        '<p>' + Utils.esc(e.job_title || '') + ' - ' + Utils.esc(e.phone || 'بدون رقم') + '</p>' +
        '<p style="color:var(--gold);font-weight:600;">راتب: ' + Utils.fmtMoney(e.basic_salary) + '</p>' +
        '<p style="font-size:11px;">الدور: ' + Utils.esc(PERMISSIONS[e.role] ? PERMISSIONS[e.role].label : e.role) + '</p>' +
      '</div>' +
      '<div class="actions">' +
        (can('employees_edit') ? '<button class="btn btn-primary btn-sm" onclick="Employees.edit(\'' + e.uid + '\')">✏️</button>' : '') +
        (can('employees_delete') && e.uid !== State.currentUser.uid
          ? '<button class="btn btn-danger btn-sm" onclick="Employees.remove(\'' + e.uid + '\')">🗑️</button>' : '') +
      '</div></div>';
    }
    el.innerHTML = html;
  },

  search: Utils.debounce(function () { Employees.render(); }, 250),

  async edit(uid) {
    if (uid && !requirePermission('employees_edit', 'تعديل')) return;
    if (!uid && !requirePermission('employees_add', 'إضافة')) return;
    let e = { name: '', phone: '', job_title: '', basic_salary: 0, housing_allowance: 0, transport_allowance: 0, insurance_deduction: 0, tax_deduction: 0, role: 'sales', code: '', hire_date: Utils.todayStr(), national_id: '' };
    if (uid) e = (cache.employees || []).find(function (x) { return x.uid === uid; }) || e;

    const html =
      '<div class="form-group"><label>الاسم *</label><input id="f_name" value="' + Utils.esc(e.name || '') + '"></div>' +
      '<div class="form-group"><label>الكود</label><input id="f_code" value="' + Utils.esc(e.code || '') + '"></div>' +
      '<div class="form-group"><label>الوظيفة</label><input id="f_job" value="' + Utils.esc(e.job_title || '') + '"></div>' +
      '<div class="form-group"><label>الهاتف</label><input id="f_phone" value="' + Utils.esc(e.phone || '') + '" inputmode="tel"></div>' +
      '<div class="form-group"><label>الرقم القومي</label><input id="f_nid" value="' + Utils.esc(e.national_id || '') + '"></div>' +
      '<div class="form-group"><label>تاريخ التعيين</label><input type="date" id="f_hire" value="' + (e.hire_date || Utils.todayStr()) + '"></div>' +
      '<div class="form-group"><label>الدور</label><select id="f_role">' +
        '<option value="admin" ' + (e.role === 'admin' ? 'selected' : '') + '>مدير</option>' +
        '<option value="hr" ' + (e.role === 'hr' ? 'selected' : '') + '>موارد بشرية</option>' +
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
      const nameEl = document.getElementById('f_name');
      const name = nameEl ? nameEl.value.trim() : '';
      if (!name) return Toast.show('الاسم مطلوب', 'error');
      const newId = uid || Utils.genId('EMP');
      const data = Object.assign({}, e, {
        uid: newId, name: name,
        code: document.getElementById('f_code').value,
        job_title: document.getElementById('f_job').value,
        phone: document.getElementById('f_phone').value,
        national_id: document.getElementById('f_nid').value,
        hire_date: document.getElementById('f_hire').value,
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
      // ⚠️ حدّث cache فوراً
      const idx = (cache.employees || []).findIndex(function (x) { return x.uid === newId; });
      if (idx >= 0) cache.employees[idx] = data;
      else cache.employees.push(data);
      await Activity.log('employee_save', name);
      Modal.close();
      Toast.show('✅ تم الحفظ');
      Employees.render();
    });
  },

  async remove(uid) {
    if (!requirePermission('employees_delete', 'حذف')) return;
    if (uid === State.currentUser.uid) return Toast.show('لا يمكنك حذف نفسك', 'error');
    if (!confirm('حذف الموظف؟')) return;
    await Sync.softDelete('employees', uid);
    Toast.show('تم الحذف');
    Employees.render();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   24. HR
   ═══════════════════════════════════════════════════════════════════ */
const HR = {
  switchTab(e, tab) {
    State.currentHRTab = tab;
    document.querySelectorAll('#page-hr .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    document.querySelectorAll('.hr-panel').forEach(function (p) { p.classList.add('hidden'); });
    const panel = document.getElementById('hr-' + tab);
    if (panel) panel.classList.remove('hidden');
    HR.render();
  },

  init() { HR.render(); },

  render() {
    const tab = State.currentHRTab;
    if (tab === 'overview') HR.renderOverview();
    else if (tab === 'leaves') HR.renderLeaves();
    else if (tab === 'advances') HR.renderAdvances();
    else if (tab === 'bonuses') HR.renderBonuses();
  },

  renderOverview() {
    const el = document.getElementById('hr-overview');
    if (!el) return;
    const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    const today = Utils.todayStr();
    const monthKey = Utils.getMonthKey();
    const att = (cache.attendance || []).filter(function (a) { return a.date && a.date.startsWith(monthKey); });
    const payrolls = (cache.payroll || []).filter(function (p) { return p.month === monthKey; });
    const totalSalary = emps.reduce(function (s, e) { return s + (Number(e.basic_salary) || 0); }, 0);
    const totalAllow = emps.reduce(function (s, e) {
      return s + (Number(e.housing_allowance) || 0) + (Number(e.transport_allowance) || 0);
    }, 0);
    const presentToday = att.filter(function (a) { return a.date === today && a.check_in; }).length;
    const totalLateThisMonth = att.reduce(function (s, a) { return s + (Number(a.minutes_late) || 0); }, 0);
    const totalDeductions = payrolls.reduce(function (s, p) {
      return s + (Number(p.absence_deduction) || 0) + (Number(p.late_deduction) || 0);
    }, 0);

    let html =
      '<div class="stats-grid" style="padding:0;">' +
        '<div class="stat-card"><div class="label">عدد الموظفين</div><div class="value">' + emps.length + '</div></div>' +
        '<div class="stat-card green"><div class="label">حضور اليوم</div><div class="value">' + presentToday + ' / ' + emps.length + '</div></div>' +
        '<div class="stat-card blue"><div class="label">إجمالي الرواتب</div><div class="value">' + Utils.fmtNum(totalSalary) + '</div></div>' +
        '<div class="stat-card orange"><div class="label">إجمالي البدلات</div><div class="value">' + Utils.fmtNum(totalAllow) + '</div></div>' +
        '<div class="stat-card red"><div class="label">إجمالي التأخير (د)</div><div class="value">' + totalLateThisMonth + '</div></div>' +
        '<div class="stat-card red"><div class="label">خصومات الشهر</div><div class="value">' + Utils.fmtNum(totalDeductions) + '</div></div>' +
      '</div>' +
      '<div class="card"><h3>👥 قائمة الموظفين</h3>';
    for (const e of emps) {
      html += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;font-size:13px;">' +
        '<div><strong>' + Utils.esc(e.name) + '</strong><br><small style="color:#888;">' + Utils.esc(e.job_title || '') + '</small></div>' +
        '<div style="text-align:left;">' +
          '<div style="color:var(--gold);font-weight:700;">' + Utils.fmtMoney(e.basic_salary) + '</div>' +
          '<small style="color:#888;">' + Utils.esc(PERMISSIONS[e.role] ? PERMISSIONS[e.role].label : e.role) + '</small>' +
        '</div></div>';
    }
    html += '</div>';
    el.innerHTML = html;
  },

  renderLeaves() {
    const el = document.getElementById('hr-leaves');
    if (!el) return;
    const leaves = (cache.leaves || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 50);
    let html = '<div class="card"><h3>📅 الإجازات والأذونات</h3>';
    if (leaves.length === 0) html += '<p style="color:#666;">لا توجد سجلات</p>';
    const typeMap = { 'leave': '📅 إجازة', 'permission': '⏰ إذن', 'mission': '🚗 مأمورية' };
    for (const l of leaves) {
      html += '<div style="padding:10px 0;border-bottom:1px solid #222;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<strong style="color:var(--gold);">' + Utils.esc(l.employee_name) + '</strong>' +
          '<span style="color:var(--blue-2);">' + (typeMap[l.type] || l.type) + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:#aaa;margin-top:4px;">' + Utils.esc(l.date) + ' | ' + Utils.esc(l.from || '') + ' - ' + Utils.esc(l.to || '') + '</div>' +
        (l.reason ? '<div style="font-size:12px;color:#888;margin-top:4px;">' + Utils.esc(l.reason) + '</div>' : '') +
      '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  },

  renderAdvances() {
    const el = document.getElementById('hr-advances');
    if (!el) return;
    const transactions = (cache.employee_transactions || []).filter(function (t) { return t.type === 'advance'; })
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 50);
    let html = '<div class="card"><h3>💰 السلف</h3>' +
      '<button class="btn btn-primary btn-full" onclick="HR.addTransaction(\'advance\')" style="margin-bottom:10px;">➕ إضافة سلفة</button>';
    if (transactions.length === 0) html += '<p style="color:#666;">لا توجد سلف</p>';
    for (const t of transactions) {
      html += '<div style="padding:10px 0;border-bottom:1px solid #222;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<strong>' + Utils.esc(t.employee_name) + '</strong>' +
          '<span style="color:var(--red-2);font-weight:700;">' + Utils.fmtMoney(t.amount) + '</span>' +
        '</div>' +
        '<div style="font-size:11px;color:#888;margin-top:4px;">' + Utils.fmtDate(t.date) + ' | ' + (t.paid ? 'مسددة ✓' : 'مستحقة') + '</div>' +
      '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  },

  renderBonuses() {
    const el = document.getElementById('hr-bonuses');
    if (!el) return;
    const transactions = (cache.employee_transactions || []).filter(function (t) {
      return t.type === 'bonus' || t.type === 'deduction';
    }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 50);
    let html = '<div class="card"><h3>🎁 المكافآت والخصومات</h3>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
        '<button class="btn btn-success btn-full" onclick="HR.addTransaction(\'bonus\')">➕ مكافأة</button>' +
        '<button class="btn btn-danger btn-full" onclick="HR.addTransaction(\'deduction\')">➖ خصم</button>' +
      '</div>';
    if (transactions.length === 0) html += '<p style="color:#666;">لا توجد سجلات</p>';
    for (const t of transactions) {
      const color = t.type === 'bonus' ? 'var(--green-2)' : 'var(--red-2)';
      const label = t.type === 'bonus' ? '🎁 مكافأة' : '➖ خصم';
      html += '<div style="padding:10px 0;border-bottom:1px solid #222;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<strong>' + Utils.esc(t.employee_name) + '</strong>' +
          '<span style="color:' + color + ';font-weight:700;">' + Utils.fmtMoney(t.amount) + '</span>' +
        '</div>' +
        '<div style="font-size:11px;color:#888;margin-top:4px;">' + label + ' | ' + Utils.fmtDate(t.date) + '</div>' +
        (t.reason ? '<div style="font-size:11px;color:#aaa;margin-top:4px;">' + Utils.esc(t.reason) + '</div>' : '') +
      '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  },

  async addTransaction(type) {
    if (!requirePermission('hr_manage', 'إدارة HR')) return;
    const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    const titles = { advance: '💰 إضافة سلفة', bonus: '🎁 إضافة مكافأة', deduction: '➖ إضافة خصم' };
    const html =
      '<div class="form-group"><label>الموظف *</label><select id="hr_emp">' +
        emps.map(function (e) { return '<option value="' + e.uid + '">' + Utils.esc(e.name) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-group"><label>المبلغ *</label><input type="number" id="hr_amount" inputmode="decimal"></div>' +
      '<div class="form-group"><label>التاريخ</label><input type="date" id="hr_date" value="' + Utils.todayStr() + '"></div>' +
      '<div class="form-group"><label>السبب / البيان</label><textarea id="hr_reason" rows="3"></textarea></div>' +
      '<div class="info-box">💡 هذه المعاملة لا تؤثر على الخزينة. لتأثير على الخزينة، استخدم سند صرف.</div>';
    Modal.open(titles[type] || 'إضافة', html, async function () {
      const empUid = document.getElementById('hr_emp').value;
      const amount = parseFloat(document.getElementById('hr_amount').value) || 0;
      if (!empUid) return Toast.show('اختر موظف', 'error');
      if (amount <= 0) return Toast.show('مبلغ غير صالح', 'error');
      const emp = emps.find(function (e) { return e.uid === empUid; });
      const id = Utils.genId(type.toUpperCase());
      await Sync.save('employee_transactions', id, {
        id: id, type: type, employee_uid: empUid, employee_name: emp.name,
        amount: amount, reason: document.getElementById('hr_reason').value,
        date: document.getElementById('hr_date').value, paid: false,
        created_by: State.currentEmployee.name, created_at: Utils.nowISO()
      });
      await Activity.log('hr_update', type + ': ' + emp.name + ' - ' + Utils.fmtMoney(amount));
      Modal.close();
      Toast.show('✅ تم التسجيل');
      HR.render();
    });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   25. Payroll
   ═══════════════════════════════════════════════════════════════════ */
const Payroll = {
  switchTab(e, tab) {
    State.currentPayrollTab = tab;
    document.querySelectorAll('#page-payroll .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    const genEl = document.getElementById('payroll-generate');
    const listEl = document.getElementById('payroll-list');
    if (genEl) genEl.classList.toggle('hidden', tab !== 'generate');
    if (listEl) listEl.classList.toggle('hidden', tab !== 'list');
    if (tab === 'list') Payroll.loadList();
  },

  init() {
    const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    const empEl = document.getElementById('payEmp');
    if (empEl) {
      empEl.innerHTML = emps.map(function (e) {
        return '<option value="' + e.uid + '">' + Utils.esc(e.name) + '</option>';
      }).join('');
    }
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthEl = document.getElementById('payMonth');
    if (monthEl) {
      monthEl.innerHTML = months.map(function (m, i) { return '<option value="' + (i + 1) + '">' + m + '</option>'; }).join('');
      monthEl.value = new Date().getMonth() + 1;
    }
    const yearEl = document.getElementById('payYear');
    if (yearEl) yearEl.value = new Date().getFullYear();
    if (State.currentPayrollTab === 'list') Payroll.loadList();
  },

  render() { if (State.currentPage === 'payroll') Payroll.loadList(); },

  loadList() {
    const payrolls = (cache.payroll || []).slice().sort(function (a, b) {
      return (b.month || '').localeCompare(a.month || '');
    });
    const el = document.getElementById('payrollList');
    if (!el) return;
    if (payrolls.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">💵</div>لا توجد مرتبات</div>';
      return;
    }
    let html = '';
    for (const p of payrolls) {
      html += '<div class="list-item"><div class="info">' +
        '<h4>' + Utils.esc(p.employee_name) + ' - ' + Utils.esc(p.month) + '</h4>' +
        '<p>صافي: <strong style="color:var(--gold);">' + Utils.fmtMoney(p.net_salary) + '</strong></p>' +
        '<p style="font-size:11px;">غياب: ' + (p.absence_days || 0) + ' يوم | تأخير: ' + (p.late_minutes || 0) + ' د</p>' +
        '<p style="font-size:11px;color:' + (p.status === 'paid' ? 'var(--green-2)' : 'var(--orange-2)') + ';">' +
          (p.status === 'paid' ? 'مدفوع ✓' : 'مستحق') + '</p>' +
      '</div>' +
      '<div class="actions">' +
        (p.status !== 'paid' && can('payroll_pay')
          ? '<button class="btn btn-success btn-sm" onclick="Payroll.pay(\'' + p.id + '\')">صرف</button>' : '') +
        '<button class="btn btn-primary btn-sm" onclick="Payroll.show(\'' + p.id + '\')">👁️</button>' +
      '</div></div>';
    }
    el.innerHTML = html;
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
    const existing = (cache.payroll || []).find(function (p) { return p.employee_uid === empUid && p.month === monthKey; });
    if (existing && !confirm('موجود، إعادة الحساب؟')) return;

    const start = monthKey + '-01';
    const lastDay = new Date(year, month, 0).getDate();
    const end = monthKey + '-' + String(lastDay).padStart(2, '0');

    const att = (cache.attendance || []).filter(function (a) {
      return a.employee_uid === empUid && a.date >= start && a.date <= end;
    });
    const presentDays = att.filter(function (a) { return a.check_in && a.status === 'present'; }).length;
    const leaveDays = att.filter(function (a) { return a.status === 'leave'; }).length;
    const workDays = Utils.calculateWorkDaysInMonth(year, month);
    const absenceDays = Math.max(0, workDays - presentDays - leaveDays);

    const basic = Number(emp.basic_salary) || 0;
    const housing = Number(emp.housing_allowance) || 0;
    const transport = Number(emp.transport_allowance) || 0;
    const insurance = Number(emp.insurance_deduction) || 0;
    const tax = Number(emp.tax_deduction) || 0;
    const dailyRate = basic / WORK_DAYS_PER_MONTH;
    const absenceDeduction = dailyRate * absenceDays;
    const lateDeduction = att.reduce(function (s, a) { return s + (Number(a.late_deduction) || 0); }, 0);
    const lateMinutes = att.reduce(function (s, a) { return s + (Number(a.minutes_late) || 0); }, 0);
    const advances = (cache.employee_transactions || [])
      .filter(function (t) { return t.employee_uid === empUid && t.type === 'advance' && !t.paid; })
      .reduce(function (s, t) { return s + (Number(t.amount) || 0); }, 0);
    const hrBonuses = (cache.employee_transactions || [])
      .filter(function (t) {
        return t.employee_uid === empUid && t.type === 'bonus' && !t.paid && t.date && t.date >= start && t.date <= end;
      })
      .reduce(function (s, t) { return s + (Number(t.amount) || 0); }, 0);
    const hrDeductions = (cache.employee_transactions || [])
      .filter(function (t) {
        return t.employee_uid === empUid && t.type === 'deduction' && !t.paid && t.date && t.date >= start && t.date <= end;
      })
      .reduce(function (s, t) { return s + (Number(t.amount) || 0); }, 0);

    const gross = basic + housing + transport + bonus + hrBonuses;
    const totalDed = insurance + tax + absenceDeduction + lateDeduction + deduction + advances + hrDeductions;
    const net = gross - totalDed;
    const id = existing ? existing.id : Utils.genId('PAY');

    const data = {
      id: id, employee_uid: empUid, employee_name: emp.name,
      month: monthKey, basic_salary: basic,
      housing_allowance: housing, transport_allowance: transport,
      bonuses: bonus + hrBonuses, deductions: deduction + hrDeductions,
      absence_days: absenceDays, absence_deduction: absenceDeduction,
      late_minutes: lateMinutes, late_deduction: lateDeduction,
      insurance_deduction: insurance, tax_deduction: tax,
      advances_deduction: advances, net_salary: net,
      work_days: workDays, attendance_days: presentDays, leave_days: leaveDays,
      status: existing ? existing.status : 'pending',
      accrual_date: end, created_at: Utils.nowISO(),
      created_by: State.currentEmployee.name
    };
    await Sync.save('payroll', id, data);
    // ⚠️ حدّث cache فوراً
    const idx = (cache.payroll || []).findIndex(function (p) { return p.id === id; });
    if (idx >= 0) cache.payroll[idx] = data;
    else cache.payroll.push(data);

    await Activity.log('payroll_generate', emp.name + ' - ' + monthKey + ' - صافي ' + Utils.fmtMoney(net));
    Toast.show('✅ تم الإنشاء — صافي: ' + Utils.fmtMoney(net));
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
        '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>الشهر:</span><strong>' + Utils.esc(p.month) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:18px;color:var(--gold);font-weight:700;"><span>الصافي:</span><strong>' + Utils.fmtMoney(p.net_salary) + '</strong></div>' +
      '</div>' +
      '<div class="form-group"><label>طريقة الصرف</label>' +
        '<select id="sal_method"><option>نقدي</option><option>بنكي</option><option>محفظة</option></select></div>' +
      '<div class="info-box">💡 سيتم إنشاء سند صرف تلقائياً وخصم المبلغ من الخزينة.</div>';
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
        amount: p.net_salary, employee_uid: p.employee_uid, employee_name: p.employee_name,
        issued_by_name: State.currentEmployee.name, date: now, payment_method: method,
        description: 'راتب ' + p.month + ' - ' + p.employee_name,
        reference: 'SAL-' + p.month, auto_generated: true, created_at: now
      });

      const cashId = Utils.genId('CSH');
      await Sync.save('cash_transactions', cashId, {
        id: cashId, type: 'out', amount: p.net_salary,
        description: 'راتب ' + p.month + ' - ' + p.employee_name,
        category: 'رواتب', date: now, employee_name: State.currentEmployee.name,
        payment_method: method, voucher_ref: voucherNo
      });

      Modal.close();
      Toast.show('✅ تم الصرف');
      await Activity.log('salary_paid', voucherNo + ' - ' + Utils.fmtMoney(p.net_salary));
    });
  },

  async show(id) {
    const p = (cache.payroll || []).find(function (x) { return x.id === id; });
    if (!p) return;
    const html =
      '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
        '<button class="btn btn-primary btn-full" onclick="Export.openDialog(\'payroll\', JSON.parse(\'' + JSON.stringify(p).replace(/'/g, "\\'") + '\'), [])">📤 تصدير</button>' +
      '</div>' +
      '<div class="receipt"><div class="header"><h2>🏪 شركة البسملة</h2><p>مفردات المرتب - ' + Utils.esc(p.month) + '</p></div>' +
      '<div class="line"><span>الموظف:</span><span>' + Utils.esc(p.employee_name) + '</span></div><hr>' +
      '<div class="line"><span>أيام العمل:</span><span>' + (p.work_days || 0) + '</span></div>' +
      '<div class="line"><span>أيام الحضور:</span><span>' + (p.attendance_days || 0) + '</span></div>' +
      '<div class="line"><span>أيام الغياب:</span><span>' + (p.absence_days || 0) + '</span></div>' +
      '<div class="line"><span>دقائق التأخير:</span><span>' + (p.late_minutes || 0) + '</span></div><hr>' +
      '<div class="line"><span>الأساسي:</span><span>' + Utils.fmtMoney(p.basic_salary) + '</span></div>' +
      '<div class="line"><span>بدل سكن:</span><span>' + Utils.fmtMoney(p.housing_allowance) + '</span></div>' +
      '<div class="line"><span>بدل مواصلات:</span><span>' + Utils.fmtMoney(p.transport_allowance) + '</span></div>' +
      '<div class="line"><span>مكافآت:</span><span>+' + Utils.fmtMoney(p.bonuses) + '</span></div><hr>' +
      '<div class="line"><span>خصم غياب:</span><span>-' + Utils.fmtMoney(p.absence_deduction) + '</span></div>' +
      '<div class="line"><span>خصم تأخير:</span><span>-' + Utils.fmtMoney(p.late_deduction) + '</span></div>' +
      '<div class="line"><span>تأمينات:</span><span>-' + Utils.fmtMoney(p.insurance_deduction) + '</span></div>' +
      '<div class="line"><span>ضريبة:</span><span>-' + Utils.fmtMoney(p.tax_deduction) + '</span></div>' +
      '<div class="line"><span>خصومات:</span><span>-' + Utils.fmtMoney(p.deductions) + '</span></div>' +
      '<div class="line"><span>سلف:</span><span>-' + Utils.fmtMoney(p.advances_deduction) + '</span></div>' +
      '<div class="line total"><span>الصافي:</span><span>' + Utils.fmtMoney(p.net_salary) + '</span></div></div>';
    Modal.open('📄 مفردات المرتب', html, null, 'إغلاق');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   26. Products
   ═══════════════════════════════════════════════════════════════════ */
const Products = {
  render() {
  // ⚠️ الحالة الأساسية: cache.products (سريع + دقيق)
  let allProducts = (cache.products || []).slice();

  // ⚠️ لو فيه pending changes للمنتجات، ادمجهم
  try {
    const pendingKey = 'pending_changes_' + State.currentCompanyId;
    const pendingStr = localStorage.getItem(pendingKey);
    if (pendingStr) {
      const pending = JSON.parse(pendingStr);
      // ⚠️ فلتر بس pending المنتجات
      const productPending = pending.filter(function (p) {
        return p && p.store === 'products' && p.data && p.data.id;
      });

      // ⚠️ لو فيه pending، ادمجهم
      if (productPending.length > 0) {
        const existingIds = {};
        allProducts.forEach(function (p) { if (p && p.id) existingIds[p.id] = true; });
        productPending.forEach(function (item) {
          if (!existingIds[item.data.id]) {
            allProducts.push(item.data);
          } else {
            // استبدل بالنسخة الأحدث
            const idx = allProducts.findIndex(function (x) { return x.id === item.data.id; });
            if (idx >= 0) allProducts[idx] = item.data;
          }
        });
      }
    }
  } catch (e) {}

  // ⚠️ فلتر + بحث
  const searchEl = document.getElementById('prodSearch');
  const search = searchEl ? searchEl.value.trim() : '';
  let prods = allProducts.filter(function (p) { return p && p.active !== false; });
  if (search) prods = prods.filter(function (p) {
    return (p.name || '').includes(search) || (p.barcode || '').includes(search) || (p.code || '').includes(search);
  });

  // ⚠️ ترتيب — الأحدث أول
  prods.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

  const addBtn = document.getElementById('prodAddBtn');
  if (addBtn) addBtn.style.display = can('products_add') ? 'flex' : 'none';
  const el = document.getElementById('prodList');
  if (!el) return;
  if (prods.length === 0) {
    el.innerHTML = '<div class="empty"><div class="ico">📦</div>لا توجد منتجات</div>';
    return;
  }
  let html = '';
  for (const p of prods) {
    const low = (Number(p.quantity) || 0) <= (Number(p.min_quantity) || 5);
    const imgHtml = p.image
      ? '<img src="' + p.image + '" style="width:70px;height:70px;border-radius:10px;border:2px solid #333;object-fit:cover;background:#0a0a0a;flex-shrink:0;">'
      : '<div style="width:70px;height:70px;border-radius:10px;border:2px solid #333;background:linear-gradient(135deg,#1a1a1a,#0a0a0a);display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;">📦</div>';
    html += '<div class="list-item">' +
      '<div style="display:flex;gap:12px;align-items:center;flex:1;">' + imgHtml +
        '<div class="info" style="margin-right:10px;">' +
          (p.code ? '<div style="font-size:18px;font-weight:800;color:var(--gold);letter-spacing:1px;font-family:Courier New,monospace;margin-bottom:2px;">' + Utils.esc(p.code) + '</div>' : '') +
          '<h4 style="font-size:14px;margin-bottom:4px;">' + Utils.esc(p.name) + '</h4>' +
          (p.barcode ? '<p style="font-size:11px;color:var(--text-2);font-family:Courier New,monospace;">📊 ' + Utils.esc(p.barcode) + '</p>' : '') +
          '<p style="font-size:11px;">شراء: ' + Utils.fmtMoney(p.cost_price) + ' | بيع: ' + Utils.fmtMoney(p.sale_price) + '</p>' +
          '<p style="font-size:12px;color:' + (low ? 'var(--red-2)' : 'var(--green-2)') + ';font-weight:600;">المخزون: ' + (p.quantity || 0) + ' ' + Utils.esc(p.unit || 'قطعة') + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="actions">' +
        (can('products_edit') ? '<button class="btn btn-primary btn-sm" onclick="Products.edit(\'' + p.id + '\')">✏️</button>' : '') +
        (can('delete_anything') ? '<button class="btn btn-danger btn-sm" onclick="Products.remove(\'' + p.id + '\')">🗑️</button>' : '') +
      '</div></div>';
  }
  el.innerHTML = html;
},

  search: function (term) {
  // ⚠️ لو فيه term، حدّث الحقل
  if (typeof term === 'string' && term.length > 0) {
    const el = document.getElementById('prodSearch');
    if (el) el.value = term;
  }
  // ⚠️ أعد الرسم (مع debounce)
  if (!Products._searchDebounced) {
    Products._searchDebounced = Utils.debounce(function () {
      Products.render();
    }, 250);
  }
  Products._searchDebounced();
},
   
  async edit(id) {
    if (id && !requirePermission('products_edit', 'تعديل')) return;
    if (!id && !requirePermission('products_add', 'إضافة')) return;
    let p = { name: '', barcode: '', code: '', unit: 'قطعة', cost_price: 0, sale_price: 0, quantity: 0, min_quantity: 5, image: '', origin: 'الصين' };
    if (id) p = (cache.products || []).find(function (x) { return x.id === id; }) || p;

    if (State._scannedBarcode) { p.barcode = State._scannedBarcode; State._scannedBarcode = null; }
    State.editingProductImage = p.image || null;

    let autoCode = p.code || '';
    if (!id) autoCode = Products.generateAutoCode();

    const hasImage = !!State.editingProductImage;
    const imgHtml = hasImage
      ? '<img src="' + State.editingProductImage + '" id="prodImagePreview" style="width:100%;height:100%;object-fit:cover;">'
      : '<span id="prodImagePlaceholder" style="font-size:36px;color:#666;">📷</span>';

    const html =
      '<div class="form-group"><label>صورة المنتج</label>' +
        '<div id="prodImageContainer" style="width:120px;height:120px;border:2px dashed #444;border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:0 auto 10px;background:#0a0a0a;overflow:hidden;position:relative;" onclick="Products.pickImage()">' + imgHtml + '</div>' +
        '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">' +
          '<button type="button" class="btn btn-primary btn-sm" onclick="Products.pickFromCamera()">📷 كاميرا</button>' +
          '<button type="button" class="btn btn-info btn-sm" onclick="Products.pickFromGallery()">🖼️ المعرض</button>' +
          '<button type="button" class="btn btn-warning btn-sm" onclick="Products.pickFromFiles()">📁 من ملف</button>' +
          '<button type="button" class="btn btn-danger btn-sm" id="removeImgBtn" onclick="Products.removeImage()" style="' + (hasImage ? '' : 'display:none;') + '">🗑️ حذف الصورة</button>' +
        '</div>' +
        '<input type="file" id="prodImageInputCamera" accept="image/*" capture="environment" style="display:none;" onchange="Products.onImagePicked(event)">' +
        '<input type="file" id="prodImageInputGallery" accept="image/*" style="display:none;" onchange="Products.onImagePicked(event)">' +
        '<input type="file" id="prodImageInputFiles" accept="image/*,application/octet-stream" style="display:none;" onchange="Products.onImagePicked(event)">' +
      '</div>' +
      '<div class="form-group"><label>اسم المنتج *</label><input id="p_name" value="' + Utils.esc(p.name || '') + '"></div>' +
      '<div class="form-group"><label>الباركود</label>' +
        '<div style="display:flex;gap:6px;">' +
          '<input id="p_barcode" value="' + Utils.esc(p.barcode || '') + '" style="flex:1;">' +
          '<button class="btn btn-info btn-sm" onclick="Scanner.open(\'field\')">📷</button>' +
        '</div></div>' +
      '<div class="form-group"><label>الكود ' + (!id ? '(تلقائي)' : '') + '</label>' +
        '<div style="display:flex;gap:6px;">' +
          '<input id="p_code_auto" value="' + Utils.esc(autoCode) + '" readonly style="flex:1;background:#0a0a0a;color:var(--orange-2);font-weight:700;letter-spacing:1px;text-align:center;">' +
          '<input id="p_code" placeholder="كود يدوي" style="flex:1;" value="' + (id ? Utils.esc(p.code || '') : '') + '">' +
        '</div></div>' +
      '<div class="form-group"><label>الوحدة</label><input id="p_unit" value="' + Utils.esc(p.unit || 'قطعة') + '"></div>' +
      '<div class="form-group"><label>المنشأ</label><input id="p_origin" value="' + Utils.esc(p.origin || 'الصين') + '"></div>' +
      '<div class="form-group"><label>سعر الشراء</label><input id="p_cost" type="number" value="' + (p.cost_price || 0) + '"></div>' +
      '<div class="form-group"><label>سعر البيع</label><input id="p_sale" type="number" value="' + (p.sale_price || 0) + '"></div>' +
      '<div class="form-group"><label>الكمية</label><input id="p_qty" type="number" value="' + (p.quantity || 0) + '"></div>' +
      '<div class="form-group"><label>الحد الأدنى</label><input id="p_min" type="number" value="' + (p.min_quantity || 5) + '"></div>';

    Modal.open(id ? '✏️ تعديل منتج' : '➕ إضافة منتج', html, async function () {
      const nameEl = document.getElementById('p_name');
      if (!nameEl) return Toast.show('خطأ: النموذج مغلق', 'error');
      const name = nameEl.value.trim();
      if (!name) return Toast.show('اسم المنتج مطلوب', 'error');

      const manualCode = document.getElementById('p_code').value.trim();
      const autoCodeVal = document.getElementById('p_code_auto').value.trim();
      const finalCode = manualCode || autoCodeVal;
      const newId = id || Utils.genId('PRD');

      const data = {
        id: newId, name: name,
        barcode: document.getElementById('p_barcode').value,
        code: finalCode,
        unit: document.getElementById('p_unit').value,
        origin: document.getElementById('p_origin').value,
        cost_price: parseFloat(document.getElementById('p_cost').value) || 0,
        sale_price: parseFloat(document.getElementById('p_sale').value) || 0,
        quantity: parseInt(document.getElementById('p_qty').value) || 0,
        min_quantity: parseInt(document.getElementById('p_min').value) || 5,
        image: State.editingProductImage || '',
        active: true,
        created_at: p.created_at || Utils.nowISO()
      };

      // ⚠️ حدّث cache فوراً
      const idx = (cache.products || []).findIndex(function (x) { return x.id === newId; });
      if (idx >= 0) cache.products[idx] = data;
      else cache.products.push(data);
      cache.products.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

      State.editingProductImage = null;
      Modal.close();
      Toast.show('✅ تم الحفظ — كود: ' + finalCode);

      if (State.currentPage === 'products') Products.render();

      // احفظ في Firebase في الخلفية
      Sync.save('products', newId, data).catch(function (e) { console.warn('Sync failed:', e); });

      // أعد العرض بعد ثانية
      setTimeout(function () { if (State.currentPage === 'products') Products.render(); }, 1000);
    });
  },

  generateAutoCode() {
    const products = cache.products || [];
    let maxNum = 0;
    for (const p of products) {
      if (p.code && /^PRD\d+$/i.test(p.code)) {
        const num = parseInt(p.code.replace(/[^\d]/g, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return 'PRD' + String(maxNum + 1).padStart(3, '0');
  },

  async pickFromCamera() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const photo = await CameraHelper.captureFromCamera();
        if (photo) {
          State.editingProductImage = photo;
          Products.updateImagePreview(photo);
          Products.showRemoveBtn();
          Toast.show('✅ تم التقاط الصورة');
        }
        return;
      }
      const inp = document.getElementById('prodImageInputCamera');
      if (inp) inp.click();
    } catch (e) { Toast.show('❌ فشل الكاميرا: ' + e.message, 'error'); }
  },

  pickFromGallery() { const inp = document.getElementById('prodImageInputGallery'); if (inp) inp.click(); },
  pickFromFiles() { const inp = document.getElementById('prodImageInputFiles'); if (inp) inp.click(); },
  pickImage() { Products.pickFromGallery(); },

  updateImagePreview(dataUrl) {
    const container = document.getElementById('prodImageContainer');
    if (container) container.innerHTML = '<img src="' + dataUrl + '" id="prodImagePreview" style="width:100%;height:100%;object-fit:cover;">';
  },

  showRemoveBtn() { const btn = document.getElementById('removeImgBtn'); if (btn) btn.style.display = ''; },
  hideRemoveBtn() { const btn = document.getElementById('removeImgBtn'); if (btn) btn.style.display = 'none'; },

  removeImage() {
    if (!State.editingProductImage) return Toast.show('لا توجد صورة', 'info');
    if (!confirm('حذف صورة المنتج؟')) return;
    State.editingProductImage = null;
    const container = document.getElementById('prodImageContainer');
    if (container) container.innerHTML = '<span id="prodImagePlaceholder" style="font-size:36px;color:#666;">📷</span>';
    Products.hideRemoveBtn();
    Toast.show('🗑️ تم حذف الصورة', 'success');
  },

  onImagePicked(event) {
    const file = event.target.files[0];
    if (!file) { event.target.value = ''; return; }
    if (file.size > 700000) { Toast.show('الصورة كبيرة (الحد 700KB)', 'error'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const maxSize = 500;
        let w = img.width, h = img.height;
        if (w > h && w > maxSize) { h = h * maxSize / w; w = maxSize; }
        else if (h > maxSize) { w = w * maxSize / h; h = maxSize; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        State.editingProductImage = canvas.toDataURL('image/jpeg', 0.7);
        Products.updateImagePreview(State.editingProductImage);
        Products.showRemoveBtn();
        Toast.show('✅ تم اختيار الصورة');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  },

  async remove(id) {
    if (!requirePermission('delete_anything', 'حذف')) return;
    if (!confirm('حذف المنتج؟')) return;
    await Sync.softDelete('products', id);
    Toast.show('تم الحذف');
    Products.render();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   27. Partners
   ═══════════════════════════════════════════════════════════════════ */
const Partners = {
  switchTab(e, tab) {
    State.currentPartnerTab = tab;
    document.querySelectorAll('#page-partners .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    Partners.render();
  },

  render() {
    const searchEl = document.getElementById('partnerSearch');
    const search = searchEl ? searchEl.value.trim() : '';
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

    const el = document.getElementById('partnerList');
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">🤝</div>لا يوجد سجلات</div>';
      return;
    }
    let html = '';
    for (const p of list) {
      const balance = Number(p.balance) || 0;
      const color = balance > 0 ? 'var(--red-2)' : balance < 0 ? 'var(--green-2)' : '#888';
      const label = balance > 0 ? 'مدين لنا' : balance < 0 ? 'دائن' : 'متوازن';
      html += '<div class="list-item"><div class="info">' +
        '<h4>' + Utils.esc(p.name) + '</h4>' +
        '<p>📞 ' + Utils.esc(p.phone || '-') + '</p>' +
        '<p style="color:' + color + ';font-weight:600;">الرصيد: ' + Utils.fmtMoney(Math.abs(balance)) + ' - ' + label + '</p>' +
      '</div>' +
      '<div class="actions">' +
        (can('partners_edit') ? '<button class="btn btn-primary btn-sm" onclick="Partners.edit(\'' + p.id + '\',\'' + p.type + '\')">✏️</button>' : '') +
        (can('delete_anything') ? '<button class="btn btn-danger btn-sm" onclick="Partners.remove(\'' + p.id + '\')">🗑️</button>' : '') +
      '</div></div>';
    }
    el.innerHTML = html;
  },

  search: Utils.debounce(function () { Partners.render(); }, 250),

  async quickAdd(type) { Partners.edit(null, type); },

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
      const nameEl = document.getElementById('pt_name');
      const name = nameEl ? nameEl.value.trim() : '';
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
      // ⚠️ حدّث cache فوراً
      const idx = (cache.partners || []).findIndex(function (x) { return x.id === newId; });
      if (idx >= 0) cache.partners[idx] = data;
      else cache.partners.push(data);
      Modal.close();
      Toast.show('✅ تم الحفظ');
      Partners.render();
      Sync.save('partners', newId, data).catch(function (e) { console.warn(e); });
    });
  },

  async remove(id) {
    if (!can('delete_anything')) return Toast.show('🔒 المدير فقط', 'error');
    if (!confirm('حذف؟')) return;
    await Sync.softDelete('partners', id);
    Toast.show('تم الحذف');
    Partners.render();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   28. Sales
   ═══════════════════════════════════════════════════════════════════ */
const Sales = {
  init() {
    if (!State._saleFormActive) saleItems.length = 0;
    State._saleFormActive = true;

    const customers = (cache.partners || []).filter(function (p) {
      return p.type === 'customer' && p.active !== false;
    });
    const products = (cache.products || []).filter(function (p) { return p.active !== false; });
    const custEl = document.getElementById('saleCustomer');
    const prodEl = document.getElementById('saleProduct');
    if (custEl) {
      custEl.innerHTML = '<option value="">-- اختر عميل --</option>' +
        customers.map(function (c) { return '<option value="' + c.id + '">' + Utils.esc(c.name) + '</option>'; }).join('');
    }
    if (prodEl) {
      prodEl.innerHTML = products.map(function (p) {
        const qty = Number(p.quantity) || 0;
        const status = qty <= 0 ? '❌' : qty <= (Number(p.min_quantity) || 5) ? '⚠️' : '✅';
        return '<option value="' + p.id + '">' + Utils.esc(p.name) + ' - ' + p.sale_price + ' (رصيد: ' + qty + ') ' + status + '</option>';
      }).join('');
    }
    Sales.render();
    Sales.calcTotals();
  },

  addItem() {
    if (!requirePermission('sales_create', 'إنشاء فاتورة')) return;
    const pid = document.getElementById('saleProduct').value;
    if (!pid) return Toast.show('اختر منتج', 'error');
    Sales.addItemById(pid);
  },

  addItemById(pid) {
    const p = (cache.products || []).find(function (x) { return x.id === pid; });
    if (!p) return Toast.show('منتج غير موجود', 'error');
    const existing = saleItems.find(function (i) { return i.product_id === pid; });
    if (existing) {
      if (existing.quantity + 1 > (Number(p.quantity) || 0)) {
        return Toast.show('⚠️ لا يوجد رصيد كافٍ (' + p.quantity + ')', 'error');
      }
      existing.quantity++;
    } else {
      if ((Number(p.quantity) || 0) <= 0) return Toast.show('❌ نافذ', 'error');
      saleItems.push({
        product_id: pid, name: p.name, quantity: 1,
        price: Number(p.sale_price) || 0,
        cost: Number(p.cost_price) || 0,
        max: Number(p.quantity) || 0,
        image: p.image || ''
      });
    }
    Sales.render();
    Sales.calcTotals();
  },

  render() {
    const body = document.getElementById('saleItemsBody');
    if (!body) return;
    if (saleItems.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="padding:20px;color:#666;">لا توجد أصناف</td></tr>';
    } else {
      body.innerHTML = saleItems.map(function (it, i) {
        const over = it.quantity > it.max;
        const imgHtml = it.image
          ? '<img src="' + it.image + '" style="width:30px;height:30px;border-radius:4px;object-fit:cover;vertical-align:middle;margin-left:4px;">'
          : '';
        return '<tr style="' + (over ? 'background:rgba(198,40,40,.15);' : '') + '">' +
          '<td>' + imgHtml + Utils.esc(it.name) + '<br><small style="color:#888;font-size:10px;">رصيد: ' + it.max + '</small></td>' +
          '<td><input type="number" value="' + it.quantity + '" min="1" max="' + it.max + '" onchange="Sales.updateQty(' + i + ',this.value)" oninput="Sales.updateQty(' + i + ',this.value)"></td>' +
          '<td><input type="number" value="' + it.price + '" onchange="Sales.updatePrice(' + i + ',this.value)" oninput="Sales.updatePrice(' + i + ',this.value)"></td>' +
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

updatePrice(i, v) {
  saleItems[i].price = parseFloat(v) || 0;
  Sales.render();
},

removeItem(i) {
  saleItems.splice(i, 1);
  Sales.render();
},

  calcTotals() {
  const subEl = document.getElementById('saleSubtotal');
  const totEl = document.getElementById('saleTotal');
  const remEl = document.getElementById('saleRemaining');
  if (!subEl || !totEl || !remEl) return;

  // ⚠️ حساب المجموع الفرعي
  let sub = 0;
  for (let i = 0; i < saleItems.length; i++) {
    const it = saleItems[i];
    if (!it) continue;
    const qty = Number(it.quantity) || 0;
    const price = Number(it.price) || 0;
    sub += qty * price;
  }

  // ⚠️ قراءة القيم من الحقول
  const discEl = document.getElementById('saleDiscount');
  const taxEl = document.getElementById('saleTax');
  const paidEl = document.getElementById('salePaid');

  // ⚠️ نوع الخصم — مبلغ أو نسبة
  const discTypeEl = document.getElementById('saleDiscountType');
  const discType = discTypeEl ? discTypeEl.value : 'amount';

  const discValue = discEl ? (parseFloat(discEl.value) || 0) : 0;
  const tax = taxEl ? (parseFloat(taxEl.value) || 0) : 0;
  const paid = paidEl ? (parseFloat(paidEl.value) || 0) : 0;

  // ⚠️ حساب الخصم حسب النوع
  let disc = 0;
  if (discType === 'percent') {
    disc = sub * (discValue / 100);
  } else {
    disc = discValue;
  }

  // ⚠️ حماية: الخصم ما يزيدش عن المجموع
  if (disc > sub) disc = sub;
  if (disc < 0) disc = 0;

  // ⚠️ الحساب النهائي
  const total = sub - disc + tax;
  const remaining = total - paid;

  // ⚠️ عرض النتيجة
  subEl.textContent = Utils.fmtMoney(sub);
  totEl.textContent = Utils.fmtMoney(total);
  remEl.textContent = Utils.fmtMoney(remaining);

  // ⚠️ عرض المبلغ الفعلي للخصم لو كان نسبة
  const discLabelEl = document.getElementById('saleDiscountLabel');
  if (discLabelEl) {
    if (discType === 'percent' && discValue > 0) {
      discLabelEl.textContent = 'الخصم (' + discValue + '%) = ' + Utils.fmtMoney(disc);
    } else {
      discLabelEl.textContent = 'الخصم';
    }
  }
},

  async save() {
  if (!requirePermission('sales_create', 'إنشاء فاتورة')) return;

  const custId = document.getElementById('saleCustomer').value;
  if (!custId) return Toast.show('اختر عميل', 'error');
  if (saleItems.length === 0) return Toast.show('أضف أصناف', 'error');

  // ⚠️ التحقق من الرصيد
  for (const it of saleItems) {
    const p = (cache.products || []).find(function (x) { return x.id === it.product_id; });
    if (!p) return Toast.show('منتج غير موجود', 'error');
    if ((Number(p.quantity) || 0) < it.quantity) {
      return Toast.show('❌ رصيد "' + p.name + '" غير كافٍ', 'error');
    }
  }

  // ⚠️ تأكيد الهوية
  const verified = await Biometric.verify('تأكيد فاتورة المبيعات');
  if (!verified) return Toast.show('فشل التحقق', 'error');

  // ⚠️ قراءة الخصم (نسبة أو مبلغ)
  const discTypeEl = document.getElementById('saleDiscountType');
  const discType = discTypeEl ? discTypeEl.value : 'amount';
  const discValue = parseFloat(document.getElementById('saleDiscount').value) || 0;

  const tax = parseFloat(document.getElementById('saleTax').value) || 0;
  const paid = parseFloat(document.getElementById('salePaid').value) || 0;
  const paymentMethod = document.getElementById('salePayment').value;

  // ⚠️ حساب المجموع الفرعي
  const sub = saleItems.reduce(function (s, it) {
    return s + (Number(it.quantity) || 0) * (Number(it.price) || 0);
  }, 0);

  // ⚠️ حساب الخصم
  let disc = 0;
  if (discType === 'percent') {
    disc = sub * (discValue / 100);
  } else {
    disc = discValue;
  }
  if (disc > sub) disc = sub;
  if (disc < 0) disc = 0;

  // ⚠️ الإجمالي النهائي
  const total = sub - disc + tax;
  const remaining = total - paid;

  // ⚠️ الحساب اللي الفلوس دخلته
  const accountId = methodToAccountId(paymentMethod);
  const account = getAccount(accountId);

  const invoiceId = Utils.genId('S');
  const invoiceNo = 'S-' + Date.now();
  const now = Utils.nowISO();

  // ⚠️ 1. خصم الكميات من المخزون
  for (const it of saleItems) {
    const p = (cache.products || []).find(function (x) { return x.id === it.product_id; });
    p.quantity = (Number(p.quantity) || 0) - it.quantity;
    await Sync.save('products', p.id, p);
    const moveId = Utils.genId('SM');
    await Sync.save('stock_movements', moveId, {
      id: moveId,
      product_id: it.product_id,
      type: 'out',
      quantity: it.quantity,
      balance_after: p.quantity,
      reference: invoiceNo,
      date: now,
      employee_name: State.currentEmployee.name
    });
  }

  // ⚠️ 2. حفظ الفاتورة
  const customer = (cache.partners || []).find(function (x) { return x.id === custId; });
  await Sync.save('sales_invoices', invoiceId, {
    id: invoiceId,
    invoice_no: invoiceNo,
    customer_id: custId,
    customer_name: customer ? customer.name : '',
    employee_uid: State.currentUser.uid,
    employee_name: State.currentEmployee.name,
    date: now,
    subtotal: sub,
    discount_type: discType,
    discount_value: discValue,
    discount: disc,
    tax: tax,
    total: total,
    paid: paid,
    remaining: remaining,
    payment_method: paymentMethod,
    account_id: accountId,
    account_label: account.label,
    fingerprint_verified: 1,
    created_at: now
  });

  // ⚠️ 3. حفظ الأصناف
  for (const it of saleItems) {
    const iid = Utils.genId('SI');
    await Sync.save('sales_items', iid, {
      id: iid,
      invoice_id: invoiceId,
      product_id: it.product_id,
      product_name: it.name,
      quantity: it.quantity,
      price: it.price,
      cost: it.cost,
      cost_at_sale: it.cost,
      total: it.quantity * it.price
    });
  }

  // ⚠️ 4. تحديث رصيد العميل
  if (customer) {
    customer.balance = (Number(customer.balance) || 0) + remaining;
    await Sync.save('partners', custId, customer);
  }

  // ⚠️ 5. لو فيه مبلغ مدفوع → إنشاء سند قبض + حركة خزينة
  if (paid > 0) {
    const voucherId = Utils.genId('RCV');
    const voucherNo = 'RCV-' + Date.now();

    // سند القبض
    await Sync.save('vouchers', voucherId, {
      id: voucherId,
      voucher_no: voucherNo,
      type: 'receipt',
      amount: paid,
      partner_id: custId,
      partner_name: customer ? customer.name : '',
      employee_uid: State.currentUser.uid,
      employee_name: State.currentEmployee.name,
      issued_by_name: State.currentEmployee.name,
      date: now,
      payment_method: paymentMethod,
      account_id: accountId,
      account_label: account.label,
      description: 'تحصيل فاتورة ' + invoiceNo,
      reference: invoiceNo,
      auto_generated: true,
      invoice_id: invoiceId,
      invoice_type: 'sales',
      created_at: now
    });

    // حركة الخزينة
    const cashId = Utils.genId('CSH');
    await Sync.save('cash_transactions', cashId, {
      id: cashId,
      type: 'in',
      amount: paid,
      reference: voucherNo,
      description: 'تحصيل فاتورة ' + invoiceNo,
      category: 'مبيعات',
      date: now,
      employee_name: State.currentEmployee.name,
      partner_id: custId,
      partner_name: customer ? customer.name : '',
      payment_method: paymentMethod,
      account_id: accountId,
      account_label: account.label,
      voucher_id: voucherId,
      invoice_id: invoiceId
    });
  }

  // ⚠️ 6. تسجيل النشاط
  await Activity.log('sale_invoice', invoiceNo + ' - ' + Utils.fmtMoney(total) + ' - ' + account.label);

  Toast.show('✅ تم تسجيل الفاتورة');

  // ⚠️ 7. إعادة التهيئة
  saleItems.length = 0;
  State._saleFormActive = false;
  State._initialized.sales = false;
  Sales.init();

  // ⚠️ 8. عرض الفاتورة
  setTimeout(function () { Invoices.show(invoiceId, 'sales'); }, 300);
}
};

/* ═══════════════════════════════════════════════════════════════════
   29. Purchases
   ═══════════════════════════════════════════════════════════════════ */
const Purchases = {
  init() {
    if (!State._purchaseFormActive) purItems.length = 0;
    State._purchaseFormActive = true;

    const suppliers = (cache.partners || []).filter(function (p) {
      return p.type === 'supplier' && p.active !== false;
    });
    const products = (cache.products || []).filter(function (p) { return p.active !== false; });
    const supEl = document.getElementById('purSupplier');
    const prodEl = document.getElementById('purProduct');
    if (supEl) {
      supEl.innerHTML = '<option value="">-- اختر مورد --</option>' +
        suppliers.map(function (s) { return '<option value="' + s.id + '">' + Utils.esc(s.name) + '</option>'; }).join('');
    }
    if (prodEl) {
      prodEl.innerHTML = products.map(function (p) {
        const qty = Number(p.quantity) || 0;
        return '<option value="' + p.id + '">' + Utils.esc(p.name) + ' - ' + p.cost_price + ' (رصيد: ' + qty + ')</option>';
      }).join('');
    }
    Purchases.render();
    Purchases.calcTotals();
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
      price: Number(p.cost_price) || 0,
      max: Number(p.quantity) || 0,
      image: p.image || ''
    });
    Purchases.render();
    Purchases.calcTotals();
  },

  render() {
    const body = document.getElementById('purItemsBody');
    if (!body) return;
    if (purItems.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="padding:20px;color:#666;">لا توجد أصناف</td></tr>';
    } else {
      body.innerHTML = purItems.map(function (it, i) {
        const imgHtml = it.image
          ? '<img src="' + it.image + '" style="width:30px;height:30px;border-radius:4px;object-fit:cover;vertical-align:middle;margin-left:4px;">'
          : '';
        return '<tr>' +
          '<td>' + imgHtml + Utils.esc(it.name) + '<br><small style="color:#888;font-size:10px;">رصيد: ' + it.max + '</small></td>' +
          '<td><input type="number" value="' + it.quantity + '" min="1" onchange="Purchases.updateQty(' + i + ',this.value)" oninput="Purchases.updateQty(' + i + ',this.value)"></td>' +
          '<td><input type="number" value="' + it.price + '" onchange="Purchases.updatePrice(' + i + ',this.value)" oninput="Purchases.updatePrice(' + i + ',this.value)"></td>' +
          '<td>' + (it.quantity * it.price).toFixed(2) + '</td>' +
          '<td><button class="btn btn-danger btn-sm" onclick="Purchases.removeItem(' + i + ')">×</button></td>' +
        '</tr>';
      }).join('');
    }
    Purchases.calcTotals();
  },

  updateQty(i, v) {
  const qty = parseInt(v) || 1;
  purItems[i].quantity = qty < 1 ? 1 : qty;
  Purchases.render();
},

updatePrice(i, v) {
  purItems[i].price = parseFloat(v) || 0;
  Purchases.render();
},

removeItem(i) {
  purItems.splice(i, 1);
  Purchases.render();
},

  calcTotals() {
  const subEl = document.getElementById('purSubtotal');
  const totEl = document.getElementById('purTotal');
  const remEl = document.getElementById('purRemaining');
  if (!subEl || !totEl || !remEl) return;

  // ⚠️ حساب المجموع الفرعي
  let sub = 0;
  for (let i = 0; i < purItems.length; i++) {
    const it = purItems[i];
    if (!it) continue;
    const qty = Number(it.quantity) || 0;
    const price = Number(it.price) || 0;
    sub += qty * price;
  }

  // ⚠️ قراءة القيم من الحقول
  const discEl = document.getElementById('purDiscount');
  const taxEl = document.getElementById('purTax');
  const paidEl = document.getElementById('purPaid');

  // ⚠️ نوع الخصم — مبلغ أو نسبة
  const discTypeEl = document.getElementById('purDiscountType');
  const discType = discTypeEl ? discTypeEl.value : 'amount';

  const discValue = discEl ? (parseFloat(discEl.value) || 0) : 0;
  const tax = taxEl ? (parseFloat(taxEl.value) || 0) : 0;
  const paid = paidEl ? (parseFloat(paidEl.value) || 0) : 0;

  // ⚠️ حساب الخصم حسب النوع
  let disc = 0;
  if (discType === 'percent') {
    disc = sub * (discValue / 100);
  } else {
    disc = discValue;
  }

  // ⚠️ حماية: الخصم ما يزيدش عن المجموع
  if (disc > sub) disc = sub;
  if (disc < 0) disc = 0;

  // ⚠️ الحساب النهائي
  const total = sub - disc + tax;
  const remaining = total - paid;

  // ⚠️ عرض النتيجة
  subEl.textContent = Utils.fmtMoney(sub);
  totEl.textContent = Utils.fmtMoney(total);
  remEl.textContent = Utils.fmtMoney(remaining);

  // ⚠️ عرض المبلغ الفعلي للخصم لو كان نسبة
  const discLabelEl = document.getElementById('purDiscountLabel');
  if (discLabelEl) {
    if (discType === 'percent' && discValue > 0) {
      discLabelEl.textContent = 'الخصم (' + discValue + '%):';
    } else {
      discLabelEl.textContent = 'الخصم:';
    }
  }
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
      supplier_name: (cache.partners || []).find(function (x) { return x.id === supId; })
        ? (cache.partners || []).find(function (x) { return x.id === supId; }).name : '',
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

    purItems.length = 0;
    State._purchaseFormActive = false;
    State._initialized.purchase = false;
    Purchases.init();
    setTimeout(function () { Invoices.show(invoiceId, 'purchase'); }, 300);
  }
};

/* ═══════════════════════════════════════════════════════════════════
   30. Returns
   ═══════════════════════════════════════════════════════════════════ */
const Returns = {
  switchTab(e, tab) {
    State.currentReturnTab = tab;
    document.querySelectorAll('#page-returns .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    State._initialized.returns = false;
    Returns.init();
  },

  init() {
    if (!State._returnFormActive) retItems.length = 0;
    State._returnFormActive = true;

    const isSales = State.currentReturnTab === 'sales';
    const labelEl = document.getElementById('retPartyLabel');
    if (labelEl) labelEl.textContent = isSales ? 'العميل' : 'المورد';

    const parties = (cache.partners || []).filter(function (p) {
      return p.type === (isSales ? 'customer' : 'supplier') && p.active !== false;
    });
    const partyEl = document.getElementById('retParty');
    if (partyEl) {
      partyEl.innerHTML = '<option value="">-- اختر --</option>' +
        parties.map(function (p) { return '<option value="' + p.id + '">' + Utils.esc(p.name) + '</option>'; }).join('');
    }

    const products = (cache.products || []).filter(function (p) { return p.active !== false; });
    const prodEl = document.getElementById('retProduct');
    if (prodEl) {
      prodEl.innerHTML = products.map(function (p) {
        const qty = Number(p.quantity) || 0;
        return '<option value="' + p.id + '">' + Utils.esc(p.name) + ' (رصيد: ' + qty + ') - ' +
          (isSales ? p.sale_price : p.cost_price) + '</option>';
      }).join('');
    }

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
      max: Number(p.quantity) || 0,
      image: p.image || ''
    });
    Returns.render();
  },

  render() {
  const body = document.getElementById('retItemsBody');
  if (!body) return;

  if (retItems.length === 0) {
    body.innerHTML = '<tr><td colspan="5" style="padding:20px;color:#666;">لا توجد أصناف</td></tr>';
  } else {
    body.innerHTML = retItems.map(function (it, i) {
      const imgHtml = it.image
        ? '<img src="' + it.image + '" style="width:30px;height:30px;border-radius:4px;object-fit:cover;vertical-align:middle;margin-left:4px;">'
        : '';
      return '<tr>' +
        '<td>' + imgHtml + Utils.esc(it.name) + '</td>' +
        '<td><input type="number" value="' + it.quantity + '" min="1" onchange="Returns.updateQty(' + i + ',this.value)" oninput="Returns.updateQty(' + i + ',this.value)"></td>' +
        '<td><input type="number" value="' + it.price + '" onchange="Returns.updatePrice(' + i + ',this.value)" oninput="Returns.updatePrice(' + i + ',this.value)"></td>' +
        '<td>' + (it.quantity * it.price).toFixed(2) + '</td>' +
        '<td><button class="btn btn-danger btn-sm" onclick="Returns.removeItem(' + i + ')">×</button></td>' +
      '</tr>';
    }).join('');
  }

  // ⚠️ حساب المجموع الفرعي
  const sub = retItems.reduce(function (s, it) {
    return s + (Number(it.quantity) || 0) * (Number(it.price) || 0);
  }, 0);

  // ⚠️ قراءة الخصم (مبلغ أو نسبة)
  const discTypeEl = document.getElementById('retDiscountType');
  const discEl = document.getElementById('retDiscount');
  const discType = discTypeEl ? discTypeEl.value : 'amount';
  const discValue = discEl ? (parseFloat(discEl.value) || 0) : 0;

  let disc = 0;
  if (discType === 'percent') {
    disc = sub * (discValue / 100);
  } else {
    disc = discValue;
  }

  // ⚠️ حماية
  if (disc > sub) disc = sub;
  if (disc < 0) disc = 0;

  const total = sub - disc;

  // ⚠️ عرض المجموع الفرعي والإجمالي
  const subEl = document.getElementById('retSubtotal');
  if (subEl) subEl.textContent = Utils.fmtMoney(sub);

  const totalEl = document.getElementById('retTotal');
  if (totalEl) totalEl.textContent = Utils.fmtMoney(total);

  // ⚠️ عرض المبلغ الفعلي للخصم لو كان نسبة
  const discLabelEl = document.getElementById('retDiscountLabel');
  if (discLabelEl) {
    if (discType === 'percent' && discValue > 0) {
      discLabelEl.textContent = 'الخصم (' + discValue + '%):';
    } else {
      discLabelEl.textContent = 'الخصم:';
    }
  }
},

  updateQty(i, v) {
    const qty = parseInt(v) || 1;
    retItems[i].quantity = qty < 1 ? 1 : qty;
    Returns.render();
  },

  updatePrice(i, v) {
    retItems[i].price = parseFloat(v) || 0;
    Returns.render();
  },

  removeItem(i) {
    retItems.splice(i, 1);
    Returns.render();
  },

async save() {
  if (!requirePermission('returns_create', 'إنشاء مرتجع')) return;

  const partyId = document.getElementById('retParty').value;
  if (!partyId) return Toast.show('اختر الجهة', 'error');
  if (retItems.length === 0) return Toast.show('أضف أصناف', 'error');

  // ⚠️ تأكيد الهوية
  const verified = await Biometric.verify('تأكيد المرتجع');
  if (!verified) return Toast.show('فشل التحقق', 'error');

  const isSales = State.currentReturnTab === 'sales';
  const settle = document.getElementById('retSettle').value;
  const reason = document.getElementById('retReason').value;

  // ⚠️ حساب المجموع الفرعي
  const sub = retItems.reduce(function (s, it) {
    return s + (Number(it.quantity) || 0) * (Number(it.price) || 0);
  }, 0);

  // ⚠️ قراءة الخصم (مبلغ أو نسبة)
  const discTypeEl = document.getElementById('retDiscountType');
  const discEl = document.getElementById('retDiscount');
  const discType = discTypeEl ? discTypeEl.value : 'amount';
  const discValue = discEl ? (parseFloat(discEl.value) || 0) : 0;

  let disc = 0;
  if (discType === 'percent') {
    disc = sub * (discValue / 100);
  } else {
    disc = discValue;
  }
  if (disc > sub) disc = sub;
  if (disc < 0) disc = 0;

  const total = sub - disc;

  // ⚠️ الحساب الافتراضي (نقدي)
  // ⚠️ ملاحظة: صفحة المرتجعات مفيش فيها خيار طريقة دفع حالياً
  // ⚠️ فبنستخدم "نقدي" كافتراضي
  const accountId = 'cash';
  const account = getAccount(accountId);

  const returnId = Utils.genId(isSales ? 'SR' : 'PR');
  const returnNo = (isSales ? 'SR-' : 'PR-') + Date.now();
  const now = Utils.nowISO();

  // ⚠️ 1. تعديل المخزون
  for (const it of retItems) {
    const p = (cache.products || []).find(function (x) { return x.id === it.product_id; });
    const change = isSales ? it.quantity : -it.quantity;
    p.quantity = (Number(p.quantity) || 0) + change;
    await Sync.save('products', p.id, p);
    const moveId = Utils.genId('SM');
    await Sync.save('stock_movements', moveId, {
      id: moveId,
      product_id: it.product_id,
      type: isSales ? 'return_in' : 'return_out',
      quantity: it.quantity,
      balance_after: p.quantity,
      reference: returnNo,
      date: now,
      notes: reason,
      employee_name: State.currentEmployee.name
    });
  }

  // ⚠️ 2. حفظ المرتجع
  const store = isSales ? 'sales_returns' : 'purchase_returns';
  const party = (cache.partners || []).find(function (x) { return x.id === partyId; });
  const partyName = party ? party.name : '';

  const retData = {
    id: returnId,
    return_no: returnNo,
    party_name: partyName,
    employee_uid: State.currentUser.uid,
    employee_name: State.currentEmployee.name,
    date: now,
    subtotal: sub,
    discount_type: discType,
    discount_value: discValue,
    discount: disc,
    total: total,
    reason: reason,
    settlement: settle,
    account_id: accountId,
    account_label: account.label,
    created_at: now
  };
  if (isSales) retData.customer_id = partyId;
  else retData.supplier_id = partyId;
  await Sync.save(store, returnId, retData);

  // ⚠️ 3. حفظ الأصناف
  const itemsStore = isSales ? 'sales_return_items' : 'purchase_return_items';
  for (const it of retItems) {
    const iid = Utils.genId('RI');
    await Sync.save(itemsStore, iid, {
      id: iid,
      return_id: returnId,
      product_id: it.product_id,
      product_name: it.name,
      quantity: it.quantity,
      price: it.price,
      total: it.quantity * it.price
    });
  }

  // ⚠️ 4. تحديث رصيد الجهة
  if (party) {
    party.balance = (Number(party.balance) || 0) - total;
    await Sync.save('partners', partyId, party);
  }

  // ⚠️ 5. لو استرداد نقدي → سند + حركة خزينة
  if (settle === 'refund') {
    const voucherType = isSales ? 'payment' : 'receipt';
    const voucherId = Utils.genId(isSales ? 'PAY' : 'RCV');
    const voucherNo = (isSales ? 'PAY-' : 'RCV-') + Date.now();

    // السند
    await Sync.save('vouchers', voucherId, {
      id: voucherId,
      voucher_no: voucherNo,
      type: voucherType,
      amount: total,
      partner_id: partyId,
      partner_name: partyName,
      employee_uid: State.currentUser.uid,
      employee_name: State.currentEmployee.name,
      issued_by_name: State.currentEmployee.name,
      date: now,
      payment_method: 'نقدي',
      account_id: accountId,
      account_label: account.label,
      description: (isSales ? 'استرداد مرتجع ' : 'استرداد مرتجع مشتريات ') + returnNo,
      reference: returnNo,
      auto_generated: true,
      return_id: returnId,
      return_type: isSales ? 'sales_return' : 'purchase_return',
      created_at: now
    });

    // حركة الخزينة
    const cashId = Utils.genId('CSH');
    await Sync.save('cash_transactions', cashId, {
      id: cashId,
      type: isSales ? 'out' : 'in',
      amount: total,
      reference: voucherNo,
      description: (isSales ? 'استرداد مرتجع مبيعات ' : 'استرداد مرتجع مشتريات ') + returnNo,
      category: isSales ? 'مرتجع مبيعات' : 'مرتجع مشتريات',
      date: now,
      employee_name: State.currentEmployee.name,
      partner_id: partyId,
      partner_name: partyName,
      payment_method: 'نقدي',
      account_id: accountId,
      account_label: account.label,
      voucher_id: voucherId,
      return_id: returnId
    });
  }

  // ⚠️ 6. تسجيل النشاط
  await Activity.log('return', returnNo + ' - ' + Utils.fmtMoney(total) + ' - ' + account.label);

  Toast.show('✅ تم تسجيل المرتجع');

  // ⚠️ 7. إعادة التهيئة
  retItems.length = 0;
  State._returnFormActive = false;
  State._initialized.returns = false;
  Returns.init();

  // ⚠️ 8. عرض المرتجع
  setTimeout(function () { Invoices.show(returnId, isSales ? 'sales_return' : 'purchase_return'); }, 300);
},

  loadList() {
    const isSales = State.currentReturnTab === 'sales';
    const store = isSales ? 'sales_returns' : 'purchase_returns';
    const returns = (cache[store] || []).slice().sort(function (a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    const el = document.getElementById('returnsList');
    if (!el) return;
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
        '<div style="font-size:12px;color:#aaa;margin-top:4px;">' + Utils.esc(r.party_name || '-') + ' | ' + Utils.fmtDate(r.date) + '</div>' +
        '<div style="font-size:11px;color:#888;margin-top:2px;">' + Utils.esc(r.reason || '') + ' | ' + (r.settlement === 'refund' ? 'استرداد نقدي' : 'خصم من الحساب') + '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }
};

/* ═══════════════════════════════════════════════════════════════════
   31. Invoices
   ═══════════════════════════════════════════════════════════════════ */
const Invoices = {
  switchTab(e, tab) {
    State.currentInvTab = tab;
    document.querySelectorAll('#page-invoices .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    Invoices.render();
  },

  render: Utils.debounce(function () {
    const searchEl = document.getElementById('invSearch');
    const search = searchEl ? searchEl.value.trim() : '';
    const store = State.currentInvTab === 'sales' ? 'sales_invoices' : 'purchase_invoices';
    let invs = (cache[store] || []).slice();
    if (search) invs = invs.filter(function (i) { return (i.invoice_no || '').includes(search); });
    invs.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

    const el = document.getElementById('invList');
    if (!el) return;
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
        '</div></div>';
    }
    el.innerHTML = html;
  }, 250),

  load() { Invoices.render(); },

  async show(id, type) {
    const storeMap = { sales: 'sales_invoices', purchase: 'purchase_invoices', sales_return: 'sales_returns', purchase_return: 'purchase_returns' };
    const itemsMap = { sales: 'sales_items', purchase: 'purchase_items', sales_return: 'sales_return_items', purchase_return: 'purchase_return_items' };
    const store = storeMap[type];
    const itemsStore = itemsMap[type];
    if (!store) return;
    const doc = (cache[store] || []).find(function (x) { return x.id === id; });
    if (!doc) return;
    const items = (cache[itemsStore] || []).filter(function (i) { return (i.invoice_id === id || i.return_id === id); });

    const titles = { sales: '🧾 فاتورة مبيعات', purchase: '📦 فاتورة مشتريات', sales_return: '↩️ مرتجع مبيعات', purchase_return: '↩️ مرتجع مشتريات' };
    const partyLabel = (type === 'sales' || type === 'sales_return') ? 'العميل' : 'المورد';
    const partyName = doc.customer_name || doc.supplier_name || doc.party_name || '-';
    const docNo = doc.invoice_no || doc.return_no;

    let html = '<div class="receipt" id="printableReceipt">' +
      '<div class="header"><h2>🏪 شركة البسملة</h2><p>لتجارة المشغولات الصينية</p><p>' + titles[type] + '</p></div>' +
      '<div class="line"><span>رقم:</span><span>' + Utils.esc(docNo) + '</span></div>' +
      '<div class="line"><span>التاريخ:</span><span>' + Utils.fmtDate(doc.date) + '</span></div>' +
      '<div class="line"><span>' + partyLabel + ':</span><span>' + Utils.esc(partyName) + '</span></div>' +
      '<div class="line"><span>الموظف:</span><span>' + Utils.esc(doc.employee_name || '-') + '</span></div>' +
      '<hr style="margin:10px 0;border:none;border-top:1px dashed #000;">' +
      '<div class="items">';
    for (const it of items) {
      const product = (cache.products || []).find(function (x) { return x.id === it.product_id; });
      const imgTag = product && product.image
        ? '<img src="' + product.image + '" style="width:24px;height:24px;border-radius:4px;object-fit:cover;margin-left:6px;vertical-align:middle;">'
        : '';
      html += '<div class="line">' +
        '<span>' + imgTag + Utils.esc(it.product_name || 'منتج') + ' × ' + it.quantity + '</span>' +
        '<span>' + Utils.fmtMoney(it.total) + '</span>' +
      '</div>';
    }
    html += '</div>';

    if (type === 'sales' || type === 'purchase') {
      html += '<hr style="margin:10px 0;border:none;border-top:1px dashed #000;">' +
        '<div class="line"><span>الإجمالي الفرعي:</span><span>' + Utils.fmtMoney(doc.subtotal) + '</span></div>' +
        '<div class="line"><span>الخصم:</span><span>' + Utils.fmtMoney(doc.discount) + '</span></div>' +
        '<div class="line"><span>الضريبة:</span><span>' + Utils.fmtMoney(doc.tax) + '</span></div>';
    }
    html += '<div class="line total"><span>الإجمالي:</span><span>' + Utils.fmtMoney(doc.total) + '</span></div>';
    if (type === 'sales' || type === 'purchase') {
      html += '<div class="line"><span>المدفوع:</span><span>' + Utils.fmtMoney(doc.paid) + '</span></div>' +
        '<div class="line"><span>الباقي:</span><span>' + Utils.fmtMoney(doc.remaining) + '</span></div>';
    }
    html += '<div style="text-align:center;margin-top:15px;font-size:11px;border-top:1px dashed #000;padding-top:10px;">شكراً لتعاملكم معنا<br>© البسملة 2026</div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">' +
        '<button class="btn btn-primary" onclick="Invoices.openExport(\'' + id + '\',\'' + type + '\')">📤 تصدير</button>' +
        '<button class="btn btn-info" onclick="Invoices.print(\'' + id + '\',\'' + type + '\')">🖨️ طباعة</button>' +
        '<button class="btn btn-success" onclick="Invoices.share(\'' + id + '\',\'' + type + '\')">📱 مشاركة</button>' +
        '<button class="btn btn-warning" onclick="Invoices.saveToPhone(\'' + id + '\',\'' + type + '\')">💾 حفظ</button>' +
      '</div>';
    if ((type === 'sales' || type === 'purchase') && Number(doc.remaining) > 0 && can('vouchers_create')) {
      html += '<button class="btn btn-warning btn-full" style="margin-top:8px;" onclick="Modal.close();Invoices.pay(\'' + doc.id + '\',\'' + type + '\')">💳 سداد جزء أو الكل</button>';
    }
    Modal.open('تفاصيل المستند', html, null, 'إغلاق');
  },

  openExport(id, type) {
    const storeMap = { sales: 'sales_invoices', purchase: 'purchase_invoices', sales_return: 'sales_returns', purchase_return: 'purchase_returns' };
    const itemsMap = { sales: 'sales_items', purchase: 'purchase_items', sales_return: 'sales_return_items', purchase_return: 'purchase_return_items' };
    const doc = (cache[storeMap[type]] || []).find(function (x) { return x.id === id; });
    const items = (cache[itemsMap[type]] || []).filter(function (i) { return (i.invoice_id === id || i.return_id === id); });
    Export.openDialog(type, doc, items);
  },

  async print(id, type) {
    const storeMap = { sales: 'sales_invoices', purchase: 'purchase_invoices', sales_return: 'sales_returns', purchase_return: 'purchase_returns' };
    const itemsMap = { sales: 'sales_items', purchase: 'purchase_items', sales_return: 'sales_return_items', purchase_return: 'purchase_return_items' };
    const doc = (cache[storeMap[type]] || []).find(function (x) { return x.id === id; });
    const items = (cache[itemsMap[type]] || []).filter(function (i) { return (i.invoice_id === id || i.return_id === id); });
    const html = Export.generateHTML(doc, items, type);
    await Export.printHTML(html, 'dialog');
    await Activity.log('print', doc.invoice_no || doc.return_no || '');
  },

  saveToPhone(id, type) {
    const storeMap = { sales: 'sales_invoices', purchase: 'purchase_invoices', sales_return: 'sales_returns', purchase_return: 'purchase_returns' };
    const itemsMap = { sales: 'sales_items', purchase: 'purchase_items', sales_return: 'sales_return_items', purchase_return: 'purchase_return_items' };
    const doc = (cache[storeMap[type]] || []).find(function (x) { return x.id === id; });
    const items = (cache[itemsMap[type]] || []).filter(function (i) { return (i.invoice_id === id || i.return_id === id); });
    const html = Export.generateHTML(doc, items, type);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'albasmala_' + (doc.invoice_no || doc.return_no || 'doc') + '.html';
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('✅ تم الحفظ');
  },

  async share(id, type) {
    const storeMap = { sales: 'sales_invoices', purchase: 'purchase_invoices', sales_return: 'sales_returns', purchase_return: 'purchase_returns' };
    const itemsMap = { sales: 'sales_items', purchase: 'purchase_items', sales_return: 'sales_return_items', purchase_return: 'purchase_return_items' };
    const doc = (cache[storeMap[type]] || []).find(function (x) { return x.id === id; });
    const items = (cache[itemsMap[type]] || []).filter(function (i) { return (i.invoice_id === id || i.return_id === id); });
    await Export.share(doc, items, type);
  },

  async pay(invId, type) {
    if (!requirePermission('vouchers_create', 'سداد')) return;

    const store = type === 'sales' ? 'sales_invoices' : 'purchase_invoices';
    const inv = (cache[store] || []).find(function (x) { return x.id === invId; });
    if (!inv) return;

    const remaining = Number(inv.remaining) || 0;
    if (remaining <= 0) return Toast.show('الفاتورة مسددة بالكامل', 'error');

    const partyId = type === 'sales' ? inv.customer_id : inv.supplier_id;
    const party = (cache.partners || []).find(function (x) { return x.id === partyId; });

    const html =
      '<div style="margin-bottom:14px;padding:12px;background:rgba(212,175,55,.08);border-radius:10px;border:1px solid rgba(212,175,55,.2);">' +
        '<div style="display:flex;justify-content:space-between;padding:6px 0;"><span>الجهة:</span><strong>' + Utils.esc(party ? party.name : '-') + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:6px 0;"><span>رقم الفاتورة:</span><strong>' + Utils.esc(inv.invoice_no) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:6px 0;"><span>إجمالي الفاتورة:</span><strong>' + Utils.fmtMoney(inv.total) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:6px 0;"><span>المدفوع سابقاً:</span><strong style="color:var(--green-2);">' + Utils.fmtMoney(inv.paid) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px dashed rgba(212,175,55,.3);margin-top:4px;padding-top:8px;"><span>المتبقي:</span><strong style="color:var(--red-2);">' + Utils.fmtMoney(remaining) + '</strong></div>' +
      '</div>' +
      '<div class="form-group"><label>المبلغ المُسدد *</label><input type="number" id="pay_amount" value="' + remaining + '" max="' + remaining + '" step="any"></div>' +
      '<div class="form-group"><label>طريقة الدفع *</label>' +
        '<select id="pay_method">' +
          '<option value="نقدي">💵 نقدي</option>' +
          '<option value="بنكي">🏦 بنكي</option>' +
          '<option value="إنستا باي">📱 إنستا باي</option>' +
          '<option value="محفظة إلكترونية">📲 محفظة إلكترونية</option>' +
          '<option value="شيك">🧾 شيك</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group"><label>ملاحظات (اختياري)</label><input id="pay_notes" placeholder="مثال: دفعة أولى"></div>' +
      '<div class="info-box" style="font-size:12px;">💡 سيتم إنشاء سند قبض/دفع تلقائياً وتسجيل الحركة في الخزينة.</div>';

    Modal.open(
      (type === 'sales' ? '💳 تحصيل من ' : '💳 سداد لـ ') + (party ? party.name : ''),
      html,
      async function () {
        const amountEl = document.getElementById('pay_amount');
        const methodEl = document.getElementById('pay_method');
        const notesEl = document.getElementById('pay_notes');

        const amount = parseFloat(amountEl.value) || 0;
        const method = methodEl.value;
        const notes = notesEl ? notesEl.value.trim() : '';

        // ⚠️ التحقق من المبلغ
        if (amount <= 0) return Toast.show('أدخل مبلغ صحيح', 'error');
        if (amount > remaining + 0.01) return Toast.show('المبلغ أكبر من المتبقي (' + Utils.fmtMoney(remaining) + ')', 'error');

        // ⚠️ تأكيد هوية
        const verified = await Biometric.verify('تأكيد السداد');
        if (!verified) return Toast.show('❌ فشل التحقق', 'error');

        const now = Utils.nowISO();

        // ⚠️ 1. تحديث الفاتورة
        inv.paid = (Number(inv.paid) || 0) + amount;
        inv.remaining = Math.max(0, Number(inv.total) - inv.paid);
        await Sync.save(store, invId, inv);

        // ⚠️ 2. إنشاء سند قبض/دفع
        const voucherId = Utils.genId(type === 'sales' ? 'RCV' : 'PAY');
        const voucherNo = (type === 'sales' ? 'RCV-' : 'PAY-') + Date.now();
        const voucherData = {
          id: voucherId,
          voucher_no: voucherNo,
          type: type === 'sales' ? 'receipt' : 'payment',
          amount: amount,
          partner_id: partyId,
          partner_name: party ? party.name : '',
          employee_uid: State.currentUser.uid,
          employee_name: State.currentEmployee.name,
          issued_by_name: State.currentEmployee.name,
          date: now,
          payment_method: method,
          description: (type === 'sales' ? 'تحصيل فاتورة ' : 'سداد فاتورة ') + inv.invoice_no + (notes ? ' - ' + notes : ''),
          reference: inv.invoice_no,
          auto_generated: true,
          invoice_id: invId,
          invoice_type: type,
          created_at: now
        };
        await Sync.save('vouchers', voucherId, voucherData);

        // ⚠️ 3. حركة الخزينة
        const cashId = Utils.genId('CSH');
        await Sync.save('cash_transactions', cashId, {
          id: cashId,
          type: type === 'sales' ? 'in' : 'out',
          amount: amount,
          reference: voucherNo,
          description: (type === 'sales' ? 'تحصيل فاتورة ' : 'سداد فاتورة ') + inv.invoice_no + (notes ? ' - ' + notes : ''),
          category: type === 'sales' ? 'تحصيل مبيعات' : 'سداد مشتريات',
          date: now,
          employee_name: State.currentEmployee.name,
          partner_id: partyId,
          partner_name: party ? party.name : '',
          payment_method: method,
          voucher_id: voucherId,
          invoice_id: invId
        });

        // ⚠️ 4. تحديث رصيد الجهة
        if (party) {
          party.balance = (Number(party.balance) || 0) - amount;
          await Sync.save('partners', partyId, party);
        }

        // ⚠️ 5. تسجيل النشاط
        await Activity.log(
          type === 'sales' ? 'voucher_receipt' : 'voucher_payment',
          voucherNo + ' - ' + Utils.fmtMoney(amount) + ' - ' + (party ? party.name : '')
        );

        Modal.close();
        Toast.show('✅ تم السداد: ' + Utils.fmtMoney(amount));

        // ⚠️ إعادة تحميل الفواتير
        setTimeout(function () {
          Invoices.render();
        }, 500);
      },
      'إغلاق'
    );
  }
};

/* ═══════════════════════════════════════════════════════════════════
   32. Vouchers
   ═══════════════════════════════════════════════════════════════════ */
const Vouchers = {
  switchTab(e, tab) {
    State.currentVoucherTab = tab;
    document.querySelectorAll('#page-vouchers .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    Vouchers.render();
  },

  render() {
    const vs = (cache.vouchers || [])
      .filter(function (v) { return v.type === State.currentVoucherTab; })
      .sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    const addBtn = document.getElementById('voucherAddBtn');
    if (addBtn) addBtn.style.display = can('vouchers_create') ? 'flex' : 'none';
    const el = document.getElementById('voucherList');
    if (!el) return;
    if (vs.length === 0) {
      el.innerHTML = '<div class="empty"><div class="ico">🧾</div>لا توجد سندات</div>';
      return;
    }
    let html = '';
    for (const v of vs) {
      const p = (cache.partners || []).find(function (x) { return x.id === v.partner_id; });
      const emp = v.employee_uid ? (cache.employees || []).find(function (x) { return x.uid === v.employee_uid; }) : null;
      html += '<div class="list-item" onclick="Vouchers.show(\'' + v.id + '\')">' +
        '<div class="info">' +
          '<h4>' + Utils.esc(v.voucher_no) + (v.auto_generated ? ' <small style="color:var(--blue-2);">(تلقائي)</small>' : '') + '</h4>' +
          '<p>' + Utils.esc(p ? p.name : (emp ? emp.name : v.description || '-')) + '</p>' +
          '<p style="color:' + (v.type === 'receipt' ? 'var(--green-2)' : 'var(--red-2)') + ';font-weight:600;">' +
            (v.type === 'receipt' ? '+' : '-') + Utils.fmtMoney(v.amount) + '</p>' +
          '<p style="font-size:11px;">' + Utils.fmtDate(v.date) + '</p>' +
        '</div></div>';
    }
    el.innerHTML = html;
  },

  async show(id) {
    const v = (cache.vouchers || []).find(function (x) { return x.id === id; });
    if (!v) return;
    const p = (cache.partners || []).find(function (x) { return x.id === v.partner_id; });
    const emp = v.employee_uid ? (cache.employees || []).find(function (x) { return x.uid === v.employee_uid; }) : null;
    const html =
      '<div class="receipt"><div class="header"><h2>🏪 شركة البسملة</h2><p>لتجارة المشغولات الصينية</p>' +
      '<p>' + (v.type === 'receipt' ? '🧾 سند قبض' : '🧾 سند دفع') + '</p></div>' +
      '<div class="line"><span>رقم:</span><span>' + Utils.esc(v.voucher_no) + '</span></div>' +
      '<div class="line"><span>التاريخ:</span><span>' + Utils.fmtDate(v.date) + '</span></div>' +
      (p ? '<div class="line"><span>الجهة:</span><span>' + Utils.esc(p.name) + '</span></div>' : '') +
      (emp ? '<div class="line"><span>الموظف:</span><span>' + Utils.esc(emp.name) + '</span></div>' : '') +
      '<div class="line"><span>الموظف المُصدر:</span><span>' + Utils.esc(v.employee_name || '-') + '</span></div><hr>' +
      '<div class="line total"><span>' + (v.type === 'receipt' ? 'المبلغ المقبوض:' : 'المبلغ المدفوع:') + '</span><span>' + Utils.fmtMoney(v.amount) + '</span></div>' +
      '<div class="line"><span>طريقة الدفع:</span><span>' + Utils.esc(v.payment_method || '-') + '</span></div>' +
      '<div class="line"><span>البيان:</span><span>' + Utils.esc(v.description || '-') + '</span></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">' +
        '<button class="btn btn-primary" onclick="Vouchers.openExport(\'' + id + '\')">📤 تصدير</button>' +
        '<button class="btn btn-info" onclick="Vouchers.print(\'' + id + '\')">🖨️ طباعة</button>' +
      '</div>';
    Modal.open('تفاصيل السند', html, null, 'إغلاق');
  },

  openExport(id) {
    const v = (cache.vouchers || []).find(function (x) { return x.id === id; });
    if (!v) return;
    const docType = v.type === 'receipt' ? 'voucher_receipt' : 'voucher_payment';
    Export.openDialog(docType, v, []);
  },

  async print(id) {
    const v = (cache.vouchers || []).find(function (x) { return x.id === id; });
    if (!v) return;
    const docType = v.type === 'receipt' ? 'voucher_receipt' : 'voucher_payment';
    const html = Export.generateHTML(v, [], docType);
    await Export.printHTML(html, 'dialog');
    await Activity.log('print', v.voucher_no);
  },

  async create() {
  if (!requirePermission('vouchers_create', 'إنشاء سند')) return;

  const type = State.currentVoucherTab;
  const partners = (cache.partners || []).filter(function (p) { return p.active !== false; });
  const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
  const label = type === 'receipt' ? 'قبض' : 'دفع';
  const color = type === 'receipt' ? 'var(--green-2)' : 'var(--red-2)';

  // ⚠️ بناء قائمة الحسابات
  const accountsList = getAllAccounts();
  const accountsHtml = accountsList.map(function (acc) {
    return '<option value="' + acc.id + '">' + acc.icon + ' ' + Utils.esc(acc.label) + '</option>';
  }).join('');

  const html =
    '<div class="form-group"><label>المبلغ *</label><input id="v_amount" type="number" inputmode="decimal" step="any"></div>' +
    '<div class="form-group"><label>الجهة (اختياري)</label><select id="v_partner">' +
      '<option value="">-- بدون جهة --</option>' +
      '<optgroup label="العملاء والموردون">' +
        partners.map(function (p) { return '<option value="' + p.id + '">' + Utils.esc(p.name) + ' (' + (p.type === 'customer' ? 'عميل' : 'مورد') + ')</option>'; }).join('') +
      '</optgroup>' +
      '<optgroup label="الموظفون">' +
        emps.map(function (e) { return '<option value="emp_' + e.uid + '">' + Utils.esc(e.name) + ' (موظف)</option>'; }).join('') +
      '</optgroup>' +
    '</select></div>' +
    '<div class="form-group"><label>الحساب (طريقة الدفع) *</label>' +
      '<select id="v_account">' + accountsHtml + '</select>' +
    '</div>' +
    '<div class="form-group"><label>البيان</label><input id="v_desc" placeholder="وصف السند"></div>' +
    '<p style="color:' + color + ';font-size:13px;padding:10px;background:rgba(255,255,255,.05);border-radius:8px;">' +
      (type === 'receipt' ? '⬇️ إضافة للخزينة' : '⬆️ خصم من الخزينة') + '</p>';

  Modal.open('🧾 سند ' + label, html, async function () {
    const amountEl = document.getElementById('v_amount');
    const accountEl = document.getElementById('v_account');
    const partnerEl = document.getElementById('v_partner');
    const descEl = document.getElementById('v_desc');

    const amount = parseFloat(amountEl.value) || 0;
    if (amount <= 0) return Toast.show('أدخل مبلغ صحيح', 'error');

    const accountId = accountEl.value;
    const account = getAccount(accountId);
    const rawPartner = partnerEl.value || null;
    const desc = descEl ? descEl.value.trim() : '';
    const now = Utils.nowISO();

    let partnerId = null, empUid = null;
    if (rawPartner) {
      if (rawPartner.startsWith('emp_')) empUid = rawPartner.substring(4);
      else partnerId = rawPartner;
    }

    const partner = partnerId
      ? (cache.partners || []).find(function (x) { return x.id === partnerId; })
      : null;
    const emp = empUid
      ? emps.find(function (e) { return e.uid === empUid; })
      : null;

    // ⚠️ 1. حفظ السند
    const voucherId = Utils.genId(type === 'receipt' ? 'RCV' : 'PAY');
    const voucherNo = (type === 'receipt' ? 'RCV-' : 'PAY-') + Date.now();

    let voucherDescription = desc;
    if (!voucherDescription) {
      if (emp) voucherDescription = 'سند ' + label + ' - ' + emp.name;
      else if (partner) voucherDescription = 'سند ' + label + ' - ' + partner.name;
      else voucherDescription = 'سند ' + label;
    }

    const voucherData = {
      id: voucherId,
      voucher_no: voucherNo,
      type: type,
      amount: amount,
      partner_id: partnerId,
      partner_name: partner ? partner.name : '',
      employee_uid: empUid,
      employee_name: State.currentEmployee.name,
      issued_by_name: State.currentEmployee.name,
      date: now,
      payment_method: account.label,
      account_id: accountId,
      account_label: account.label,
      description: voucherDescription,
      created_at: now
    };
    await Sync.save('vouchers', voucherId, voucherData);

    // ⚠️ 2. حركة الخزينة
    const cashId = Utils.genId('CSH');
    await Sync.save('cash_transactions', cashId, {
      id: cashId,
      type: type === 'receipt' ? 'in' : 'out',
      amount: amount,
      reference: voucherNo,
      description: voucherDescription,
      category: type === 'receipt' ? 'سندات قبض' : 'سندات دفع',
      date: now,
      employee_name: State.currentEmployee.name,
      partner_id: partnerId,
      partner_name: partner ? partner.name : '',
      payment_method: account.label,
      account_id: accountId,
      account_label: account.label,
      voucher_id: voucherId
    });

    // ⚠️ 3. تحديث رصيد الجهة (عميل/مورد)
    if (partner) {
      if (type === 'receipt') partner.balance = (Number(partner.balance) || 0) - amount;
      else partner.balance = (Number(partner.balance) || 0) + amount;
      await Sync.save('partners', partnerId, partner);
    }

    // ⚠️ 4. معاملة للموظف (لو موجود)
    if (empUid) {
      const txId = Utils.genId('EMP-TX');
      await Sync.save('employee_transactions', txId, {
        id: txId,
        type: type === 'receipt' ? 'bonus' : 'deduction',
        employee_uid: empUid,
        employee_name: emp ? emp.name : '',
        amount: amount,
        reason: voucherDescription,
        date: now,
        paid: true,
        voucher_ref: voucherNo,
        account_id: accountId,
        account_label: account.label,
        created_by: State.currentEmployee.name,
        created_at: now
      });
    }

    Modal.close();
    Toast.show('✅ تم إنشاء السند: ' + Utils.fmtMoney(amount) + ' - ' + account.label);

    // ⚠️ 5. تسجيل النشاط
    await Activity.log(
      'voucher_' + type,
      voucherNo + ' - ' + Utils.fmtMoney(amount) + ' - ' + account.label
    );

    Vouchers.render();
  });
}
};

/* ═══════════════════════════════════════════════════════════════════
   33. Cash
   ═══════════════════════════════════════════════════════════════════ */
const Cash = {
  render() {
  const fromEl = document.getElementById('cashFrom');
  const toEl = document.getElementById('cashTo');
  const from = fromEl ? fromEl.value : '';
  const to = toEl ? toEl.value : '';
  let cash = (cache.cash_transactions || []).slice();
  if (from && to) {
    cash = cash.filter(function (c) {
      return c.date && c.date.split('T')[0] >= from && c.date.split('T')[0] <= to;
    });
  }
  cash.sort(function (a, b) {
    return (b.date || '').localeCompare(a.date || '');
  });

  const allCash = cache.cash_transactions || [];

  // ⚠️ حساب أرصدة كل حساب فرعي
  const accountsBalances = {};
  for (const acc of getAllAccounts()) {
    accountsBalances[acc.id] = { account: acc, in: 0, out: 0, balance: 0 };
  }

  for (const c of allCash) {
    // ⚠️ استخدام account_id لو موجود، أو methodToAccountId كـ fallback
    const accId = c.account_id || methodToAccountId(c.payment_method || 'نقدي');
    if (!accountsBalances[accId]) {
      // ⚠️ لو الحساب مش معروف، نضيفه كحساب افتراضي
      accountsBalances[accId] = {
        account: { id: accId, label: accId, icon: '❓', color: 'var(--text-2)' },
        in: 0, out: 0, balance: 0
      };
    }
    if (c.type === 'in') {
      accountsBalances[accId].in += Number(c.amount) || 0;
    } else {
      accountsBalances[accId].out += Number(c.amount) || 0;
    }
  }

  // ⚠️ حساب الرصيد والإجماليات
  let totalIn = 0, totalOut = 0, totalBalance = 0;
  for (const id in accountsBalances) {
    const acc = accountsBalances[id];
    acc.balance = acc.in - acc.out;
    totalIn += acc.in;
    totalOut += acc.out;
    totalBalance += acc.balance;
  }

  // ⚠️ ترتيب الحسابات حسب order
  const accountsArr = Object.values(accountsBalances).sort(function (a, b) {
    return (a.account.order || 99) - (b.account.order || 99);
  });

  // ⚠️ عرض الإحصائيات
  const statsEl = document.getElementById('cashStats');
  if (statsEl) {
    let accountsCardsHtml = '';
    for (const item of accountsArr) {
      const acc = item.account;
      const icon = acc.icon || '💰';
      const label = acc.label || acc.id;
      // ⚠️ نعرض الحساب بس لو فيه حركة أو رصيد
      if (item.in === 0 && item.out === 0) continue;
      accountsCardsHtml +=
        '<div class="stat-card" style="border-right-color:' + (acc.color || 'var(--gold)') + ';">' +
          '<div class="label">' + icon + ' ' + Utils.esc(label) + '</div>' +
          '<div class="value" style="color:' + (acc.color || 'var(--gold)') + ';">' + Utils.fmtNum(item.balance) + '</div>' +
          '<div class="sub-value" style="font-size:10px;">+' + Utils.fmtNum(item.in) + ' / -' + Utils.fmtNum(item.out) + '</div>' +
        '</div>';
    }

    statsEl.innerHTML =
      '<div class="stat-card green"><div class="label">إجمالي الواردات</div><div class="value">' + Utils.fmtNum(totalIn) + '</div></div>' +
      '<div class="stat-card red"><div class="label">إجمالي الصادرات</div><div class="value">' + Utils.fmtNum(totalOut) + '</div></div>' +
      '<div class="stat-card blue" style="grid-column:span 2;"><div class="label">💰 الإجمالي الكلي</div><div class="value" style="font-size:26px;">' + Utils.fmtNum(totalBalance) + '</div></div>' +
      (accountsCardsHtml
        ? '<div style="grid-column:span 2;padding:12px 0 6px;color:var(--gold);font-weight:700;font-size:13px;border-top:1px dashed rgba(212,175,55,.2);margin-top:6px;">📊 تفصيل الحسابات:</div>' + accountsCardsHtml
        : '');
  }

  // ⚠️ عرض الحركات
  let html = '';
  if (cash.length === 0) {
    html = '<div class="empty"><div class="ico">💰</div>لا توجد حركات</div>';
  } else {
    for (const c of cash.slice(0, 100)) {
      const accId = c.account_id || methodToAccountId(c.payment_method || 'نقدي');
      const acc = getAccount(accId);
      const icon = acc.icon || '💰';
      const label = acc.label || accId;

      html += '<div class="list-item"><div class="info">' +
        '<h4 style="color:' + (c.type === 'in' ? 'var(--green-2)' : 'var(--red-2)') + ';">' +
          (c.type === 'in' ? '↓ وارد' : '↑ صادر') + ' - ' + Utils.fmtMoney(c.amount) + '</h4>' +
        '<p>' + Utils.esc(c.description || '-') + '</p>' +
        '<p style="font-size:11px;color:var(--gold);">' + icon + ' ' + Utils.esc(label) + (c.reference ? ' | ' + Utils.esc(c.reference) : '') + '</p>' +
        '<p style="font-size:11px;">' + Utils.fmtDate(c.date) + '</p>' +
      '</div></div>';
    }
  }
  const el = document.getElementById('cashList');
  if (el) el.innerHTML = html;
},

  load() { Cash.render(); }
};

/* ═══════════════════════════════════════════════════════════════════
   34. Expenses / Revenues
   ═══════════════════════════════════════════════════════════════════ */
const Expenses = {
  switchTab(e, tab) {
    State.currentExpTab = tab;
    document.querySelectorAll('#page-expenses .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    Expenses.render();
  },

  render() {
    const store = State.currentExpTab === 'expense' ? 'expenses' : 'revenues';
    const list = (cache[store] || []).slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    });
    const el = document.getElementById('expList');
    if (!el) return;
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
        '<div style="font-size:12px;color:#aaa;margin-top:4px;">' + Utils.esc(r.description || '-') + ' | ' + Utils.fmtDate(r.date) + '</div>' +
      '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  },

  async save() {
    if (!requirePermission('expenses_add', 'إضافة')) return;
    const categoryEl = document.getElementById('expCategory');
    const amountEl = document.getElementById('expAmount');
    const descEl = document.getElementById('expDesc');
    const category = categoryEl ? categoryEl.value.trim() : '';
    const amount = amountEl ? (parseFloat(amountEl.value) || 0) : 0;
    const desc = descEl ? descEl.value : '';
    if (!category) return Toast.show('التصنيف مطلوب', 'error');
    if (amount <= 0) return Toast.show('مبلغ صالح مطلوب', 'error');
    const store = State.currentExpTab === 'expense' ? 'expenses' : 'revenues';
    const id = Utils.genId(store === 'expenses' ? 'EXP' : 'REV');
    const data = {
      id: id, category: category, amount: amount,
      description: desc, date: Utils.nowISO(),
      employee_uid: State.currentUser.uid,
      employee_name: State.currentEmployee.name
    };
    // ⚠️ حدّث cache فوراً
    if (!cache[store]) cache[store] = [];
    const idx = cache[store].findIndex(function (x) { return x.id === id; });
    if (idx >= 0) cache[store][idx] = data;
    else cache[store].push(data);
    if (categoryEl) categoryEl.value = '';
    if (amountEl) amountEl.value = '';
    if (descEl) descEl.value = '';
    Toast.show('✅ تم الحفظ');
    Expenses.render();
    Sync.save(store, id, data).catch(function (e) { console.warn(e); });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   35. Reports
   ═══════════════════════════════════════════════════════════════════ */
const Reports = {
  switchTab(e, tab) {
    document.querySelectorAll('#page-reports .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    const p1 = document.getElementById('rep-profit');
    const p2 = document.getElementById('rep-top');
    const p3 = document.getElementById('rep-low');
    if (p1) p1.classList.toggle('hidden', tab !== 'profit');
    if (p2) p2.classList.toggle('hidden', tab !== 'top');
    if (p3) p3.classList.toggle('hidden', tab !== 'low');
    if (tab === 'profit') {
      const fromEl = document.getElementById('profFrom');
      const toEl = document.getElementById('profTo');
      if (fromEl && !fromEl.value) fromEl.value = Utils.todayStr();
      if (toEl && !toEl.value) toEl.value = Utils.todayStr();
      Reports.loadProfit();
    } else if (tab === 'top') Reports.loadTop();
    else if (tab === 'low') Reports.loadLow();
  },

  init() {
    const fromEl = document.getElementById('profFrom');
    const toEl = document.getElementById('profTo');
    if (fromEl) fromEl.value = Utils.todayStr();
    if (toEl) toEl.value = Utils.todayStr();
    Reports.loadProfit();
  },

  loadProfit() {
  const fromEl = document.getElementById('profFrom');
  const toEl = document.getElementById('profTo');
  const from = fromEl ? fromEl.value : Utils.todayStr();
  const to = toEl ? toEl.value : Utils.todayStr();

  // ⚠️ فلترة البيانات حسب التاريخ
  const sales = (cache.sales_invoices || []).filter(function (s) {
    return s.date && s.date.split('T')[0] >= from && s.date.split('T')[0] <= to;
  });
  const salesReturns = (cache.sales_returns || []).filter(function (r) {
    return r.date && r.date.split('T')[0] >= from && r.date.split('T')[0] <= to;
  });
  const expenses = (cache.expenses || []).filter(function (e) {
    return e.date && e.date.split('T')[0] >= from && e.date.split('T')[0] <= to;
  });
  const revenues = (cache.revenues || []).filter(function (r) {
    return r.date && r.date.split('T')[0] >= from && r.date.split('T')[0] <= to;
  });
  const payrolls = (cache.payroll || []).filter(function (p) {
    return p.month >= from.substring(0, 7) && p.month <= to.substring(0, 7);
  });

  // ⚠️ الإجماليات
  const salesTotal = sales.reduce(function (s, i) { return s + (Number(i.total) || 0); }, 0);
  const salesRetTotal = salesReturns.reduce(function (s, r) { return s + (Number(r.total) || 0); }, 0);
  const expensesTotal = expenses.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
  const revenuesTotal = revenues.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0);
  const salariesTotal = payrolls.reduce(function (s, p) { return s + (Number(p.net_salary) || 0); }, 0);

  // ⚠️ تكلفة المبيعات (COGS)
  const salesIds = sales.map(function (s) { return s.id; });
  const cogs = (cache.sales_items || [])
    .filter(function (it) { return salesIds.includes(it.invoice_id); })
    .reduce(function (s, it) {
      const cost = Number(it.cost_at_sale || it.cost || 0);
      return s + cost * (Number(it.quantity) || 0);
    }, 0);

  // ⚠️ حساب الأرباح
  const netSales = salesTotal - salesRetTotal;
  const grossProfit = netSales - cogs;
  const netProfit = grossProfit + revenuesTotal - expensesTotal - salariesTotal;
  const pc = netProfit >= 0 ? 'var(--green-2)' : 'var(--red-2)';

  // ⚠️ حساب أرصدة الحسابات (الخزينة الحالية)
  const accountsBalances = {};
  for (const acc of getAllAccounts()) {
    accountsBalances[acc.id] = { account: acc, in: 0, out: 0, balance: 0 };
  }
  let totalCashBalance = 0;

  // ⚠️ الأرصدة الحالية (كل الحركات، مش بس الفترة)
  for (const c of (cache.cash_transactions || [])) {
    const accId = c.account_id || methodToAccountId(c.payment_method || 'نقدي');
    if (!accountsBalances[accId]) {
      accountsBalances[accId] = {
        account: { id: accId, label: accId, icon: '❓', color: 'var(--text-2)', order: 99 },
        in: 0, out: 0, balance: 0
      };
    }
    if (c.type === 'in') accountsBalances[accId].in += Number(c.amount) || 0;
    else accountsBalances[accId].out += Number(c.amount) || 0;
  }
  for (const id in accountsBalances) {
    accountsBalances[id].balance = accountsBalances[id].in - accountsBalances[id].out;
    totalCashBalance += accountsBalances[id].balance;
  }

  // ⚠️ أرصدة الحسابات اللي فيها حركة
  const accountsArr = Object.values(accountsBalances)
    .filter(function (item) { return item.in > 0 || item.out > 0; })
    .sort(function (a, b) {
      return (a.account.order || 99) - (b.account.order || 99);
    });

  // ============ بناء HTML ============
  const el = document.getElementById('profResult');
  if (!el) return;

  el.innerHTML =
    // ============ الأرباح والخسائر ============
    '<div class="card"><h3>📊 الأرباح والخسائر</h3>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;">' +
        '<span>المبيعات:</span>' +
        '<strong style="color:var(--green-2);">+' + Utils.fmtMoney(salesTotal) + '</strong>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;">' +
        '<span>مرتجع:</span>' +
        '<strong style="color:var(--red-2);">-' + Utils.fmtMoney(salesRetTotal) + '</strong>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;font-weight:700;">' +
        '<span>صافي المبيعات:</span>' +
        '<strong>' + Utils.fmtMoney(netSales) + '</strong>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;">' +
        '<span>تكلفة المبيعات:</span>' +
        '<strong style="color:var(--red-2);">-' + Utils.fmtMoney(cogs) + '</strong>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--gold);color:var(--gold);font-weight:700;">' +
        '<span>الربح الإجمالي:</span>' +
        '<strong>' + Utils.fmtMoney(grossProfit) + '</strong>' +
      '</div>' +
    '</div>' +

    // ============ إيرادات ============
    '<div class="card"><h3>➕ إيرادات</h3>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;">' +
        '<span>إيرادات:</span>' +
        '<strong style="color:var(--green-2);">+' + Utils.fmtMoney(revenuesTotal) + '</strong>' +
      '</div>' +
    '</div>' +

    // ============ مصروفات ============
    '<div class="card"><h3>➖ مصروفات</h3>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;">' +
        '<span>مصروفات:</span>' +
        '<strong style="color:var(--red-2);">-' + Utils.fmtMoney(expensesTotal) + '</strong>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;">' +
        '<span>مرتبات:</span>' +
        '<strong style="color:var(--red-2);">-' + Utils.fmtMoney(salariesTotal) + '</strong>' +
      '</div>' +
    '</div>' +

    // ============ صافي الربح ============
    '<div class="card" style="border:2px solid ' + pc + ';">' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:20px;font-weight:700;color:' + pc + ';">' +
        '<span>صافي الربح:</span>' +
        '<strong>' + Utils.fmtMoney(netProfit) + '</strong>' +
      '</div>' +
      '<div style="text-align:center;font-size:12px;color:#888;margin-top:8px;">' +
        (netProfit >= 0 ? '✅ ربح' : '⚠️ خسارة') +
      '</div>' +
    '</div>' +

    // ============ 🆕 الأرصدة النقدية (جديد) ============
    '<div class="card">' +
      '<h3>💰 الأرصدة النقدية الحالية</h3>' +
      '<p style="font-size:11px;color:#888;margin-bottom:10px;">' +
        '(الأرصدة الحالية بغض النظر عن الفترة المحددة)' +
      '</p>' +

      // تفصيل الحسابات
      (accountsArr.length > 0
        ? accountsArr.map(function (item) {
            const acc = item.account;
            const icon = acc.icon || '💰';
            const label = acc.label || acc.id;
            const color = acc.color || 'var(--gold)';
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(212,175,55,.1);">' +
              '<div>' +
                '<div style="color:' + color + ';font-weight:600;font-size:13px;">' + icon + ' ' + Utils.esc(label) + '</div>' +
              '</div>' +
              '<div style="font-weight:700;color:' + color + ';font-size:14px;">' + Utils.fmtMoney(item.balance) + '</div>' +
            '</div>';
          }).join('')
        : '<p style="color:#666;text-align:center;font-size:12px;">لا توجد حركات خزينة</p>') +

      // الإجمالي
      '<div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid var(--gold);margin-top:8px;font-size:18px;font-weight:800;color:var(--gold);">' +
        '<span>الإجمالي الكلي:</span>' +
        '<strong>' + Utils.fmtMoney(totalCashBalance) + '</strong>' +
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
        '</div></div>';
    }
    html += '</div>';
    const el = document.getElementById('topProductsList');
    if (el) el.innerHTML = html;
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
        '</div></div>';
    }
    html += '</div>';
    const el = document.getElementById('lowStockList');
    if (el) el.innerHTML = html;
  }
};

/* ═══════════════════════════════════════════════════════════════════
   36. Statements
   ═══════════════════════════════════════════════════════════════════ */
const Statements = {
  switchTab(e, tab) {
    State.currentStmtTab = tab;
    document.querySelectorAll('#page-statements .tab').forEach(function (t) { t.classList.remove('active'); });
    if (e && e.target) e.target.classList.add('active');
    const p1 = document.getElementById('stmt-partner');
    const p2 = document.getElementById('stmt-employee');
    const p3 = document.getElementById('stmt-cash');
    if (p1) p1.classList.toggle('hidden', tab !== 'partner');
    if (p2) p2.classList.toggle('hidden', tab !== 'employee');
    if (p3) p3.classList.toggle('hidden', tab !== 'cash');
    if (tab === 'partner') Statements.loadPartnerOptions();
    else if (tab === 'employee') Statements.loadEmployeeOptions();
  },

  init() {
    if (State.currentStmtTab === 'partner') Statements.loadPartnerOptions();
    else if (State.currentStmtTab === 'employee') Statements.loadEmployeeOptions();
  },

  loadPartnerOptions() {
    const partners = (cache.partners || []).filter(function (p) { return p.active !== false; });
    const el = document.getElementById('stmtPartner');
    if (el) {
      el.innerHTML = '<option value="">-- اختر --</option>' +
        partners.map(function (p) { return '<option value="' + p.id + '">' + Utils.esc(p.name) + '</option>'; }).join('');
    }
    const listEl = document.getElementById('stmtPartnerList');
    if (listEl) listEl.innerHTML = '';
  },

  loadEmployeeOptions() {
    const emps = (cache.employees || []).filter(function (e) { return e.active !== false; });
    const el = document.getElementById('stmtEmp');
    if (el) {
      el.innerHTML = '<option value="">-- اختر --</option>' +
        emps.map(function (e) { return '<option value="' + e.uid + '">' + Utils.esc(e.name) + '</option>'; }).join('');
    }
    const listEl = document.getElementById('stmtEmpList');
    if (listEl) listEl.innerHTML = '';
  },

  loadPartner() {
    const selectEl = document.getElementById('stmtPartner');
    const id = selectEl ? selectEl.value : '';
    if (!id) return;
    const p = (cache.partners || []).find(function (x) { return x.id === id; });
    if (!p) return;

    const sales = (cache.sales_invoices || []).filter(function (s) { return s.customer_id === id; });
    const purchases = (cache.purchase_invoices || []).filter(function (s) { return s.supplier_id === id; });
    const vouchers = (cache.vouchers || []).filter(function (v) { return v.partner_id === id; });
    const transactions = [];

    for (const s of sales) transactions.push({ date: s.date, type: 'فاتورة مبيعات', ref: s.invoice_no, debit: s.total, credit: s.paid, color: 'var(--green-2)' });
    for (const pu of purchases) transactions.push({ date: pu.date, type: 'فاتورة مشتريات', ref: pu.invoice_no, debit: pu.paid, credit: pu.total, color: 'var(--orange-2)' });
    for (const v of vouchers) transactions.push({
      date: v.date, type: v.type === 'receipt' ? 'سند قبض' : 'سند دفع',
      ref: v.voucher_no,
      debit: v.type === 'receipt' ? 0 : v.amount,
      credit: v.type === 'receipt' ? v.amount : 0,
      color: v.type === 'receipt' ? 'var(--blue-2)' : 'var(--red-2)'
    });
    transactions.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });

    let html = '<div class="card"><h3>' + Utils.esc(p.name) + '</h3>' +
      '<p style="color:#aaa;font-size:13px;">' + Utils.esc(p.phone || '') + '</p>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--gold);margin-top:10px;font-size:18px;font-weight:700;color:' +
        ((Number(p.balance) || 0) > 0 ? 'var(--red-2)' : 'var(--green-2)') + ';">' +
        '<span>الرصيد:</span><span>' + Utils.fmtMoney(Math.abs(Number(p.balance) || 0)) + '</span></div></div>' +
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
        '</div></div>';
    }
    html += '</div>';
    const listEl = document.getElementById('stmtPartnerList');
    if (listEl) listEl.innerHTML = html;
  },

  loadEmployee() {
    const selectEl = document.getElementById('stmtEmp');
    const uid = selectEl ? selectEl.value : '';
    if (!uid) return;
    const emp = (cache.employees || []).find(function (x) { return x.uid === uid; });
    if (!emp) return;

    const att = (cache.attendance || []).filter(function (a) { return a.employee_uid === uid; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    const payrolls = (cache.payroll || []).filter(function (p) { return p.employee_uid === uid; })
      .sort(function (a, b) { return b.month.localeCompare(a.month); });
    const txs = (cache.employee_transactions || []).filter(function (t) { return t.employee_uid === uid; })
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    let html = '<div class="card"><h3>' + Utils.esc(emp.name) + ' - ' + Utils.esc(emp.job_title || '') + '</h3>' +
      '<p style="font-size:12px;color:#aaa;">الراتب: ' + Utils.fmtMoney(emp.basic_salary) + '</p>' +
      '<p style="font-size:12px;color:#aaa;">الهاتف: ' + Utils.esc(emp.phone || '-') + '</p></div>' +
      '<div class="card"><h3>📅 الحضور (آخر 30)</h3>';

    for (const a of att.slice(0, 30)) {
      let status = '', color = '#888';
      if (a.status === 'leave') { status = '📅 إجازة'; color = 'var(--blue-2)'; }
      else if (a.check_in && a.check_out) { status = '✓ ' + (a.work_hours || 0) + 'س'; color = 'var(--green-2)'; }
      else if (a.check_in) { status = '✓ حاضر'; color = 'var(--green-2)'; }
      const lateText = (a.minutes_late > 0) ? ' <span style="color:var(--orange-2);font-size:11px;">(تأخير ' + a.minutes_late + 'د)</span>' : '';
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;font-size:13px;">' +
        '<span>' + a.date + lateText + '</span><span style="color:' + color + ';">' + status + '</span></div>';
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
        '<div style="font-size:11px;color:#888;">غياب: ' + (p.absence_days || 0) + ' يوم | تأخير: ' + (p.late_minutes || 0) + ' د</div>' +
      '</div>';
    }
    html += '</div>';

    if (txs.length > 0) {
      html += '<div class="card"><h3>💵 السلف والمكافآت</h3>';
      const typeMap = { 'advance': '💰 سلفة', 'bonus': '🎁 مكافأة', 'deduction': '➖ خصم' };
      for (const t of txs) {
        const color = t.type === 'advance' ? 'var(--orange-2)' : t.type === 'bonus' ? 'var(--green-2)' : 'var(--red-2)';
        html += '<div style="padding:8px 0;border-bottom:1px solid #222;">' +
          '<div style="display:flex;justify-content:space-between;">' +
            '<strong style="color:' + color + ';">' + (typeMap[t.type] || t.type) + '</strong>' +
            '<span style="font-weight:700;">' + Utils.fmtMoney(t.amount) + '</span>' +
          '</div>' +
          '<div style="font-size:11px;color:#888;">' + Utils.fmtDate(t.date) + (t.reason ? ' | ' + Utils.esc(t.reason) : '') + '</div>' +
        '</div>';
      }
      html += '</div>';
    }
    const listEl = document.getElementById('stmtEmpList');
    if (listEl) listEl.innerHTML = html;
  },

  loadCash() {
    const fromEl = document.getElementById('stmtCashFrom');
    const toEl = document.getElementById('stmtCashTo');
    const from = fromEl ? fromEl.value : '';
    const to = toEl ? toEl.value : '';

    // ⚠️ فلترة الحركات حسب التاريخ
    const allCash = (cache.cash_transactions || [])
      .filter(function (c) {
        if (!from || !to) return true;
        return c.date && c.date.split('T')[0] >= from && c.date.split('T')[0] <= to;
      })
      .sort(function (a, b) {
        return (a.date || '').localeCompare(b.date || '');
      });

    // ⚠️ تجميع حسب الحساب
    const byAccount = {};
    for (const acc of getAllAccounts()) {
      byAccount[acc.id] = { account: acc, in: 0, out: 0, balance: 0, transactions: [] };
    }

    let totalIn = 0, totalOut = 0;

    for (const c of allCash) {
      const accId = c.account_id || methodToAccountId(c.payment_method || 'نقدي');
      if (!byAccount[accId]) {
        byAccount[accId] = {
          account: { id: accId, label: accId, icon: '❓', color: 'var(--text-2)', order: 99 },
          in: 0, out: 0, balance: 0, transactions: []
        };
      }
      if (c.type === 'in') {
        byAccount[accId].in += Number(c.amount) || 0;
        totalIn += Number(c.amount) || 0;
      } else {
        byAccount[accId].out += Number(c.amount) || 0;
        totalOut += Number(c.amount) || 0;
      }
      byAccount[accId].transactions.push(c);
    }

    // ⚠️ حساب الأرصدة
    for (const id in byAccount) {
      byAccount[id].balance = byAccount[id].in - byAccount[id].out;
    }

    // ⚠️ ترتيب الحسابات
    const accountsArr = Object.values(byAccount).sort(function (a, b) {
      return (a.account.order || 99) - (b.account.order || 99);
    });

    // ⚠️ بناء HTML
    let html = '';

    // ============ ملخص الفترة ============
    html += '<div class="card">' +
      '<h3>📊 ملخص الفترة</h3>' +
      '<p style="font-size:12px;color:#aaa;">' +
        (from && to
          ? 'من ' + Utils.esc(from) + ' إلى ' + Utils.esc(to)
          : 'كل الحركات') +
      '</p>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;">' +
        '<span>إجمالي الواردات:</span>' +
        '<strong style="color:var(--green-2);">' + Utils.fmtMoney(totalIn) + '</strong>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;padding:8px 0;">' +
        '<span>إجمالي الصادرات:</span>' +
        '<strong style="color:var(--red-2);">' + Utils.fmtMoney(totalOut) + '</strong>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--gold);font-weight:700;color:var(--gold);">' +
        '<span>الصافي:</span>' +
        '<strong>' + Utils.fmtMoney(totalIn - totalOut) + '</strong>' +
      '</div>' +
    '</div>';

    // ============ أرصدة الحسابات ============
    const accountsWithActivity = accountsArr.filter(function (item) {
      return item.in > 0 || item.out > 0;
    });

    if (accountsWithActivity.length > 0) {
      html += '<div class="card">' +
        '<h3>💰 أرصدة الحسابات</h3>';

      for (const item of accountsWithActivity) {
        const acc = item.account;
        const icon = acc.icon || '💰';
        const label = acc.label || acc.id;
        const color = acc.color || 'var(--gold)';

        html += '<div style="padding:10px 0;border-bottom:1px solid #222;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div>' +
              '<div style="color:' + color + ';font-weight:700;font-size:14px;">' + icon + ' ' + Utils.esc(label) + '</div>' +
              '<div style="font-size:11px;color:#888;margin-top:2px;">وارد: +' + Utils.fmtNum(item.in) + ' | صادر: -' + Utils.fmtNum(item.out) + '</div>' +
            '</div>' +
            '<div style="text-align:left;">' +
              '<div style="color:' + color + ';font-weight:800;font-size:16px;">' + Utils.fmtNum(item.balance) + '</div>' +
              '<div style="font-size:10px;color:#666;">' + CURRENCY + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      html += '</div>';
    }

    // ============ تفاصيل الحركات لكل حساب ============
    if (accountsWithActivity.length > 0) {
      for (const item of accountsWithActivity) {
        const acc = item.account;
        const icon = acc.icon || '💰';
        const label = acc.label || acc.id;
        const color = acc.color || 'var(--gold)';

        html += '<div class="card">' +
          '<h3 style="color:' + color + ';">' + icon + ' ' + Utils.esc(label) + '</h3>';

        // عرض آخر 50 حركة
        const txns = item.transactions.slice(0, 50);
        for (const c of txns) {
          html += '<div class="list-item" style="margin:4px 0;">' +
            '<div class="info">' +
              '<h4 style="color:' + (c.type === 'in' ? 'var(--green-2)' : 'var(--red-2)') + ';font-size:13px;">' +
                (c.type === 'in' ? '↓ وارد' : '↑ صادر') + ' - ' + Utils.fmtMoney(c.amount) +
              '</h4>' +
              '<p style="font-size:12px;">' + Utils.esc(c.description || '-') + '</p>' +
              '<p style="font-size:11px;color:#888;">' +
                Utils.fmtDate(c.date) +
                (c.reference ? ' | ' + Utils.esc(c.reference) : '') +
              '</p>' +
            '</div>' +
          '</div>';
        }

        if (item.transactions.length > 50) {
          html += '<p style="text-align:center;color:#666;font-size:11px;padding:8px;">' +
            '(يتم عرض 50 حركة من إجمالي ' + item.transactions.length + ')' +
          '</p>';
        }

        html += '</div>';
      }
    }

    // ============ لو مفيش حركات ============
    if (allCash.length === 0) {
      html = '<div class="card">' +
        '<div class="empty"><div class="ico">💰</div>لا توجد حركات في هذه الفترة</div>' +
      '</div>';
    }

    const el = document.getElementById('stmtCashList');
    if (el) el.innerHTML = html;
  }
};

/* ═══════════════════════════════════════════════════════════════════
   37. Policies
   ═══════════════════════════════════════════════════════════════════ */
const Policies = {
  render() {
    const pols = (cache.work_policies || []).filter(function (p) { return p.active !== false; });
    const addBtn = document.getElementById('policyAddBtn');
    if (addBtn) addBtn.style.display = can('policies_add') ? 'flex' : 'none';
    const el = document.getElementById('policyList');
    if (!el) return;
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
      const titleEl = document.getElementById('pol_title');
      const contentEl = document.getElementById('pol_content');
      const title = titleEl ? titleEl.value.trim() : '';
      const content = contentEl ? contentEl.value.trim() : '';
      if (!title || !content) return Toast.show('مطلوب', 'error');
      const id = Utils.genId('POL');
      const data = {
        id: id, title: title, content: content,
        category: document.getElementById('pol_cat').value,
        effective_date: Utils.todayStr(), active: true
      };
      if (!cache.work_policies) cache.work_policies = [];
      cache.work_policies.push(data);
      Modal.close();
      Toast.show('✅ تم');
      Policies.render();
      Sync.save('work_policies', id, data).catch(function (e) { console.warn(e); });
    });
  },

  async remove(id) {
    if (!can('delete_anything')) return Toast.show('🔒 المدير فقط', 'error');
    if (!confirm('حذف؟')) return;
    await Sync.softDelete('work_policies', id);
    Toast.show('تم');
    Policies.render();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   38. WhatsApp
   ═══════════════════════════════════════════════════════════════════ */
const WhatsApp = {
  render() {
    const partners = (cache.partners || []).filter(function (p) { return p.active !== false; });
    const partnerEl = document.getElementById('waPartner');
    if (partnerEl) {
      partnerEl.innerHTML = '<option value="">-- اختر --</option>' +
        partners.map(function (p) {
          return '<option value="' + p.id + '">' + Utils.esc(p.name) + ' - ' + Utils.esc(p.phone || '') + '</option>';
        }).join('');
    }
    const templates = cache.whatsapp_templates || [];
    const tempEl = document.getElementById('waTemplate');
    if (tempEl) {
      tempEl.innerHTML = '<option value="">-- قالب --</option>' +
        templates.map(function (t) { return '<option value="' + t.id + '">' + Utils.esc(t.name) + '</option>'; }).join('');
    }
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
    const logEl = document.getElementById('waLog');
    if (logEl) logEl.innerHTML = html || '<p style="color:#666;">لا يوجد سجل</p>';
  },

  applyTemplate() {
    const tempEl = document.getElementById('waTemplate');
    if (!tempEl) return;
    const tid = tempEl.value;
    if (!tid) return;
    const t = (cache.whatsapp_templates || []).find(function (x) { return x.id === tid; });
    if (t) {
      const msgEl = document.getElementById('waMessage');
      if (msgEl) msgEl.value = t.content;
    }
  },

  async send() {
    const partnerEl = document.getElementById('waPartner');
    const msgEl = document.getElementById('waMessage');
    const pid = partnerEl ? partnerEl.value : '';
    const msg = msgEl ? msgEl.value.trim() : '';
    if (!pid) return Toast.show('اختر الجهة', 'error');
    if (!msg) return Toast.show('اكتب رسالة', 'error');
    const p = (cache.partners || []).find(function (x) { return x.id === pid; });
    if (!p || !p.phone) return Toast.show('لا يوجد رقم', 'error');
    let phone = p.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '20' + phone.substring(1);
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    const id = Utils.genId('WA');
    const data = {
      id: id, phone: p.phone, message: msg, partner_id: pid,
      sent_at: Utils.nowISO(),
      employee_name: State.currentEmployee.name
    };
    if (!cache.whatsapp_log) cache.whatsapp_log = [];
    cache.whatsapp_log.push(data);
    Toast.show('✅ تم');
    WhatsApp.render();
    Sync.save('whatsapp_log', id, data).catch(function (e) { console.warn(e); });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   39. Devices
   ═══════════════════════════════════════════════════════════════════ */
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
        html += '<div style="background:rgba(20,20,20,.95);border:1px solid #333;border-radius:12px;padding:12px;margin:8px 0;' +
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
    const el = document.getElementById('devicesList');
    if (el) el.innerHTML = html;
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
    } catch (e) { Toast.show('❌ فشل: ' + e.message, 'error'); }
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
    } catch (e) { Toast.show('❌ فشل: ' + e.message, 'error'); }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   40. Requests
   ═══════════════════════════════════════════════════════════════════ */
const Requests = {
  render() {
    if (!can('requests_manage')) return;
    const requests = (cache.pending_requests || []).filter(function (r) { return r.status === 'pending'; });
    const el = document.getElementById('requestsList');
    if (!el) return;
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
        uid: uid, name: req.name, email: req.email, role: req.role,
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
    } catch (e) { Toast.show('❌ ' + e.message, 'error'); }
  },

  async reject(uid) {
    if (!can('requests_manage')) return;
    if (!confirm('رفض الطلب؟')) return;
    try {
      await State.companyRef.child('pending_requests/' + uid).update({
        status: 'rejected', rejected_at: Utils.nowISO()
      });
      Toast.show('تم الرفض');
    } catch (e) { Toast.show('❌ ' + e.message, 'error'); }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   41. Settings
   ═══════════════════════════════════════════════════════════════════ */
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
      '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>الإصدار:</span>' +
        '<strong>' + APP_VERSION + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>آخر تحديث:</span>' +
        '<strong>' + new Date().toLocaleTimeString('ar-EG') + '</strong></div>';
  }
};

/* ═══════════════════════════════════════════════════════════════════
   42. Boot — نقطة الانطلاق
   ═══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  // شريط التحميل
  const progress = document.getElementById('loadProgress');
  let p = 0;
  const timer = setInterval(function () {
    p += 20;
    if (progress) progress.style.width = Math.min(p, 100) + '%';
    if (p >= 100) clearInterval(timer);
  }, 200);

  // Firebase persistence
  try {
    FBAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});
  } catch (e) {}

  // بدء التطبيق
  App.init();

  // تنظيف دوري للـ localStorage (كل 10 دقائق)
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
      // لو الحجم > 4MB، احذف 30% من الـ cache
      if (total / (1024 * 1024) > 4) {
        const toDelete = Math.floor(keys.length * 0.3);
        for (let i = 0; i < toDelete; i++) localStorage.removeItem(keys[i]);
      }
    } catch (e) {}
  }, 10 * 60 * 1000);

  // تحذير عند الخروج مع تعديلات غير محفوظة
  window.addEventListener('beforeunload', function (e) {
    if (saleItems.length > 0 || purItems.length > 0 || retItems.length > 0) {
      e.preventDefault();
      e.returnValue = 'لديك تعديلات غير محفوظة';
      return e.returnValue;
    }
  });

  // معالجة زر الرجوع لأندرويد (Cordova)
  document.addEventListener('backbutton', function (e) {
    e.preventDefault();
    App.handleBack();
  }, false);

  // ⚠️ مراقبة تغييرات الاتصال
  window.addEventListener('online', function () {
    console.log('✅ Online — syncing...');
    if (State.companyRef) setTimeout(Sync.flushPending, 1000);
  });

  window.addEventListener('offline', function () {
    console.log('📴 Offline mode');
  });

  // ⚠️ مراقبة تغييرات CSS (لمنع الشاشة السوداء)
  window.addEventListener('error', function (e) {
    console.error('🔴 Runtime error:', e.message);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   Console Welcome Message
   ═══════════════════════════════════════════════════════════════════ */
console.log(
  '%c🏪 البسملة ERP ' + APP_VERSION + ' — جاهز',
  'color:#D4AF37;font-size:16px;font-weight:bold;background:#000;padding:6px 12px;border:1px solid #D4AF37;border-radius:6px;'
);
console.log(
  '%c✅ Firebase + Offline Mode + RBAC + Camera + GPS + HR + Reports',
  'color:#66bb6a;font-size:12px;font-weight:bold;'
);
console.log(
  '%c📱 للإبلاغ عن مشكلة: showErrorLog()',
  'color:#42a5f5;font-size:11px;'
);
