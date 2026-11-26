"use strict";

const certificates = [
    { amount: 29000, issueDate: "2025-03-17", dueDate: "2028-03-18", interest: 26 },
    { amount: 11000, issueDate: "2024-12-08", dueDate: "2027-12-10", interest: 26 },
    { amount: 20000, issueDate: "2024-10-14", dueDate: "2027-10-15", interest: 26 },
    { amount: 33000, issueDate: "2024-03-23", dueDate: "2027-03-24", interest: 26 },
    { amount: 12000, issueDate: "2023-11-29", dueDate: "2026-11-30", interest: 19 },
    { amount: 13000, issueDate: "2023-12-27", dueDate: "2026-12-28", interest: 19 },
    { amount: 35000, issueDate: "2026-11-26", dueDate: null, interest: 18.75, type: "fixed" },
    { amount: 25000, issueDate: "2026-03-23", dueDate: null, interest: null }
];

const number = new Intl.NumberFormat("en-GB");
const arabicDate = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
});
const cairoCalendar = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Cairo"
});
const calendarParts = Object.fromEntries(cairoCalendar.formatToParts().map(({ type, value }) => [type, value]));
const today = [calendarParts.year, calendarParts.month, calendarParts.day].join("-");
const statuses = {
    upcoming: "استحقاق قادم",
    due: "حلّ موعد الاستحقاق"
};
const types = { fixed: "ثابت", unknown: "غير مسجّل" };
const labels = ["قيمة الشهادة", "تاريخ الإصدار", "تاريخ الاستحقاق", "العائد", "الحالة"];
const searchTerms = /\b\d{1,2}\s+(?:يناير|فبراير|مارس|ابريل|مايو|يونيو|يوليو|اغسطس|سبتمبر|اكتوبر|نوفمبر|ديسمبر)(?:\s+\d{4}\b)?|\S+/g;

const get = (id) => document.getElementById(id);
const filterForm = get("filters");
const tableBody = get("statementBody");
const emptyState = get("emptyState");
const resetButton = get("resetFilters");
const daySortToggle = get("daySortToggle");
const sortSelect = get("sortBy");
const directionSelect = get("sortDirection");
let sortByDay = false;
const columns = {
    amount: ({ amount }) => amount,
    issueDate: ({ issueDate }) => issueDate,
    dueDate: ({ dueDate }) => dueDate,
    interest: ({ interest }) => interest,
    dueDay: ({ dueDate }) => Number(dueDate.slice(-2))
};

function defaultDueDate(issueDate) {
    const [year, month, day] = issueDate.split("-").map(Number);
    const dueYear = year + 3;
    const lastDayOfMonth = new Date(Date.UTC(dueYear, month, 0)).getUTCDate();
    return [dueYear, month, Math.min(day, lastDayOfMonth)]
        .map((part) => String(part).padStart(2, "0")).join("-");
}

function formatDate(isoDate) {
    const [year, month, day] = isoDate.split("-");
    return [day, month, year].join("/");
}

function interestText(value) {
    return number.format(value) + "%";
}

function total(entries) {
    return entries.reduce((sum, { amount }) => sum + amount, 0);
}

function normalize(text) {
    return String(text).normalize("NFKC")
        .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
        .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
        .replace(/[٬,]/g, "")
        .replace(/٫/g, ".")
        .replace(/٪/g, "%")
        .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u0640]/g, "")
        .replace(/[أإآ]/g, "ا")
        .toLowerCase();
}

const records = certificates.map((certificate) => {
    const { amount, issueDate, interest = null, type = "unknown" } = certificate;
    const dueDate = certificate.dueDate || defaultDueDate(issueDate);
    const status = dueDate <= today ? "due" : "upcoming";
    const dateTerms = [issueDate, dueDate]
        .flatMap((value) => [value, formatDate(value), arabicDate.format(new Date(value))]);
    const searchText = normalize([
        amount, ...dateTerms, interest === null ? "العائد غير مسجّل" : interestText(interest),
        types[type], statuses[status]
    ].join(" "));
    return { ...certificate, dueDate, interest, type, status, searchText };
});
const knownRates = [...new Set(records.map(({ interest }) => interest).filter((rate) => rate !== null))]
    .sort((a, b) => a - b);

