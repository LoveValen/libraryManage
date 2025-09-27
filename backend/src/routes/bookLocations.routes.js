const express = require('express');
const router = express.Router();
const bookLocationsController = require('../controllers/bookLocations.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * 图书存放位置路由
 */

router.get('/', bookLocationsController.list);
router.get('/active', bookLocationsController.listActive);
router.get('/:id', bookLocationsController.detail);

router.post('/', authenticate, authorize(['admin']), bookLocationsController.create);
router.put('/:id', authenticate, authorize(['admin']), bookLocationsController.update);
router.delete('/:id', authenticate, authorize(['admin']), bookLocationsController.remove);

module.exports = router;
