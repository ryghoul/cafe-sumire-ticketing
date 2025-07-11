require('dotenv').config();
const express    = require('express');
const http       = require('http');
const socketIo   = require('socket.io');
const mongoose   = require('mongoose');
const bodyParser = require('body-parser');
const orderRoutes = require('./routes/orders');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/api/orders', orderRoutes);

const server = http.createServer(app);
const io     = socketIo(server, { cors: { origin: '*' } });

io.on('connection', socket => {
  console.log('➤ Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('➤ Client disconnected:', socket.id);
  });
});

// make io accessible in controllers
app.set('io', io);

const path = require('path');

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Serve cashier.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cashier.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected');
  const HOST = '0.0.0.0';  // listen on every NIC
  server.listen(process.env.PORT, HOST, () => {
  console.log(`🚀 Server listening on http://${HOST}:${process.env.PORT}`);
});
})
.catch(err => console.error('MongoDB error:', err));

