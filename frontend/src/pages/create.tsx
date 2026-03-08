import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { NextPage } from 'next';
import { Layout } from '@/components/Layout';
import {
  useGenerateScript, useGenerateVideo, useUploadImage,
} from '@/lib/hooks/useAPI';
import { useVideoStore } from '@/lib/store/videoStore';
import { historyAPI, type HistoryItem } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Upload, Wand2, Film, Download, RefreshCw, CheckCircle2,
  Image as ImageIcon, Loader2, ChevronDown, ChevronUp, Share2,
  Clock, Sparkles, Play, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────────────────
interface FormState {
  businessType: string;
  productName: string;
  language: string;
  platform: string;
  tone: string;
}

// ─── Animation Variants ──────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

// ─── Create Page ─────────────────────────────────────────────────────────────
const Create: NextPage = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState<FormState>({
    businessType: '', productName: '', language: 'en', platform: 'reels', tone: 'professional',
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editedScript, setEditedScript] = useState({ hook: '', body: '', cta: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, isLoading: uploading } = useUploadImage();
  const { generate: generateScript, script, imageAnalysis, isLoading: genScript, error: scriptError } = useGenerateScript();
  const { generate: generateVideo, videoUrl, adFrameUrls, isLoading: genVideo, error: videoError, reset: resetVideo } = useGenerateVideo();
  const videoStore = useVideoStore();

  // Load history on mount
  useEffect(() => {
    historyAPI.getAll().then((res) => setHistory(res.items || [])).catch(() => {});
  }, []);

  // Update edited script when AI script arrives
  useEffect(() => {
    if (script) {
      setEditedScript({
        hook: script.scenes?.[0]?.voiceoverText || '',
        body: script.scenes?.slice(1, -1).map((s: any) => s.voiceoverText).join(' ') || '',
        cta: script.callToAction || '',
      });
    }
  }, [script]);

  // Drop handling
  const onDrop = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image');
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    onDrop(e.dataTransfer.files);
  };

  const handleUploadAndGenerate = async () => {
    if (!uploadedFile) { toast.error('Please select an image first'); return; }
    if (!form.businessType || !form.productName) { toast.error('Fill in Business Type and Product Name'); return; }

    try {
      // Step 1: Upload image
      const uploadResult = await upload(uploadedFile);
      videoStore.setImage(uploadResult.url, uploadResult.url);

      // Step 2: Generate script — pass imageUrl so backend can run Nova Lite vision analysis
      const scriptResult = await generateScript({
        businessType: form.businessType,
        productName: form.productName,
        language: form.language as any,
        platform: form.platform as any,
        tone: form.tone as any,
        imageUrl: uploadResult.url,   // ← enables image analysis + grounded script
      } as any);
      videoStore.setScript(scriptResult.scriptId);
      toast.success('Script generated from your product image!');

      // Refresh history
      historyAPI.getAll().then((r) => setHistory(r.items || [])).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate script');
    }
  };

  const handleGenerateVideo = async () => {
    if (!script) { toast.error('Generate a script first'); return; }

    const hook = editedScript.hook || script.scenes?.[0]?.voiceoverText || '';
    const cta  = editedScript.cta  || script.callToAction || 'Shop Now';
    const prompt = `${form.businessType} advertisement for ${form.productName}. ${hook} ${editedScript.body} ${cta}`.trim();

    try {
      await generateVideo({
        scriptId: videoStore.scriptId || `script_${Date.now()}`,
        imagePath: videoStore.imageUrl || '',
        platform: form.platform as any,
        businessType: form.businessType,
        productName: form.productName,
        hook,
        cta,
        imageAnalysis,
        prompt,
      } as any);
      toast.success('Ad video generated!');
      historyAPI.getAll().then((r) => setHistory(r.items || [])).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || 'Video generation failed');
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl; a.download = `${form.productName || 'ad'}_video.mp4`; a.click();
  };

  const setField = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const hasImage = !!preview;
  const hasScript = !!script;
  const hasVideo = !!videoUrl;

  return (
    <Layout>
      <div className="min-h-screen p-6 lg:p-8">
        {/* ── Page Header ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="panel-label text-cyan-500">AI Studio</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create Your Ad</h1>
          <p className="text-gray-400 mt-1">Upload a product image, generate a script, and create your video.</p>
        </motion.div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ═══ LEFT COLUMN ═══ */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

            {/* 1. Upload Panel */}
            <motion.div variants={fadeUp} className="glass rounded-2xl overflow-hidden">
              <SectionHeader icon={<Upload className="w-4 h-4" />} label="1 — Upload Image" done={hasImage} />
              <div className="p-5">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
                    flex flex-col items-center justify-center text-center min-h-[180px]
                    ${isDragging ? 'drop-active' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'}
                    ${hasImage ? 'p-3' : 'p-8'}
                  `}
                >
                  <input
                    ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => onDrop(e.target.files)}
                  />
                  {preview ? (
                    <div className="relative w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Preview" className="w-full h-48 object-contain rounded-lg" />
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1.5 text-xs text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-300">Drop your product image here</p>
                      <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP • Max 10MB</p>
                      <div className="mt-4 px-4 py-1.5 text-xs font-medium text-cyan-400 border border-cyan-500/30 rounded-lg bg-cyan-500/5">
                        Browse files
                      </div>
                    </>
                  )}
                </div>
                {preview && (
                  <button onClick={() => { setPreview(null); setUploadedFile(null); }}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Change image
                  </button>
                )}
              </div>
            </motion.div>

            {/* 2. Details Panel */}
            <motion.div variants={fadeUp} className="glass rounded-2xl overflow-hidden">
              <SectionHeader icon={<Wand2 className="w-4 h-4" />} label="2 — Ad Details" done={hasScript} />
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Business Type" value={form.businessType} onChange={setField('businessType')} placeholder="e.g. Retail, Tech" />
                  <FormField label="Product Name" value={form.productName} onChange={setField('productName')} placeholder="e.g. SmartPhone X" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <SelectField label="Platform" value={form.platform} onChange={setField('platform')} options={[
                    { value: 'reels', label: '📱 Reels' },
                    { value: 'youtube', label: '▶️ YouTube' },
                    { value: 'whatsapp', label: '💬 WhatsApp' },
                  ]} />
                  <SelectField label="Language" value={form.language} onChange={setField('language')} options={[
                    { value: 'en', label: '🇬🇧 English' },
                    { value: 'hi', label: '🇮🇳 Hindi' },
                    { value: 'te', label: 'తెలుగు' },
                    { value: 'ta', label: 'தமிழ்' },
                    { value: 'kn', label: 'ಕನ್ನಡ' },
                    { value: 'ml', label: 'മലയാളം' },
                  ]} />
                  <SelectField label="Tone" value={form.tone} onChange={setField('tone')} options={[
                    { value: 'professional', label: '💼 Pro' },
                    { value: 'casual', label: '😊 Casual' },
                    { value: 'humorous', label: '😂 Funny' },
                    { value: 'emotional', label: '❤️ Emotional' },
                  ]} />
                </div>

                <button
                  onClick={handleUploadAndGenerate}
                  disabled={!hasImage || !form.businessType || !form.productName || genScript || uploading}
                  className={`
                    w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2
                    ${(!hasImage || !form.businessType || !form.productName)
                      ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:opacity-90 active:scale-[0.98] shadow-lg'
                    }
                  `}
                >
                  {(genScript || uploading) ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {uploading ? 'Uploading...' : 'Generating Script...'}</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> {hasScript ? 'Regenerate Script' : 'Generate Script'}</>
                  )}
                </button>

                {scriptError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {scriptError}
                  </div>
                )}
              </div>
            </motion.div>

            {/* History Strip */}
            {history.length > 0 && (
              <motion.div variants={fadeUp} className="glass rounded-2xl overflow-hidden">
                <SectionHeader icon={<Clock className="w-4 h-4" />} label="Recent History" />
                <div className="p-4 flex gap-3 overflow-x-auto pb-4">
                  {history.slice(0, 8).map((item) => (
                    <HistoryThumb key={item.id} item={item} />
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

            {/* 3. Script Panel */}
            <motion.div variants={fadeUp} className="glass rounded-2xl overflow-hidden">
              <SectionHeader icon={<Sparkles className="w-4 h-4" />} label="3 — Generated Script" done={hasScript} />
              <div className="p-5">
                {!hasScript && !genScript && (
                  <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500">Your AI-generated script will appear here</p>
                  </div>
                )}
                {genScript && (
                  <div className="min-h-[200px] flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm text-gray-300 font-medium">Analyzing your product image...</p>
                      <p className="text-xs text-gray-500 mt-1">Nova Lite Vision → Script Generation</p>
                    </div>
                  </div>
                )}
                <AnimatePresence>
                  {hasScript && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                      className="space-y-4"
                    >
                      {/* Script title */}
                      <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <p className="panel-label mb-1">Title</p>
                        <p className="text-sm font-semibold text-white">{script?.title}</p>
                      </div>

                      {/* Image Analysis card — what AI saw */}
                      {imageAnalysis && (
                        <div className="px-3 py-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                          <p className="panel-label text-cyan-500 mb-2">🔍 What AI sees in your image</p>
                          <p className="text-xs text-gray-300 mb-2">{imageAnalysis.productDescription}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {imageAnalysis.category}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                              {imageAnalysis.suggestedAdStyle} style
                            </span>
                            {imageAnalysis.dominantColors?.slice(0,2).map((c: string) => (
                              <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hook */}
                      <ScriptTextArea label="🪝 Hook" emoji="Opening lines" value={editedScript.hook}
                        onChange={(v) => setEditedScript((s) => ({ ...s, hook: v }))} />
                      {/* Body */}
                      <ScriptTextArea label="📖 Body" emoji="Main message" value={editedScript.body}
                        onChange={(v) => setEditedScript((s) => ({ ...s, body: v }))} />
                      {/* CTA */}
                      <ScriptTextArea label="🎯 CTA" emoji="Call to action" value={editedScript.cta}
                        onChange={(v) => setEditedScript((s) => ({ ...s, cta: v }))} />

                      {/* Scene details collapsible */}
                      <SceneList scenes={script?.scenes || []} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* 4. Video Panel */}
            <motion.div variants={fadeUp} className="glass rounded-2xl overflow-hidden">
              <SectionHeader icon={<Film className="w-4 h-4" />} label="4 — Generated Video" done={hasVideo} />
              <div className="p-5">
                {/* Empty state — no video yet and not loading */}
                {!hasVideo && !genVideo && (
                  <div className="min-h-[180px] flex flex-col items-center justify-center text-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <Play className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500">Your video preview will appear here</p>
                  </div>
                )}

                {genVideo && (
                  <div className="min-h-[180px] flex flex-col items-center justify-center gap-4 mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film className="w-6 h-6 text-violet-400" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-300">Generating your video...</p>
                      <p className="text-xs text-gray-500 mt-1">Nova Reel is working (2–5 min)</p>
                    </div>
                  </div>
                )}

                {/* Error banner */}
                {videoError && !genVideo && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 mb-4">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {videoError}
                  </div>
                )}

                <AnimatePresence>
                  {hasVideo && (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 mb-4">
                      <div className="relative rounded-xl overflow-hidden bg-black">
                        <video src={videoUrl!} controls className="w-full max-h-72 rounded-xl" poster={preview || undefined} />
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleDownload}
                          className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-gray-200 flex items-center justify-center gap-2 transition"
                        >
                          <Download className="w-4 h-4" /> Download
                        </button>
                        <button
                          onClick={() => navigator.share?.({ title: form.productName, url: videoUrl! }).catch(() => {})}
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 flex items-center justify-center gap-2 transition"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleGenerateVideo}
                          disabled={!hasScript || genVideo}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/80 to-pink-600/80 text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className="w-4 h-4" /> Regenerate
                        </button>
                        <button
                          onClick={() => {
                            resetVideo();
                            videoStore.reset();
                            setPreview(null); setUploadedFile(null);
                            setForm({ businessType: '', productName: '', language: 'en', platform: 'reels', tone: 'professional' });
                          }}
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm transition"
                        >
                          New Ad
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ─── Always-visible Generate Video button ─── */}
                {!genVideo && !hasVideo && (
                  <button
                    onClick={handleGenerateVideo}
                    disabled={!hasScript}
                    className={`
                      w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                      ${!hasScript
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-500 to-pink-600 text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-violet-500/20'
                      }
                    `}
                  >
                    <Film className="w-4 h-4" />
                    {!hasScript ? 'Generate Script First' : 'Generate Video'}
                  </button>
                )}
                {genVideo && (
                  <div className="py-6 px-2 flex flex-col items-center gap-4">
                    <div className="w-full rounded-full h-1.5 bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-violet-500"
                        style={{
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 2s linear infinite',
                          width: '60%',
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-300 font-medium">Creating your ad...</p>
                    <p className="text-xs text-gray-500">This usually takes 4–8 minutes</p>
                    <style>{`
                      @keyframes shimmer {
                        0%   { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                      }
                    `}</style>
                  </div>
                )}

              </div>

              {/* ─── Ad Frames Carousel ─── */}
              {adFrameUrls.length > 0 && (
                <div className="px-5 pb-5">
                  <p className="panel-label text-violet-400 mb-2">🎨 Nova Canvas Ad Frames ({adFrameUrls.length})</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {adFrameUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="flex-none">
                        <img
                          src={url}
                          alt={`Ad frame ${i + 1}`}
                          className="h-20 w-36 object-cover rounded-lg border border-white/10 hover:border-violet-500/40 transition"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; label: string; done?: boolean }> = ({ icon, label, done }) => (
  <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
      <span className="text-cyan-400">{icon}</span>
      {label}
    </div>
    {done && (
      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
        <CheckCircle2 className="w-3 h-3" /> Done
      </span>
    )}
  </div>
);

const FormField: React.FC<{
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
    <input
      value={value} onChange={onChange} placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06] transition"
    />
  </div>
);

const SelectField: React.FC<{
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
    <select
      value={value} onChange={onChange}
      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition appearance-none cursor-pointer"
    >
      {options.map((o) => <option key={o.value} value={o.value} className="bg-[#1a1a28]">{o.label}</option>)}
    </select>
  </div>
);

const ScriptTextArea: React.FC<{
  label: string; emoji: string; value: string; onChange: (v: string) => void;
}> = ({ label, emoji, value, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs font-semibold text-gray-300">{label}</label>
      <span className="text-[10px] text-gray-600">{emoji}</span>
    </div>
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)} rows={2}
      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 transition resize-none"
    />
  </div>
);

const SceneList: React.FC<{ scenes: any[] }> = ({ scenes }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-white/[0.02] transition"
      >
        <span>Scene Breakdown ({scenes.length} scenes)</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-white/[0.06] divide-y divide-white/[0.04] max-h-48 overflow-y-auto">
              {scenes.map((scene) => (
                <div key={scene.sceneNumber} className="px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded">S{scene.sceneNumber}</span>
                    <span className="text-[10px] text-gray-600">{scene.duration}s</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{scene.voiceoverText}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HistoryThumb: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const icons: Record<string, React.ReactNode> = {
    image: <ImageIcon className="w-4 h-4 text-blue-400" />,
    script: <Sparkles className="w-4 h-4 text-violet-400" />,
    video: <Film className="w-4 h-4 text-green-400" />,
  };
  return (
    <div className="flex-shrink-0 w-24 group">
      <div className="w-24 h-20 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col items-center justify-center gap-1.5 group-hover:bg-white/[0.07] transition cursor-pointer overflow-hidden">
        {item.type === 'image' && item.url.startsWith('http') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="w-full h-full object-cover" />
        ) : (
          icons[item.type]
        )}
      </div>
      <p className="text-[10px] text-gray-600 mt-1.5 truncate capitalize">{item.type}</p>
      <p className="text-[9px] text-gray-700 truncate">{new Date(item.createdAt).toLocaleTimeString()}</p>
    </div>
  );
};

export default Create;
