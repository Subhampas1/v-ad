import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { Layout } from '@/components/Layout';
import { historyAPI, type HistoryItem } from '@/lib/api';
import { Film, FileText, Image as ImageIcon, Loader2, Clock, Download, Sparkles, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

type FilterType = 'all' | 'image' | 'script' | 'video';

const HistoryPage: NextPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    historyAPI.getAll()
      .then((r) => setItems(r.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);

  const filterBtn = (f: FilterType, label: string) => (
    <button
      key={f}
      onClick={() => setFilter(f)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        filter === f
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Layout>
      <div className="min-h-screen p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="panel-label text-cyan-500">History</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Activity History</h1>
              <p className="text-gray-400 mt-1">All your images, scripts, and videos from this session.</p>
            </div>
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              <Filter className="w-3.5 h-3.5 text-gray-500 ml-2" />
              {filterBtn('all', 'All')}
              {filterBtn('image', '📷 Images')}
              {filterBtn('script', '✍️ Scripts')}
              {filterBtn('video', '🎬 Videos')}
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">
              {filter === 'all' ? 'No activity yet' : `No ${filter}s yet`}
            </p>
            <p className="text-sm text-gray-600 mt-1">Create an ad to see it here</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="glass glass-hover rounded-2xl overflow-hidden transition-all"
              >
                {/* Thumbnail */}
                <div className="h-36 bg-white/[0.02] flex items-center justify-center relative">
                  {item.type === 'image' && item.url.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : item.type === 'video' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Film className="w-10 h-10 text-violet-400/60" />
                      <span className="text-xs text-gray-600">Video</span>
                    </div>
                  ) : item.type === 'script' ? (
                    <div className="flex flex-col items-center gap-2 px-4 text-center">
                      <FileText className="w-8 h-8 text-cyan-400/60" />
                      <p className="text-xs text-gray-500 line-clamp-2">{item.metadata?.title || 'Script'}</p>
                    </div>
                  ) : (
                    <ImageIcon className="w-10 h-10 text-gray-600" />
                  )}
                  <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    item.type === 'video' ? 'text-violet-400 bg-violet-500/20' :
                    item.type === 'script' ? 'text-cyan-400 bg-cyan-500/20' :
                    'text-orange-400 bg-orange-500/20'
                  }`}>
                    {item.type}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {item.metadata?.productName || item.metadata?.title || item.metadata?.originalName || item.type}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{new Date(item.createdAt).toLocaleString()}</p>
                  {item.metadata?.platform && (
                    <p className="text-[10px] text-gray-600 capitalize">{item.metadata.platform}</p>
                  )}
                  {/* Download if video/image */}
                  {(item.type === 'video' || item.type === 'image') && item.url && item.url.startsWith('http') && (
                    <a href={item.url} download target="_blank" rel="noreferrer"
                      className="mt-2 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition">
                      <Download className="w-3 h-3" /> Download
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HistoryPage;
