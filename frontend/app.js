const API_BASE = 'http://127.0.0.1:3030';

// ==== Notification Helpers ====
function showError(msg, isSuccess = false) {
    const n = document.getElementById('notification');
    n.className = 'alert mt-2 ' + (isSuccess ? 'alert-success' : 'alert-danger');
    n.textContent = msg;
    n.classList.remove('d-none');
    setTimeout(() => { n.classList.add('d-none'); }, 3000);
}
function showSuccess(msg) {
    showError(msg, true);
}
function hideError() {
    const n = document.getElementById('notification');
    n.classList.add('d-none');
}

// ==== Spinner ====
function showSpinner(id) {
    document.getElementById(id).innerHTML = `
        <div class="text-center p-2">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>`;
}

// ==== ORDER FORM ====
document.getElementById('orderForm').onsubmit = async function(e) {
    e.preventDefault();
    try {
        const side = document.getElementById('side').value;
        const order_type = document.getElementById('type').value;
        const priceVal = document.getElementById('price').value;
        const price = priceVal ? parseFloat(priceVal) : null;
        const quantity = parseFloat(document.getElementById('qty').value);

        // VALIDATION
        if (!quantity || quantity <= 0 || (order_type === 'Limit' && (!price || price <= 0))) {
            showError('Please enter positive price and quantity.');
            return;
        }
        const order = { side, order_type, price, quantity };
        const res = await fetch(`${API_BASE}/order`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(order)
        });
        if (!res.ok) {
            const errMsg = await res.text();
            showError('Order failed: ' + errMsg);
            return;
        }
        showSuccess('Order submitted!');
        // Optionally: document.getElementById('orderForm').reset();
    } catch (err) {
        showError('Error: ' + err.message);
    }
};

// ==== CLEAR ALL ====
document.getElementById('clearBtn').onclick = async function() {
    if (!confirm('Are you sure you want to clear all orders and trades?')) return;
    try {
        const res = await fetch(`${API_BASE}/clear`, {method: 'POST'});
        if (!res.ok) throw new Error('Failed to clear');
        showSuccess('Order book and trades cleared!');
    } catch (err) {
        showError('Error: ' + err.message);
    }
};

// ==== ORDER BOOK TABLES (sorted, empty state) ====
function renderOrderBookTables(book) {
    // Defensive: Book must be an array of 2 objects
    if (!book || !Array.isArray(book) || book.length < 2) {
        return '<div class="text-muted">Order book unavailable.</div>';
    }
    const buyBook = book[0] || {};
    const sellBook = book[1] || {};

    // Buy side sorted descending
    const buyPrices = Object.keys(buyBook).map(Number).sort((a, b) => b - a);
    // Sell side sorted ascending
    const sellPrices = Object.keys(sellBook).map(Number).sort((a, b) => a - b);

    let buyTable = '<h4>Buy Orders</h4><table class="table table-striped table-bordered"><tr><th>Side</th><th>Price</th><th>Quantity</th></tr>';
    if (buyPrices.length === 0) buyTable += '<tr><td colspan="3" class="text-center text-muted">No buy orders</td></tr>';
    buyPrices.forEach(price => {
        const arr = buyBook[price];
        if (Array.isArray(arr)) {
            arr.forEach(order => {
                buyTable += `<tr><td>${order.side}</td><td>${order.price}</td><td>${order.quantity}</td></tr>`;
            });
        }
    });
    buyTable += '</table>';

    let sellTable = '<h4>Sell Orders</h4><table class="table table-striped table-bordered"><tr><th>Side</th><th>Price</th><th>Quantity</th></tr>';
    if (sellPrices.length === 0) sellTable += '<tr><td colspan="3" class="text-center text-muted">No sell orders</td></tr>';
    sellPrices.forEach(price => {
        const arr = sellBook[price];
        if (Array.isArray(arr)) {
            arr.forEach(order => {
                sellTable += `<tr><td>${order.side}</td><td>${order.price}</td><td>${order.quantity}</td></tr>`;
            });
        }
    });
    sellTable += '</table>';

    return buyTable + sellTable;
}


// ==== LAST PRICE ====
function renderLastPrice(trades) {
    if (!trades.length) {
        document.getElementById('lastPrice').innerHTML = '<div class="text-muted">No trades yet.</div>';
        return;
    }
    const last = trades[trades.length - 1];
    document.getElementById('lastPrice').innerHTML =
        `<h5>Last Trade Price: <span class="text-success">${last.price}</span></h5>`;
}

// ==== TRADES (table, empty state) ====
function renderTradesTable(trades) {
    if (!trades.length) return '<div class="text-muted">No trades yet.</div>';
    let html = '<table class="table table-striped table-bordered"><tr><th>Buy Order ID</th><th>Sell Order ID</th><th>Price</th><th>Quantity</th><th>Timestamp</th></tr>';
    trades.forEach(trade => {
        html += `<tr>
            <td>${trade.buy_order_id}</td>
            <td>${trade.sell_order_id}</td>
            <td>${trade.price}</td>
            <td>${trade.quantity}</td>
            <td>${trade.timestamp ? trade.timestamp : '-'}</td>
        </tr>`;
    });
    html += '</table>';
    return html;
}

// ==== STATS ====
function renderStats(stats) {
    if (!stats || Object.keys(stats).length === 0) {
        return '<div class="text-muted">No stats available.</div>';
    }
    let html = '<ul>';
    for (const [k, v] of Object.entries(stats)) {
        html += `<li><b>${k}:</b> ${v}</li>`;
    }
    html += '</ul>';
    return html;
}

// ==== REFRESH FUNCTIONS ====
async function refreshOrderBook() {
    showSpinner('orderBook');
    try {
        const res = await fetch(`${API_BASE}/orderbook`);
        if (!res.ok) throw new Error('Failed to fetch order book');
        const book = await res.json();
        document.getElementById('orderBook').innerHTML = renderOrderBookTables(book);
    } catch(err) {
        document.getElementById('orderBook').innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
    }
}
async function refreshTrades() {
    showSpinner('trades');
    try {
        const res = await fetch(`${API_BASE}/trades`);
        if (!res.ok) throw new Error('Failed to fetch trades');
        const trades = await res.json();
        renderLastPrice(trades);
        document.getElementById('trades').innerHTML = renderTradesTable(trades);
    } catch (err) {
        document.getElementById('trades').innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
        document.getElementById('lastPrice').innerHTML = '<div class="text-muted">No trades yet.</div>';
    }
}
async function refreshStats() {
    showSpinner('stats');
    try {
        const res = await fetch(`${API_BASE}/stats`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        const stats = await res.json();
        document.getElementById('stats').innerHTML = renderStats(stats);
    } catch(e) {
        document.getElementById('stats').innerHTML = `<span style="color:red;">Error: ${e.message}</span>`;
    }
}

// ==== INTERVAL REFRESH ====
setInterval(() => {
    refreshOrderBook();
    refreshTrades();
    refreshStats();
}, 1000);

// Initial load
refreshOrderBook();
refreshTrades();
refreshStats();
