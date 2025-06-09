const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
  try {
    const order = await Order.create(req.body);
    const io = req.app.get('io');
    io.emit('newOrder', order);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  try {
    const orders = await Order.find(filter).sort('-createdAt');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ error: 'Not found' });
    // optionally emit statusUpdate:
    req.app.get('io').emit('statusUpdate', order);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    // notify other clients if you like:
    req.app.get('io').emit('orderDeleted', { _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Clear all orders
exports.clearAllOrders = async (req, res) => {
  try {
    await Order.deleteMany({});
    // notify all connected clients
    req.app.get('io').emit('clearAll');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

