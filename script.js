// -----------------------------
// Expense Tracker App
// -----------------------------
// This file contains all application logic:
// - Managing expenses in memory
// - Persisting to localStorage
// - Filtering, sorting, and searching
// - Generating charts with Chart.js
// - Handling light/dark theme
// -----------------------------

// Storage key used for saving expenses in localStorage.
const STORAGE_KEY_EXPENSES = "expenseTracker:expenses";
// Storage key used for saving theme preference in localStorage.
const STORAGE_KEY_THEME = "expenseTracker:theme";

// In-memory list of expenses loaded from localStorage.
let expenses = [];

// Keep a reference to the Chart.js instance so it can be updated/destroyed.
let categoryChart = null;

// -------------- Utility Functions --------------

/**

Generate a unique ID for each expense.

Combines current timestamp and a random number.
*/
function generateId() {
return (
Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
);
}

/**

Format a number as currency (₹).

Uses Intl.NumberFormat for consistent formatting.
*/
function formatCurrency(amount) {
return new Intl.NumberFormat("en-IN", {
style: "currency",
currency: "INR",
maximumFractionDigits: 2,
}).format(amount);
}

/**

Format a date string (YYYY-MM-DD) into a more readable format.
*/
function formatDate(isoDate) {
const date = new Date(isoDate);
if (isNaN(date.getTime())) return isoDate;
return date.toLocaleDateString("en-IN", {
year: "numeric",
month: "short",
day: "numeric",
});
}

/**

Get the year-month key (YYYY-MM) for a given Date or date string.
*/
function getYearMonthKey(dateInput) {
const date = new Date(dateInput);
if (isNaN(date.getTime())) return "";
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
return ${year}-${month};
}

// -------------- Local Storage Handling --------------

/**

Load expenses array from localStorage.

Explanation:

localStorage stores only strings.​

Data is saved as JSON with JSON.stringify and parsed back using JSON.parse.​
*/
function loadExpensesFromStorage() {
try {
const stored = localStorage.getItem(STORAGE_KEY_EXPENSES); //​
if (!stored) {
expenses = [];
return;
}
const parsed = JSON.parse(stored);
if (Array.isArray(parsed)) {
expenses = parsed;
} else {
expenses = [];
}
} catch (err) {
console.error("Failed to load expenses from localStorage", err);
expenses = [];
}
}

/**

Save current expenses array into localStorage.

Uses JSON.stringify because localStorage can only save strings.​
*/
function saveExpensesToStorage() {
try {
const data = JSON.stringify(expenses);
localStorage.setItem(STORAGE_KEY_EXPENSES, data); //​
} catch (err) {
console.error("Failed to save expenses to localStorage", err);
}
}

/**

Load theme preference from localStorage and apply to <body>.
*/
function loadThemeFromStorage() {
try {
const theme = localStorage.getItem(STORAGE_KEY_THEME); //​
if (theme === "dark" || theme === "light") {
document.body.setAttribute("data-theme", theme);
} else {
document.body.setAttribute("data-theme", "light");
}
} catch {
document.body.setAttribute("data-theme", "light");
}
}

/**

Save selected theme to localStorage for persistence.​
*/
function saveThemeToStorage(theme) {
try {
localStorage.setItem(STORAGE_KEY_THEME, theme);
} catch (err) {
console.error("Failed to save theme", err);
}
}

// -------------- DOM Helpers --------------