function addOptions(id, values, format) {
    const select = get(id);
    for (const value of values) {
        select.add(new Option(format(value), value));
    }
}

function renderSummary() {
    const nextDue = records.filter(({ status }) => status === "upcoming")
        .map(({ dueDate }) => dueDate).sort()[0];

    get("today").dateTime = today;
    get("today").textContent = formatDate(today);
    get("totalAmount").textContent = number.format(total(records));
    get("certificateCount").textContent = number.format(records.length);
    get("nextMaturity").textContent = nextDue ? formatDate(nextDue) : "لا يوجد موعد قادم";
    get("topInterest").textContent = knownRates.length ? interestText(knownRates.at(-1)) : "غير مسجّل";
}

function cell(row, column) {
    const element = row.insertCell();
    element.setAttribute("role", "cell");
    const label = document.createElement("span");
    label.className = "mobile-label";
    label.textContent = labels[column];
    label.setAttribute("aria-hidden", "true");
    element.append(label);
    return element;
}

function dateCell(row, column, value) {
    const element = document.createElement("time");
    element.dateTime = value;
    element.dir = "ltr";
    element.className = "entry-date";
    element.textContent = formatDate(value);
    cell(row, column).append(element);
}

function renderInterest(entry, target) {
    const value = document.createElement("span");
    target.append(value);
    if (entry.interest === null) {
        value.className = "muted";
        value.textContent = "غير مسجّل";
        return;
    }

    const rate = document.createElement("bdi");
    rate.className = "rate";
    rate.dir = "ltr";
    rate.textContent = interestText(entry.interest);
    const type = document.createElement("span");
    type.className = "muted";
    type.textContent = entry.type === "unknown" ? "نوع العائد غير مسجّل" : types[entry.type];
    value.className = "interest-value";
    value.append(rate, type);
}

function renderRow(entry, index) {
    const row = document.createElement("tr");
    row.setAttribute("role", "row");
    row.style.setProperty("--row-order", Math.min(index, 8));

    const amountCell = cell(row, 0);
    amountCell.className = "amount-cell";
    const amount = document.createElement("bdi");
    amount.className = "amount";
    amount.textContent = number.format(entry.amount);
    const amountValue = document.createElement("span");
    amountValue.className = "amount-value";
    amountValue.append(amount, " جنيه");
    amountCell.append(amountValue);

    dateCell(row, 1, entry.issueDate);
    dateCell(row, 2, entry.dueDate);

    renderInterest(entry, cell(row, 3));

    const statusCell = cell(row, 4);
    statusCell.className = "status-cell";
    const status = document.createElement("span");
    status.className = "status " + entry.status;
    status.textContent = statuses[entry.status];
    statusCell.append(status);
    return row;
}

function sortRecords(entries, property, direction) {
    const valueOf = columns[property];
    return entries.sort((left, right) => {
        const a = valueOf(left);
        const b = valueOf(right);
        if (a === b) return 0;
        if (a === null) return 1;
        if (b === null) return -1;
        return (a < b ? -1 : 1) * direction;
    });
}

