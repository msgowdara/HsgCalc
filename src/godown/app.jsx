/* =====================================================================
   Smart Godown Inspector (offline)

   Reports are kept only in this browser on this device (IndexedDB).
   Nothing is sent over the internet. "Back up" saves every report to a
   file; "Load backup" brings them back on this or another device.

   build.py compiles this file into ../../GodownInspection.html.
   ===================================================================== */
const { useState, useEffect, useRef } = React;
const LOGO = window.GODOWN_LOGO || '';

// ---------- Choices offered in the form ----------
const DROPDOWNS = {
    conditions: ['Satisfactory', 'Not Satisfactory'],
    storage: ['Proper', 'Haphazard'],
    yesNo: ['Yes', 'No', 'Not Applicable'],
    insideOutside: ['Inside', 'Outside', 'Not Applicable'],
    frequency: ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'Irregular'],
    authorities: ['BRBH', 'BRSM', 'BRCM', 'BRAGM', 'BRDGM', 'ROCC-DRM', 'ROCC-RM', 'ZOCC-BD', 'ZOCC-DGM', 'ZOCC-GM', 'COCC-GM', 'COCC-CGM', 'COCC-ED', 'COCC-CMD', 'COCC-MCB'],
    margins: ['0', '10', '15', '20', '25', '30', '40', '50']
};

// ---------- Findings: the answer that is a finding, and the wording used for it ----------
// remark:   the observation, filled in on the form when the finding is chosen (the inspector can edit it)
// branch:   the action suggested to the Branch Head in the internal memo (every finding goes to the memo)
// borrower: the action asked of the borrower in the letter (only findings the borrower must act on)
const FINDINGS = {
    conditionOfGodown: { trigger: 'Not Satisfactory', field: 'godownRemark', label: 'Condition of Godown',
        remark: 'The godown needs cleaning and maintenance.',
        branch: 'Follow up with the borrower to get the godown cleaned and maintained.',
        borrower: 'Please get the godown cleaned and repaired, and keep it in good condition.' },
    conditionOfStocks: { trigger: 'Not Satisfactory', field: 'conditionOfStocksRemark', label: 'Condition of Stocks',
        remark: 'Some stocks appear damaged or obsolete.',
        branch: 'Exclude damaged or obsolete stocks while computing the drawing power, and follow up for their disposal.',
        borrower: 'Please set aside damaged or obsolete stocks, leave them out of your stock statement and dispose of them early.' },
    modeOfStorage: { trigger: 'Haphazard', field: 'modeOfStorageRemark', label: 'Mode of Storage',
        remark: 'Stocks are stored haphazardly.',
        branch: 'Advise the borrower to stack the stocks properly so that they can be identified and counted.',
        borrower: 'Please stack the stocks properly so that they can be easily identified and counted.' },
    modeOfValuationSatisfactory: { trigger: 'Not Satisfactory', field: 'valuationRemark', label: 'Valuation Mode',
        remark: 'Valuation is not in line with current market rates.',
        branch: 'Revalue the stocks at current market rates and recompute the drawing power.' },
    tradeDiscountDeducted: { trigger: 'No', field: 'tradeDiscountRemark', label: 'Trade Discount',
        remark: 'Trade discount has not been deducted while valuing the stocks.',
        branch: 'Recompute the stock value net of trade discount and revise the drawing power.',
        borrower: 'Please show the value of stocks net of trade discount in your stock statements.' },
    insuranceAdequate: { trigger: 'No', field: 'insuranceAdequateRemark', label: 'Insurance Adequacy',
        remark: 'Insurance cover is less than the value of stocks.',
        branch: 'Follow up with the borrower to enhance the insurance cover to at least the value of stocks.',
        borrower: 'Please enhance the insurance cover to at least the value of stocks and submit a copy of the revised policy to the branch.' },
    insuranceComprehensive: { trigger: 'No', field: 'insuranceComprehensiveRemark', label: 'Comprehensive Insurance',
        remark: 'The insurance policy does not cover all the required risks.',
        branch: "Ensure the policy covers all required risks (fire, riot and civil commotion, burglary etc.) with the Bank's clause.",
        borrower: "Please obtain a policy covering all required risks (fire, riot and civil commotion, burglary etc.) with the Bank's clause, and submit a copy to the branch." },
    unpledgedInsured: { trigger: 'No', field: 'unpledgedInsuredRemark', label: 'Unpledged Stocks Insurance',
        remark: 'Unpledged stocks stored in the godown are not insured.',
        branch: 'Ensure the unpledged stocks stored in the godown are also adequately insured.',
        borrower: 'Please insure the unpledged stocks stored in the godown as well.' },
    signboardsDisplayed: { trigger: 'No', field: 'signboardsDisplayedRemark', label: 'Bank Signboards',
        remark: "The Bank's signboard is not displayed at the godown.",
        branch: "Ensure the Bank's signboard is displayed at the godown.",
        borrower: "Please display the Bank's signboard at the godown immediately." },
    godownKeeperSanctioned: { trigger: 'No', field: 'godownKeeperRemark', label: 'Godown Keeper',
        remark: 'No godown keeper/chokidar is sanctioned for this account.',
        branch: 'Review whether a godown keeper/chokidar is required for this account.' },
    stockReportsRegular: { trigger: 'No', field: 'stockReportsRemark', label: 'Stock Reports Submission',
        remark: 'Duly signed stock statements are not received regularly.',
        branch: 'Follow up for regular submission of duly signed stock statements.',
        borrower: 'Please submit duly signed stock statements to the branch regularly.' },
    bankPossessionEffective: { trigger: 'No', field: 'bankPossessionRemark', label: 'Bank Possession',
        remark: "The Bank's possession of the godown is not fully effective.",
        branch: "Ensure the Bank's possession of the godown is fully effective and secure." },
    registersMaintained: { trigger: 'No', field: 'registersMaintainedRemark', label: 'Stock Registers',
        remark: 'Godown registers/cards are not properly maintained.',
        branch: 'Advise the borrower to maintain the godown registers/cards properly.',
        borrower: 'Please maintain the godown registers and stock cards properly and keep them up to date.' },
    registersTally: { trigger: 'No', field: 'registersTallyRemark', label: 'Registers Tally',
        remark: 'Godown registers do not tally with the godown cards.',
        branch: "Reconcile the registers with the cards and the physical stock, and obtain the borrower's explanation for the difference.",
        borrower: 'Please reconcile your godown registers with the stock cards and the physical stock, and explain the difference to the branch.' },
    inspectedPeriodically: { trigger: 'No', field: 'inspectedPeriodicallyRemark', label: 'Periodical Inspection',
        remark: 'The godown is not inspected periodically.',
        branch: 'Inspect the godown regularly as per the prescribed schedule.' },
    recordMaintained: { trigger: 'No', field: 'recordMaintainedRemark', label: 'Inspection Records',
        remark: 'Record of inspections is not maintained.',
        branch: 'Maintain and update the record of godown inspections.' },
    turnoverSatisfactory: { trigger: 'No', field: 'turnoverSatisfactoryRemark', label: 'Stock Turnover',
        remark: 'Turnover in stocks is not commensurate with the limit.',
        branch: 'Monitor the turnover in stocks closely.',
        borrower: 'Please improve the turnover of stocks in line with the limit sanctioned.' },
    accountTurnoverSatisfactory: { trigger: 'No', field: 'accountTurnoverSatisfactoryRemark', label: 'Account Turnover',
        remark: 'Sales proceeds are not routed fully through the Cash Credit account.',
        branch: 'Ensure all sales proceeds are routed through the Cash Credit account.',
        borrower: 'Please route all sales proceeds through the Cash Credit account only.' },
    movementChecked: { trigger: 'No', field: 'movementRemark', label: 'Stock Movement',
        remark: 'Movement of stocks in the account has not been fully checked.',
        branch: 'Check the movement of stocks against the stock statements closely.' },
    oldStockMoving: { trigger: 'No', field: 'oldStockRemark', label: 'Old Stock Movement',
        remark: 'Stocks older than three months are not moving out satisfactorily.',
        branch: 'Monitor the movement of old stocks closely.',
        borrower: 'Please arrange early sale of stocks older than three months.' },
    deliveriesNotNew: { trigger: 'No', field: 'deliveriesRemark', label: 'Deliveries Preponderance',
        remark: 'Deliveries since the last inspection have been mainly from new stocks.',
        branch: 'Watch for old stocks being held back; deliveries should be made from older stocks first.',
        borrower: 'Please make deliveries from older stocks first.' },
    statementsOnRecord: { trigger: 'No', field: 'statementsRemark', label: 'Statements on Record',
        remark: 'Some stock statements of the borrower are not on branch record.',
        branch: 'Obtain the pending stock statements and keep them on record.' }
};

// Remarks suggested by earlier versions of this page. Reports that still carry one are shown with the current wording.
const OLD_REMARKS = {
    godownRemark: ['Godown requires maintenance/cleaning.'],
    conditionOfStocksRemark: ['Some stocks appear damaged/obsolete.'],
    modeOfStorageRemark: ['Advised customer to arrange and stack goods properly.'],
    tradeDiscountRemark: ['Trade discount is not deducted from valuation.'],
    insuranceAdequateRemark: ['Advised customer to increase insurance cover to match declared stock value.'],
    insuranceComprehensiveRemark: ['Advised to obtain comprehensive insurance policy covering all required risks.'],
    unpledgedInsuredRemark: ['Unpledged stocks stored in the godown are currently uninsured.'],
    signboardsDisplayedRemark: ["Advised customer to display Bank's signboard immediately."],
    godownKeeperRemark: ['Godown keeper not sanctioned/required for this account.'],
    stockReportsRemark: ['Advised customer to submit stock statements promptly.'],
    bankPossessionRemark: ['Advised branch to ensure strict possession of godown.'],
    registersMaintainedRemark: ['Advised customer to maintain proper stock registers.'],
    registersTallyRemark: ['Discrepancy observed between physical stock and records.'],
    inspectedPeriodicallyRemark: ['Advised branch to strictly follow inspection schedule.'],
    recordMaintainedRemark: ['Advised branch to update inspection records.'],
    turnoverSatisfactoryRemark: ['Turnover is not commensurate with the limit.'],
    accountTurnoverSatisfactoryRemark: ['Advised the customer to route all sales proceeds through Cash Credit Account only.'],
    movementRemark: ['Movement of stocks needs closer monitoring.'],
    oldStockRemark: ['Old stocks are slow-moving; advised early liquidation.'],
    deliveriesRemark: ['Deliveries are mostly from newly arrived stocks.'],
    statementsRemark: ['Stock statements are pending at branch.']
};