/**

Get references to all important DOM elements once.
*/
const elements = {
expenseForm: document.getElementById("expenseForm"),
expenseId: document.getElementById("expenseId"),
amount: document.getElementById("amount"),
category: document.getElementById("category"),
date: document.getElementById("date"),
description: document.getElementById("description"),
resetFormBtn: document.getElementById("resetFormBtn"),
exportCsvBtn: document.getElementById("exportCsvBtn"),
clearAllBtn: document.getElementById("clearAllBtn"),
searchInput: document.getElementById("searchInput"),
filterMonth: document.getElementById("filterMonth"),
filterCategory: document.getElementById("filterCategory"),
sortBy: document.getElementById("sortBy"),
expenseTableBody: document.getElementById("expenseTableBody"),
emptyState: document.getElementById("emptyState"),
totalThisMonth: document.getElementById("totalThisMonth"),
currentMonthLabel: document.getElementById("currentMonthLabel"),
allTimeTotal: document.getElementById("allTimeTotal"),
topCategory: document.getElementById("topCategory"),
topCategoryAmount: document.getElementById("topCategoryAmount"),
transactionCount: document.getElementById("transactionCount"),
themeToggle: document.getElementById("themeToggle"),
confirmModal: document.getElementById("confirmModal"),
confirmCancelBtn: document.getElementById("confirmCancelBtn"),
confirmOkBtn: document.getElementById("confirmOkBtn"),
confirmTitle: document.getElementById("confirmTitle"),
confirmMessage: document.getElementById("confirmMessage"),
chartTypeButtons: document.querySelectorAll(
"[data-chart-type]"
),
};

/**

Open confirmation modal with a message and callback.

This is used, for example, before clearing all data.
*/
let confirmCallback = null;
function openConfirmModal({ title, message, onConfirm }) {
elements.confirmTitle.textContent = title;
elements.confirmMessage.textContent = message;
confirmCallback = onConfirm;
elements.confirmModal.classList.remove("hidden");
}

/**

Close the confirmation modal.
*/
function closeConfirmModal() {
elements.confirmModal.classList.add("hidden");
confirmCallback = null;
}

// -------------- Expense CRUD Functions --------------

/**

Create a new expense object from form values.
*/
function createExpenseFromForm() {
const amountValue = parseFloat(elements.amount.value);
if (isNaN(amountValue) || amountValue <= 0) {
alert("Please enter a valid amount greater than 0.");
return null;
}

const categoryValue = elements.category.value.trim();
const dateValue = elements.date.value;
const descriptionValue = elements.description.value.trim();

if (!categoryValue || !dateValue || !descriptionValue) {
alert("Please fill in all fields.");
return null;
}

return {
id: generateId(),
amount: amountValue,
category: categoryValue,
date: dateValue,
description: descriptionValue,
createdAt: new Date().toISOString(),
};
}

/**

Handle form submission:

If expenseId is empty => create new expense.

If expenseId has value => update existing expense.
*/
function handleFormSubmit(event) {
event.preventDefault();

const editingId = elements.expenseId.value;

if (editingId) {
// Editing existing expense
const index = expenses.findIndex((e) => e.id === editingId);
if (index === -1) {
alert("Could not find expense to update.");
return;
}
const updatedAmount = parseFloat(elements.amount.value);
if (isNaN(updatedAmount) || updatedAmount <= 0) {
  alert("Please enter a valid amount greater than 0.");
  return;
}

expenses[index].amount = updatedAmount;
expenses[index].category = elements.category.value.trim();
expenses[index].date = elements.date.value;
expenses[index].description = elements.description.value.trim();

saveExpensesToStorage();
resetForm();
refreshUI();
} else {
// Creating a new expense
const newExpense = createExpenseFromForm();
if (!newExpense) return;
expenses.push(newExpense);
saveExpensesToStorage();
resetForm();
refreshUI();
}
}

/**

Fill the form fields with an existing expense,

enabling user to edit it.
*/
function populateFormForEdit(expense) {
elements.expenseId.value = expense.id;
elements.amount.value = expense.amount;
elements.category.value = expense.category;
elements.date.value = expense.date;
elements.description.value = expense.description;
}

/**

Reset the form fields and clear editing state.
*/
function resetForm() {
elements.expenseId.value = "";
elements.expenseForm.reset();
}

/**

Delete an expense by ID from the list and update storage + UI.
*/
function deleteExpense(id) {
expenses = expenses.filter((e) => e.id !== id);
saveExpensesToStorage();
refreshUI();
}

/**

Clear all expenses from memory and localStorage.
*/
function clearAllExpenses() {
expenses = [];
saveExpensesToStorage();
refreshUI();
}

