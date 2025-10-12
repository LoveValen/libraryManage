const express = require('express');
const rolesController = require('../controllers/roles.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRole, requirePermission } = require('../middlewares/rbac.middleware');
const { sanitizeInput } = require('../middlewares/validation.middleware');

const router = express.Router();

router.use(sanitizeInput);
router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', requirePermission('roles.manage'), rolesController.list);
router.post('/', requirePermission('roles.manage'), rolesController.create);
router.put('/:id', requirePermission('roles.manage'), rolesController.update);
router.delete('/:id', requirePermission('roles.manage'), rolesController.remove);

// Assign roles to user
router.post('/assign/:userId', requirePermission('roles.manage'), rolesController.setUserRoles);

module.exports = router;


