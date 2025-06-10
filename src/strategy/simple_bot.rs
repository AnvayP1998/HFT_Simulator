use crate::engine::types::{Order, OrderType, Side};
use rand::Rng;

pub struct RandomTraderBot;

impl RandomTraderBot {
    pub fn generate_order(order_id: u64) -> Order {
        let mut rng = rand::thread_rng();
        let side = if rng.gen::<bool>() { Side::Buy } else { Side::Sell };
        let price = Some(100.0 + rng.gen_range(-2.0..2.0));
        let quantity = rng.gen_range(0.5..2.0);
        let order_type = if rng.gen_bool(0.7) { OrderType::Limit } else { OrderType::Market };
        Order {
            id: order_id,
            side,
            order_type: order_type.clone(), // <--- CLONE HERE
            price: if order_type == OrderType::Limit { price } else { None },
            quantity,
        }
    }
}
