import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import * as authService from '../../services/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

// Signup
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body as SignupRequest;

    if (!email || !password || !name) {
      throw new ApiError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    // Check if Supabase is configured
    if (!authService.isAuthConfigured()) {
      throw new ApiError('Supabase is not configured. Please set Supabase environment variables.', 500, 'SUPABASE_NOT_CONFIGURED');
    }

    const { user, session } = await authService.signupWithSupabase({ email, password, name });

    // Generate JWT for backward compatibility
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      throw new ApiError('Missing email or password', 400, 'VALIDATION_ERROR');
    }

    // Check if Supabase is configured
    if (!authService.isAuthConfigured()) {
      throw new ApiError('Supabase is not configured. Please set Supabase environment variables.', 500, 'SUPABASE_NOT_CONFIGURED');
    }

    const { user, session } = await authService.loginWithSupabase(email, password);

    // Generate JWT for backward compatibility
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
    });
  } catch (error: any) {
    if (error.message?.includes('Invalid login credentials')) {
      next(new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
    } else {
      next(error);
    }
  }
});

// Get user profile
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new ApiError('No token provided', 401, 'NO_TOKEN');
    }

    // Verify JWT token - we use our own JWT, not Supabase's
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    // Check if Supabase is configured
    if (!authService.isAuthConfigured()) {
      throw new ApiError('Supabase is not configured', 500, 'SUPABASE_NOT_CONFIGURED');
    }

    // Get user profile using the userId from our custom JWT
    const user = await authService.getUserProfile(userId);

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError('Invalid token', 401, 'INVALID_TOKEN'));
    } else {
      next(error);
    }
  }
});

export default router;

