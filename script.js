// -----------------------------
// Expense Tracker App (Enhanced)
// -----------------------------
// Fixed version with Budget Tracker + Spending Trends
// -----------------------------

// Storage keys
const STORAGE_KEY_EXPENSES = "expenseTracker:expenses";
const STORAGE_KEY_THEME = "expenseTracker:theme";
const STORAGE_KEY_BUDGET = "expenseTracker:budget";

// App state
let expenses = [];
let categoryChart = null;
let budgetChart = null; // New: for budget progress

// -------------- Utility Functions (FIXED) --------------

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

// FIXED: Template literal syntax error
function getYearMonthKey(dateInput) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`; // Fixed: Added backticks
}

// -------------- NEW: Budget Functions --------------

/**
 * Load/save monthly budget from localStorage
 */
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

/**
 * Get budget progress for current month
 */
function getBudgetProgress() {
  const now = new Date();
  const currentMonthKey = getYearMonthKey(now);
  const budget = getBudget();
  
  let spent = 0;
  for (const expense of expenses) {
    if (getYearMonthKey(expense.date) === currentMonthKey) {
      spent += expense.amount;
    }
  }
  
  return { budget, spent, remaining: Math.max(0, budget - spent), percentage: budget > 0 ? (spent / budget) * 100 : 0 };
}

// -------------- Local Storage (Enhanced) --------------

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
    console.error("Failed to load expenses", err);
    expenses = [];
  }
}

function saveExpensesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
  } catch (err) {
    console.error("Failed to save expenses", err);
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

// -------------- FIXED: Safe DOM Elements --------------

function getElements() {
  return {
    expenseForm: () => document.getElementById("expenseForm"),
    expenseId: () => document.getElementById("expenseId"),
    amount: () => document.getElementById("amount"),
    category: () => document.getElementById("category"),
    date: () => document.getElementById("date"),
    description: () => document.getElementById("description"),
    resetFormBtn: () => document.getElementById("resetFormBtn"),
    exportCsvBtn: () => document.getElementById("exportCsvBtn"),
    clearAllBtn: () => document.getElementById("clearAllBtn"),
    searchInput: () => document.getElementById("searchInput"),
    filterMonth: () => document.getElementById("filterMonth"),
    filterCategory: () => document.getElementById("filterCategory"),
    sortBy: () => document.getElementById("sortBy"),
    expenseTableBody: () => document.getElementById("expenseTableBody"),
    emptyState: () => document.getElementById("emptyState"),
    totalThisMonth: () => document.getElementById("totalThisMonth"),
    currentMonthLabel: () => document.getElementById("currentMonthLabel"),
    allTimeTotal: () => document.getElementById("allTimeTotal"),
    topCategory: () => document.getElementById("topCategory"),
    topCategoryAmount: () => document.getElementById("topCategoryAmount"),
    transactionCount: () => document.getElementById("transactionCount"),
    themeToggle: () => document.getElementById("themeToggle"),
    confirmModal: () => document.getElementById("confirmModal"),
    confirmCancelBtn: () => document.getElementById("confirmCancelBtn"),
    confirmOkBtn: () => document.getElementById("confirmOkBtn"),
    confirmTitle: () => document.getElementById("confirmTitle"),
    confirmMessage: () => document.getElementById("confirmMessage"),
    chartTypeButtons: () => document.querySelectorAll("[data-chart-type]"),
    budgetInput: () => document.getElementById("budgetInput"), // New
    budgetProgress: () => document.getElementById("budgetProgress"), // New
  };
}

const elements = getElements();

let confirmCallback = null;

function openConfirmModal({ title, message, onConfirm }) {
  const confirmTitle = elements.confirmTitle();
  const confirmMessage = elements.confirmMessage();
  const confirmModal = elements.confirmModal();
  
  if (confirmTitle && confirmMessage && confirmModal) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmCallback = onConfirm;
    confirmModal.classList.remove("hidden");
  }
}

function closeConfirmModal() {
  const confirmModal = elements.confirmModal();
  if (confirmModal) {
    confirmModal.classList.add("hidden");
    confirmCallback = null;
  }
}

// -------------- CRUD Functions (Enhanced) --------------

function createExpenseFromForm() {
  const amountEl = elements.amount();
  const categoryEl = elements.category();
  const dateEl = elements.date();
  const descEl = elements.description();
  
  if (!amountEl || !categoryEl || !dateEl || !descEl) return null;
  
  const amountValue = parseFloat(amountEl.value);
  if (isNaN(amountValue) || amountValue <= 0) {
    alert("Please enter a valid amount greater than 0.");
    return null;
  }

  const categoryValue = categoryEl.value.trim();
  const dateValue = dateEl.value;
  const descriptionValue = descEl.value.trim();

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
  const editingId = elements.expenseId()?.value || "";

  if (editingId) {
    // Edit existing
    const index = expenses.findIndex(e => e.id === editingId);
    if (index !== -1) {
      const amountEl = elements.amount();
      if (amountEl) {
        const updatedAmount = parseFloat(amountEl.value);
        if (!isNaN(updatedAmount) && updatedAmount > 0) {
          expenses[index].amount = updatedAmount;
          expenses[index].category = elements.category()?.value.trim() || "";
          expenses[index].date = elements.date()?.value || "";
          expenses[index].description = elements.description()?.value.trim() || "";
          saveExpensesToStorage();
          resetForm();
          refreshUI();
        }
      }
    }
  } else {
    // Add new
    const newExpense = createExpenseFromForm();
    if (newExpense) {
      expenses.push(newExpense);
      saveExpensesToStorage();
      resetForm();
      refreshUI();
    }
  }
}

function populateFormForEdit(expense) {
  elements.expenseId()?.value = expense.id;
  elements.amount()?.value = expense.amount;
  elements.category()?.value = expense.category;
  elements.date()?.value = expense.date;
  elements.description()?.value = expense.description;
}

function resetForm() {
  elements.expenseId().value = "";
  const form = elements.expenseForm();
  if (form) form.reset();
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveExpensesToStorage();
  refreshUI();
}

function clearAllExpenses() {
  expenses = [];
  saveExpensesToStorage();
  refreshUI();
}

// -------------- Filtering & Sorting --------------

function getProcessedExpenses() {
  const searchEl = elements.searchInput();
  const monthEl = elements.filterMonth();
  const catEl = elements.filterCategory();
  const sortEl = elements.sortBy();
  
  const searchQuery = searchEl ? searchEl.value.trim().toLowerCase() : "";
  const filterMonth = monthEl ? monthEl.value : "";
  const filterCategory = catEl ? catEl.value : "";
  const sortBy = sortEl ? sortEl.value : "dateDesc";

  let list = [...expenses];

  if (searchQuery) {
    list = list.filter(expense => 
      expense.description.toLowerCase().includes(searchQuery) ||
      expense.category.toLowerCase().includes(searchQuery)
    );
  }

  if (filterMonth) {
    list = list.filter(expense => getYearMonthKey(expense.date) === filterMonth);
  }

  if (filterCategory) {
    list = list.filter(expense => expense.category === filterCategory);
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

// -------------- Rendering (Enhanced) --------------

function renderTable() {
  const tbody = elements.expenseTableBody();
  const emptyState = elements.emptyState();
  if (!tbody || !emptyState) return;

  const processed = getProcessedExpenses();
  tbody.innerHTML = "";

  if (processed.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  processed.forEach(expense => {
    const tr = document.createElement("tr");
    
    tr.innerHTML = `
      <td>${formatDate(expense.date)}</td>
      <td>${expense.description}</td>
      <td>${expense.category}</td>
      <td>${formatCurrency(expense.amount)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-small btn-outline" onclick="populateFormForEdit(${JSON.stringify(expense)})">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteExpense('${expense.id}')">Delete</button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

function renderSummary() {
  const now = new Date();
  const currentMonthKey = getYearMonthKey(now);
  
  let thisMonthTotal = 0, allTimeTotal = 0;
  const categoryTotals = {};

  expenses.forEach(e => {
    allTimeTotal += e.amount;
    if (getYearMonthKey(e.date) === currentMonthKey) {
      thisMonthTotal += e.amount;
    }
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  // Update DOM safely
  elements.totalThisMonth()?.textContent = formatCurrency(thisMonthTotal);
  elements.allTimeTotal()?.textContent = formatCurrency(allTimeTotal);
  elements.transactionCount()?.textContent = expenses.length.toString();
  elements.currentMonthLabel()?.textContent = now.toLocaleDateString("en-IN", { year: "numeric", month: "long" });

  // Top category
  let topCat = "–", topAmt = 0;
  Object.entries(categoryTotals).forEach(([cat, amt]) => {
    if (amt > topAmt) {
      topAmt = amt;
      topCat = cat;
    }
  });
  elements.topCategory()?.textContent = topCat;
  elements.topCategoryAmount()?.textContent = topAmt > 0 ? formatCurrency(topAmt) : "";
}

// FIXED: Chart.js safe rendering with load detection
function renderChart(chartType = "pie") {
  const canvas = document.getElementById("categoryChart");
  if (!canvas || typeof Chart === "undefined") {
    console.log("Chart.js not ready yet");
    return;
  }

  const processed = getProcessedExpenses();
  const categoryTotals = {};
  processed.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

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
      datasets: [{
        label: "Spending",
        data,
        backgroundColor: ["#2563eb","#10b981","#f97316","#ef4444","#8b5cf6","#ec4899","#22c55e","#facc15"],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${formatCurrency(ctx.parsed)}`
          }
        }
      },
      scales: chartType === "bar" ? { y: { beginAtZero: true } } : {}
    }
  });
}

// NEW: Budget Progress Chart
function renderBudgetChart() {
  const canvas = document.getElementById("budgetChart");
  if (!canvas || typeof Chart === "undefined") return;

  const { budget, spent, percentage } = getBudgetProgress();
  
  if (budgetChart) budgetChart.destroy();
  
  const ctx = canvas.getContext("2d");
  budgetChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Spent', 'Remaining'],
      datasets: [{
        data: [spent, Math.max(0, budget - spent)],
        backgroundColor: percentage > 90 ? ['#ef4444', '#6b7280'] : ['#10b981', '#dbeafe']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => formatCurrency(ctx.parsed)
          }
        }
      }
    }
  });
}

function refreshUI() {
  renderTable();
  renderSummary();
  renderChart();
  renderBudgetChart(); // New
}

// -------------- Event Listeners (Safe) --------------

function setupEventListeners() {
  // Form
  const form = elements.expenseForm();
  if (form) form.addEventListener("submit", handleFormSubmit);
  
  elements.resetFormBtn()?.addEventListener("click", resetForm);
  elements.exportCsvBtn()?.addEventListener("click", exportExpensesToCsv);
  
  // Filters
  ['searchInput', 'filterMonth', 'filterCategory', 'sortBy'].forEach(id => {
    elements[id]?.addEventListener("input", refreshUI);
    elements[id]?.addEventListener("change", refreshUI);
  });
  
  // Theme
  elements.themeToggle()?.addEventListener("click", toggleTheme);
  
  // Clear all
  elements.clearAllBtn()?.addEventListener("click", () => {
    openConfirmModal({
      title: "Clear All Data",
      message: "Delete all expenses permanently?",
      onConfirm: clearAllExpenses
    });
  });
  
  // Chart toggles
  elements.chartTypeButtons().forEach(btn => {
    btn.addEventListener("click", () => {
      elements.chartTypeButtons().forEach(b => b.classList.remove("chart-active"));
      btn.classList.add("chart-active");
      renderChart(btn.dataset.chartType || "pie");
    });
  });
  
  // Modal
  elements.confirmCancelBtn()?.addEventListener("click", closeConfirmModal);
  elements.confirmOkBtn()?.addEventListener("click", () => {
    if (confirmCallback) confirmCallback();
    closeConfirmModal();
  });
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", next);
  saveThemeToStorage(next);
  
  const toggle = elements.themeToggle();
  if (toggle) {
    toggle.textContent = next === "dark" ? "☀ Light Mode" : "🌙 Dark Mode";
  }
}

function exportExpensesToCsv() {
  if (expenses.length === 0) return alert("No expenses to export.");
  
  const csv = [
    ["ID", "Date", "Category", "Description", "Amount"],
    ...expenses.map(e => [e.id, e.date, e.category, `"${e.description}"`, e.amount])
  ].map(row => row.join(",")).join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// -------------- Initialization --------------

function init() {
  loadThemeFromStorage();
  loadExpensesFromStorage();
  
  // Set current month
  const now = new Date();
  const monthKey = getYearMonthKey(now);
  elements.filterMonth().value = monthKey;
  
  setupEventListeners();
  refreshUI();
  
  // Chart.js load detection
  const checkChartReady = () => {
    if (typeof Chart !== "undefined") {
      refreshUI();
    } else {
      setTimeout(checkChartReady, 100);
    }
  };
  checkChartReady();
}

// Global functions for inline onclick
window.populateFormForEdit = populateFormForEdit;
window.deleteExpense = deleteExpense;

document.addEventListener("DOMContentLoaded", init);