// -------------- Filtering, Searching, Sorting --------------

/**

Get filtered, searched, and sorted list of expenses.

Explanation of filtering:

Search (description or category, case-insensitive)

Filter by month (YYYY-MM), using getYearMonthKey

Filter by category (exact match)

Sort using selected option (date/amount ascending/descending)
*/
function getProcessedExpenses() {
const searchQuery = elements.searchInput.value.trim().toLowerCase();
const filterMonth = elements.filterMonth.value;
const filterCategory = elements.filterCategory.value;
const sortBy = elements.sortBy.value;

let list = [...expenses];

// Search by description or category
if (searchQuery) {
list = list.filter((expense) => {
const inDescription = expense.description
.toLowerCase()
.includes(searchQuery);
const inCategory = expense.category.toLowerCase().includes(searchQuery);
return inDescription || inCategory;
});
}

// Filter by month (YYYY-MM)
if (filterMonth) {
list = list.filter(
(expense) => getYearMonthKey(expense.date) === filterMonth
);
}

// Filter by category
if (filterCategory) {
list = list.filter((expense) => expense.category === filterCategory);
}

// Sorting
list.sort((a, b) => {
if (sortBy === "dateDesc") {
return new Date(b.date) - new Date(a.date);
}
if (sortBy === "dateAsc") {
return new Date(a.date) - new Date(b.date);
}
if (sortBy === "amountDesc") {
return b.amount - a.amount;
}
if (sortBy === "amountAsc") {
return a.amount - b.amount;
}
return 0;
});

return list;
}

// -------------- Rendering UI --------------

/**

Render the expenses table based on filtered/sorted data.
*/
function renderTable() {
const processed = getProcessedExpenses();

elements.expenseTableBody.innerHTML = "";

if (processed.length === 0) {
elements.emptyState.style.display = "block";
return;
}

elements.emptyState.style.display = "none";

for (const expense of processed) {
const tr = document.createElement("tr");
const tdDate = document.createElement("td");
tdDate.textContent = formatDate(expense.date);

const tdDescription = document.createElement("td");
tdDescription.textContent = expense.description;

const tdCategory = document.createElement("td");
tdCategory.textContent = expense.category;

const tdAmount = document.createElement("td");
tdAmount.textContent = formatCurrency(expense.amount);

const tdActions = document.createElement("td");
const actionsDiv = document.createElement("div");
actionsDiv.className = "table-actions";

const editBtn = document.createElement("button");
editBtn.className = "btn btn-small btn-outline";
editBtn.textContent = "Edit";
editBtn.addEventListener("click", () => populateFormForEdit(expense));

const deleteBtn = document.createElement("button");
deleteBtn.className = "btn btn-small btn-danger";
deleteBtn.textContent = "Delete";
deleteBtn.addEventListener("click", () => {
  openConfirmModal({
    title: "Delete Expense",
    message: "Are you sure you want to delete this expense?",
    onConfirm: () => {
      deleteExpense(expense.id);
    },
  });
});

actionsDiv.appendChild(editBtn);
actionsDiv.appendChild(deleteBtn);
tdActions.appendChild(actionsDiv);

tr.appendChild(tdDate);
tr.appendChild(tdDescription);
tr.appendChild(tdCategory);
tr.appendChild(tdAmount);
tr.appendChild(tdActions);

elements.expenseTableBody.appendChild(tr);
}
}

