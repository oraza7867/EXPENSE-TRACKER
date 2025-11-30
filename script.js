// -----------------------------
// Expense Tracker App - Final Fixed Version
// -----------------------------

const STORAGE_KEY_EXPENSES = "expenseTracker:expenses";
const STORAGE_KEY_THEME = "expenseTracker:theme";
const STORAGE_KEY_BUDGET = "expenseTracker:budget";

let expenses = [];
let categoryChart = null;
let budgetChart = null;
let confirmCallback = null;

// -------------- Utility Functions --------------

function generateId() {
return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function formatCurrency(amount) {
return new Intl.NumberFormat("en-IN", {
style: "currency",
currency: "INR",
maximumFractionDigits: 2,
}).format(amount);
}

function formatDate(isoDate) {
const date = new Date(isoDate);
if (isNaN(date.getTime())) return isoDate;
return date.toLocaleDateString("en-IN", {
year: "numeric",
month: "short",
day: "numeric",
});
}

function getYearMonthKey(dateInput) {
const date = new Date(dateInput);
if (isNaN(date.getTime())) return "";
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
return ${year}-${month};
}

// -------------- Budget Helpers --------------

function getBudget() {
try {
const stored = localStorage.getItem(STORAGE_KEY_BUDGET);
return stored ? parseFloat(stored) || 0 : 0;
} catch {
return 0;
}
}

function saveBudget(amount) {
try {
localStorage.setItem(STORAGE_KEY_BUDGET, amount.toString());
} catch (err) {
console.error("Failed to save budget", err);
}
}

function getBudgetProgress() {
const now = new Date();
const currentMonthKey = getYearMonthKey(now);
const budget = getBudget();
let spent = 0;

for (const e of expenses) {
if (getYearMonthKey(e.date) === currentMonthKey) {
spent += e.amount;
}
}

const remaining = Math.max(0, budget - spent);
const percentage = budget > 0 ? (spent / budget) * 100 : 0;

return { budget, spent, remaining, percentage };
}

// -------------- Local Storage --------------

function loadExpensesFromStorage() {
try {
const stored = localStorage.getItem(STORAGE_KEY_EXPENSES);
if (!stored) {
expenses = [];
return;
}
const parsed = JSON.parse(stored);
expenses = Array.isArray(parsed) ? parsed : [];
} catch (err) {
console.error("Failed to load expenses from localStorage", err);
expenses = [];
}
}

function saveExpensesToStorage() {
try {
localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
} catch (err) {
console.error("Failed to save expenses to localStorage", err);
}
}

function loadThemeFromStorage() {
try {
const theme = localStorage.getItem(STORAGE_KEY_THEME);
document.body.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
} catch {
document.body.setAttribute("data-theme", "light");
}
}

function saveThemeToStorage(theme) {
try {
localStorage.setItem(STORAGE_KEY_THEME, theme);
} catch (err) {
console.error("Failed to save theme", err);
}
}

// -------------- DOM Elements --------------

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
chartTypeButtons: document.querySelectorAll("[data-chart-type]"),
budgetInput: document.getElementById("budgetInput"),
budgetProgress: document.getElementById("budgetProgress"),
budgetProgressBar: document.getElementById("budgetProgressBar"),
budgetStatus: document.getElementById("budgetStatus"),
};

// -------------- Modal Helpers --------------

function openConfirmModal({ title, message, onConfirm }) {
if (!elements.confirmModal) return;
elements.confirmTitle.textContent = title;
elements.confirmMessage.textContent = message;
confirmCallback = onConfirm;
elements.confirmModal.classList.remove("hidden");
}

function closeConfirmModal() {
if (!elements.confirmModal) return;
elements.confirmModal.classList.add("hidden");
confirmCallback = null;
}

// -------------- CRUD --------------

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

function handleFormSubmit(event) {
event.preventDefault();

const editingId = elements.expenseId.value;

if (editingId) {
// Update existing expense
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
} else {
// Create new expense
const newExpense = createExpenseFromForm();
if (!newExpense) return;
expenses.push(newExpense);
}

saveExpensesToStorage();
resetForm();
refreshUI();
}

function populateFormForEdit(expense) {
elements.expenseId.value = expense.id;
elements.amount.value = expense.amount;
elements.category.value = expense.category;
elements.date.value = expense.date;
elements.description.value = expense.description;
}

function resetForm() {
elements.expenseId.value = "";
elements.expenseForm.reset();
}

