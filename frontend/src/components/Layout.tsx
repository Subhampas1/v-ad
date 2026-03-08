import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Zap, LayoutDashboard, Film, History, Settings,
  LogOut, ChevronRight, Loader2, Moon, Sun, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/create',    icon: Film,            label: 'Create Ad' },
  { href: '/history',   icon: History,          label: 'History' },
];

export const Layout: React.FC<LayoutProps> = ({ children, requireAuth = false }) => {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setIsChecking(false));
  }, [checkAuth]);

  useEffect(() => {
    if (!isChecking && !user && requireAuth) {
      router.push('/login');
    }
  }, [isChecking, user, router, requireAuth]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
          <p className="text-sm text-gray-500">Loading V-AD...</p>
        </div>
      </div>
    );
  }

  if (!user && requireAuth) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <>
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar panel */}
        <aside
          className={`
            fixed top-0 left-0 h-full w-64 z-50 flex flex-col
            glass-dark border-r border-white/[0.06]
            transition-transform duration-300 ease-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo */}
          <div className="p-5 border-b border-white/[0.06]">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-white text-lg tracking-tight">V-AD</span>
                <p className="text-[10px] text-gray-500 -mt-0.5">AI Ad Generator</p>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <p className="panel-label px-3 py-2">Main Menu</p>
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = router.pathname === href || router.pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-150 group
                    ${active
                      ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-cyan-500/60" />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-white/[0.06] space-y-1">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <LogoutButton />
              </>
            ) : (
              <div className="px-2 pb-1 space-y-1.5">
                <Link href="/login" className="block w-full text-center px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition">
                  Sign In
                </Link>
                <Link href="/signup" className="block w-full text-center px-3 py-2 text-sm text-white bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg hover:opacity-90 transition font-medium">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </aside>
      </>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 glass-dark border-b border-white/[0.06] h-14 flex items-center px-4 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">V-AD</span>
          </div>
        </div>

        <main className="flex-1 pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
};

const LogoutButton: React.FC = () => {
  const { logout } = useAuthStore();
  const router = useRouter();
  return (
    <button
      onClick={() => { logout(); router.push('/login'); }}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
    >
      <LogOut className="w-4 h-4" />
      <span>Sign Out</span>
    </button>
  );
};

export default Layout;