/**

Compute and render summary statistics (cards).

Total this month

All-time total

Top category (by total)

Transaction count
*/
function renderSummary() {
const now = new Date();
const currentMonthKey = getYearMonthKey(now);

let thisMonthTotal = 0;
let allTimeTotal = 0;
let transactionCount = expenses.length;

// Category totals for finding top category and chart data.
const categoryTotals = {};

for (const e of expenses) {
allTimeTotal += e.amount;
const ymKey = getYearMonthKey(e.date);
if (ymKey === currentMonthKey) {
  thisMonthTotal += e.amount;
}

if (!categoryTotals[e.category]) {
  categoryTotals[e.category] = 0;
}
categoryTotals[e.category] += e.amount;
}

elements.totalThisMonth.textContent = formatCurrency(thisMonthTotal);
elements.allTimeTotal.textContent = formatCurrency(allTimeTotal);
elements.transactionCount.textContent = transactionCount.toString();

// Show label for current month (e.g. "December 2025")
elements.currentMonthLabel.textContent = now.toLocaleDateString("en-IN", {
year: "numeric",
month: "long",
});

// Determine top category
let topCategoryName = "–";
let topCategoryAmount = 0;
for (const [category, total] of Object.entries(categoryTotals)) {
if (total > topCategoryAmount) {
topCategoryAmount = total;
topCategoryName = category;
}
}

elements.topCategory.textContent = topCategoryName;
elements.topCategoryAmount.textContent =
topCategoryAmount > 0 ? formatCurrency(topCategoryAmount) : "";
}

/**

Render (or update) the category-wise spending chart using Chart.js.

Chart.js explanation:

A <canvas> element in HTML is selected with getElementById.

new Chart(ctx, config) creates the chart.​

Data is passed as labels and datasets; config includes type and options.​
*/
function renderChart(chartType = "pie") {
const ctx = document.getElementById("categoryChart");
if (!ctx || typeof Chart === "undefined") {
return;
}

// Aggregate totals by category from filtered list (so chart reflects filters).
const processed = getProcessedExpenses();
const categoryTotals = {};
for (const e of processed) {
if (!categoryTotals[e.category]) {
categoryTotals[e.category] = 0;
}
categoryTotals[e.category] += e.amount;
}

const labels = Object.keys(categoryTotals);
const data = Object.values(categoryTotals);

// If no data, destroy existing chart and do nothing.
if (labels.length === 0) {
if (categoryChart) {
categoryChart.destroy();
categoryChart = null;
}
return;
}

// Destroy previous chart instance to avoid memory leaks.
if (categoryChart) {
categoryChart.destroy();
}

categoryChart = new Chart(ctx, {
type: chartType,
data: {
labels,
datasets: [
{
label: "Spending by Category",
data,
backgroundColor: [
"#2563eb",
"#10b981",
"#f97316",
"#ef4444",
"#8b5cf6",
"#ec4899",
"#22c55e",
"#facc15",
],
borderWidth: 1,
},
],
},
options: {
responsive: true,
plugins: {
legend: {
position: "bottom",
labels: {
usePointStyle: true,
},
},
tooltip: {
callbacks: {
label: function (context) {
const label = context.label || "";
const value = context.parsed || 0;
return ${label}: ${formatCurrency(value)};
},
},
},
},
scales:
chartType === "bar"
? {
y: {
beginAtZero: true,
},
}
: {},
},
});
}

/**

Re-render all UI parts:

Table

Summary cards

Chart
*/
function refreshUI() {
renderTable();
renderSummary();

// Get currently active chart type button (default pie if none).
let activeType = "pie";
const activeBtn = document.querySelector(
"[data-chart-type].chart-active"
);
if (activeBtn) {
activeType = activeBtn.getAttribute("data-chart-type");
}
renderChart(activeType);
}

// -------------- CSV Export --------------

/**

Convert expenses into CSV and trigger a download.

CSV format: id, date, category, description, amount.
*/
function exportExpensesToCsv() {
if (expenses.length === 0) {
alert("No expenses to export.");
return;
}

const headers = ["ID", "Date", "Category", "Description", "Amount"];
const rows = expenses.map((e) => [
e.id,
e.date,
e.category,
e.description.replace(/"/g, '""'), // Escape quotes
e.amount.toFixed(2),
]);

const csvLines = [headers.join(","), ...rows.map((r) => r.join(","))];
const csvContent = csvLines.join("\n");

const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
const url = URL.createObjectURL(blob);

const link = document.createElement("a");
link.setAttribute("href", url);
link.setAttribute("download", "expenses.csv");
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);
}

