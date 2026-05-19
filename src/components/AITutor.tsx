import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, X, Settings, Key, Cpu, Check, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface AITutorProps {
  currentContext: any;
  layout?: 'floating' | 'sidebar';
}

type ModelType = 'gemini-2.0-flash' | 'deepseek-r1';

export const AITutor: React.FC<AITutorProps> = ({ currentContext, layout = 'floating' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('aitutor_api_key') || '');
  const [selectedModel, setSelectedModel] = useState<ModelType>(() => (localStorage.getItem('aitutor_model') as ModelType) || 'gemini-2.0-flash');
  
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>(() => {
    const saved = localStorage.getItem('aitutor_messages');
    return saved ? JSON.parse(saved) : [
      { role: 'ai', text: "观察图中红色的向量 **v1**。在线性变换时，如果向量的方向保持不变（仅发生缩放），它就是**特征向量**。缩放的倍数即为**特征值**。这种“不动”的方向揭示了矩阵变换的内在逻辑。" }
    ];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    localStorage.setItem('aitutor_api_key', apiKey);
    localStorage.setItem('aitutor_model', selectedModel);
  }, [apiKey, selectedModel]);

  useEffect(() => {
    localStorage.setItem('aitutor_messages', JSON.stringify(messages));
  }, [messages]);

  const isSidebar = layout === 'sidebar';

  const clearHistory = () => {
    const defaultMsg = { role: 'ai' as const, text: "观察图中红色的向量 **v1**。在线性变换时，如果向量的方向保持不变（仅发生缩放），它就是**特征向量**。缩放的倍数即为**特征值**。这种“不动”的方向揭示了矩阵变换的内在逻辑。" };
    setMessages([defaultMsg]);
  };

  const callGemini = async (prompt: string) => {
    const contextStr = JSON.stringify(currentContext);
    const fullPrompt = `你是一个深思熟虑的数学导师。当前数学上下文：${contextStr}。
    
    你的任务：
    1. 紧密结合可视化图表（向量、坐标网格、变换过程）解释特征值和特征向量。
    2. 使用精炼、直观的语言，重点解释“为什么方向不变”或“为什么空间会塌陷”。
    3. 在回答结束时，抛出一个启发式的问题引导用户观察图中的特定变化。
    
    用户问：${prompt}`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });
    
    if (!response.ok) throw new Error('Gemini API Error');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "未收到有效回复";
  };

  const callDeepSeek = async (prompt: string) => {
    const contextStr = JSON.stringify(currentContext);
    const fullPrompt = `你是一个深思熟虑的数学导师。当前数学上下文：${contextStr}。
    
    你的任务：
    1. 紧密结合可视化图表（向量、坐标网格、变换过程）解释特征值和特征向量。
    2. 使用精炼、直观的语言。
    3. 在回答结束时，抛出一个启发式的问题引导用户。
    
    用户问：${prompt}`;
    
    // DeepSeek R1 usually uses the OpenAI-compatible endpoint
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner', // DeepSeek-R1 API name
        messages: [{ role: 'user', content: fullPrompt }]
      })
    });
    
    if (!response.ok) throw new Error('DeepSeek API Error');
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "未收到有效回复";
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!apiKey) {
      setShowSettings(true);
      return;
    }
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      let aiResponse = "";
      if (selectedModel.startsWith('gemini')) {
        aiResponse = await callGemini(userMsg);
      } else {
        aiResponse = await callDeepSeek(userMsg);
      }
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "❌ **错误**: 无法调用模型。请检查 API Key 是否正确且有效，或者网络是否畅通（部分 API 需要特殊网络环境）。" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const ChatContent = (
    <div className={cn(
        "flex flex-col h-full overflow-hidden transition-all duration-300",
        isSidebar ? "bg-slate-50" : "bg-white rounded-2xl shadow-2xl border border-slate-200"
    )}>
        {/* Header - only if floating or restricted sidebar header */}
        <div className={cn(
            "p-4 flex items-center justify-between shrink-0",
            isSidebar ? "border-b border-slate-200 bg-white" : "bg-indigo-600 text-white"
        )}>
            <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", isSidebar ? "bg-indigo-500" : "bg-white")}></div>
                <span className={cn("text-xs font-bold uppercase tracking-widest", isSidebar ? "text-slate-900" : "text-white")}>AI 互动导师</span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowSettings(!showSettings)} 
                  className={cn(
                    "p-1.5 rounded-lg transition-colors", 
                    isSidebar ? "hover:bg-slate-100 text-slate-400" : "hover:bg-white/20 text-white"
                  )}
                  title="设置 API Key 和模型"
                >
                    <Settings className="w-5 h-5" />
                </button>
                {!isSidebar && (
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-white">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>

        {/* Settings Panel Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-900 text-white shrink-0 overflow-hidden"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">模型设置</span>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
                      <Key className="w-3 h-3" /> API Key (加密存储于浏览器)
                    </label>
                    <input 
                      type="password" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="输入您的 API Key..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
                      <Cpu className="w-3 h-3" /> 选择大模型
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'gemini-2.0-flash', name: 'Gemini 3 Flash' },
                        { id: 'deepseek-r1', name: 'DeepSeek R1' }
                      ].map(model => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModel(model.id as ModelType)}
                          className={cn(
                            "px-2 py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between",
                            selectedModel === model.id 
                              ? "bg-indigo-600 border-indigo-500 text-white" 
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                          )}
                        >
                          {model.name}
                          {selectedModel === model.id && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!apiKey && (
                    <div className="flex items-center gap-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      <span className="text-[9px] text-rose-200">必须输入 API Key 才能调用导师功能</span>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowSettings(false)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-900/40"
                  >
                    确认大模型选择
                  </button>

                  <button 
                    onClick={clearHistory}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all border border-slate-700"
                  >
                    清空对话记录
                  </button>
                </div>
                
                <div className="pt-2 text-[8px] text-slate-500 border-t border-slate-800 leading-tight">
                  提示：DeepSeek API 需要 OpenAI 兼容格式，Gemini 需要 Google Cloud 密钥。本应用仅在您的浏览器中安全地调用接口，不会泄露给第三方。
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className={cn(
            "flex-1 overflow-y-auto p-5 space-y-6",
            isSidebar ? "bg-transparent" : "bg-slate-50/50"
        )}>
            {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                        "max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                        msg.role === 'user' 
                            ? "bg-slate-800 text-white rounded-tr-none" 
                            : isSidebar 
                                ? "bg-white border border-slate-100 text-slate-700 italic rounded-tl-none" 
                                : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                    )}>
                        <div className="markdown-body">
                            <Markdown>{msg.text}</Markdown>
                        </div>
                    </div>
                </div>
            ))}
            {isTyping && (
                <div className="flex justify-start">
                    <div className={cn(
                        "p-4 rounded-2xl rounded-tl-none flex gap-1.5 shadow-sm",
                        isSidebar ? "bg-white border border-slate-100" : "bg-white border border-slate-200"
                    )}>
                        <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                </div>
            )}
        </div>

        {/* Challenges for Sidebar */}
        {isSidebar && (
             <div className="px-5 py-4 space-y-3 mb-2 shrink-0 border-t border-slate-100 bg-slate-50/50">
                <div 
                    onClick={() => setInput("如果一个矩阵没有实数特征向量，它的图形变换看起来会是什么样？")}
                    className="p-3 rounded-xl bg-white hover:bg-indigo-50 cursor-pointer border border-slate-100 hover:border-indigo-100 transition-all group"
                >
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 group-hover:text-indigo-500">图形与特征值</div>
                    <p className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">为什么旋转变换通常没有实特征向量？</p>
                </div>
                <div 
                    onClick={() => setInput("解释一下图中行列式 det(A) 变为 0 时，特征向量发生了什么？")}
                    className="p-3 rounded-xl bg-white hover:bg-emerald-50 cursor-pointer border border-slate-100 hover:border-emerald-100 transition-all group"
                >
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 group-hover:text-emerald-500">降维的视觉证据</div>
                    <p className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">当特征值为 0 时，平面是如何坍缩的？</p>
                </div>
            </div>
        )}

        {/* Input */}
        <div className={cn(
            "p-4 shrink-0",
            isSidebar ? "border-t border-slate-200 bg-white" : "border-t border-slate-200 bg-white"
        )}>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="输入您的数学疑问..."
                    className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all",
                        isSidebar ? "bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-600" : "bg-slate-100 border border-transparent focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    )}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className={cn(
                        "p-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md",
                        isSidebar ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-indigo-600 text-white hover:bg-indigo-700"
                    )}
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
  );

  if (isSidebar) return ChatContent;

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-200 flex items-center gap-3 hover:bg-indigo-700 transition-colors"
          id="ai-tutor-trigger"
        >
          <Sparkles className="w-6 h-6" />
          <span className="font-bold tracking-wide">AI 导师</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-28 right-8 w-[400px] max-w-[calc(100vw-4rem)] h-[600px] z-50 overflow-hidden"
            id="ai-tutor-window"
          >
            {ChatContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