// Details of the account (not observations) that a new report can take from the last report of the same account
const ACCOUNT_FIELDS = ['name', 'nature', 'limit', 'sanctioningAuthority', 'officeAddress', 'godownAddress', 'distance',
    'branch', 'branchAlpha', 'region', 'stockMarginPercent', 'bdMarginPercent', 'insuranceAmount',
    'godownKeeperSanctioned', 'stockReportsFrequency', 'inspectedHowOften'];

// ---------- Dates and amounts ----------
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayLocal = () => isoDate(new Date());   // today's date on this device (not UTC)
const addDays = (iso, days) => { const [y, m, d] = iso.split('-').map(Number); return isoDate(new Date(y, m - 1, d + days)); };
const fmtDate = iso => { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : String(iso || ''); };
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const money = v => '₹\u00a0' + num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });   // the symbol never wraps away from the amount
const marginAmount = (value, pct) => (num(value) * num(pct) / 100).toFixed(2);
// Drawing power. Current rule ('paid-stock'): the stock margin is taken on paid stock, i.e. stock less creditors:
//     DP = (stock - creditors) - margin on it  +  book debts - margin on them
// Reports saved before this rule ('gross') keep the calculation they were printed with:
//     DP = (stock - margin on stock)  +  (book debts - margin on them)  -  creditors
const paidStock = r => Math.max(0, num(r.stockValue) - num(r.creditors));
const stockMarginAmount = r => (r.dpRule === 'gross' ? marginAmount(r.stockValue, r.stockMarginPercent) : marginAmount(paidStock(r), r.stockMarginPercent));
const calcDP = r => (r.dpRule === 'gross'
    ? Math.max(0, (num(r.stockValue) - num(r.stockMargin)) + (num(r.bookDebts) - num(r.bookDebtsMargin)) - num(r.creditors))
    : Math.max(0, (paidStock(r) - num(r.stockMargin)) + (num(r.bookDebts) - num(r.bookDebtsMargin))));
const oldStockPct = r => num(r.stockValue) ? (num(r.amountOfOldStockRupees) / num(r.stockValue) * 100).toFixed(2) + ' %' : '0.00 %';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- A blank report ----------
const blankReport = () => ({
    id: '', accountNo: '', name: '', nature: '', limit: '', sanctioningAuthority: 'BRCM',
    officeAddress: '', godownAddress: '', distance: '', branch: '', branchAlpha: '', region: '',
    dateOfReporting: todayLocal(), dateOfVerification: todayLocal(), inspectingOfficer: '',

    conditionOfGodown: 'Satisfactory', godownRemark: '',
    dpRule: 'paid-stock', stockValue: '', stockMarginPercent: '25', stockMargin: '0.00',
    bookDebts: '', bdMarginPercent: '25', bookDebtsMargin: '0.00',
    creditors: '', outstandingBalance: '',
    conditionOfStocks: 'Satisfactory', conditionOfStocksRemark: '', modeOfStorage: 'Proper', modeOfStorageRemark: '',
    seasonYear: '', ageOfOldStockDays: '', amountOfOldStockRupees: '', percentOldStock: '0.00 %',

    modeOfValuationSatisfactory: 'Satisfactory', valuationRemark: '',
    tradeDiscountDeducted: 'Yes', tradeDiscountRemark: '',
    unpledgedStocks: 'No',

    insuranceAmount: '', insuranceValidityDate: '',
    insuranceAdequate: 'Yes', insuranceAdequateRemark: '',
    insuranceComprehensive: 'Yes', insuranceComprehensiveRemark: '',
    unpledgedInsured: 'Not Applicable', unpledgedInsuredRemark: '',

    signboardsDisplayed: 'Yes', signboardsDisplayedRemark: '', signboardsInsideOutside: 'Inside',
    godownKeeperSanctioned: 'Yes', godownKeeperRemark: '',
    stockReportsRegular: 'Yes', stockReportsRemark: '', stockReportsFrequency: 'Monthly',
    bankPossessionEffective: 'Yes', bankPossessionRemark: '',
    registersMaintained: 'Yes', registersMaintainedRemark: '',
    registersTally: 'Yes', registersTallyRemark: '',
    inspectedPeriodically: 'Yes', inspectedPeriodicallyRemark: '', inspectedHowOften: 'Quarterly by undersigned inspecting officer',
    recordMaintained: 'Yes', recordMaintainedRemark: '',

    turnoverSatisfactory: 'Yes', turnoverSatisfactoryRemark: '', accountTurnoverSatisfactory: 'Yes', accountTurnoverSatisfactoryRemark: '',
    movementChecked: 'Yes', movementRemark: '',
    oldStockMoving: 'Yes', oldStockRemark: '',
    deliveriesNotNew: 'Yes', deliveriesRemark: '',
    statementsOnRecord: 'Yes', statementsRemark: '',
    lastUpdated: ''
});

// ---------- Bring a stored report (from this device, an earlier version of the page, or a backup) up to date ----------
function normalizeRecord(raw) {
    const r = { ...blankReport(), dateOfReporting: '', dateOfVerification: '', ...raw };
    for (const k of Object.keys(r)) {
        if (r[k] === null || r[k] === undefined) r[k] = '';
        else if (typeof r[k] !== 'string') r[k] = String(r[k]);
    }
    if (r.ageOfOldStock && !r.ageOfOldStockDays) r.ageOfOldStockDays = r.ageOfOldStock;   // name used by an early version
    delete r.ageOfOldStock;
    // An earlier version stored "No. Advised the customer ..." as the answer itself, which the form could not show
    const acc = r.accountTurnoverSatisfactory.match(/^No\.\s*(.*)$/s);
    if (acc) {
        r.accountTurnoverSatisfactory = 'No';
        if (!r.accountTurnoverSatisfactoryRemark.trim()) r.accountTurnoverSatisfactoryRemark = acc[1].trim() || FINDINGS.accountTurnoverSatisfactory.remark;
    }
    if (r.insuranceAdequateRemark.trim() === 'Insurance amount is less than declared stock value.') {   // set by the old automatic check
        r.insuranceAdequateRemark = autoInsuranceRemark(r.insuranceAmount, r.stockValue);
    }
    for (const [key, f] of Object.entries(FINDINGS)) {
        if ((OLD_REMARKS[f.field] || []).includes(r[f.field].trim())) r[f.field] = f.remark;
        if (r[key] !== f.trigger) r[f.field] = '';
        else if (!r[f.field].trim()) r[f.field] = f.remark;
    }
    // Questions that only apply in some cases
    if (r.unpledgedStocks !== 'Yes') { r.unpledgedInsured = 'Not Applicable'; r.unpledgedInsuredRemark = ''; }
    if (r.signboardsDisplayed !== 'Yes') r.signboardsInsideOutside = 'Not Applicable';
    // Distance is kept in km: "3 km" -> "3"
    const km = r.distance.trim().match(/^(\d+(?:\.\d+)?)\s*(?:km|kms|kilometres?|kilometers?)?\.?$/i);
    if (km) r.distance = km[1];
    r.accountNo = r.accountNo.trim();
    r.branchAlpha = r.branchAlpha.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 6);
    // A report saved before the drawing-power rule was recorded used the earlier calculation, and keeps it;
    // a report that has never been saved uses the current rule
    r.dpRule = raw.dpRule === 'paid-stock' || raw.dpRule === 'gross' ? raw.dpRule : (raw.lastUpdated ? 'gross' : 'paid-stock');
    // Margins and the old-stock share always follow the figures
    r.stockMargin = stockMarginAmount(r);
    r.bookDebtsMargin = marginAmount(r.bookDebts, r.bdMarginPercent);
    r.percentOldStock = oldStockPct(r);
    return r;
}

// ---------- What changes when an answer changes ----------
// Insurance below the value of stocks is a finding. The remark the rule writes names the figures, so the rule can tell
// its own "No" (which it updates, and clears once the cover is enough) from one the inspector chose (left alone).
const autoInsuranceRemark = (ins, stock) => `Insurance amount (${money(ins)}) is less than the value of stocks (${money(stock)}).`;
const isAutoInsuranceRemark = s => /^Insurance amount \(.*\) is less than the value of stocks \(.*\)\.$/.test(s || '');
function insuranceCheck(next) {
    if (String(next.insuranceAmount).trim() === '' || String(next.stockValue).trim() === '') return;   // nothing to compare yet
    const stock = num(next.stockValue), ins = num(next.insuranceAmount);
    const auto = isAutoInsuranceRemark(next.insuranceAdequateRemark);
    if (ins < stock) {
        if (next.insuranceAdequate !== 'No' || auto || !next.insuranceAdequateRemark) {
            next.insuranceAdequate = 'No';
            next.insuranceAdequateRemark = autoInsuranceRemark(ins, stock);
        }
    } else if (next.insuranceAdequate === 'No' && auto) {
        next.insuranceAdequate = 'Yes';
        next.insuranceAdequateRemark = '';
    }
}