// -------------- Theme Toggle --------------

/**

Toggle between light and dark themes and save preference.
*/
function toggleTheme() {
const current = document.body.getAttribute("data-theme") || "light";
const next = current === "light" ? "dark" : "light";
document.body.setAttribute("data-theme", next);
saveThemeToStorage(next);

elements.themeToggle.textContent =
next === "dark" ? "☀ Light Mode" : "🌙 Dark Mode";
}

/**

Initialize theme button label based on current theme.
*/
function updateThemeButtonLabel() {
const current = document.body.getAttribute("data-theme") || "light";
elements.themeToggle.textContent =
current === "dark" ? "☀ Light Mode" : "🌙 Dark Mode";
}

// -------------- Event Listeners --------------

/**

Set up all event listeners:

Form submit/reset

Search/filter/sort inputs

Export CSV

Clear all with confirmation

Theme toggle

Chart type buttons

Modal actions
*/
function setupEventListeners() {
elements.expenseForm.addEventListener("submit", handleFormSubmit);
elements.resetFormBtn.addEventListener("click", resetForm);

elements.searchInput.addEventListener("input", refreshUI);
elements.filterMonth.addEventListener("change", refreshUI);
elements.filterCategory.addEventListener("change", refreshUI);
elements.sortBy.addEventListener("change", refreshUI);

elements.exportCsvBtn.addEventListener("click", exportExpensesToCsv);

elements.clearAllBtn.addEventListener("click", () => {
openConfirmModal({
title: "Clear All Data",
message:
"This will permanently delete all expenses from this browser. Do you want to continue?",
onConfirm: () => {
clearAllExpenses();
},
});
});

elements.themeToggle.addEventListener("click", toggleTheme);

// Chart type toggle buttons
elements.chartTypeButtons.forEach((btn) => {
btn.addEventListener("click", () => {
elements.chartTypeButtons.forEach((b) =>
b.classList.remove("chart-active")
);
btn.classList.add("chart-active");
const type = btn.getAttribute("data-chart-type") || "pie";
renderChart(type);
});
});

// Modal buttons
elements.confirmCancelBtn.addEventListener("click", () => {
closeConfirmModal();
});

elements.confirmOkBtn.addEventListener("click", () => {
if (typeof confirmCallback === "function") {
confirmCallback();
}
closeConfirmModal();
});

// Close modal on background click
elements.confirmModal.addEventListener("click", (event) => {
if (event.target === elements.confirmModal) {
closeConfirmModal();
}
});
}

// -------------- App Initialization --------------

/**

Initialize the application:

Load theme preference

Load expenses from localStorage

Set default month filter to current month

Set up event listeners

Render initial UI
*/
function init() {
loadThemeFromStorage();
updateThemeButtonLabel();

loadExpensesFromStorage();

// Set filterMonth to current month by default (useful for summary alignment).
const now = new Date();
const currentMonthKey = getYearMonthKey(now);
elements.filterMonth.value = currentMonthKey;

setupEventListeners();
refreshUI();
}

// Run init when DOM is ready.
document.addEventListener("DOMContentLoaded", init);

// -----------------------------
// HOW THE APP WORKS (SUMMARY)
// -----------------------------
// 1. Data model:
// - Each expense has: id, amount, category, date, description, createdAt.
// 2. Persistence with localStorage:
// - Expenses are saved under STORAGE_KEY_EXPENSES as JSON string.
// - On load, JSON is parsed back into the 'expenses' array.​
// 3. UI rendering:
// - refreshUI() re-renders table, summary cards, and chart
// based on filtered/sorted expenses.
// 4. Filtering & search:
// - getProcessedExpenses() applies search, month, category filters,
// then sorting by date or amount.
// 5. Charts with Chart.js:
// - renderChart() builds a pie or bar chart from filtered data
// using new Chart(ctx, config).​
// 6. Theme toggle:
// - toggleTheme() switches between light/dark by setting body[data-theme]
// and saves the choice in localStorage for persistence.
