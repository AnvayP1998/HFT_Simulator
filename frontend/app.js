const API_BASE = 'http://127.0.0.1:3030';

function fixOrderBookShape(book) {
    // If already [buyBook, sellBook] in object form, just return
    if (
        Array.isArray(book) &&
        book.length === 2 &&
        typeof book[0] === 'object' &&
        typeof book[1] === 'object' &&
        !Array.isArray(book[0]) &&
        !Array.isArray(book[1])
    ) {
        // But check if both objects have only Buy or only Sell at root
        const prices0 = Object.values(book[0]);
        const prices1 = Object.values(book[1]);
        if (
            (prices0.length === 0 || prices0.every(arr => arr[0]?.side === "Buy")) &&
            (prices1.length === 0 || prices1.every(arr => arr[0]?.side === "Sell"))
        ) {
            return book;
        }
    }
    // Otherwise, regroup into buyBook and sellBook!
    let buyBook = {}, sellBook = {};
    if (Array.isArray(book)) {
        book.forEach(obj => {
            Object.keys(obj).forEach(price => {
                const orders = obj[price];
                if (!orders.length) return;
                if (orders[0].side === "Buy") buyBook[price] = orders;
                if (orders[0].side === "Sell") sellBook[price] = orders;
            });
        });
    }
    return [buyBook, sellBook];
}



let priceChart;
function updatePriceChart(trades) {
    if (!trades.length) return;
    // Prepare data
    const labels = trades.map((t, i) => t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : (i + 1));
    const prices = trades.map(t => t.price);

    if (!priceChart) {
        // First time, create chart
        const ctx = document.getElementById('priceChart').getContext('2d');
        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Trade Price',
                    data: prices,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { beginAtZero: false }
                }
            }
        });
    } else {
        // Update existing chart
        priceChart.data.labels = labels;
        priceChart.data.datasets[0].data = prices;
        priceChart.update();
    }
}


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
document.getElementById('orderForm').onsubmit = async function (e) {
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
            headers: { 'Content-Type': 'application/json' },
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
document.getElementById('clearBtn').onclick = async function () {
    if (!confirm('Are you sure you want to clear all orders and trades?')) return;
    try {
        const res = await fetch(`${API_BASE}/clear`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to clear');
        showSuccess('Order book and trades cleared!');
    } catch (err) {
        showError('Error: ' + err.message);
    }
};

// ==== BOT CONTROLS (Frontend-Only, Simulated) ====
let botInterval = null;
let botActive = false;

document.getElementById('startBotBtn').onclick = function () {
    if (botActive) return;
    const botType = document.getElementById('botType').value;
    botActive = true;
    document.getElementById('botStatus').textContent = `${botType === 'maker' ? 'Market Maker' : 'Random Trader'} running...`;

    botInterval = setInterval(() => {
        if (botType === 'random') {
            submitRandomOrder();
        } else {
            submitMarketMakerOrder();
        }
    }, 2000); // bot submits every 2 seconds (tweak as needed)
};

document.getElementById('stopBotBtn').onclick = function () {
    botActive = false;
    clearInterval(botInterval);
    document.getElementById('botStatus').textContent = "Bot stopped";
};

function submitRandomOrder() {
    // Random buy/sell, price, quantity
    const side = Math.random() > 0.5 ? "Buy" : "Sell";
    const order_type = Math.random() > 0.5 ? "Limit" : "Market";
    const price = order_type === "Limit" ? (Math.random() * 100 + 50).toFixed(2) : null;
    const quantity = (Math.random() * 5 + 1).toFixed(2);

    fetch(`${API_BASE}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side, order_type, price: price ? Number(price) : null, quantity: Number(quantity) })
    });
}

function submitMarketMakerOrder() {
    // Places a limit buy AND sell order near the last trade price
    fetch(`${API_BASE}/trades`)
        .then(res => res.json())
        .then(trades => {
            let lastPrice = trades.length ? trades[trades.length - 1].price : 100;
            let buyPrice = (lastPrice * 0.99).toFixed(2);
            let sellPrice = (lastPrice * 1.01).toFixed(2);

            fetch(`${API_BASE}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ side: "Buy", order_type: "Limit", price: Number(buyPrice), quantity: 1 })
            });
            fetch(`${API_BASE}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ side: "Sell", order_type: "Limit", price: Number(sellPrice), quantity: 1 })
            });
        });
}


// ==== ORDER BOOK TABLES (sorted, empty state) ====
function renderOrderBookTables(book) {
    if (!book || !Array.isArray(book) || book.length < 2) {
        return '<div class="text-muted">Order book unavailable.</div>';
    }
    const buyBook = book[0] || {};
    const sellBook = book[1] || {};

    // Numeric sort for price levels
    const buyPrices = Object.keys(buyBook).sort((a, b) => Number(b) - Number(a));
    const sellPrices = Object.keys(sellBook).sort((a, b) => Number(a) - Number(b));

    let buyTable = '<h4>Buy Orders</h4><table class="table table-striped table-bordered"><tr><th>Side</th><th>Price</th><th>Quantity</th></tr>';
    if (buyPrices.length === 0) buyTable += '<tr><td colspan="3" class="text-center text-muted">No buy orders</td></tr>';
    buyPrices.forEach(price => {
        const arr = buyBook[price];
        if (Array.isArray(arr)) {
            arr.forEach(order => {
                const displayPrice = (order.price !== null && order.price !== undefined)
                    ? Number(order.price).toFixed(2)
                    : (order.order_type === 'Market' ? 'Market' : '-');
                const displayQty = (order.quantity !== undefined && order.quantity !== null)
                    ? Number(order.quantity).toFixed(2)
                    : '-';
                buyTable += `<tr><td>${order.side}</td><td>${displayPrice}</td><td>${displayQty}</td></tr>`;
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
                const displayPrice = (order.price !== null && order.price !== undefined)
                    ? Number(order.price).toFixed(2)
                    : (order.order_type === 'Market' ? 'Market' : '-');
                const displayQty = (order.quantity !== undefined && order.quantity !== null)
                    ? Number(order.quantity).toFixed(2)
                    : '-';
                sellTable += `<tr><td>${order.side}</td><td>${displayPrice}</td><td>${displayQty}</td></tr>`;
            });
        }
    });
    sellTable += '</table>';

    // Optional debug log:
    // console.log(buyBook, sellBook, buyPrices, sellPrices);

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
        document.getElementById('orderBook').innerHTML = renderOrderBookTables(fixOrderBookShape(book));
    } catch (err) {
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
        updatePriceChart(trades);
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
    } catch (e) {
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

function tradesToCsv(trades) {
    if (!trades.length) return "";
    const keys = Object.keys(trades[0]);
    const csvRows = [keys.join(",")];
    trades.forEach(trade => {
        const values = keys.map(k => `"${(trade[k] !== undefined && trade[k] !== null) ? trade[k] : ''}"`);
        csvRows.push(values.join(","));
    });
    return csvRows.join("\n");
}

document.getElementById('exportCsvBtn').onclick = async function () {
    try {
        const res = await fetch(`${API_BASE}/trades`);
        if (!res.ok) throw new Error('Failed to fetch trades');
        const trades = await res.json();
        const csv = tradesToCsv(trades);
        if (!csv) {
            showError("No trades to export.");
            return;
        }
        // Download as file
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "trades.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        showError("Export failed: " + err.message);
    }
};
