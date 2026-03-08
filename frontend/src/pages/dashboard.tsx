import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout';
import { useAuthStore } from '@/lib/store/authStore';
import { historyAPI, type HistoryItem } from '@/lib/api';
import {
  Film, Sparkles, Clock, TrendingUp, Plus, ArrowRight,
  Image as ImageIcon, FileText, Play, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut', delay: i * 0.08 } }) };

const Dashboard: NextPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    historyAPI.getAll()
      .then((res) => setHistory(res.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const images  = history.filter((h) => h.type === 'image');
  const scripts = history.filter((h) => h.type === 'script');
  const videos  = history.filter((h) => h.type === 'video');

  const stats = [
    { label: 'Videos Created', value: videos.length, icon: Film, color: 'from-violet-500 to-pink-500' },
    { label: 'Scripts Generated', value: scripts.length, icon: FileText, color: 'from-cyan-500 to-blue-500' },
    { label: 'Images Uploaded', value: images.length, icon: ImageIcon, color: 'from-orange-500 to-amber-500' },
    { label: 'Ads This Session', value: history.length, icon: TrendingUp, color: 'from-green-500 to-teal-500' },
  ];

  return (
    <Layout>
      <div className="min-h-screen p-6 lg:p-8">
        {/* Header */}
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show" className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="panel-label text-cyan-500">Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-gray-400 mt-1">Here&apos;s your V-AD activity at a glance.</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass rounded-2xl p-5 glass-hover transition-all">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="text-2xl font-bold text-white">{loading ? '—' : value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Quick Action */}
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show" className="mb-10">
          <Link href="/create">
            <div className="relative glass rounded-2xl p-6 overflow-hidden group cursor-pointer hover:border-cyan-500/30 transition-all border border-white/[0.06]">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">Create New Ad</h3>
                    <p className="text-sm text-gray-400 mt-0.5">Upload image → AI script → Generated video</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Recent Activity
            </h2>
            <Link href="/history" className="text-xs text-cyan-400 hover:text-cyan-300 transition">View all →</Link>
          </div>

          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Film className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">No activity yet</p>
              <p className="text-sm text-gray-600 mt-1">Create your first ad to see it here</p>
              <Link href="/create">
                <button className="mt-5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-sm font-semibold hover:opacity-90 transition">
                  Get Started
                </button>
              </Link>
            </div>
          )}

          {!loading && history.length > 0 && (
            <div className="space-y-2">
              {history.slice(0, 6).map((item, i) => (
                <motion.div key={item.id} variants={fadeUp} custom={i} initial="hidden" animate="show"
                  className="glass glass-hover rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.type === 'video' ? 'bg-violet-500/15' :
                    item.type === 'script' ? 'bg-cyan-500/15' : 'bg-orange-500/15'
                  }`}>
                    {item.type === 'video' ? <Play className="w-3.5 h-3.5 text-violet-400" /> :
                     item.type === 'script' ? <FileText className="w-3.5 h-3.5 text-cyan-400" /> :
                     <ImageIcon className="w-3.5 h-3.5 text-orange-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {item.metadata?.productName || item.metadata?.title || item.metadata?.originalName || 'Untitled'}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 capitalize">
                      {item.type} • {item.metadata?.platform || ''} • {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize flex-shrink-0 ${
                    item.type === 'video' ? 'text-violet-400 bg-violet-500/10 border border-violet-500/20' :
                    item.type === 'script' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20' :
                    'text-orange-400 bg-orange-500/10 border border-orange-500/20'
                  }`}>
                    {item.type}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default Dashboard;
