// src/engine/types.rs

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderType {
    Market,
    Limit,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Side {
    Buy,
    Sell,
}

#[derive(Debug, Clone)]
pub struct Order {
    pub id: u64,
    pub side: Side,
    pub order_type: OrderType,
    pub price: Option<f64>,   // None for Market order
    pub quantity: f64,
}

#[derive(Debug, Clone)]
pub struct Trade {
    pub buy_order_id: u64,
    pub sell_order_id: u64,
    pub price: f64,
    pub quantity: f64,
}
