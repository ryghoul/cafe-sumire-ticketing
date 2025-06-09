const express = require('express');
const ctrl    = require('../controllers/ordersController');
const router  = express.Router();

// GET  /api/orders?status=pending
// POST /api/orders
router.route('/')
  .get(ctrl.getOrders)
  .post(ctrl.createOrder);

// PUT /api/orders/:id
router.put('/:id', ctrl.updateOrder);

// DELETE /api/orders/:id
router.delete('/:id', ctrl.deleteOrder);

// DELETE /api/orders     → delete all orders
router.delete('/', ctrl.clearAllOrders);

module.exports = router;