function applyChange(prev, name, value) {
    const next = { ...prev, [name]: value };
    if (name === 'accountNo') next.accountNo = value.replace(/\D/g, '').slice(0, 14);
    if (name === 'branchAlpha') next.branchAlpha = value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 6);
    if (['stockValue', 'stockMarginPercent', 'creditors', 'dpRule'].includes(name)) next.stockMargin = stockMarginAmount(next);
    if (name === 'bookDebts' || name === 'bdMarginPercent') next.bookDebtsMargin = marginAmount(next.bookDebts, next.bdMarginPercent);
    if (name === 'stockValue' || name === 'amountOfOldStockRupees') next.percentOldStock = oldStockPct(next);
    if (name === 'stockValue' || name === 'insuranceAmount') insuranceCheck(next);

    const f = FINDINGS[name];
    if (f) {
        if (value === f.trigger) { if (!next[f.field]) next[f.field] = f.remark; }
        else next[f.field] = '';
    }
    if (name === 'turnoverSatisfactory') {
        // Poor turnover in stocks usually means the sales are not coming through the account either
        const a = FINDINGS.accountTurnoverSatisfactory;
        if (value === 'No' && next.accountTurnoverSatisfactory !== 'No') {
            next.accountTurnoverSatisfactory = 'No';
            if (!next[a.field]) next[a.field] = a.remark;
        } else if (value === 'Yes' && next.accountTurnoverSatisfactory === 'No' && next[a.field] === a.remark) {
            next.accountTurnoverSatisfactory = 'Yes';
            next[a.field] = '';
        }
    }
    if (name === 'signboardsDisplayed') {
        if (value !== 'Yes') next.signboardsInsideOutside = 'Not Applicable';
        else if (next.signboardsInsideOutside === 'Not Applicable') next.signboardsInsideOutside = 'Outside';
    }
    if (name === 'unpledgedStocks') {
        if (value !== 'Yes') { next.unpledgedInsured = 'Not Applicable'; next.unpledgedInsuredRemark = ''; }
        else if (next.unpledgedInsured === 'Not Applicable') next.unpledgedInsured = 'Yes';
    }
    return next;
}

// A new report for an account seen before takes that account's details (not the last visit's observations).
// defaults: the values the report started with; filledBefore: details put in for a previous account number, which are
// put back to their defaults (unless the inspector has changed them since) when the account number changes.
function fillAccountDetails(cur, last, defaults, filledBefore) {
    const next = { ...cur };
    let cleared = 0;
    for (const [k, v] of Object.entries(filledBefore)) {
        if (next[k] === v && next[k] !== defaults[k]) { next[k] = defaults[k]; cleared++; }
    }
    const filled = {};
    if (last) {
        for (const k of ACCOUNT_FIELDS) {
            if (next[k] === defaults[k] && last[k] !== '' && last[k] !== undefined && last[k] !== next[k]) { next[k] = last[k]; filled[k] = last[k]; }
        }
    }
    for (const [key, f] of Object.entries(FINDINGS)) {
        if (next[key] !== f.trigger) next[f.field] = '';
        else if (!next[f.field]) next[f.field] = f.remark;
    }
    next.stockMargin = stockMarginAmount(next);
    next.bookDebtsMargin = marginAmount(next.bookDebts, next.bdMarginPercent);
    insuranceCheck(next);
    return { next, filled, cleared };
}

// ---------- Findings for the internal memo and the letter to the borrower ----------
function insuranceStatus(r) {
    if (!r.insuranceValidityDate || !r.dateOfVerification) return '';
    if (r.insuranceValidityDate < r.dateOfVerification) return 'expired';
    if (r.insuranceValidityDate <= addDays(r.dateOfVerification, 30)) return 'due';
    return '';
}

function analyse(r) {
    const critical = [], other = [], borrower = [];
    const dp = calcDP(r), os = num(r.outstandingBalance);
    if (os > 0 && dp < os) {
        critical.push({ label: 'Drawing Power Shortfall (DP < OS)',
            observation: `Drawing power (${money(dp)}) is less than the outstanding balance (${money(os)}) by ${money(os - dp)}.`,
            action: 'Possible diversion of funds. Credit department to closely monitor, seek immediate justification, and ensure regularization.' });
        borrower.push({ label: 'Drawing Power Shortfall',
            observation: 'The outstanding balance in your account exceeds the drawing power available against the declared stocks.',
            action: 'Please submit a detailed clarification for the shortfall and arrange to regularize the account immediately.' });
    }
    const ins = insuranceStatus(r);
    if (ins === 'expired') {
        critical.push({ label: 'Insurance Policy Expired',
            observation: `The stock insurance policy expired on ${fmtDate(r.insuranceValidityDate)}, before the date of verification.`,
            action: "Credit department to immediately follow up with the borrower to renew the insurance policy to safeguard Bank's interest." });
        borrower.push({ label: 'Insurance Policy Expired',
            observation: `Your stock insurance policy expired on ${fmtDate(r.insuranceValidityDate)}.`,
            action: 'Please renew the insurance policy immediately and submit a copy of the renewed policy to the branch to ensure continuous coverage.' });
    } else if (ins === 'due') {
        other.push({ label: 'Insurance Renewal Due',
            observation: `The stock insurance policy expires on ${fmtDate(r.insuranceValidityDate)}, within 30 days of the verification.`,
            action: 'Follow up with the borrower to renew the policy before it expires.' });
        borrower.push({ label: 'Insurance Renewal Due',
            observation: `Your stock insurance policy expires on ${fmtDate(r.insuranceValidityDate)}.`,
            action: 'Please renew the policy before it expires and submit a copy of the renewed policy to the branch.' });
    }
    for (const [key, f] of Object.entries(FINDINGS)) {
        if (r[key] !== f.trigger) continue;
        if (key === 'unpledgedInsured' && r.unpledgedStocks !== 'Yes') continue;   // question not asked
        const observation = (r[f.field] || '').trim() || f.remark;
        (key === 'insuranceAdequate' ? critical : other).push({ label: f.label, observation, action: f.branch });
        if (f.borrower) borrower.push({ label: f.label, observation, action: f.borrower });
    }
    return { critical, other, borrower, dp, os };
}

// ---------- Storage on this device ----------
const DB_NAME = 'SmartGodownDB';
const STORE = 'inspections';
let dbPromise = null;
function openDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) { reject(new Error('This browser cannot store reports on the device.')); return; }
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
            };
            req.onsuccess = () => {
                const db = req.result;
                db.onversionchange = () => { db.close(); dbPromise = null; };
                db.onclose = () => { dbPromise = null; };   // the browser closed it: open again next time
                resolve(db);
            };
            req.onerror = () => { dbPromise = null; reject(req.error || new Error('The report store could not be opened.')); };
        });
    }
    return dbPromise;
}
const failed = (err, what) => err || new Error(what);
async function dbRead(fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = fn(db.transaction(STORE, 'readonly').objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(failed(req.error, 'The saved reports could not be read.'));
    });
}
const dbAll = () => dbRead(st => st.getAll()).then(list => list || []);
const dbGet = id => dbRead(st => st.get(id));
// One read-write transaction: work(store) queues the changes; the promise settles when they are all written
async function dbWrite(work, what) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const result = work(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(failed(tx.error, what));
        tx.onabort = () => reject(failed(tx.error, what + ' (the device may be out of space).'));
    });
}
const dbPut = records => dbWrite(st => records.forEach(r => st.put(r)), 'The report could not be saved');
const dbDelete = id => dbWrite(st => st.delete(id), 'The report could not be deleted');
// Load a backup: a report is added if new here, replaced only by a later copy, and never deleted
const dbMerge = incoming => dbWrite(st => {
    const counts = { added: 0, updated: 0, same: 0 };
    incoming.forEach(r => {
        const req = st.get(r.id);
        req.onsuccess = () => {
            const ex = req.result;
            if (!ex) { counts.added++; st.put(r); }
            else if ((r.lastUpdated || '') > (ex.lastUpdated || '')) { counts.updated++; st.put(r); }
            else counts.same++;
        };
    });
    return counts;
}, 'The backup could not be loaded');
const errorText = e => (e && e.message) || String(e || 'Unknown error');
// Ask the browser not to clear the reports when the device runs low on space (it decides; nothing is shown in most browsers)
let persistAsked = false;
function requestPersistence() {
    if (persistAsked) return;
    persistAsked = true;
    try {
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {});
        }
    } catch (e) { /* not supported */ }
}

// Small settings kept in this browser (best effort: private windows may not keep them)
const local = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};
const KEYS = { draft: 'godownInspection.draft', lastBackup: 'godownInspection.lastBackup' };
const SESSION = Date.now().toString(36) + Math.random().toString(36).slice(2);   // this page, in this tab
function readDraft() {
    try { const d = JSON.parse(local.get(KEYS.draft) || 'null'); return d && d.form ? d : null; } catch (e) { return null; }
}
const draftTitle = d => (d && d.form && (d.form.name || d.form.accountNo)) || 'a new report';

// ---------- Backup files ----------
const BACKUP_FORMAT = 'smart-godown-inspector-backup';
// Resolves to 'saved' (the browser confirmed the file was written), 'downloaded' (handed to the browser's downloads)
// or 'cancelled'. Where the browser offers a save window (Chrome and Edge on computers), it is used, so a cancelled save is known.
async function saveBackupFile(records) {
    const payload = { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), count: records.length, records };
    const json = JSON.stringify(payload, null, 1);
    const name = `godown-inspections-backup-${todayLocal()}.json`;
    if (typeof window.showSaveFilePicker === 'function') {
        try {
            const handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Godown inspection backup', accept: { 'application/json': ['.json'] } }] });
            const out = await handle.createWritable();
            await out.write(json);
            await out.close();
            return 'saved';
        } catch (e) {
            if (e && e.name === 'AbortError') return 'cancelled';
            /* otherwise fall back to an ordinary download */
        }
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return 'downloaded';
}
function readFileText(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ''));
        fr.onerror = () => reject(new Error('The file could not be read.'));
        fr.readAsText(file);
    });
}
function readBackup(text) {
    let data;
    try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (e) { throw new Error('This file is not a backup made by this page.'); }
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : null);
    if (!list || (!Array.isArray(data) && data.format && data.format !== BACKUP_FORMAT)) throw new Error('This file is not a backup made by this page.');
    if (!Array.isArray(data) && Number(data.version) > 1) throw new Error('This backup was made by a newer version of this page. Reload the page (with internet) and try again.');
    const byId = new Map();   // the same report twice in one file: keep the later copy
    list.filter(r => r && typeof r === 'object' && r.id && r.accountNo !== undefined).forEach(raw => {
        const r = normalizeRecord({ ...raw, id: String(raw.id) });
        const seen = byId.get(r.id);
        if (!seen || (r.lastUpdated || '') > (seen.lastUpdated || '')) byId.set(r.id, r);
    });
    if (!byId.size) throw new Error('No reports were found in this file.');
    return [...byId.values()];
}

