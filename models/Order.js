// models/Order.js
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  qty:   { type: Number, required: true, min: 1 },
  milk:  { type: String, default: null },   // ← add this
  notes: { type: String, default: '' }
});

const OrderSchema = new mongoose.Schema({
  items:    [OrderItemSchema],
  total:    { type: Number, required: true, min: 0 },
  status:   {
    type: String,
    enum: ['pending','in-progress','ready','completed'],
    default: 'pending'
  },
  cashier:  { type: String },
  barista:  { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
