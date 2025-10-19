const express = require('express');
const router = express.Router();
const bookLocationsController = require('../controllers/bookLocations.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');

/**
 * 图书存放位置路由
 */

router.get('/', bookLocationsController.list);
router.get('/active', bookLocationsController.listActive);
router.get('/:id', bookLocationsController.detail);

router.post('/', authenticateToken, requirePermission('bookLocations.create'), bookLocationsController.create);
router.put('/:id', authenticateToken, requirePermission('bookLocations.update'), bookLocationsController.update);
router.delete('/:id', authenticateToken, requirePermission('bookLocations.delete'), bookLocationsController.remove);

module.exports = router;
