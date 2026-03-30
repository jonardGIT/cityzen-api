import { Router } from 'express';
import { createUser, deleteUser, getUserById, getUsers, getUserCapabilities, updateUser } from '../controllers/usersController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createUserValidator, updateUserValidator } from '../validators/bodyValidators.js';

const router = Router();

router.get('/capabilities', requireJwtAuth, getUserCapabilities);
router.get('/', requireJwtAuth, requireRole(...ADMIN_ROLES), getUsers);
router.get('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), getUserById);
router.post('/', requireJwtAuth, requireRole(...ADMIN_ROLES), createUserValidator, validateRequest, createUser);
router.patch('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), updateUserValidator, validateRequest, updateUser);
router.delete('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), deleteUser);

export default router;
