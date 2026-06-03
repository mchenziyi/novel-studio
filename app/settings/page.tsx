'use client';

import { useState, useEffect } from 'react';
import { ModelConfig, ModelProvider, MODEL_PRESETS } from '@/types/model';
import { GlobalSettings } from '@/types/settings';

export default function SettingsPage() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latency?: number; error?: string }>>({});

  // 动态模型列表
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 全局设置
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai' as ModelProvider,
    settings: {} as any,
    enabled: true,
    isDefault: false,
  });

  useEffect(() => {
    loadModels();
    loadGlobalSettings();
  }, []);

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setGlobalSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveGlobalSettings = async (settings: GlobalSettings) => {
    setSavingSettings(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setGlobalSettings(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  // 手动获取模型列表
  const handleFetchModels = async () => {
    setFetchingModels(true);
    setFetchError(null);
    setAvailableModels([]);

    try {
      const params = new URLSearchParams({
        provider: formData.provider,
      });

      if (formData.settings?.apiKey) {
        params.append('apiKey', formData.settings.apiKey);
      }
      if (formData.settings?.baseURL) {
        params.append('baseURL', formData.settings.baseURL);
      }

      const response = await fetch(`/api/models/list?${params}`);
      const data = await response.json();

      if (data.error) {
        setFetchError(data.error);
      } else if (data.models.length === 0) {
        setFetchError('未获取到可用模型，请检查配置');
      } else {
        setAvailableModels(data.models);
      }
    } catch (error) {
      setFetchError('请求失败，请检查网络连接');
    } finally {
      setFetchingModels(false);
    }
  };

  const handleAddModel = async () => {
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadModels();
        setShowAddModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add model:', error);
    }
  };

  const handleUpdateModel = async () => {
    if (!editingModel) return;

    try {
      const response = await fetch('/api/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingModel.id,
          ...formData,
        }),
      });

      if (response.ok) {
        await loadModels();
        setEditingModel(null);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('确定要删除这个模型配置吗？')) return;

    try {
      const response = await fetch(`/api/models?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadModels();
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };

  const handleTestModel = async (modelId: string) => {
    setTesting(modelId);
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', modelId }),
      });
      const result = await response.json();
      setTestResults(prev => ({
        ...prev,
        [modelId]: result,
      }));
    } catch (error) {
      console.error('Failed to test model:', error);
      setTestResults(prev => ({
        ...prev,
        [modelId]: { success: false, error: '测试失败' },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleToggleDefault = async (id: string) => {
    const model = models.find(m => m.id === id);
    if (!model) return;

    try {
      await fetch('/api/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDefault: !model.isDefault }),
      });
      await loadModels();
    } catch (error) {
      console.error('Failed to toggle default:', error);
    }
  };

  const handleToggleEnabled = async (id: string) => {
    const model = models.find(m => m.id === id);
    if (!model) return;

    try {
      await fetch('/api/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !model.enabled }),
      });
      await loadModels();
    } catch (error) {
      console.error('Failed to toggle enabled:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'openai',
      settings: {},
      enabled: true,
      isDefault: false,
    });
    setAvailableModels([]);
    setFetchError(null);
  };

  const openEditModal = (model: ModelConfig) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      settings: model.settings,
      enabled: model.enabled,
      isDefault: model.isDefault,
    });
  };

  const getProviderName = (provider: ModelProvider) => {
    return MODEL_PRESETS[provider]?.name || provider;
  };

  // 判断是否需要 API Key
  const needsApiKey = ['openai', 'anthropic', 'deepseek', 'gemini'].includes(formData.provider);

  // 判断是否可以获取模型列表
  const canFetchModels = formData.provider === 'ollama' || formData.provider === 'lmstudio' || formData.settings?.apiKey;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fafafa]">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* 页面标题 */}
        <div className="mb-10">
          <h1 className="text-[32px] font-semibold text-[#171717] tracking-tight">设置</h1>
          <p className="text-[15px] text-[#737373] mt-1">
            管理 AI 模型配置和全局设置
          </p>
        </div>

        {/* 代理设置 */}
        <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#f5f5f5] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#525252]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#171717]">网络代理</h2>
              <p className="text-[13px] text-[#737373]">配置代理以访问海外 API（如 Gemini、OpenAI）</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 启用代理开关 */}
            <div className="flex items-center justify-between">
              <label className="text-[14px] text-[#171717]">启用代理</label>
              <button
                onClick={() => {
                  const newSettings = {
                    ...globalSettings,
                    proxy: {
                      ...globalSettings.proxy,
                      enabled: !globalSettings.proxy?.enabled,
                      url: globalSettings.proxy?.url || 'http://127.0.0.1:7890',
                    },
                  };
                  saveGlobalSettings(newSettings);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  globalSettings.proxy?.enabled ? 'bg-[#171717]' : 'bg-[#e8e8e8]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    globalSettings.proxy?.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 代理地址 */}
            {globalSettings.proxy?.enabled && (
              <div>
                <label className="block text-[13px] font-medium text-[#525252] mb-2">
                  代理地址
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={globalSettings.proxy?.url || ''}
                    onChange={(e) => {
                      setGlobalSettings(prev => ({
                        ...prev,
                        proxy: { ...prev.proxy!, url: e.target.value },
                      }));
                    }}
                    placeholder="http://127.0.0.1:7890"
                    className="flex-1 px-4 py-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[14px] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors"
                  />
                  <button
                    onClick={() => saveGlobalSettings(globalSettings)}
                    disabled={savingSettings}
                    className="px-4 py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-xl hover:bg-[#404040] transition-colors disabled:opacity-50"
                  >
                    {savingSettings ? '保存中...' : '保存'}
                  </button>
                </div>
                <p className="text-[11px] text-[#a3a3a3] mt-1.5">
                  常见格式：http://127.0.0.1:7890（Clash）、socks5://127.0.0.1:1080
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 添加模型按钮 */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#171717] text-white text-[14px] font-medium rounded-xl hover:bg-[#404040] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加模型
          </button>
        </div>

        {/* 模型列表 */}
        <div className="space-y-3">
          {models.map((model) => (
            <div
              key={model.id}
              className={`bg-white rounded-2xl border transition-all duration-150 ${
                model.isDefault
                  ? 'border-[#171717]'
                  : 'border-[#e8e8e8] hover:border-[#d4d4d4]'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-[15px] font-medium text-[#171717]">{model.name}</h3>
                      {model.isDefault && (
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-[#171717] text-white rounded-full">
                          默认
                        </span>
                      )}
                      {!model.enabled && (
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-[#f5f5f5] text-[#737373] rounded-full">
                          已禁用
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-[#737373]">
                      <span>{getProviderName(model.provider)}</span>
                      <span className="text-[#d4d4d4]">·</span>
                      <span className="font-mono text-[12px]">{model.settings.model}</span>
                    </div>
                    {'baseURL' in model.settings && model.settings.baseURL && (
                      <div className="text-[12px] text-[#a3a3a3] font-mono mt-1">
                        {model.settings.baseURL}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {testResults[model.id] && (
                      <span
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${
                          testResults[model.id].success
                            ? 'bg-[#f0fdf4] text-[#16a34a]'
                            : 'bg-[#fef2f2] text-[#dc2626]'
                        }`}
                      >
                        {testResults[model.id].success
                          ? `${testResults[model.id].latency}ms`
                          : '失败'}
                      </span>
                    )}

                    <button
                      onClick={() => handleTestModel(model.id)}
                      disabled={testing === model.id}
                      className="px-3 py-1.5 text-[12px] text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-lg transition-colors disabled:opacity-50"
                    >
                      {testing === model.id ? '测试中...' : '测试'}
                    </button>
                    <button
                      onClick={() => handleToggleDefault(model.id)}
                      className="px-3 py-1.5 text-[12px] text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                    >
                      {model.isDefault ? '取消默认' : '设为默认'}
                    </button>
                    <button
                      onClick={() => handleToggleEnabled(model.id)}
                      className="px-3 py-1.5 text-[12px] text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                    >
                      {model.enabled ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => openEditModal(model)}
                      className="px-3 py-1.5 text-[12px] text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteModel(model.id)}
                      className="px-3 py-1.5 text-[12px] text-[#dc2626] hover:text-[#b91c1c] hover:bg-[#fef2f2] rounded-lg transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {models.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#e8e8e8]">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f5f5] flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[#a3a3a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-[16px] font-medium text-[#171717] mb-2">还没有配置模型</h3>
              <p className="text-[14px] text-[#737373] mb-6">点击上方按钮添加你的第一个 AI 模型</p>
            </div>
          )}
        </div>
      </div>

      {/* 添加/编辑模型弹窗 */}
      {(showAddModal || editingModel) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto animate-scaleIn">
            <div className="p-8">
              <h2 className="text-[20px] font-semibold text-[#171717] mb-6">
                {editingModel ? '编辑模型' : '添加模型'}
              </h2>

              {/* 模型提供商选择 */}
              <div className="mb-6">
                <label className="block text-[13px] font-medium text-[#525252] mb-3">
                  选择提供商
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(MODEL_PRESETS) as ModelProvider[]).map((provider) => (
                    <button
                      key={provider}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          provider,
                          settings: {
                            type: provider,
                            apiKey: '',
                            baseURL: MODEL_PRESETS[provider].defaultBaseURL || '',
                            model: '',
                          },
                        }));
                        setAvailableModels([]);
                        setFetchError(null);
                      }}
                      className={`p-3 rounded-xl border transition-all duration-150 text-left ${
                        formData.provider === provider
                          ? 'border-[#171717] bg-[#fafafa]'
                          : 'border-[#e8e8e8] hover:border-[#d4d4d4]'
                      }`}
                    >
                      <div className="text-[13px] font-medium text-[#171717]">{MODEL_PRESETS[provider].name}</div>
                      <div className="text-[11px] text-[#a3a3a3] mt-0.5">{MODEL_PRESETS[provider].description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 模型名称 */}
              <div className="mb-5">
                <label className="block text-[13px] font-medium text-[#525252] mb-2">
                  显示名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：我的 GPT-4o"
                  className="w-full px-4 py-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[14px] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors"
                />
              </div>

              {/* API Key */}
              {needsApiKey && (
                <div className="mb-5">
                  <label className="block text-[13px] font-medium text-[#525252] mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.settings.apiKey || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, apiKey: e.target.value },
                    }))}
                    placeholder="sk-..."
                    className="w-full px-4 py-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[14px] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors"
                  />
                  {formData.provider === 'gemini' && (
                    <p className="text-[11px] text-[#a3a3a3] mt-1.5">
                      在 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a> 获取 API Key
                    </p>
                  )}
                </div>
              )}

              {/* Base URL */}
              {formData.provider !== 'gemini' && (
                <div className="mb-5">
                  <label className="block text-[13px] font-medium text-[#525252] mb-2">
                    API 地址
                  </label>
                  <input
                    type="text"
                    value={formData.settings.baseURL || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, baseURL: e.target.value },
                    }))}
                    placeholder={MODEL_PRESETS[formData.provider].defaultBaseURL}
                    className="w-full px-4 py-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[13px] font-mono placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors"
                  />
                  {formData.provider === 'ollama' && (
                    <p className="text-[11px] text-[#a3a3a3] mt-1.5">
                      Ollama 默认地址：http://localhost:11434
                    </p>
                  )}
                  {formData.provider === 'lmstudio' && (
                    <p className="text-[11px] text-[#a3a3a3] mt-1.5">
                      LM Studio 默认地址：http://localhost:1234/v1
                    </p>
                  )}
                </div>
              )}

              {/* 模型选择 */}
              <div className="mb-6">
                <label className="block text-[13px] font-medium text-[#525252] mb-2">
                  模型
                </label>

                {/* 获取模型按钮 */}
                <div className="mb-3">
                  <button
                    onClick={handleFetchModels}
                    disabled={fetchingModels || !canFetchModels}
                    className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#171717] bg-[#f5f5f5] hover:bg-[#e8e8e8] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fetchingModels ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#a3a3a3] border-t-transparent rounded-full animate-spin" />
                        获取中...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        获取可用模型列表
                      </>
                    )}
                  </button>
                  {!canFetchModels && (
                    <span className="ml-2 text-[11px] text-[#a3a3a3]">
                      请先填写 API Key
                    </span>
                  )}
                </div>

                {/* 错误提示 */}
                {fetchError && (
                  <div className="mb-3 p-3 bg-[#fef2f2] text-[#dc2626] text-[12px] rounded-lg">
                    {fetchError}
                  </div>
                )}

                {/* 模型下拉列表 */}
                {availableModels.length > 0 && (
                  <select
                    value={formData.settings.model || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, model: e.target.value },
                    }))}
                    className="w-full px-4 py-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[14px] focus:outline-none focus:border-[#171717] transition-colors mb-2"
                  >
                    <option value="">从列表选择...</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                )}

                {/* 手动输入 */}
                <input
                  type="text"
                  value={formData.settings.model || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, model: e.target.value },
                  }))}
                  placeholder="输入模型名称或从上方列表选择"
                  className="w-full px-4 py-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[14px] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors"
                />

                {availableModels.length > 0 && (
                  <p className="text-[11px] text-[#a3a3a3] mt-1.5">
                    已获取 {availableModels.length} 个可用模型
                  </p>
                )}
              </div>

              {/* 选项 */}
              <div className="flex items-center gap-6 mb-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d4d4d4] text-[#171717] focus:ring-[#171717]"
                  />
                  <span className="text-[13px] text-[#525252]">启用</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d4d4d4] text-[#171717] focus:ring-[#171717]"
                  />
                  <span className="text-[13px] text-[#525252]">设为默认</span>
                </label>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingModel(null);
                    resetForm();
                  }}
                  className="px-5 py-2.5 text-[14px] text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={editingModel ? handleUpdateModel : handleAddModel}
                  disabled={!formData.name || !formData.settings.model}
                  className="px-5 py-2.5 bg-[#171717] text-white text-[14px] font-medium rounded-xl hover:bg-[#404040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingModel ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
