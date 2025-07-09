const { pool } = require('../config/database');

async function updateOldOrders() {
  try {
    const [orders] = await pool.execute('SELECT id FROM orders');
    for (const order of orders) {
      // Buscar itens do pedido
      const [items] = await pool.execute('SELECT id, price, quantity FROM order_items WHERE order_id = ?', [order.id]);
      let total = 0;
      for (const item of items) {
        let itemTotal = Number(item.price) * Number(item.quantity);
        // Buscar adicionais do item
        const [additions] = await pool.execute('SELECT price, quantity FROM order_item_acrescimo WHERE order_item_id = ?', [item.id]);
        for (const add of additions) {
          itemTotal += Number(add.price) * Number(add.quantity || 1);
        }
        total += itemTotal;
      }
      // Atualizar o total_amount do pedido
      await pool.execute('UPDATE orders SET total_amount = ? WHERE id = ?', [total, order.id]);
      console.log(`Pedido #${order.id} atualizado para total_amount = R$ ${total.toFixed(2)}`);
    }
    console.log('Todos os pedidos antigos foram atualizados!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao atualizar pedidos antigos:', error);
    process.exit(1);
  }
}

updateOldOrders(); 