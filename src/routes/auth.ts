import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';
import { requireJwtAuth } from '../middleware/jwtAuth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireJwtAuth, me);

export default router;
