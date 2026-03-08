import { supabase, getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import bcryptjs from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  tier: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
}

// Signup with Supabase Auth
export const signupWithSupabase = async (data: SignupData): Promise<{ user: User; session: any }> => {
  const supabaseClient = getSupabaseClient();

  const { data: authData, error } = await supabaseClient.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  });

  if (error) {
    logger.error({ err: error }, 'Supabase signup error');
    throw new Error(error.message);
  }

  if (!authData.user) {
    throw new Error('Failed to create user');
  }

  // Store additional user data in the public.users table
  const { error: profileError } = await supabaseClient
    .from('users')
    .upsert({
      id: authData.user.id,
      email: data.email,
      name: data.name,
      tier: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (profileError) {
    logger.warn({ err: profileError }, 'Failed to create user profile, continuing anyway');
  }

  logger.info(`User signed up: ${data.email}`);

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email!,
      name: data.name,
      tier: 'free',
      createdAt: authData.user.created_at,
      updatedAt: authData.user.updated_at || authData.user.created_at,
    },
    session: authData.session,
  };
};

// Login with Supabase Auth
export const loginWithSupabase = async (email: string, password: string): Promise<{ user: User; session: any }> => {
  const supabaseClient = getSupabaseClient();

  const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.error({ err: error }, 'Supabase login error');
    throw new Error(error.message);
  }

  if (!authData.user) {
    throw new Error('Invalid credentials');
  }

  // Get user profile from public.users table
  const { data: profile } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  logger.info(`User logged in: ${email}`);

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email!,
      name: profile?.name || authData.user.user_metadata?.name || 'User',
      tier: profile?.tier || 'free',
      createdAt: profile?.created_at || authData.user.created_at,
      updatedAt: profile?.updated_at || new Date().toISOString(),
    },
    session: authData.session,
  };
};

// Get user profile from Supabase
export const getUserProfile = async (userId: string): Promise<User | null> => {
  const supabaseClient = getSupabaseClient();

  const { data: profile, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    tier: profile.tier,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
};

// Update user profile
export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
  const supabaseClient = getSupabaseClient();

  const { data, error } = await supabaseClient
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, 'Failed to update user profile');
    throw new Error(error.message);
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    tier: data.tier,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

// Verify Supabase JWT token
export const verifySupabaseToken = async (token: string): Promise<{ userId: string; email: string }> => {
  const supabaseClient = getSupabaseClient();

  const { data: { user }, error } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid token');
  }

  return {
    userId: user.id,
    email: user.email!,
  };
};

// Check if Supabase is configured
export const isAuthConfigured = () => isSupabaseConfigured();

