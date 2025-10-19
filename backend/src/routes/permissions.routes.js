const express = require('express');
const permissionsController = require('../controllers/permissions.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole, requirePermission } = require('../middlewares/rbac.middleware');
const { validate, sanitizeInput } = require('../middlewares/validation.middleware');

const router = express.Router();

router.use(sanitizeInput);
router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', requirePermission('permissions.manage'), permissionsController.list);
router.post('/', requirePermission('permissions.manage'), permissionsController.create);
router.put('/:id', requirePermission('permissions.manage'), permissionsController.update);
router.delete('/:id', requirePermission('permissions.manage'), permissionsController.remove);

module.exports = router;


