const http = require('http');
const crypto = require('crypto');

const PORT = 5050;

// Central Real-Time Orders Store
let orders = [
  {
    id: 'SC-1040',
    table: 'Table 2',
    timestamp: new Date(Date.now() - 8 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: [
      { id: 'cf3', name: 'Spanish Latte (16oz)', qty: 2, price: 69 },
      { id: 'wf1', name: 'Strawberry & Cream Waffle', qty: 1, price: 75 }
    ],
    total: 213,
    paymentMethod: 'GCash',
    status: 'new'
  },
  {
    id: 'SC-1041',
    table: 'Table 5',
    timestamp: new Date(Date.now() - 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: [
      { id: 'cf1', name: 'Caramel Macchiato (22oz)', qty: 1, price: 89 },
      { id: 'nc7', name: 'Matcha (16oz)', qty: 1, price: 85 }
    ],
    total: 174,
    paymentMethod: 'Maya',
    status: 'preparing'
  }
];

let sockets = new Set();

function broadcast(type, data) {
  const payload = JSON.stringify({ type, data });
  for (const socket of sockets) {
    if (socket.writable) {
      sendFrame(socket, payload);
    }
  }
}

// WebSocket Frame Encoder for Browser Clients
function sendFrame(socket, message) {
  const byteLength = Buffer.byteLength(message);
  let header;

  if (byteLength <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text frame
    header[1] = byteLength;
  } else if (byteLength <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(byteLength, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(byteLength), 2);
  }

  try {
    socket.write(Buffer.concat([header, Buffer.from(message)]));
  } catch (e) {
    sockets.delete(socket);
  }
}

// Create HTTP & WebSocket Server
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/orders' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(orders));
    return;
  }

  if (url.pathname === '/api/orders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const orderData = JSON.parse(body);
        const orderId = orderData.id || orderData.orderNum || `SC-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Deduplicate order creation
        let order = orders.find(o => o.id === orderId);
        if (!order) {
          order = {
            id: orderId,
            table: orderData.table || 'Table 1',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            items: orderData.items || [],
            total: orderData.total || 0,
            paymentMethod: orderData.paymentMethod || 'Cash',
            status: 'new'
          };
          orders.unshift(order);
          broadcast('order:new', order);
        }

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, order }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/orders/') && req.method === 'PATCH') {
    const parts = url.pathname.split('/');
    const orderId = parts[3];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { status } = JSON.parse(body);
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.status = status;
          broadcast('order:status-changed', order);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, order }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Order not found' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

// Upgrade HTTP to WebSocket Connection
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
  sockets.add(socket);

  socket.on('close', () => sockets.delete(socket));
  socket.on('error', () => sockets.delete(socket));

  // Receive WebSocket messages from browser clients
  socket.on('data', (buffer) => {
    try {
      const secondByte = buffer[1];
      if (secondByte === undefined) return;

      const length = secondByte & 127;
      let isMasked = (secondByte & 128) === 128;
      let maskStart = 2;

      if (length === 126) maskStart = 4;
      else if (length === 127) maskStart = 10;

      let maskKeys = isMasked ? buffer.slice(maskStart, maskStart + 4) : null;
      let dataStart = isMasked ? maskStart + 4 : maskStart;
      let payload = buffer.slice(dataStart);

      if (isMasked && maskKeys) {
        payload = Buffer.from(payload.map((byte, i) => byte ^ maskKeys[i % 4]));
      }

      const messageStr = payload.toString('utf8');
      const msg = JSON.parse(messageStr);

      if (msg.type === 'order:create') {
        const orderId = msg.data.id || msg.data.orderNum || `SC-${Math.floor(1000 + Math.random() * 9000)}`;
        let order = orders.find(o => o.id === orderId);
        if (!order) {
          order = {
            id: orderId,
            table: msg.data.table || 'Table 1',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            items: msg.data.items || [],
            total: msg.data.total || 0,
            paymentMethod: msg.data.paymentMethod || 'Cash',
            status: 'new'
          };
          orders.unshift(order);
          broadcast('order:new', order);
        }
      } else if (msg.type === 'order:update-status') {
        const order = orders.find(o => o.id === msg.data.id);
        if (order) {
          order.status = msg.data.status;
          broadcast('order:status-changed', order);
        }
      } else if (msg.type === 'stock:toggle') {
        broadcast('stock:updated', msg.data);
      }
    } catch (e) {
      // Ignored malformed frames
    }
  });
});

server.listen(PORT, () => {
  console.log(`⚡ Scialla Real-Time WebSocket Server running on ws://localhost:${PORT}`);
});