const byNewest = (a, b) => (b.dateOfReporting || '').localeCompare(a.dateOfReporting || '') || (b.lastUpdated || '').localeCompare(a.lastUpdated || '');

// ---------- Icons ----------
const svg = (size, children, cls) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">{children}</svg>;
const Icons = {
    Plus: () => svg(18, <><path d="M5 12h14" /><path d="M12 5v14" /></>),
    Print: () => svg(18, <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></>),
    Home: () => svg(20, <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>),
    Save: () => svg(18, <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>),
    AlertCircle: () => svg(14, <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>),
    Search: () => svg(18, <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>),
    Download: () => svg(16, <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>),
    Upload: () => svg(16, <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>),
    Edit: () => svg(16, <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>)
};

// ---------- Form pieces ----------
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const inputCls = 'w-full border-slate-300 rounded px-3 py-2 border';

function Field({ label, name, form, set, className, inputClass, type = 'text', required = true, ...rest }) {
    return (
        <div className={className}>
            <label htmlFor={'f_' + name} className={labelCls}>{label}</label>
            <input id={'f_' + name} name={name} type={type} required={required} autoComplete="off"
                className={`${inputCls} ${inputClass || ''}`} value={form[name]} onChange={e => set(name, e.target.value)} {...rest} />
        </div>
    );
}

function Amount(props) {
    return <Field type="number" min="0" step="any" inputMode="decimal" {...props} />;
}

function Select({ label, name, form, set, options, className, selectClass, disabled, required = true }) {
    const value = form[name];
    const opts = !value || options.includes(value) ? options : [...options, value];   // keep an older value visible
    return (
        <div className={className}>
            <label htmlFor={'f_' + name} className={labelCls}>{label}</label>
            <select id={'f_' + name} name={name} required={required} disabled={disabled}
                className={`${inputCls} bg-white disabled:bg-gray-200 ${selectClass || ''}`} value={value} onChange={e => set(name, e.target.value)}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

// A question whose "bad" answer is a finding, with the remark box that then appears
function Question({ label, name, form, set, list = 'yesNo' }) {
    const f = FINDINGS[name];
    const value = form[name];
    const negative = f && value === f.trigger;
    const options = DROPDOWNS[list];
    const opts = !value || options.includes(value) ? options : [...options, value];
    return (
        <div className="flex flex-col mb-4">
            <label htmlFor={'f_' + name} className={labelCls}>{label}</label>
            <select id={'f_' + name} name={name} required
                className={`w-full border-slate-300 rounded px-3 py-2 border text-sm ${negative ? 'bg-amber-50 border-amber-300 font-bold text-amber-900' : 'bg-white'}`}
                value={value} onChange={e => set(name, e.target.value)}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {negative && (
                <div className="mt-2">
                    <label htmlFor={'f_' + f.field} className="flex items-center gap-1 text-[11px] font-bold text-amber-700 mb-1"><Icons.AlertCircle /> Remark (edit if needed):</label>
                    <input id={'f_' + f.field} name={f.field} required type="text" autoComplete="off"
                        className="w-full border-amber-300 rounded px-3 py-1.5 border bg-amber-50 text-sm font-medium text-amber-900"
                        value={form[f.field]} onChange={e => set(f.field, e.target.value)} placeholder="Enter the observation..."
                        pattern=".*\S.*" title="Enter the observation." />
                </div>
            )}
        </div>
    );
}

function Alert({ kind = 'warn', children }) {
    const cls = kind === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900';
    return (
        <div className={`flex gap-2 items-start rounded border px-3 py-2 text-sm ${cls}`} role="status">
            <span className="mt-0.5 shrink-0"><Icons.AlertCircle /></span><span>{children}</span>
        </div>
    );
}

function Card({ title, right, children }) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap gap-2 justify-between items-center">
                <h3 className="font-bold text-slate-800">{title}</h3>{right}
            </div>
            {children}
        </div>
    );
}

function Box({ title, children }) {
    return (
        <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-3 border-b pb-1">{title}</h4>
            {children}
        </div>
    );
}

// ---------- The data entry form ----------
function setDateChecks(f) {
    if (!f) return;
    const rep = f.elements.namedItem('dateOfReporting');
    const ver = f.elements.namedItem('dateOfVerification');
    const today = todayLocal();
    if (rep) rep.setCustomValidity(rep.value && rep.value > today ? 'The date of reporting cannot be later than today.' : '');
    if (ver) ver.setCustomValidity(ver.value && rep && rep.value && ver.value > rep.value ? 'The date of stock verification cannot be after the date of reporting.' : '');
}

