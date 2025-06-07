mod engine;
mod strategy;
mod data;

use engine::order_book::OrderBook;
use engine::types::{Order, OrderType, Side};
use strategy::simple_bot::RandomTraderBot;

fn main() {
    use engine::types::{Order, OrderType, Side};
    use engine::order_book::OrderBook;

    let mut ob = OrderBook::new();

     // Generate N random orders from the bot
    let n_orders = 10;
    let mut total_trades = 0;
    let mut total_buy_volume = 0.0;
    let mut total_sell_volume = 0.0;
    let mut buy_pnl = 0.0;
    let mut sell_pnl = 0.0;

    let mut orders = Vec::new();
    for _ in 0..n_orders {
        orders.push(RandomTraderBot::generate_order(0));
    }

    for (i, order) in orders.into_iter().enumerate() {
        println!("Submitting Order {}: {:?}", i + 1, order);
        let trades = ob.add_order(order);
        if !trades.is_empty() {
            for trade in trades {
                println!("Trade occurred! {:?}", trade);
                total_trades += 1;
                // For a simple P&L calc: Buys lose cash, gain asset; sells gain cash, lose asset
                buy_pnl -= trade.price * trade.quantity;   // Buy = spend cash
                sell_pnl += trade.price * trade.quantity;  // Sell = earn cash
                total_buy_volume += trade.quantity;
                total_sell_volume += trade.quantity;
            }   

        } else {
            println!("No trade.");
        }
        println!("Order book: Buys: {:?}, Sells: {:?}", ob.buy_orders, ob.sell_orders);
        println!("---");
        
    }
    println!("===================");
    println!("Summary:");
    println!("Total trades: {}", total_trades);
    println!("Total buy volume: {:.4}", total_buy_volume);
    println!("Total sell volume: {:.4}", total_sell_volume);
    println!("Net buy P&L: {:.2}", buy_pnl);
    println!("Net sell P&L: {:.2}", sell_pnl);
}