function deleteExpense(id) {
expenses = expenses.filter((e) => e.id !== id);
saveExpensesToStorage();
refreshUI();
}

function clearAllExpenses() {
expenses = [];
saveExpensesToStorage();
refreshUI();
}

// -------------- Filtering / Sorting --------------

function getProcessedExpenses() {
const searchQuery = elements.searchInput.value.trim().toLowerCase();
const filterMonth = elements.filterMonth.value;
const filterCategory = elements.filterCategory.value;
const sortBy = elements.sortBy.value;

let list = [...expenses];

if (searchQuery) {
list = list.filter((expense) => {
const inDescription = expense.description
.toLowerCase()
.includes(searchQuery);
const inCategory = expense.category.toLowerCase().includes(searchQuery);
return inDescription || inCategory;
});
}

if (filterMonth) {
list = list.filter(
(expense) => getYearMonthKey(expense.date) === filterMonth
);
}

if (filterCategory) {
list = list.filter((expense) => expense.category === filterCategory);
}

list.sort((a, b) => {
if (sortBy === "dateDesc") return new Date(b.date) - new Date(a.date);
if (sortBy === "dateAsc") return new Date(a.date) - new Date(b.date);
if (sortBy === "amountDesc") return b.amount - a.amount;
if (sortBy === "amountAsc") return a.amount - b.amount;
return 0;
});

return list;
}

// -------------- Rendering: Table / Summary --------------

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
    onConfirm: () => deleteExpense(expense.id),
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
    onConfirm: () => deleteExpense(expense.id),
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
    onConfirm: () => deleteExpense(expense.id),
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

function renderSummary() {
const now = new Date();
const currentMonthKey = getYearMonthKey(now);

let thisMonthTotal = 0;
let allTimeTotal = 0;
const categoryTotals = {};

for (const e of expenses) {
allTimeTotal += e.amount;
if (getYearMonthKey(e.date) === currentMonthKey) {
  thisMonthTotal += e.amount;
}

if (!categoryTotals[e.category]) {
  categoryTotals[e.category] = 0;
}
categoryTotals[e.category] += e.amount;
}

elements.totalThisMonth.textContent = formatCurrency(thisMonthTotal);
elements.allTimeTotal.textContent = formatCurrency(allTimeTotal);
elements.transactionCount.textContent = expenses.length.toString();

elements.currentMonthLabel.textContent = now.toLocaleDateString("en-IN", {
year: "numeric",
month: "long",
});

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

// -------------- Charts --------------

function renderCategoryChart(chartType = "pie") {
const canvas = document.getElementById("categoryChart");
if (!canvas || typeof Chart === "undefined") return;

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

if (labels.length === 0) {
if (categoryChart) {
categoryChart.destroy();
categoryChart = null;
}
return;
}

if (categoryChart) categoryChart.destroy();

const ctx = canvas.getContext("2d");
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
labels: { usePointStyle: true },
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

function renderBudgetChart() {
const canvas = document.getElementById("budgetChart");
if (!canvas || typeof Chart === "undefined") return;

const { budget, spent } = getBudgetProgress();
if (budget <= 0 && spent <= 0) {
if (budgetChart) {
budgetChart.destroy();
budgetChart = null;
}
return;
}

if (budgetChart) budgetChart.destroy();

const ctx = canvas.getContext("2d");
const remaining = Math.max(0, budget - spent);

budgetChart = new Chart(ctx, {
type: "doughnut",
data: {
labels: ["Spent", "Remaining"],
datasets: [
{
data: [spent, remaining],
backgroundColor: [
spent > budget ? "#ef4444" : "#10b981",
"#e5e7eb",
],
},
],
},
options: {
responsive: true,
plugins: {
legend: { position: "bottom" },
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
cutout: "60%",
},
});
}

// -------------- Budget UI --------------

function renderBudgetUI() {
const { budget, spent, remaining, percentage } = getBudgetProgress();

if (elements.budgetInput) {
elements.budgetInput.value = budget > 0 ? budget : "";
}

if (elements.budgetProgressBar) {
const clamped = Math.min(100, percentage);
elements.budgetProgressBar.style.width = ${clamped}%;
if (percentage >= 100) {
elements.budgetProgressBar.style.background = "#ef4444";
} else if (percentage >= 80) {
elements.budgetProgressBar.style.background = "#f97316";
} else {
elements.budgetProgressBar.style.background = "#10b981";
}
}

if (elements.budgetStatus) {
if (budget <= 0) {
elements.budgetStatus.textContent = "No budget set yet.";
} else {
elements.budgetStatus.textContent = Spent ${formatCurrency( spent )} of ${formatCurrency(budget)} · Remaining ${formatCurrency(remaining)};
}
}
}

// -------------- CSV Export --------------

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
"${e.description.replace(/"/g, '""')}",
e.amount.toFixed(2),
]);