function InspectionForm({ form, set, officers, onAccountBlur, onPreview, onSave, saving }) {
    useEffect(() => { setDateChecks(document.getElementById('inspectionForm')); }, [form.dateOfReporting, form.dateOfVerification]);
    const dp = calcDP(form), os = num(form.outstandingBalance);
    const paid = form.dpRule !== 'gross';
    const ins = insuranceStatus(form);
    const today = todayLocal();
    const p = { form, set };
    return (
        <form id="inspectionForm" className="space-y-6 pb-12" noValidate onSubmit={e => { e.preventDefault(); onSave(); }}>
            <Card title="1. Basic Details & Godown">
                <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="Account No *" name="accountNo" {...p} inputClass="bg-blue-50 font-bold font-mono" inputMode="numeric"
                        pattern="\d{14}" maxLength={14} title="Enter the 14-digit account number." placeholder="14 digits" onBlur={onAccountBlur} />
                    <Field label="Name of Account" name="name" {...p} />
                    <Field label="Nature of Business" name="nature" {...p} placeholder="e.g. RETAIL SELLING" />
                    <Select label="Sanc. Authority" name="sanctioningAuthority" {...p} options={DROPDOWNS.authorities} />
                    <Field label="Office Address" name="officeAddress" {...p} className="sm:col-span-2" />
                    <Field label="Godown Address" name="godownAddress" {...p} className="sm:col-span-2" />
                    <Amount label="Limit (₹)" name="limit" {...p} />
                    <Field label="Date of Reporting" name="dateOfReporting" type="date" {...p} max={today} />
                    <Field label="Date of Verification" name="dateOfVerification" type="date" {...p} max={form.dateOfReporting || today} />
                    <div>
                        <label htmlFor="f_inspectingOfficer" className={labelCls}>Inspecting Officer</label>
                        <input id="f_inspectingOfficer" name="inspectingOfficer" required list="officers-list" autoComplete="off" className={`${inputCls} bg-white`}
                            value={form.inspectingOfficer} onChange={e => set('inspectingOfficer', e.target.value)} placeholder="Select or type a name" />
                        <datalist id="officers-list">{officers.map(o => <option key={o} value={o} />)}</datalist>
                    </div>
                    <Field label="Branch Name" name="branch" {...p} />
                    <Field label="Branch Alpha (6 letters)" name="branchAlpha" {...p} inputClass="font-mono uppercase" maxLength={6}
                        pattern="[A-Za-z]{6}" title="Enter the 6-letter branch alpha code, e.g. DHARWA." placeholder="e.g. DHARWA" />
                    <Field label="Region" name="region" {...p} />
                    <Field label="Distance (km)" name="distance" {...p} inputMode="decimal" pattern="\d+(\.\d{1,2})?" title="Enter the distance in km, as a number." />
                    <div className="sm:col-span-2"><Question label="Condition of Godown" name="conditionOfGodown" list="conditions" {...p} /></div>
                </div>
            </Card>

            <Card title="2. Financial Valuation" right={<span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm">DP: {money(dp)}</span>}>
                <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="bg-slate-50 p-4 rounded border border-slate-200">
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <Amount label="Stock Value (₹)" name="stockValue" {...p} className="col-span-2" inputClass="font-mono text-right" />
                            <Select label="Margin %" name="stockMarginPercent" {...p} options={DROPDOWNS.margins} selectClass="font-mono" />
                            <Amount label="Creditors (₹)" name="creditors" {...p} className="col-span-2" inputClass="font-mono text-right text-red-600" />
                        </div>
                        {paid ? (
                            <div className="bg-white p-2 rounded border border-red-100 text-sm space-y-1">
                                <div className="flex justify-between gap-2"><span className="font-semibold text-slate-600">Paid stock (stock less creditors):</span><span className="font-mono font-bold">{money(paidStock(form))}</span></div>
                                <div className="flex justify-between gap-2"><span className="font-semibold text-slate-600">Less margin on paid stock:</span><span className="font-mono font-bold text-red-600">{money(form.stockMargin)}</span></div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-white p-2 rounded border border-red-100"><span className="text-sm font-semibold text-slate-600">Less margin (stock):</span><span className="font-mono font-bold text-red-600">{money(form.stockMargin)}</span></div>
                        )}
                    </div>
                    <div className="bg-slate-50 p-4 rounded border border-slate-200">
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <Amount label="Book Debts (₹)" name="bookDebts" {...p} className="col-span-2" inputClass="font-mono text-right" />
                            <Select label="Margin %" name="bdMarginPercent" {...p} options={DROPDOWNS.margins} selectClass="font-mono" />
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded border border-red-100"><span className="text-sm font-semibold text-slate-600">Less margin (book debts):</span><span className="font-mono font-bold text-red-600">{money(form.bookDebtsMargin)}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Amount label="O/S Balance (₹)" name="outstandingBalance" {...p} inputClass="font-mono font-bold text-right bg-blue-50 border-blue-400" />
                    </div>
                    <div className="flex items-end">
                        {os > 0 && dp < os && (
                            <Alert kind="error">Drawing power ({money(dp)}) is below the outstanding balance ({money(os)}) by <b>{money(os - dp)}</b>. This goes into the memo as a critical finding.</Alert>
                        )}
                    </div>
                    {!paid && (
                        <div className="md:col-span-2">
                            <Alert>This report was saved with the earlier drawing-power calculation (margin on the full stock value, creditors deducted after the margin), so its figures stay as they were printed.{' '}
                                <button type="button" onClick={() => set('dpRule', 'paid-stock')} className="underline font-bold">Use margin on paid stock instead</button></Alert>
                        </div>
                    )}
                </div>
            </Card>

            <Card title="3-10. Detailed Inspections & Compliances">
                <div className="p-4 sm:p-6 space-y-6">
                    <Box title="Stocks & Storage">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Question label="Condition of stocks" name="conditionOfStocks" list="conditions" {...p} />
                            <Question label="Mode of storage" name="modeOfStorage" list="storage" {...p} />
                        </div>
                        {form.conditionOfStocks === 'Not Satisfactory' && (
                            <div className="mt-2 bg-amber-50 border border-amber-200 p-4 rounded-md shadow-inner">
                                <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2"><Icons.AlertCircle /> Old stock analysis required</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <Field label="Season/Year of purchase" name="seasonYear" {...p} inputClass="bg-white text-sm" placeholder="e.g. Kharif 2025" />
                                    <Field label="Age of old stock (days)" name="ageOfOldStockDays" type="number" min="0" step="1" inputMode="numeric" {...p} inputClass="bg-white text-sm" />
                                    <Amount label="Amount of old stock (₹)" name="amountOfOldStockRupees" {...p} inputClass="bg-white text-sm" />
                                    <div>
                                        <label htmlFor="f_percentOldStock" className={labelCls}>% of old stocks to total</label>
                                        <input id="f_percentOldStock" type="text" readOnly className={`${inputCls} bg-slate-100 text-sm font-bold text-slate-600`} value={oldStockPct(form)} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </Box>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Box title="Valuation">
                            <Question label="Is the mode of valuation satisfactory?" name="modeOfValuationSatisfactory" list="conditions" {...p} />
                            <Question label="Whether trade discount, if any, deducted?" name="tradeDiscountDeducted" {...p} />
                            <Select label="Unpledged stocks, if any, stored?" name="unpledgedStocks" {...p} options={DROPDOWNS.yesNo} className="mb-4" selectClass="text-sm" />
                        </Box>
                        <Box title="Insurance">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <Amount label="Amount of Insurance (₹)" name="insuranceAmount" {...p} inputClass="text-sm" />
                                <Field label="Insurance Validity Date" name="insuranceValidityDate" type="date" {...p} inputClass="text-sm" />
                            </div>
                            {ins === 'expired' && <div className="mb-4"><Alert kind="error">The policy expired on {fmtDate(form.insuranceValidityDate)}, before the date of verification. This goes into the memo as a critical finding.</Alert></div>}
                            {ins === 'due' && <div className="mb-4"><Alert>The policy expires on {fmtDate(form.insuranceValidityDate)}, within 30 days of the verification. A renewal reminder is added to the memo and the letter.</Alert></div>}
                            <Question label="Is insurance cover adequate?" name="insuranceAdequate" {...p} />
                            <Question label="Is insurance cover all comprehensive?" name="insuranceComprehensive" {...p} />
                            {form.unpledgedStocks === 'Yes' && <Question label="Are unpledged stocks adequately insured?" name="unpledgedInsured" {...p} />}
                        </Box>
                    </div>

                    <Box title="General Compliances & Records">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4">
                            <Question label="Are bank’s signboards displayed?" name="signboardsDisplayed" {...p} />
                            <Select label="Inside / Outside" name="signboardsInsideOutside" {...p} options={DROPDOWNS.insideOutside} className="mb-4" selectClass="text-sm"
                                disabled={form.signboardsDisplayed !== 'Yes'} required={form.signboardsDisplayed === 'Yes'} />
                            <Question label="Godown keeper/chokidar sanctioned?" name="godownKeeperSanctioned" {...p} />
                            <Question label="Signed stock reports received?" name="stockReportsRegular" {...p} />
                            <Select label="Report frequency" name="stockReportsFrequency" {...p} options={DROPDOWNS.frequency} className="mb-4" selectClass="text-sm" />
                            <Question label="Bank possession fully effective?" name="bankPossessionEffective" {...p} />
                            <Question label="Registers/cards properly maintained?" name="registersMaintained" {...p} />
                            <Question label="Registers tally with godown cards?" name="registersTally" {...p} />
                        </div>
                    </Box>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Box title="Control">
                            <Question label="Are godowns inspected periodically?" name="inspectedPeriodically" {...p} />
                            <Field label="How often and by whom?" name="inspectedHowOften" {...p} className="mb-4" inputClass="bg-white text-sm" />
                            <Question label="Is record of inspection maintained?" name="recordMaintained" {...p} />
                        </Box>
                        <Box title="Movement of Stocks">
                            <Question label="Is turnover in stocks satisfactory?" name="turnoverSatisfactory" {...p} />
                            <Question label="Is turnover in account satisfactory?" name="accountTurnoverSatisfactory" {...p} />
                        </Box>
                    </div>

                    <Box title="10. Officer Certificates">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <Question label="The movement of stocks in the account has been carefully checked." name="movementChecked" {...p} />
                            <Question label="Stocks older than three months are also moving out satisfactorily." name="oldStockMoving" {...p} />
                            <Question label="Deliveries effected since last inspection have not been preponderating from new stocks." name="deliveriesNotNew" {...p} />
                            <Question label="All the stock statements of the borrower are on branch record." name="statementsOnRecord" {...p} />
                        </div>
                    </Box>
                </div>
            </Card>

            <div className="flex flex-wrap justify-end gap-3 sm:gap-4 mt-6">
                <button type="button" onClick={onPreview} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-3 rounded shadow-sm font-bold transition">Preview</button>
                <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded shadow font-bold text-lg transition flex items-center gap-2 disabled:opacity-50">
                    <Icons.Save /> {saving ? 'Saving...' : 'Save Data'}
                </button>
            </div>
        </form>
    );
}

// ---------- The printed documents ----------
const yesNo = (value, remark) => (remark && remark.trim() ? `${value}. ${remark.trim()}` : value);
const Row = ({ label, children, sub, top }) => (
    <div className="doc-grid" style={top ? { alignItems: 'start' } : undefined}>
        <div className={sub ? 'sub' : undefined}>{label}</div><div>{children}</div>
    </div>
);

function Letterhead({ r }) {
    return (
        <>
            <div className="letterhead">
                <div>{LOGO && <img src={LOGO} alt="Bank of Baroda" />}</div>
                <div style={{ textAlign: 'center' }}>
                    <div className="lh-bank">BANK OF BARODA</div>
                    <div className="lh-branch">{r.branch ? `${r.branch} BRANCH` : '______________ BRANCH'}, {r.region ? `${r.region} REGION` : '______________ REGION'}</div>
                </div>
                <div></div>
            </div>
            <div className="refline">
                <div>Ref: BOB:{r.branchAlpha || 'XXXXXX'}:VISITREPORT:{r.accountNo || '__________'}</div>
                <div>Date: {fmtDate(r.dateOfReporting)}</div>
            </div>
        </>
    );
}

function FindingsTable({ items, head, critical }) {
    return (
        <table className="findings">
            <thead>
                <tr className={critical ? 'critical' : undefined}>
                    <th>Sl</th><th>{head[0]}</th><th>{head[1]}</th><th>{head[2]}</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, i) => (
                    <tr key={i}><td className="sl">{i + 1}</td><td className="param">{item.label}</td><td>{item.observation}</td><td>{item.action}</td></tr>
                ))}
            </tbody>
        </table>
    );
}

