// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,        // or false if you want it optional
    trim: true
  },
  items: [{
    name:  { type: String, required: true },
    milk:  { type: String },
    qty:   { type: Number, required: true, min: 1 }
  }],
  total:  { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending','in-progress','ready'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
