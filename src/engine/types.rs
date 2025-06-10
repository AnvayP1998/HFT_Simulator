// src/engine/types.rs
use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum OrderType {
    Market,
    Limit,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum Side {
    Buy,
    Sell,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Order {
    pub id: u64,
    pub side: Side,
    pub order_type: OrderType,
    pub price: Option<f64>,
    pub quantity: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Trade {
    pub buy_order_id: u64,
    pub sell_order_id: u64,
    pub price: f64,
    pub quantity: f64,
}
