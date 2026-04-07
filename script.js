// Global Variables
let transactions = [];
let spendingLimit = null;
let chart = null;

// DOM Elements
const elements = {
    form: document.getElementById('transactionForm'),
    itemName: document.getElementById('itemName'),
    amount: document.getElementById('amount'),
    category: document.getElementById('category'),
    transactionList: document.getElementById('transactionList'),
    totalBalance: document.getElementById('totalBalance'),
    themeToggle: document.getElementById('themeToggle'),
    spendingLimit: document.getElementById('spendingLimit'),
    limitAlert: document.getElementById('limitAlert'),
    sortBy: document.getElementById('sortBy'),
    chartCanvas: document.getElementById('spendingChart'),
    chartEmpty: document.getElementById('chartEmpty')
};

// Local Storage
function saveToLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    if (spendingLimit !== null) {
        localStorage.setItem('spendingLimit', spendingLimit.toString());
    }
}

function loadFromLocalStorage() {
    const savedTransactions = localStorage.getItem('transactions');
    const savedLimit = localStorage.getItem('spendingLimit');
    const savedTheme = localStorage.getItem('theme');

    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    }
    if (savedLimit) {
        spendingLimit = parseFloat(savedLimit);
        elements.spendingLimit.value = spendingLimit;
    }
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        elements.themeToggle.querySelector('.theme-icon').textContent = '☀️';
    }
}

// Theme Toggle
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        elements.themeToggle.querySelector('.theme-icon').textContent = '☀️';
    } else {
        document.body.removeAttribute('data-theme');
        elements.themeToggle.querySelector('.theme-icon').textContent = '🌙';
    }
    
    localStorage.setItem('theme', newTheme);
    if (chart) updateChart();
}

// Form Validation
function validateForm() {
    let isValid = true;
    document.getElementById('nameError').textContent = '';
    document.getElementById('amountError').textContent = '';
    document.getElementById('categoryError').textContent = '';
    
    if (elements.itemName.value.trim() === '') {
        document.getElementById('nameError').textContent = 'Item name is required';
        isValid = false;
    }
    if (elements.amount.value === '' || parseFloat(elements.amount.value) < 1000) {
        document.getElementById('amountError').textContent = 'Amount must be at least Rp 1,000';
        isValid = false;
    }
    if (elements.category.value === '') {
        document.getElementById('categoryError').textContent = 'Please select a category';
        isValid = false;
    }
    return isValid;
}

// Add Transaction
function addTransaction(e) {
    e.preventDefault();
    if (!validateForm()) return;
    
    const transaction = {
        id: Date.now(),
        name: elements.itemName.value.trim(),
        amount: parseFloat(elements.amount.value),
        category: elements.category.value,
        date: new Date().toISOString()
    };
    
    transactions.push(transaction);
    saveToLocalStorage();
    elements.form.reset();
    updateUI();
}

// Delete Transaction
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    updateUI();
}

// Sort Transactions
function sortTransactions(transactionsArray) {
    const sortValue = elements.sortBy.value;
    const sorted = [...transactionsArray];
    
    switch(sortValue) {
        case 'date':
            sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'amount-high':
            sorted.sort((a, b) => b.amount - a.amount);
            break;
        case 'amount-low':
            sorted.sort((a, b) => a.amount - b.amount);
            break;
        case 'category':
            sorted.sort((a, b) => a.category.localeCompare(b.category));
            break;
    }
    return sorted;
}

// Update UI
function updateUI() {
    updateBalance();
    updateTransactionList();
    updateChart();
    checkSpendingLimit();
}

function updateBalance() {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    elements.totalBalance.textContent = `Rp ${total.toLocaleString('id-ID')}`;
    
    if (spendingLimit && total > spendingLimit) {
        elements.totalBalance.classList.add('over-limit');
    } else {
        elements.totalBalance.classList.remove('over-limit');
    }
}

function updateTransactionList() {
    if (transactions.length === 0) {
        elements.transactionList.innerHTML = '<p class="empty-state">No transactions yet. Add your first expense above!</p>';
        return;
    }
    
    const sortedTransactions = sortTransactions(transactions);
    const icons = { 'Food': '🍔', 'Transport': '🚗', 'Fun': '🎮' };
    
    elements.transactionList.innerHTML = sortedTransactions.map(t => {
        const date = new Date(t.date);
        const formattedDate = date.toLocaleDateString('id-ID', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        
        return `
            <div class="transaction-item ${t.category.toLowerCase()}">
                <div class="transaction-details">
                    <div class="transaction-name">${escapeHtml(t.name)}</div>
                    <div class="transaction-meta">
                        <span class="transaction-category">${icons[t.category]} ${t.category}</span>
                        <span class="transaction-date">${formattedDate}</span>
                    </div>
                </div>
                <span class="transaction-amount">Rp ${t.amount.toLocaleString('id-ID')}</span>
                <button class="btn-delete" onclick="deleteTransaction(${t.id})" aria-label="Delete transaction">
                    🗑️
                </button>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function checkSpendingLimit() {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    if (spendingLimit && total > spendingLimit) {
        elements.limitAlert.classList.remove('hidden');
    } else {
        elements.limitAlert.classList.add('hidden');
    }
}

// Chart
function updateChart() {
    if (transactions.length === 0) {
        if (chart) {
            chart.destroy();
            chart = null;
        }
        elements.chartCanvas.style.display = 'none';
        elements.chartEmpty.classList.add('show');
        return;
    }
    
    elements.chartCanvas.style.display = 'block';
    elements.chartEmpty.classList.remove('show');
    
    const categoryTotals = transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});
    
    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);
    
    const chartData = {
        labels: categories,
        datasets: [{
            data: amounts,
            backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'],
            borderWidth: 2,
            borderColor: getComputedStyle(document.body).getPropertyValue('--bg-card').trim()
        }]
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 15,
                    font: { size: 12 },
                    color: getComputedStyle(document.body).getPropertyValue('--text-primary').trim()
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: Rp ${value.toLocaleString('id-ID')} (${percentage}%)`;
                    }
                }
            }
        }
    };
    
    if (chart) {
        chart.data = chartData;
        chart.options = chartOptions;
        chart.update();
    } else {
        chart = new Chart(elements.chartCanvas, {
            type: 'pie',
            data: chartData,
            options: chartOptions
        });
    }
}

// Event Listeners
elements.form.addEventListener('submit', addTransaction);
elements.themeToggle.addEventListener('click', toggleTheme);
elements.sortBy.addEventListener('change', updateTransactionList);
elements.spendingLimit.addEventListener('input', function() {
    spendingLimit = parseFloat(this.value) || null;
    saveToLocalStorage();
    checkSpendingLimit();
    updateBalance();
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    updateUI();
});
