function doGet(e) {
  const asset = e && e.parameter ? String(e.parameter.asset || '') : '';
  if (asset === 'manifest') return plannerManifestOutput_();
  if (asset === 'service-worker') return plannerServiceWorkerOutput_();

  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('LeafFilter Norfolk Home Protection Planner')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = body.action || (e && e.parameter ? e.parameter.action : '');

    if (action === 'savePlannerDeal') {
      return jsonOutput_(savePlannerDeal(body.dealData || body));
    }

    return jsonOutput_({ success: false, message: 'Unknown planner API action.' });
  } catch (error) {
    Logger.log('Planner API error: ' + error.toString());
    return jsonOutput_({ success: false, message: error && error.message ? error.message : String(error) });
  }
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function plannerManifestOutput_() {
  const iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="108" fill="#082A24"/><path d="M101 305c68-8 117-42 151-104 35 65 87 98 159 104-16 70-71 122-159 153-88-31-136-83-151-153z" fill="#5FBA42"/><path d="M164 250h176v44H164z" fill="#fff"/><path d="M219 171h74v184h-74z" fill="#fff"/></svg>';
  const manifest = {
    name: 'LeafFilter Norfolk Price Proposal Planner',
    short_name: 'LF Planner',
    description: 'Offline-capable LeafFilter field pricing and proposal planner.',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    background_color: '#F2F6F4',
    theme_color: '#082A24',
    icons: [
      {
        src: 'data:image/svg+xml;base64,' + Utilities.base64Encode(iconSvg),
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  };
  return ContentService
    .createTextOutput(JSON.stringify(manifest))
    .setMimeType(ContentService.MimeType.JSON);
}

function plannerServiceWorkerOutput_() {
  const source = `
const CACHE_NAME = 'lf-norfolk-planner-field-v59';
const CORE_ASSETS = ['./'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME && key.startsWith('lf-norfolk-planner')).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'CACHE_URLS') return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urls).catch(() => null)));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./')))
    );
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const refresh = fetch(request).then(response => {
        caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || refresh;
    })
  );
});
`;
  return ContentService
    .createTextOutput(source)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * If this script is standalone, set Script Property PLANNER_SHEET_ID to your Google Sheet ID.
 * If this script is container-bound to a Google Sheet, getActiveSpreadsheet() will be used.
 */
function getPlannerSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('PLANNER_SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  throw new Error('No spreadsheet found. Bind this script to a Google Sheet or set Script Property PLANNER_SHEET_ID.');
}

function plannerHeaders_() {
  return [
    'Saved Timestamp',
    'Deal ID',
    'Updated At',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Address / City',
    'Representative',
    'Branch',
    'Appointment Date',
    'Selected Option',
    'Option Label',
    'Option Name',
    'Option Badge',
    'Payment View',
    'Selected Payment Value',
    'Retail Price',
    'One-Year Price',
    'Quick Start Savings',
    'Quick Start Label',
    'Coupon Savings',
    'Coupon Label',
    'Preferred Payment Savings',
    'Flexible Installation Savings',
    'Total Today Savings',
    'Your Price Today',
    'Card Price',
    'Check Price',
    'Easy Pay Monthly',
    'Full Deal JSON'
  ];
}

function getOrCreatePlannerSheet_() {
  const ss = getPlannerSpreadsheet_();
  const name = 'Planner Deals';
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  const headers = plannerHeaders_();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#e6f4ea')
      .setBorder(true, true, true, true, true, true);
    sheet.setFrozenRows(1);
  } else {
    const preferredHeader = 'Preferred Payment Savings';
    const preferredColumn = headers.indexOf(preferredHeader) + 1;
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];

    if (!currentHeaders.includes(preferredHeader)) {
      sheet.insertColumnBefore(preferredColumn);
    }

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#e6f4ea')
      .setBorder(true, true, true, true, true, true);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function deletePlannerDealRowById_(dealId) {
  const sheet = getOrCreatePlannerSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
  const idx = ids.findIndex(id => String(id) === String(dealId));
  if (idx < 0) return false;

  sheet.deleteRow(idx + 2);
  return true;
}

/**
 * Admin-only diagnostic called from the hidden admin tools in Index.html.
 * Opens the configured spreadsheet, verifies the Planner Deals tab/headers,
 * writes a temporary cloud-backup row through the real save path, then removes it.
 */
function runCloudBackupSelfTest(adminKey) {
  const testId = 'admin-self-test-' + Utilities.getUuid();
  const startedAt = new Date();

  try {
    const requiredAdminKey = PropertiesService.getScriptProperties().getProperty('ADMIN_SELF_TEST_KEY');
    if (requiredAdminKey && String(adminKey || '') !== String(requiredAdminKey)) {
      throw new Error('Admin self-test key is missing or incorrect.');
    }

    const configuredSheetId = PropertiesService.getScriptProperties().getProperty('PLANNER_SHEET_ID');
    const ss = getPlannerSpreadsheet_();
    const sheet = getOrCreatePlannerSheet_();
    const expectedHeaders = plannerHeaders_();
    const headers = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
    const headerMismatch = expectedHeaders.find((header, idx) => String(headers[idx] || '') !== header);
    if (headerMismatch) {
      throw new Error('Planner Deals header row does not match the expected v56 cloud-backup columns.');
    }

    const payload = {
      id: testId,
      updatedAt: startedAt.toISOString(),
      customerName: 'Admin Cloud Backup Self-Test',
      customerPhone: '',
      customerEmail: '',
      address: 'Apps Script wiring check',
      repName: 'Admin',
      branch: 'Norfolk',
      apptDate: Utilities.formatDate(startedAt, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      selectedOption: 'TEST',
      optionLabel: 'Self-Test',
      optionName: 'Cloud Backup Wiring',
      optionBadge: 'Temporary Row',
      paymentView: 'Self-Test',
      selectedPaymentValue: '$0',
      retailPrice: 0,
      oneYearPrice: 0,
      quickStartSavings: 0,
      quickStartLabel: '',
      couponSavings: 0,
      couponLabel: '',
      preferredPaymentSavings: 0,
      flexibleInstallationSavings: 0,
      totalTodaySavings: 0,
      yourPrice: 0,
      cardPrice: 0,
      checkPrice: 0,
      monthly: 0,
      fullDealJson: JSON.stringify({ selfTest: true, startedAt: startedAt.toISOString() })
    };

    const saveResult = savePlannerDeal(payload);
    const cleanupComplete = deletePlannerDealRowById_(testId);

    return {
      success: true,
      message: 'Apps Script and Google Sheets cloud backup are wired correctly.',
      spreadsheetName: ss.getName(),
      spreadsheetId: ss.getId(),
      sheetName: sheet.getName(),
      sheetUrl: ss.getUrl(),
      configuration: configuredSheetId ? 'PLANNER_SHEET_ID script property' : 'container-bound active spreadsheet',
      headerCount: expectedHeaders.length,
      testRow: saveResult.row,
      cleanupComplete: cleanupComplete,
      testedAt: new Date().toISOString()
    };

  } catch (error) {
    try {
      deletePlannerDealRowById_(testId);
    } catch (cleanupError) {
      Logger.log('Self-test cleanup failed: ' + cleanupError.toString());
    }

    Logger.log('Cloud backup self-test failed: ' + error.toString());
    return {
      success: false,
      message: error && error.message ? error.message : String(error),
      testedAt: new Date().toISOString()
    };
  }
}

/**
 * Saves or updates one planner deal in Google Sheets.
 * The frontend always saves locally first. This is the cloud backup layer.
 */
function savePlannerDeal(dealData) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (!dealData || !dealData.id) {
      throw new Error('Missing deal ID.');
    }

    const sheet = getOrCreatePlannerSheet_();

    const row = [
      new Date(),
      dealData.id || '',
      dealData.updatedAt || '',
      dealData.customerName || '',
      dealData.customerPhone || '',
      dealData.customerEmail || '',
      dealData.address || '',
      dealData.repName || '',
      dealData.branch || '',
      dealData.apptDate || '',
      dealData.selectedOption || '',
      dealData.optionLabel || '',
      dealData.optionName || '',
      dealData.optionBadge || '',
      dealData.paymentView || '',
      dealData.selectedPaymentValue || '',
      Number(dealData.retailPrice || 0),
      Number(dealData.oneYearPrice || 0),
      Number(dealData.quickStartSavings || 0),
      dealData.quickStartLabel || '',
      Number(dealData.couponSavings || 0),
      dealData.couponLabel || '',
      Number(dealData.preferredPaymentSavings || 0),
      Number(dealData.flexibleInstallationSavings || 0),
      Number(dealData.totalTodaySavings || 0),
      Number(dealData.yourPrice || 0),
      Number(dealData.cardPrice || 0),
      Number(dealData.checkPrice || 0),
      Number(dealData.monthly || 0),
      dealData.fullDealJson || ''
    ];

    const lastRow = sheet.getLastRow();
    let targetRow = 0;

    if (lastRow > 1) {
      const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
      const idx = ids.findIndex(id => String(id) === String(dealData.id));
      if (idx >= 0) targetRow = idx + 2;
    }

    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
      targetRow = sheet.getLastRow();
    }

    return { success: true, row: targetRow, syncedAt: new Date().toISOString() };

  } catch (error) {
    Logger.log('Error in savePlannerDeal: ' + error.toString());
    throw new Error('Unable to back up planner deal to Google Sheets. Local iPad save is still available.');
  } finally {
    lock.releaseLock();
  }
}
