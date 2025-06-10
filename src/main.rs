use crate::engine::types::{Trade, Order, Side, OrderType};
use std::sync::{Arc, Mutex};
use warp::Filter;
use serde::{Serialize, Deserialize};
mod engine;
mod strategy;
mod data;

use engine::order_book::OrderBook;
use strategy::simple_bot::RandomTraderBot;

#[derive(Clone, Serialize, Deserialize)]
struct NewOrder {
    side: String,
    order_type: String,
    price: Option<f64>,
    quantity: f64,
}

#[tokio::main]
async fn main() {
    // Shared state: OrderBook and trade log
    let book = Arc::new(Mutex::new(OrderBook::new()));
    let trades = Arc::new(Mutex::new(Vec::<Trade>::new()));

    // POST /order (add new order)
    let book_filter = warp::any().map(move || book.clone());
    let trades_filter = warp::any().map(move || trades.clone());

    let submit_order = warp::path("order")
        .and(warp::post())
        .and(warp::body::json())
        .and(book_filter.clone())
        .and(trades_filter.clone())
        .map(|order: NewOrder, book: Arc<Mutex<OrderBook>>, trades: Arc<Mutex<Vec<Trade>>>| {
            let mut ob = book.lock().unwrap();
            // Parse side and type
            let side = match order.side.as_str() {
                "Buy" => Side::Buy,
                _ => Side::Sell,
            };
            let order_type = match order.order_type.as_str() {
                "Market" => OrderType::Market,
                _ => OrderType::Limit,
            };
            let new_order = Order {
                id: 0,
                side,
                order_type,
                price: order.price,
                quantity: order.quantity,
            };
            let order_trades = ob.add_order(new_order);
            let mut all_trades = trades.lock().unwrap();
            for t in &order_trades {
                all_trades.push(t.clone());
            }
            warp::reply::json(&order_trades)
        });

    // GET /orderbook (live snapshot)
    let get_orderbook = warp::path("orderbook")
        .and(warp::get())
        .and(book_filter.clone())
        .map(|book: Arc<Mutex<OrderBook>>| {
            let ob = book.lock().unwrap();
            let buy = &ob.buy_orders;
            let sell = &ob.sell_orders;
            warp::reply::json(&(buy, sell))
        });

    // GET /trades (trade history)
    let get_trades = warp::path("trades")
        .and(warp::get())
        .and(trades_filter.clone())
        .map(|trades: Arc<Mutex<Vec<Trade>>>| {
            let t = trades.lock().unwrap();
            warp::reply::json(&*t)
        });

    // GET /stats (basic stats for now)
    let get_stats = warp::path("stats")
        .and(warp::get())
        .and(trades_filter.clone())
        .map(|trades: Arc<Mutex<Vec<Trade>>>| {
            let t = trades.lock().unwrap();
            let mut buy_pnl = 0.0;
            let mut sell_pnl = 0.0;
            let mut total_trades = 0;
            for trade in t.iter() {
                total_trades += 1;
                buy_pnl -= trade.price * trade.quantity;
                sell_pnl += trade.price * trade.quantity;
            }
            warp::reply::json(&serde_json::json!({
                "total_trades": total_trades,
                "buy_pnl": buy_pnl,
                "sell_pnl": sell_pnl
            }))
        });

    let cors = warp::cors()
        .allow_origin("http://127.0.0.1:5500") 
        .allow_methods(vec!["GET", "POST"])
        .allow_headers(vec!["Content-Type"]);

    let routes = submit_order
        .or(get_orderbook)
        .or(get_trades)
        .or(get_stats)
        .with(cors);  

    println!("Running server on http://127.0.0.1:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