function render() {
    const query = normalize(get("search").value).replace(/\s+/g, " ").match(searchTerms) ?? [];
    const status = get("statusFilter").value;
    const rate = get("rateFilter").value;
    const requestedRate = rate === "unknown" ? null : Number(rate);
    const type = get("typeFilter").value;
    const year = get("yearFilter").value;
    const minInput = get("minimum");
    const maxInput = get("maximum");
    const min = minInput.value ? minInput.valueAsNumber : 0;
    const max = maxInput.value ? maxInput.valueAsNumber : Infinity;
    const sortBy = sortSelect.value;
    const direction = directionSelect.value === "asc" ? 1 : -1;
    const invalidRange = !minInput.validity.valid || !maxInput.validity.valid || min > max;
    const advancedCount = get("advancedCount");
    const activeAdvanced = [rate, type, year, minInput.value, maxInput.value].filter(Boolean).length;

    const entries = invalidRange ? [] : records.filter((entry) =>
        query.every((term) => term.includes(" ")
            ? (" " + entry.searchText + " ").includes(" " + term + " ")
            : entry.searchText.includes(term)) &&
        (!status || entry.status === status) &&
        (!rate || entry.interest === requestedRate) &&
        (!type || entry.type === type) &&
        (!year || entry.dueDate.startsWith(year)) &&
        entry.amount >= min && entry.amount <= max
    );

    const sorted = sortRecords(entries, sortByDay ? "dueDay" : sortBy, sortByDay ? 1 : direction);
    tableBody.replaceChildren(...sorted.map(renderRow));
    get("resultCount").textContent = "عرض " + sorted.length + " من " + records.length;
    get("filteredTotal").textContent = number.format(total(sorted));
    emptyState.hidden = sorted.length > 0;
    emptyState.textContent = invalidRange
        ? "أدخل نطاق مبالغ صحيحًا. أقل قيمة لا يمكن أن تتجاوز أعلى قيمة."
        : "مفيش شهادات مطابقة للفلاتر الحالية.";
    advancedCount.hidden = activeAdvanced === 0;
    advancedCount.textContent = activeAdvanced;
    resetButton.disabled = !(query.length || status || activeAdvanced || invalidRange || sortByDay || sortBy !== "issueDate" || direction !== -1);
}

function setDaySort(enabled) {
    sortByDay = enabled;
    daySortToggle.setAttribute("aria-pressed", String(enabled));
    sortSelect.disabled = enabled;
    directionSelect.disabled = enabled;
}

function playCoinBurst() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const button = daySortToggle.getBoundingClientRect();
    const origin = document.createElement("div");
    origin.className = "coin-burst";
    origin.style.left = (button.left + button.width / 2) + "px";
    origin.style.top = (button.top + button.height / 2) + "px";

    const coinCount = 16;
    const spread = Math.min(window.innerWidth * .31, 168);
    for (let index = 0; index < coinCount; index += 1) {
        const degrees = -176 + index * 174 / (coinCount - 1) + Math.random() * 8;
        const angle = degrees * Math.PI / 180;
        const distance = spread * (.55 + Math.random() * .45);
        const apex = Math.sin(angle) * distance - 22;
        const coin = document.createElement("span");
        coin.className = "burst-coin";
        coin.textContent = "ج";
        coin.style.setProperty("--flight-x", Math.cos(angle) * distance + "px");
        coin.style.setProperty("--apex-y", apex + "px");
        coin.style.setProperty("--landing-y", (apex * .25 + 45 + Math.random() * 35) + "px");
        coin.style.setProperty("--coin-size", (14 + Math.random() * 12) + "px");
        coin.style.setProperty("--coin-spin", (index % 2 ? 1 : -1) * (270 + Math.random() * 420) + "deg");
        coin.style.setProperty("--coin-duration", (720 + Math.random() * 240) + "ms");
        origin.append(coin);
    }

    get("coinLayer").replaceChildren(origin);
    window.setTimeout(() => origin.remove(), 1000);
}

addOptions("rateFilter", knownRates, interestText);
addOptions("yearFilter", [...new Set(records.map(({ dueDate }) => dueDate.slice(0, 4)))].sort(), String);
filterForm.addEventListener("input", render);
filterForm.addEventListener("submit", (event) => event.preventDefault());
daySortToggle.hidden = false;
daySortToggle.addEventListener("click", () => {
    setDaySort(!sortByDay);
    render();
    playCoinBurst();
});
resetButton.addEventListener("click", () => {
    filterForm.reset();
    setDaySort(false);
    get("search").focus();
    render();
});

renderSummary();
render();
