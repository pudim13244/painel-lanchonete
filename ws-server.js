const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3010 });

wss.on('connection', function connection(ws) {
  console.log('Cliente WebSocket conectado');
});

function broadcastNewOrder(order) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'NEW_ORDER', order }));
    }
  });
}

function broadcastOrderUpdate(order) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'ORDER_UPDATE', order }));
    }
  });
}

module.exports = { broadcastNewOrder, broadcastOrderUpdate }; 