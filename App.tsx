
import React, { useState, useEffect } from 'react';
import { AppStatus, EmailCampaign, ImageSize } from './types';
import { generateCampaignContent, generateImage } from './services/geminiService';
import ChatBot from './components/ChatBot';

// Removed manual declare global for aistudio because it is already defined in the environment
// and was causing conflicting modifier/type errors.

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>('Standard');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      // Accessing aistudio from window using casting to bypass local type conflicts
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } catch (e) {
      console.error("Error checking API key", e);
    }
  };

  const handleOpenSelectKey = async () => {
    try {
      // Accessing aistudio from window using casting to bypass local type conflicts
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
      setError(null);
    } catch (e) {
      console.error("Failed to open select key dialog", e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setStatus(AppStatus.GENERATING_CONTENT);
    setError(null);
    setCampaign(null);
    setGeneratedImage(null);

    try {
      const result = await generateCampaignContent(prompt);
      setCampaign(result);
      setStatus(AppStatus.IDLE);
    } catch (err: any) {
      let msg = err.message || '';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
      } catch (e) {}
      setError(msg || '生成内容时出错。');
      setStatus(AppStatus.ERROR);
    }
  };

  const handleGenerateImage = async () => {
    if (!campaign?.imagePrompt) return;

    // Pro models (1K, 2K, 4K) require a manual key selection in some contexts
    if (imageSize !== 'Standard' && !hasApiKey) {
      await handleOpenSelectKey();
    }

    setStatus(AppStatus.GENERATING_IMAGE);
    setError(null);

    try {
      const imgUrl = await generateImage(campaign.imagePrompt, imageSize);
      setGeneratedImage(imgUrl);
      setStatus(AppStatus.IDLE);
    } catch (err: any) {
      let msg = err.message || '';
      
      // Try parsing JSON error from API
      let errorCode = 0;
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) {
          msg = parsed.error.message;
          errorCode = parsed.error.code;
        }
      } catch (e) {}

      if (errorCode === 403 || msg.toLowerCase().includes("permission") || msg.includes("403")) {
        setHasApiKey(false);
        setError("权限不足 (403)：生成高质量图像 (1K/2K/4K) 需要使用【已启用计费】的付费 API Key。建议尝试使用【Standard】画质，或切换到付费项目的 Key。");
      } else if (msg.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("API Key 会话已过期或未找到。请重新选择。");
      } else {
        setError(msg || '生成图像失败，请重试。');
      }
      setStatus(AppStatus.ERROR);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 flex items-center justify-center gap-3">
          <i className="fas fa-paper-plane text-indigo-600"></i>
          CampaignFlow <span className="text-indigo-600">AI</span>
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          秒级生成强大的邮件营销活动。标题、文案、精美视觉——全由 Gemini 3 提供技术支持。
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Configuration */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <i className="fas fa-wand-sparkles text-indigo-600"></i>
              活动详情
            </h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">您的营销主题是什么？</label>
                <textarea
                  className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                  placeholder="例如：为我们的环保运动装品牌进行夏季清仓促销，目标人群是热爱徒步的年轻人..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={status === AppStatus.GENERATING_CONTENT}
                />
              </div>
              <button
                type="submit"
                disabled={status === AppStatus.GENERATING_CONTENT || !prompt.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === AppStatus.GENERATING_CONTENT ? (
                  <><i className="fas fa-spinner animate-spin"></i> 正在分析...</>
                ) : (
                  <><i className="fas fa-magic"></i> 生成文案</>
                )}
              </button>
            </form>
          </section>

          {campaign && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <i className="fas fa-image text-indigo-600"></i>
                  视觉资源
                </h2>
                {imageSize !== 'Standard' && (
                  <button 
                    onClick={handleOpenSelectKey}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline flex items-center gap-1"
                  >
                    <i className="fas fa-key"></i> 切换 Key
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-500 italic">
                  视觉提示词: "{campaign.imagePrompt}"
                </p>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-slate-700">选择图像质量</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Standard', '1K', '2K', '4K'] as ImageSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => setImageSize(size)}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                          imageSize === size 
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-600' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {size === 'Standard' ? 'Standard (Free)' : size}
                      </button>
                    ))}
                  </div>
                </div>

                {imageSize !== 'Standard' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                    <i className="fas fa-info-circle mt-0.5"></i>
                    <div>
                      生成 1K/2K/4K 图像需要使用【付费】API Key。如果遇到 403 错误，请尝试使用 Standard。
                      <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline ml-1 font-bold">查看账单文档</a>。
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGenerateImage}
                  disabled={status === AppStatus.GENERATING_IMAGE}
                  className="w-full border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {status === AppStatus.GENERATING_IMAGE ? (
                    <><i className="fas fa-spinner animate-spin"></i> 正在渲染 {imageSize}...</>
                  ) : (
                    <><i className="fas fa-paint-brush"></i> {generatedImage ? '重新生成' : '生成视觉图'}</>
                  )}
                </button>
              </div>
            </section>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <i className="fas fa-exclamation-circle mt-1"></i>
                <p>{error}</p>
              </div>
              {error.includes("403") && (
                <div className="flex gap-2">
                   <button 
                    onClick={() => { setImageSize('Standard'); setError(null); }}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors text-xs"
                  >
                    切回 Standard 画质
                  </button>
                  <button 
                    onClick={handleOpenSelectKey}
                    className="flex-1 bg-white border border-red-600 text-red-600 py-2 rounded-lg font-bold hover:bg-red-50 transition-colors text-xs"
                  >
                    选择付费 Key
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Results Display */}
        <div className="lg:col-span-8">
          {!campaign && status === AppStatus.IDLE && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-envelope-open-text text-3xl"></i>
              </div>
              <p className="text-lg font-medium">生成的营销内容将显示在这里。</p>
              <p className="text-sm mt-2">在左侧描述您的目标即可开始。</p>
            </div>
          )}

          {(campaign || status === AppStatus.GENERATING_CONTENT) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-500">
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                {/* Visual Header */}
                <div className="relative aspect-video bg-slate-100 flex items-center justify-center group">
                  {status === AppStatus.GENERATING_IMAGE ? (
                    <div className="text-center p-6">
                      <i className="fas fa-spinner animate-spin text-4xl text-indigo-600 mb-4"></i>
                      <p className="text-slate-500 font-medium">正在为您创作专属视觉大片...</p>
                      <p className="text-xs text-slate-400 mt-1">根据图像质量，可能需要 30-60 秒。</p>
                    </div>
                  ) : generatedImage ? (
                    <img src={generatedImage} alt="Campaign Visual" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-8">
                      <i className="fas fa-image text-4xl text-slate-200 mb-2"></i>
                      <p className="text-slate-400">从侧边栏生成视觉效果以完成设计。</p>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-8 md:p-12">
                  {status === AppStatus.GENERATING_CONTENT ? (
                    <div className="space-y-6">
                      <div className="h-6 w-3/4 bg-slate-100 animate-pulse rounded"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-slate-100 animate-pulse rounded"></div>
                        <div className="h-4 w-full bg-slate-100 animate-pulse rounded"></div>
                        <div className="h-4 w-5/6 bg-slate-100 animate-pulse rounded"></div>
                      </div>
                      <div className="h-12 w-48 bg-slate-100 animate-pulse rounded-xl"></div>
                    </div>
                  ) : campaign && (
                    <>
                      <div className="mb-8">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">推荐邮件标题</h3>
                        <div className="space-y-2">
                          {campaign.subjectLines.map((line, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl group hover:bg-indigo-50 transition-colors cursor-pointer">
                              <i className="fas fa-star text-indigo-400 group-hover:text-indigo-600"></i>
                              <span className="text-slate-800 font-medium">{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="prose prose-slate max-w-none">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">邮件正文</h3>
                        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-lg mb-10">
                          {campaign.bodyCopy}
                        </div>
                        
                        <div className="flex justify-center">
                          <button className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                            {campaign.cta}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {campaign && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
                      <i className="fas fa-chart-line"></i> 语调
                    </div>
                    <p className="text-emerald-800 text-xs">根据您的提示词优化了互动性。</p>
                  </div>
                  <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                    <div className="flex items-center gap-2 text-sky-700 font-bold text-sm mb-1">
                      <i className="fas fa-bullseye"></i> 目标
                    </div>
                    <p className="text-sky-800 text-xs">精准对应您指定的受众群体。</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                    <div className="flex items-center gap-2 text-purple-700 font-bold text-sm mb-1">
                      <i className="fas fa-mobile-alt"></i> 响应式
                    </div>
                    <p className="text-purple-800 text-xs">文案结构针对手机端高可读性进行了优化。</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ChatBot />
      
      <footer className="mt-20 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
        <p>&copy; 2024 CampaignFlow AI. 由 Gemini 3 提供技术支持。</p>
      </footer>
    </div>
  );
};

export default App;