const csvLines = [headers.join(","), ...rows.map((r) => r.join(","))];
const csvContent = csvLines.join("\n");

const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
const url = URL.createObjectURL(blob);

const link = document.createElement("a");
link.href = url;
link.download = "expenses.csv";
document.body.appendChild(link);
link.click();
link.remove();
URL.revokeObjectURL(url);
}

// -------------- Theme --------------

function toggleTheme() {
const current = document.body.getAttribute("data-theme") || "light";
const next = current === "light" ? "dark" : "light";
document.body.setAttribute("data-theme", next);
saveThemeToStorage(next);

elements.themeToggle.textContent =
next === "dark" ? "☀ Light Mode" : "🌙 Dark Mode";
}

function updateThemeButtonLabel() {
const current = document.body.getAttribute("data-theme") || "light";
elements.themeToggle.textContent =
current === "dark" ? "☀ Light Mode" : "🌙 Dark Mode";
}

// -------------- Main UI Refresh --------------

function refreshUI() {
renderTable();
renderSummary();
renderBudgetUI();

let activeType = "pie";
const activeBtn = document.querySelector("[data-chart-type].chart-active");
if (activeBtn) {
activeType = activeBtn.getAttribute("data-chart-type") || "pie";
}

renderCategoryChart(activeType);
renderBudgetChart();
}

// -------------- Event Listeners --------------

function setupEventListeners() {
if (elements.expenseForm) {
elements.expenseForm.addEventListener("submit", handleFormSubmit);
}

if (elements.resetFormBtn) {
elements.resetFormBtn.addEventListener("click", resetForm);
}

if (elements.exportCsvBtn) {
elements.exportCsvBtn.addEventListener("click", exportExpensesToCsv);
}

if (elements.clearAllBtn) {
elements.clearAllBtn.addEventListener("click", () => {
openConfirmModal({
title: "Clear All Data",
message:
"This will permanently delete all expenses from this browser. Continue?",
onConfirm: clearAllExpenses,
});
});
}

if (elements.searchInput) {
elements.searchInput.addEventListener("input", refreshUI);
}
if (elements.filterMonth) {
elements.filterMonth.addEventListener("change", refreshUI);
}
if (elements.filterCategory) {
elements.filterCategory.addEventListener("change", refreshUI);
}
if (elements.sortBy) {
elements.sortBy.addEventListener("change", refreshUI);
}

if (elements.themeToggle) {
elements.themeToggle.addEventListener("click", toggleTheme);
}

elements.chartTypeButtons.forEach((btn) => {
btn.addEventListener("click", () => {
elements.chartTypeButtons.forEach((b) =>
b.classList.remove("chart-active")
);
btn.classList.add("chart-active");
const type = btn.getAttribute("data-chart-type") || "pie";
renderCategoryChart(type);
});
});

if (elements.confirmCancelBtn) {
elements.confirmCancelBtn.addEventListener("click", closeConfirmModal);
}
if (elements.confirmOkBtn) {
elements.confirmOkBtn.addEventListener("click", () => {
if (typeof confirmCallback === "function") confirmCallback();
closeConfirmModal();
});
}
if (elements.confirmModal) {
elements.confirmModal.addEventListener("click", (event) => {
if (event.target === elements.confirmModal) closeConfirmModal();
});
}

if (elements.budgetInput) {
elements.budgetInput.addEventListener("change", () => {
const value = parseFloat(elements.budgetInput.value);
const budget = isNaN(value) || value < 0 ? 0 : value;
saveBudget(budget);
renderBudgetUI();
renderBudgetChart();
});
}
}

// -------------- Init --------------

function init() {
loadThemeFromStorage();
updateThemeButtonLabel();
loadExpensesFromStorage();

const now = new Date();
const currentMonthKey = getYearMonthKey(now);
if (elements.filterMonth) {
elements.filterMonth.value = currentMonthKey;
}

setupEventListeners();
refreshUI();
}

document.addEventListener("DOMContentLoaded", init);

// Make certain functions global only if needed (not required for this version)