function Documents({ r, findings, printTarget }) {
    const { critical, other, borrower, dp } = findings;
    const show = doc => (printTarget === 'all' || printTarget === doc ? '' : ' print-skip');
    const expired = insuranceStatus(r) === 'expired';
    const L = r.dpRule === 'gross' ? ['f', 'g', 'h', 'i', 'j'] : ['e', 'f', 'g', 'h', 'i'];   // letters after the stock figures
    return (
        <>
            {/* GODOWN INSPECTION REPORT */}
            <div className={'a4-page word-doc' + show('report')} data-doc="report">
                <Letterhead r={r} />
                <div className="doc-title">GODOWN INSPECTION REPORT</div>

                <h2>1. BASIC DETAILS</h2>
                <Row label="a) Date of Reporting">{fmtDate(r.dateOfReporting)}</Row>
                <Row label="b) Branch">{r.branch}</Row>
                <Row label="c) Region">{r.region}</Row>
                <Row label="d) Date of Stock Verification">{fmtDate(r.dateOfVerification)}</Row>
                <Row label="e) Inspecting Officer">{r.inspectingOfficer}</Row>
                <div className="gap" />
                <Row label="f) Name of account & its nature">{r.name}{r.nature ? ` - ${r.nature}` : ''} - {r.accountNo}</Row>
                <Row label="g) Limit">{money(r.limit)}</Row>
                <Row label="h) Sanctioning Authority">{r.sanctioningAuthority}</Row>

                <h2>2. PARTICULARS OF THE GODOWN</h2>
                <Row label="a) Location">Office Address : {r.officeAddress}<br />Godown Address : {r.godownAddress}</Row>
                <Row label="b) Distance">{r.distance ? `${r.distance} km` : ''}</Row>
                <Row label="c) Condition of Godown">{yesNo(r.conditionOfGodown, r.godownRemark)}</Row>

                <h2>3. STOCKS</h2>
                {r.dpRule === 'gross' ? (
                    <>
                        <Row label="a) Value of stock pledged/hypothecated">{money(r.stockValue)}</Row>
                        <Row label={`Less: margin on stock @ ${r.stockMarginPercent}%`} sub>{money(r.stockMargin)}</Row>
                        <Row label="b) Book debts">{money(r.bookDebts)}</Row>
                        <Row label={`Less: margin on book debts @ ${r.bdMarginPercent}%`} sub>{money(r.bookDebtsMargin)}</Row>
                        <Row label="c) Less: creditors">{money(r.creditors)}</Row>
                        <Row label="d) Drawing power"><b>{money(dp)}</b></Row>
                        <Row label="e) Outstanding balance">{money(r.outstandingBalance)}</Row>
                    </>
                ) : (
                    <>
                        <Row label="a) Value of stock pledged/hypothecated">{money(r.stockValue)}</Row>
                        <Row label="Less: creditors" sub>{money(r.creditors)}</Row>
                        <Row label="Paid stock" sub>{money(paidStock(r))}</Row>
                        <Row label={`Less: margin on paid stock @ ${r.stockMarginPercent}%`} sub>{money(r.stockMargin)}</Row>
                        <Row label="b) Book debts">{money(r.bookDebts)}</Row>
                        <Row label={`Less: margin on book debts @ ${r.bdMarginPercent}%`} sub>{money(r.bookDebtsMargin)}</Row>
                        <Row label="c) Drawing power"><b>{money(dp)}</b></Row>
                        <Row label="d) Outstanding balance">{money(r.outstandingBalance)}</Row>
                    </>
                )}
                <div className="gap" />
                <Row label={`${L[0]}) Condition of stocks`}>{yesNo(r.conditionOfStocks, r.conditionOfStocksRemark)}</Row>
                <Row label={`${L[1]}) Mode of storage (Proper/Haphazard)`}>{yesNo(r.modeOfStorage, r.modeOfStorageRemark)}</Row>
                {r.conditionOfStocks === 'Not Satisfactory' && (
                    <>
                        <Row label={`${L[2]}) Season/Year of purchase of manufactured goods`}>{r.seasonYear || '-'}</Row>
                        <Row label={`${L[3]}) Age & amount of old stock`}>{r.ageOfOldStockDays || '0'} days & {money(r.amountOfOldStockRupees)}</Row>
                        <Row label={`${L[4]}) Percentage of old stocks to total stocks`}>{oldStockPct(r)}</Row>
                    </>
                )}

                <h2>4. VALUATION</h2>
                <Row label="a) Is the mode of valuation satisfactory">{yesNo(r.modeOfValuationSatisfactory, r.valuationRemark)}</Row>
                <Row label="b) Whether trade discount, if any, allowed is deducted while arriving at the value of stocks">{yesNo(r.tradeDiscountDeducted, r.tradeDiscountRemark)}</Row>
                <Row label="c) Unpledged stocks, if any stored in the godown">{r.unpledgedStocks}</Row>

                <h2>5. INSURANCE</h2>
                <Row label="a) Amount of insurance">{money(r.insuranceAmount)}</Row>
                <Row label="b) Insurance validity date">{fmtDate(r.insuranceValidityDate)}{expired && <strong> (Insurance Expired)</strong>}</Row>
                <Row label="c) Is insurance cover adequate as to the amount">{yesNo(r.insuranceAdequate, r.insuranceAdequateRemark)}</Row>
                <Row label="d) Is insurance cover all comprehensive, state if any fire or R.R.C. burglary etc.">{yesNo(r.insuranceComprehensive, r.insuranceComprehensiveRemark)}</Row>
                {r.unpledgedStocks === 'Yes' && <Row label="e) Are unpledged stocks, if any, adequately insured">{yesNo(r.unpledgedInsured, r.unpledgedInsuredRemark)}</Row>}

                <h2>6. IN ALL CASES</h2>
                <Row label="a) Are bank’s signboards displayed?">{yesNo(r.signboardsDisplayed, r.signboardsDisplayedRemark)}</Row>
                {r.signboardsDisplayed === 'Yes' && <Row label="(State whether inside or outside, if not outside, state authority)" sub>{r.signboardsInsideOutside}</Row>}
                <Row label="b) Is godown keeper/godown chokidar sanctioned?">{yesNo(r.godownKeeperSanctioned, r.godownKeeperRemark)}</Row>
                <Row label="c) Are duly signed stock reports received regularly?">{yesNo(r.stockReportsRegular, r.stockReportsRemark)}</Row>
                <Row label="(State frequency)" sub>{r.stockReportsFrequency}</Row>
                <Row label="d) Is bank’s possession fully effective and secured?">{yesNo(r.bankPossessionEffective, r.bankPossessionRemark)}</Row>

                <h2>7. BOOKS AND RECORDS</h2>
                <Row label="a) Are godown registers/cards properly maintained?">{yesNo(r.registersMaintained, r.registersMaintainedRemark)}</Row>
                <Row label="b) Do godown registers tally with godown cards?">{yesNo(r.registersTally, r.registersTallyRemark)}</Row>

                <h2>8. CONTROL</h2>
                <Row label="a) Are godowns inspected periodically?">{yesNo(r.inspectedPeriodically, r.inspectedPeriodicallyRemark)}</Row>
                <Row label="b) How often and by whom?">{r.inspectedHowOften}</Row>
                <Row label="c) Is record of inspection maintained?">{yesNo(r.recordMaintained, r.recordMaintainedRemark)}</Row>

                <h2>9. MOVEMENT OF STOCKS</h2>
                <Row label="a) Is turnover in stocks satisfactory?">{yesNo(r.turnoverSatisfactory, r.turnoverSatisfactoryRemark)}</Row>
                <Row label="b) Is turnover in account satisfactory?" top>{yesNo(r.accountTurnoverSatisfactory, r.accountTurnoverSatisfactoryRemark)}</Row>

                <h2>10. CERTIFICATE TO BE GIVEN BY THE INSPECTING OFFICER CERTIFYING THAT</h2>
                <Row label="a) The movement of stocks in the account has been carefully checked.">{yesNo(r.movementChecked, r.movementRemark)}</Row>
                <Row label="b) Stocks older than three months are also moving out satisfactorily.">{yesNo(r.oldStockMoving, r.oldStockRemark)}</Row>
                <Row label="c) Deliveries effected since last inspection have not been preponderating from new stocks.">{yesNo(r.deliveriesNotNew, r.deliveriesRemark)}</Row>
                <Row label="d) All the stock statements of the borrower are on branch record.">{yesNo(r.statementsOnRecord, r.statementsRemark)}</Row>

                <div className="signatures">
                    <div><div className="sig-name">{(r.inspectingOfficer || '').toUpperCase()}</div><div>INSPECTING OFFICER</div></div>
                    <div className="sig-end"><div>MANAGER</div></div>
                </div>
            </div>

            {/* INTERNAL MEMO TO THE BRANCH HEAD */}
            <div className={'a4-page word-doc page-break-before' + show('memo')} data-doc="memo">
                <Letterhead r={r} />
                <div className="doc-title">INTERNAL MEMO</div>
                <div className="para"><strong>To:</strong><br />The Branch Head,<br />Bank of Baroda, {r.branch} Branch</div>
                <div className="para"><strong>Subject:</strong> Outcome of Godown Inspection - {r.name} (A/c: {r.accountNo})</div>
                <p className="para">Dear Sir/Madam,</p>
                <p className="para">
                    The regular godown inspection for the subject account was conducted on {fmtDate(r.dateOfVerification)}.
                    {critical.length === 0 && other.length === 0
                        ? ' We are pleased to report that no adverse observations were noted during the visit. The condition of stocks and maintenance of records are satisfactory.'
                        : ' During the visit, the following irregularities/adverse findings were observed. We suggest the below rectification measures for monitoring by the Credit Department and follow-up action.'}
                </p>
                {critical.length > 0 && (
                    <>
                        <h3 className="critical-title">Critical Deficiencies / Irregularities</h3>
                        <FindingsTable items={critical} head={['Parameter', 'Adverse Observation', 'Suggested Action']} critical />
                    </>
                )}
                {other.length > 0 && (
                    <>
                        <h3 className="other-title">Other Observations</h3>
                        <FindingsTable items={other} head={['Parameter', 'Adverse Observation', 'Suggested Rectification Measure']} />
                    </>
                )}
                <div className="closing">
                    <p>Submitted for your information and necessary action.</p>
                    <div className="signoff"><strong>{r.inspectingOfficer ? r.inspectingOfficer.toUpperCase() : 'INSPECTING OFFICER'}</strong><br />Inspecting Official</div>
                </div>
            </div>

            {/* LETTER TO THE BORROWER (only when the borrower has something to put right) */}
            {borrower.length > 0 && (
                <div className={'a4-page word-doc page-break-before' + show('letter')} data-doc="letter">
                    <Letterhead r={r} />
                    <div className="para"><strong>To:</strong><br />{r.name}<br />{r.officeAddress}</div>
                    <div className="para"><strong>Subject:</strong> Rectification of irregularities observed during Godown Inspection dated {fmtDate(r.dateOfVerification)}</div>
                    <p className="para">Dear Sir/Madam,</p>
                    <p className="para">During the routine godown inspection of your premises located at <em>{r.godownAddress}</em> on {fmtDate(r.dateOfVerification)}, the following irregularities were observed.</p>
                    <p className="para">You are advised to take immediate corrective action as suggested below:</p>
                    <FindingsTable items={borrower} head={['Area of Concern', 'Observation Details', 'Required Action by You']} />
                    <div className="closing">
                        <p>Please confirm compliance of the above points at the earliest to ensure smooth continuation of your credit facilities.</p>
                        <div className="signoff">Yours faithfully,<br /><br /><br /><strong>Manager / Branch Head</strong><br />Bank of Baroda, {r.branch} Branch</div>
                    </div>
                </div>
            )}
        </>
    );
}

// ---------- The list of saved reports ----------
function ReportActions({ r, onEdit, onCopy, onPrint, onDelete }) {
    const b = 'px-2 py-1 rounded hover:underline';
    return (
        <div className="flex flex-wrap justify-center gap-1 text-xs font-semibold">
            <button type="button" onClick={() => onEdit(r)} className={`${b} text-blue-600 hover:bg-blue-100`}>Edit</button>
            <button type="button" onClick={() => onCopy(r)} className={`${b} text-indigo-600 hover:bg-indigo-100`} title="Start the next inspection of this account from this report">Copy</button>
            <button type="button" onClick={() => onPrint(r)} className={`${b} text-emerald-700 hover:bg-emerald-100`}>Print</button>
            <button type="button" onClick={() => onDelete(r)} className={`${b} text-red-600 hover:bg-red-100`}>Delete</button>
        </div>
    );
}

