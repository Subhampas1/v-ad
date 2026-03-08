import React from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { Zap, Upload, Wand2, Film, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Head from 'next/head';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay } },
});

const STEPS = [
  { icon: Upload, title: 'Upload Image', desc: 'Drop any product photo — JPEG, PNG, WebP.', color: 'from-cyan-500 to-blue-500' },
  { icon: Wand2, title: 'AI Script', desc: 'Nova Lite generates a full ad script in seconds.', color: 'from-violet-500 to-purple-500' },
  { icon: Film, title: 'AI Video', desc: 'Nova Reel turns your script into a stunning video.', color: 'from-pink-500 to-rose-500' },
];

const FEATURES = [
  '6 Indian languages supported',
  'Reels, YouTube & WhatsApp formats',
  'Editable Hook / Body / CTA',
  'Download in HD',
  'Runs without signup',
  'Powered by AWS Bedrock',
];

const Index: NextPage = () => {
  return (
    <>
      <Head>
        <title>V-AD — AI Video Ads for Small Businesses</title>
        <meta name="description" content="Generate AI-powered advertisement scripts and videos for your business using AWS Bedrock Nova models." />
      </Head>

      <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-cyan-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-violet-600/8 rounded-full blur-[120px]" />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 lg:px-16 py-5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">V-AD</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">Sign in</Link>
            <Link href="/create">
              <button className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-100 transition">
                Try Free →
              </button>
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative z-10 text-center px-6 pt-24 pb-20">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-cyan-500/20 text-xs text-cyan-400 font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5" /> Powered by AWS Bedrock Nova Models
            </div>
          </motion.div>

          <motion.h1 {...fadeUp(0.1)} className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-none mb-6">
            AI Ads for{' '}
            <span className="gradient-text">Small Business</span>
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="text-lg md:text-xl text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Upload a product image. Get an AI script. Generate a video — in under 5 minutes.
            No agency, no hassle.
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/create">
              <button className="group px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-cyan-500/20 flex items-center gap-2">
                Start Creating Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="px-8 py-3.5 rounded-2xl glass border border-white/10 text-white font-semibold text-sm hover:bg-white/[0.07] transition">
                View Dashboard
              </button>
            </Link>
          </motion.div>

          {/* Social proof chips */}
          <motion.div {...fadeUp(0.4)} className="mt-10 flex items-center justify-center gap-2 flex-wrap">
            {['No signup required', 'Hindi & Telugu ready', '15s Reels + YouTube'].map((chip) => (
              <span key={chip} className="px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-gray-500">
                {chip}
              </span>
            ))}
          </motion.div>
        </section>

        {/* How it works */}
        <section className="relative z-10 px-6 pb-24">
          <div className="max-w-4xl mx-auto">
            <motion.div {...fadeUp(0)} className="text-center mb-12">
              <p className="panel-label text-cyan-500 mb-3">How it works</p>
              <h2 className="text-3xl font-bold text-white">Three steps to your video</h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-5">
              {STEPS.map(({ icon: Icon, title, desc, color }, i) => (
                <motion.div key={title} {...fadeUp(i * 0.1)}
                  className="glass glass-hover rounded-2xl p-6 transition-all text-center">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white/10 mb-2">0{i + 1}</div>
                  <h3 className="font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="relative z-10 px-6 pb-24">
          <div className="max-w-3xl mx-auto glass rounded-3xl p-8 lg:p-12">
            <div className="text-center mb-8">
              <p className="panel-label text-violet-400 mb-3">Features</p>
              <h2 className="text-2xl font-bold text-white">Everything you need</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{f}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/create">
                <button className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-sm hover:opacity-90 transition shadow-lg">
                  Create Your First Ad →
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/[0.04] px-6 py-8 text-center">
          <p className="text-xs text-gray-600">© 2026 V-AD. Built with ❤️ for Indian Small Businesses.</p>
        </footer>
      </div>
    </>
  );
};

export default Index;
