use super::types::{Order, Side, Trade, OrderType};
use std::collections::{BTreeMap, VecDeque};
use ordered_float::OrderedFloat; // <--- ADD THIS

pub struct OrderBook {
    pub buy_orders: BTreeMap<OrderedFloat<f64>, VecDeque<Order>>,  // price -> orders
    pub sell_orders: BTreeMap<OrderedFloat<f64>, VecDeque<Order>>,
    pub next_order_id: u64,
}

impl OrderBook {
    pub fn new() -> Self {
        Self {
            buy_orders: BTreeMap::new(),
            sell_orders: BTreeMap::new(),
            next_order_id: 1,
        }
    }

   pub fn add_order(&mut self, mut order: Order) -> Vec<Trade> {
    order.id = self.next_order_id;
    self.next_order_id += 1;
    let mut trades = Vec::new();

    match order.side {
        Side::Buy => {
            while order.quantity > 0.0 {
                // let mut best_match = None;
                if let Some((&best_ask, orders_at_price)) = self.sell_orders.iter_mut().next() {
                    let can_match = match order.order_type {
                        OrderType::Limit => {
                            if let Some(limit_price) = order.price {
                                limit_price >= best_ask.into_inner()
                            } else {
                                false
                            }
                        }
                        OrderType::Market => true,
                    };
                    if can_match && !orders_at_price.is_empty() {
                        let mut sell_order = orders_at_price.pop_front().unwrap();
                        let quantity = order.quantity.min(sell_order.quantity);
                        order.quantity -= quantity;
                        sell_order.quantity -= quantity;
                        trades.push(Trade {
                            buy_order_id: order.id,
                            sell_order_id: sell_order.id,
                            price: best_ask.into_inner(),
                            quantity,
                        });
                        if sell_order.quantity > 0.0 {
                            orders_at_price.push_front(sell_order.clone());
                        }
                        if orders_at_price.is_empty() {
                            self.sell_orders.remove(&best_ask);
                        }
                        continue;
                    }
                }
                // No more matches possible
                break;
            }
            if order.quantity > 0.0 {
                let price = OrderedFloat(order.price.unwrap_or(0.0));
                self.buy_orders.entry(price).or_default().push_back(order);
            }
        }
        Side::Sell => {
            while order.quantity > 0.0 {
                if let Some((&best_bid, orders_at_price)) = self.buy_orders.iter_mut().rev().next() {
                    let can_match = match order.order_type {
                        OrderType::Limit => {
                            if let Some(limit_price) = order.price {
                                limit_price <= best_bid.into_inner()
                            } else {
                                false
                            }
                        }
                        OrderType::Market => true,
                    };
                    if can_match && !orders_at_price.is_empty() {
                        let mut buy_order = orders_at_price.pop_front().unwrap();
                        let quantity = order.quantity.min(buy_order.quantity);
                        order.quantity -= quantity;
                        buy_order.quantity -= quantity;
                        trades.push(Trade {
                            buy_order_id: buy_order.id,
                            sell_order_id: order.id,
                            price: best_bid.into_inner(),
                            quantity,
                        });
                        if buy_order.quantity > 0.0 {
                            orders_at_price.push_front(buy_order.clone());
                        }
                        if orders_at_price.is_empty() {
                            self.buy_orders.remove(&best_bid);
                        }
                        continue;
                    }
                }
                break;
            }
            if order.quantity > 0.0 {
                let price = OrderedFloat(order.price.unwrap_or(0.0));
                self.sell_orders.entry(price).or_default().push_back(order);
            }
        }
    }
    trades
}


}