// iPhone/iPad browsers and Safari may clear a site's saved data when the site has not been used for about a week
const ua = navigator.userAgent;
const MAY_CLEAR_DATA = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    || (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR|Firefox|SamsungBrowser|Android/.test(ua));

function Dashboard({ records, loaded, loadError, search, setSearch, draft, onContinueDraft, onDiscardDraft, lastBackup, onBackup, onLoadBackup, onNew, actions }) {
    const fileRef = useRef(null);
    const q = search.trim().toLowerCase();
    const shown = !q ? records : records.filter(r => [r.name, r.accountNo, r.inspectingOfficer, r.branch, r.dateOfReporting, fmtDate(r.dateOfReporting)]
        .some(v => String(v || '').toLowerCase().includes(q)));
    const changed = records.filter(r => !lastBackup || (r.lastUpdated || '') > lastBackup).length;
    const btn = 'flex items-center gap-1.5 px-3 py-2 rounded text-sm font-semibold border transition';
    return (
        <div className="bg-white rounded-lg shadow border border-slate-200 p-4 sm:p-6">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-4 border-b pb-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Inspection Reports</h2>
                    <p className="text-xs text-slate-500 mt-1">Saved only in this browser on this device. Nothing is sent over the internet.</p>
                    {MAY_CLEAR_DATA && <p className="text-xs text-amber-700 mt-1">On iPhone, iPad and Safari, the browser may clear saved reports if this page is not used for about a week, so back up after each inspection.</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded border">Records: {records.length}</span>
                    <button type="button" onClick={onBackup} className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}><Icons.Download /> Back up</button>
                    <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}><Icons.Upload /> Load backup</button>
                    <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" aria-label="Backup file to load"
                        onChange={e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onLoadBackup(f); }} />
                </div>
            </div>

            <div className="space-y-3 mb-4">
                {draft && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <span><b>Unsaved report:</b> {draftTitle(draft)}{draft.savedAt ? `, last changed ${new Date(draft.savedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}.</span>
                        <span className="flex gap-2">
                            <button type="button" onClick={onContinueDraft} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-semibold">Continue</button>
                            <button type="button" onClick={onDiscardDraft} className="border border-blue-300 hover:bg-blue-100 px-3 py-1.5 rounded font-semibold">Discard</button>
                        </span>
                    </div>
                )}
                {records.length > 0 && changed > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <span>{lastBackup
                            ? <>{plural(changed, 'report')} added or changed since your last backup on {fmtDate(isoDate(new Date(lastBackup)))}.</>
                            : <>These reports are saved only in this browser. Clearing the browser's data or changing the device would lose them, so keep a backup file.</>}</span>
                        <button type="button" onClick={onBackup} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded font-semibold">Back up now</button>
                    </div>
                )}
                {loadError && <Alert kind="error">The saved reports could not be opened: {loadError}</Alert>}
            </div>

            {records.length > 0 && (
                <div className="mb-4 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Icons.Search /></div>
                    <input type="search" aria-label="Search reports" className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg shadow-sm text-sm"
                        placeholder="Search by name, account no., officer, branch or date" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            )}

            {!loaded ? (
                <p className="text-center py-12 text-slate-500">Opening saved reports...</p>
            ) : records.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <p className="mb-4">No inspection reports on this device yet. Start one, or load a backup file.</p>
                    <button type="button" onClick={onNew} className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700">Start First Inspection</button>
                </div>
            ) : shown.length === 0 ? (
                <p className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">No reports match “{search}”.</p>
            ) : (
                <>
                    {/* phones: one card per report */}
                    <ul className="sm:hidden space-y-3">
                        {shown.map(r => (
                            <li key={r.id} className="border border-slate-200 rounded-lg p-3">
                                <div className="flex justify-between gap-2 text-sm">
                                    <span className="font-semibold text-slate-900">{r.name || '(no name)'}</span>
                                    <span className="text-slate-500 shrink-0">{fmtDate(r.dateOfReporting)}</span>
                                </div>
                                <div className="flex justify-between gap-2 text-xs text-slate-600 mt-1">
                                    <span className="font-mono">{r.accountNo}</span><span>DP {money(calcDP(r))}</span>
                                </div>
                                <div className="mt-2 border-t pt-2"><ReportActions r={r} {...actions} /></div>
                            </li>
                        ))}
                    </ul>
                    {/* larger screens: a table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                                <tr><th className="p-3">Date</th><th className="p-3">Account No</th><th className="p-3">Name</th><th className="p-3 text-right">Drawing Power</th><th className="p-3 text-center">Actions</th></tr>
                            </thead>
                            <tbody>
                                {shown.map(r => (
                                    <tr key={r.id} className="border-b border-slate-100 hover:bg-blue-50">
                                        <td className="p-3 font-medium text-slate-900 whitespace-nowrap">{fmtDate(r.dateOfReporting)}</td>
                                        <td className="p-3 font-mono">{r.accountNo}</td>
                                        <td className="p-3">{r.name}</td>
                                        <td className="p-3 text-right font-medium whitespace-nowrap">{money(calcDP(r))}</td>
                                        <td className="p-3"><ReportActions r={r} {...actions} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ---------- The app ----------
function App() {
    const [view, setView] = useState('dashboard');
    const [form, setForm] = useState(blankReport);
    const [records, setRecords] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [toast, setToast] = useState(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [draft, setDraft] = useState(readDraft);
    const [lastBackup, setLastBackup] = useState(() => local.get(KEYS.lastBackup) || '');
    const [printTarget, setPrintTarget] = useState('all');
    const [zoom, setZoom] = useState(1);
    const snapshot = useRef('');        // the report as it was when opened or last saved (JSON)
    const autoFillFor = useRef('');     // account number whose details were last filled in
    const fillDefaults = useRef({});    // the values a new report started with (account details may replace these)
    const filledFor = useRef({});       // details filled in for that account number
    const ownsDraft = useRef(false);    // the report being edited is the one kept as the draft
    const takenDraft = useRef(null);    // the draft that was continued here (it may have been written by another tab)
    const printRequest = useRef(0);     // when a print button was last pressed
    const channel = useRef(null);
    const toastTimer = useRef(null);
    const latest = useRef({});

    const showToast = (text, kind = 'ok') => {
        clearTimeout(toastTimer.current);
        setToast({ text, kind });
        toastTimer.current = setTimeout(() => setToast(null), kind === 'error' ? 7000 : 4000);
    };

    const reload = async () => {
        const list = (await dbAll()).map(normalizeRecord).sort(byNewest);
        setRecords(list);
        return list;
    };
    useEffect(() => {
        reload().catch(e => setLoadError(errorText(e))).finally(() => setLoaded(true));
    }, []);

    // Other tabs with this page open are kept in step: the list of reports, the draft notice and the last backup date
    useEffect(() => {
        const onStorage = e => {
            if (e.key === KEYS.draft || e.key === null) setDraft(readDraft());
            if (e.key === KEYS.lastBackup || e.key === null) setLastBackup(local.get(KEYS.lastBackup) || '');
        };
        window.addEventListener('storage', onStorage);
        let bc = null;
        if (typeof BroadcastChannel === 'function') {
            bc = new BroadcastChannel('godown-inspection');
            bc.onmessage = () => { reload().catch(() => {}); };
            channel.current = bc;
        }
        return () => { window.removeEventListener('storage', onStorage); if (bc) bc.close(); };
    }, []);
    const announce = () => { try { if (channel.current) channel.current.postMessage('changed'); } catch (e) { /* ignore */ } };

    const editing = view === 'form' || view === 'preview';
    const formJson = JSON.stringify(form);
    const dirty = editing && formJson !== snapshot.current;

    // Unsaved work is kept as a draft in this browser, so it survives going back to the list, closing the tab or a crash
    const saveDraftNow = () => {
        const s = latest.current;
        if (!s.dirty || !ownsDraft.current) return;
        const d = { form: s.form, base: s.base, savedAt: new Date().toISOString(), session: SESSION };
        if (local.set(KEYS.draft, JSON.stringify(d))) setDraft(d);
    };
    const dropOwnDraft = () => {   // only the draft written here (or the one continued here), never another tab's
        const d = readDraft(), t = takenDraft.current;
        if (d && (d.session === SESSION || (t && d.session === t.session && d.savedAt === t.savedAt))) { local.del(KEYS.draft); setDraft(null); }
    };
    latest.current = { form, dirty, base: snapshot.current };
    useEffect(() => {
        if (!editing || !ownsDraft.current) return undefined;
        if (!dirty) { dropOwnDraft(); return undefined; }
        const t = setTimeout(saveDraftNow, 400);
        return () => clearTimeout(t);
    }, [formJson, editing]);
    useEffect(() => {
        const onHide = () => saveDraftNow();
        const onVis = () => { if (document.visibilityState === 'hidden') saveDraftNow(); };
        window.addEventListener('pagehide', onHide);
        document.addEventListener('visibilitychange', onVis);
        return () => { window.removeEventListener('pagehide', onHide); document.removeEventListener('visibilitychange', onVis); };
    }, []);

    // Only one report at a time is kept as a draft: before editing another one, the waiting draft is discarded (after asking)
    const claimDraft = keep => {
        const d = readDraft();   // read afresh: another tab may have changed it
        if (d && !keep) {
            if (!window.confirm(`You have an unsaved report (${draftTitle(d)}). Discard it and continue?`)) return false;
            local.del(KEYS.draft);
            setDraft(null);
        }
        takenDraft.current = keep && d ? { session: d.session, savedAt: d.savedAt } : null;
        ownsDraft.current = true;
        return true;
    };

    // Open a report in the form, or in the preview to print it
    const openReport = (data, nextView = 'form', opts = {}) => {
        if (nextView === 'form') { if (!claimDraft(opts.keepDraft)) return false; }
        else ownsDraft.current = false;
        const r = normalizeRecord(data);
        snapshot.current = opts.base !== undefined ? opts.base : JSON.stringify(r);
        autoFillFor.current = r.id ? r.accountNo : (opts.autoFillFor !== undefined ? opts.autoFillFor : r.accountNo);
        fillDefaults.current = opts.defaults || r;
        filledFor.current = {};
        setForm(r);
        setView(nextView);
        return true;
    };
    const newReport = () => {
        const r = blankReport();
        const last = records[0];   // a new report starts with the branch details of the latest one
        if (last) ['branch', 'branchAlpha', 'region', 'inspectingOfficer'].forEach(k => { r[k] = last[k]; });
        openReport(r);
    };
    const actions = {
        onEdit: r => openReport(r),
        onCopy: r => {
            if (openReport({ ...r, id: '', lastUpdated: '', dpRule: 'paid-stock', dateOfReporting: todayLocal(), dateOfVerification: todayLocal() }, 'form', { autoFillFor: r.accountNo })) {
                showToast('Copied for a new inspection with today’s date. Check every answer before saving.');
            }
        },
        onPrint: r => openReport(r, 'preview'),
        onDelete: async r => {
            if (!window.confirm(`Delete the report of ${r.name || r.accountNo} dated ${fmtDate(r.dateOfReporting)}? This cannot be undone.`)) return;
            try { await dbDelete(r.id); await reload(); announce(); showToast('Report deleted.'); }
            catch (e) { showToast('The report could not be deleted: ' + errorText(e), 'error'); }
        }
    };
    const continueDraft = () => {
        const d = readDraft();
        if (!d) { setDraft(null); showToast('That unsaved report is no longer here (it was saved or discarded in another tab).', 'error'); return; }
        openReport(d.form, 'form', { keepDraft: true, base: d.base || '', defaults: normalizeRecord(blankReport()) });
    };
    const discardDraft = () => {
        const d = readDraft();
        if (d && !window.confirm(`Discard the unsaved report (${draftTitle(d)})?`)) return;
        local.del(KEYS.draft);
        setDraft(null);
    };
    const goHome = () => {
        if (view === 'dashboard') return;
        if (dirty) { saveDraftNow(); showToast('Your unsaved changes are kept. Use “Continue” to carry on.'); }
        ownsDraft.current = false;
        setView('dashboard');
    };
    const editFromPreview = () => {
        if (!ownsDraft.current && !claimDraft(false)) return;
        setView('form');
    };

    const set = (name, value) => setForm(prev => applyChange(prev, name, value));
    const onAccountBlur = () => {
        const acc = form.accountNo;
        if (form.id || !acc || acc === autoFillFor.current) return;
        autoFillFor.current = acc;
        const last = records.find(r => r.accountNo === acc);
        const { next, filled, cleared } = fillAccountDetails(form, last, fillDefaults.current, filledFor.current);
        filledFor.current = filled;
        if (!Object.keys(filled).length && !cleared) return;
        setForm(next);
        showToast(Object.keys(filled).length
            ? `Account details filled from the report dated ${fmtDate(last.dateOfReporting)}. Please check them.`
            : 'The details filled in for the previous account number have been cleared.');
    };

    // The browser's own checks plus the date rules
    const validate = () => {
        const f = document.getElementById('inspectionForm');
        if (!f) return true;
        setDateChecks(f);
        return f.reportValidity();
    };
    const preview = () => { if (validate()) setView('preview'); };
    const save = async () => {
        if (view === 'form' && !validate()) return;
        setSaving(true);
        try {
            if (form.id) {
                // The report may have been changed since it was opened here (a loaded backup, or another tab)
                let base = {};
                try { base = JSON.parse(snapshot.current || '{}') || {}; } catch (e) { base = {}; }
                const stored = await dbGet(form.id);
                if (stored && (stored.lastUpdated || '') !== (base.lastUpdated || '')
                    && !window.confirm('This report was changed after you started editing it (for example, by loading a backup, or in another tab). Save your version over it?')) return;
            }
            const rec = { ...form, id: form.id || String(Date.now()), percentOldStock: oldStockPct(form), lastUpdated: new Date().toISOString() };
            await dbPut([rec]);
            snapshot.current = JSON.stringify(rec);
            autoFillFor.current = rec.accountNo;
            setForm(rec);
            dropOwnDraft();
            await reload();
            announce();
            requestPersistence();
            showToast('Report saved on this device.');
            setView('preview');
        } catch (e) {
            showToast('The report could not be saved: ' + errorText(e), 'error');
        } finally {
            setSaving(false);
        }
    };

    const backUp = async () => {
        if (!records.length) { showToast('There are no reports to back up yet.', 'error'); return; }
        let result;
        try { result = await saveBackupFile(records); }
        catch (e) { showToast('The backup could not be saved: ' + errorText(e), 'error'); return; }
        if (result === 'cancelled') { showToast('Backup cancelled.'); return; }
        const now = new Date().toISOString();
        local.set(KEYS.lastBackup, now);
        setLastBackup(now);
        showToast(result === 'saved'
            ? `Backup of ${plural(records.length, 'report')} saved.`
            : `Backup of ${plural(records.length, 'report')} downloaded. Keep the file in a safe place.`);
    };
    const loadBackup = async file => {
        try {
            const incoming = readBackup(await readFileText(file));
            const { added, updated, same } = await dbMerge(incoming);
            await reload();
            announce();
            requestPersistence();
            showToast(`Backup loaded: ${added} new, ${updated} updated${same ? `, ${same} already on this device` : ''}.`);
        } catch (e) {
            showToast(errorText(e), 'error');
        }
    };

    // Printing: everything, or one document at a time. A print started from the browser's own menu prints everything.
    const printDocs = target => {
        printRequest.current = Date.now();
        ReactDOM.flushSync(() => setPrintTarget(target));
        window.print();
    };
    useEffect(() => {
        const before = () => {
            if (Date.now() - printRequest.current < 30000) { printRequest.current = 0; return; }   // started by a print button
            ReactDOM.flushSync(() => setPrintTarget('all'));
        };
        window.addEventListener('beforeprint', before);
        return () => window.removeEventListener('beforeprint', before);
    }, []);

    // The A4 preview shrinks to fit narrow screens
    useEffect(() => {
        if (view !== 'preview') return undefined;
        const fit = () => setZoom(Math.min(1, Math.max(0.3, (document.documentElement.clientWidth - 32) / 794)));
        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, [view]);
    useEffect(() => { window.scrollTo(0, 0); }, [view]);

    const officers = Array.from(new Set(records.map(r => r.inspectingOfficer).filter(Boolean)));
    const findings = editing ? analyse(form) : null;
    const headBtn = 'flex items-center gap-2 text-white px-3 py-2 rounded text-sm font-medium transition-colors';
    const printBtn = 'flex items-center gap-1.5 px-3 py-2 rounded text-sm font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700';

    return (
        <div className="min-h-screen flex flex-col font-sans print:block print:min-h-0">
            <div className="no-print bg-slate-900 text-white shadow-md z-10 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <button type="button" onClick={goHome} title="All reports" aria-label="All reports"
                            className={`p-2 rounded transition ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}><Icons.Home /></button>
                        <h1 className="font-bold text-lg tracking-wide hidden sm:block truncate">Godown Inspector Pro <span className="text-xs text-emerald-400 font-normal ml-2">Offline · saved on this device</span></h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {dirty && <span className="text-xs text-amber-300 hidden md:inline">Unsaved changes</span>}
                        {view === 'dashboard' && <button type="button" onClick={newReport} className={`${headBtn} bg-blue-600 hover:bg-blue-500`}><Icons.Plus /> New Report</button>}
                        {(view === 'form' || (view === 'preview' && dirty)) && (
                            <button type="button" onClick={save} disabled={saving} className={`${headBtn} bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50`}>
                                <Icons.Save /> {saving ? 'Saving...' : 'Save Data'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {toast && (
                <div role="status" className={`no-print fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-md text-white px-5 py-3 rounded shadow-lg z-50 font-medium ${toast.kind === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {toast.text}
                </div>
            )}

            <div className="flex-1 bg-slate-100 p-3 sm:p-4 print:p-0 print:bg-white">
                <div className="max-w-6xl mx-auto print:max-w-none">
                    {view === 'dashboard' && (
                        <Dashboard records={records} loaded={loaded} loadError={loadError} search={search} setSearch={setSearch}
                            draft={draft} onContinueDraft={continueDraft} onDiscardDraft={discardDraft}
                            lastBackup={lastBackup} onBackup={backUp} onLoadBackup={loadBackup} onNew={newReport} actions={actions} />
                    )}

                    {view === 'form' && (
                        <InspectionForm form={form} set={set} officers={officers} onAccountBlur={onAccountBlur} onPreview={preview} onSave={save} saving={saving} />
                    )}

                    {view === 'preview' && (
                        <>
                            <div className="no-print bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-4 flex flex-wrap items-center gap-2">
                                <button type="button" onClick={editFromPreview} className={printBtn}><Icons.Edit /> Edit</button>
                                <span className="text-sm font-semibold text-slate-500 ml-1">Print:</span>
                                <button type="button" onClick={() => printDocs('all')} className={`${printBtn} !bg-slate-700 !text-white !border-slate-700 hover:!bg-slate-600`}><Icons.Print /> All documents</button>
                                <button type="button" onClick={() => printDocs('report')} className={printBtn}>Report</button>
                                <button type="button" onClick={() => printDocs('memo')} className={printBtn}>Internal memo</button>
                                {findings.borrower.length > 0 && <button type="button" onClick={() => printDocs('letter')} className={printBtn}>Letter to borrower</button>}
                                <p className="w-full text-xs text-slate-500">For double-sided printing, print each document on its own, so the letter to the borrower does not land on the back of the internal memo.</p>
                            </div>
                            <div id="report-container" className="relative" style={{ zoom }}>
                                <Documents r={form} findings={findings} printTarget={printTarget} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
