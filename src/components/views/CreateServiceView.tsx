import React, { useState, useEffect } from 'react';
import type { ServiceConfig } from '../../types';
import { api } from '../../api/tauri';

interface CreateServiceViewProps {
  editService?: ServiceConfig | null;
  onSave: (data: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  onCancel: () => void;
}

const CreateServiceView: React.FC<CreateServiceViewProps> = ({ editService, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    command: '',
    cwd: '',
    description: '',
    port: '',
    urlTemplate: '',
    autoStart: false
  });

  useEffect(() => {
    if (editService) {
      setFormData({
        name: editService.name || '',
        command: editService.command || '',
        cwd: editService.workingDir || '',
        description: '', // description might not exist in old model
        port: editService.port ? String(editService.port) : '',
        urlTemplate: editService.urlTemplate || '',
        autoStart: false
      });
    }
  }, [editService]);

  const handleSubmit = async () => {
    const success = await onSave({
      name: formData.name,
      command: formData.command,
      workingDir: formData.cwd,
      port: formData.port ? parseInt(formData.port, 10) : 0,
      urlTemplate: formData.urlTemplate || undefined
    });
    if (success) {
      onCancel(); // go back to dashboard
    }
  };

  const handleBrowse = async () => {
    const res = await api.selectDirectory();
    if (res.success && res.filePath) {
      setFormData({ ...formData, cwd: res.filePath });
    }
  };

  return (
    <div className="p-10 pb-12">
      <div className="mb-10">
        <h1 className="font-headline text-4xl font-black text-on-surface tracking-tight mb-2">
          {editService ? '编辑服务' : '初始化新服务'}
        </h1>
        <p className="text-on-surface-variant max-w-2xl leading-relaxed">定义后台引擎参数。请确保项目路径为绝对路径，且已为目标环境转义 CLI 命令。</p>
      </div>

      <div className="max-w-4xl space-y-8">
        <div className="space-y-8">
          <section className="bg-surface-container-high p-8 rounded-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <h3 className="font-headline font-bold text-xl mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">settings_input_component</span>
              服务标识
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">服务名称</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-surface-container-highest border-none border-b-2 border-transparent focus:border-primary transition-all p-4 text-on-surface rounded-t-lg outline-none"
                  placeholder="e.g. core-data-pipeline"
                  type="text"
                />
              </div>
              <div>
                <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">项目路径 (CWD)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-sm">folder_open</span>
                    <input
                      value={formData.cwd}
                      onChange={e => setFormData({...formData, cwd: e.target.value})}
                      className="w-full bg-surface-container-highest border-none border-b-2 border-transparent focus:border-primary transition-all py-4 pl-12 pr-4 text-on-surface rounded-t-lg font-mono text-sm outline-none"
                      placeholder="/var/www/services/app-01"
                      type="text"
                    />
                  </div>
                  <button onClick={handleBrowse} className="px-6 bg-surface-container-highest hover:bg-surface-bright text-primary font-headline font-bold text-sm uppercase tracking-widest rounded-lg transition-colors ring-1 ring-outline-variant/20">
                    浏览
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden group border border-outline-variant/10">
            <div className="scanline-overlay absolute inset-0 opacity-10"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-xl flex items-center gap-2 relative z-10">
                <span className="material-symbols-outlined text-primary-dim">terminal</span>
                CLI 启动命令
              </h3>
              <span className="text-[10px] font-mono text-primary/50 uppercase tracking-widest px-2 py-1 border border-primary/20 rounded relative z-10">Shell</span>
            </div>
            <div className="relative z-10">
              <textarea
                value={formData.command}
                onChange={e => setFormData({...formData, command: e.target.value})}
                className="w-full bg-transparent border-none focus:ring-0 font-mono text-primary p-0 leading-relaxed placeholder:text-primary/20 outline-none resize-none"
                placeholder="npm run start --port 8080"
                rows={4}
              ></textarea>
            </div>
          </section>
        </div>

        <div className="flex gap-4 flex-col sm:flex-row sm:justify-end pt-1">
          <button
            onClick={handleSubmit}
            className="py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-headline font-black text-sm uppercase tracking-[0.2em] rounded-lg shadow-[0_10px_30px_rgba(0,227,253,0.3)] hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto sm:min-w-[240px] px-10"
          >
            {editService ? '保存修改' : '创建服务实例'}
          </button>
          <button
            onClick={onCancel}
            className="py-4 bg-surface-container-highest text-on-surface-variant font-headline font-bold text-sm uppercase tracking-widest rounded-lg ring-1 ring-outline-variant/20 hover:bg-surface-bright transition-colors active:scale-95 w-full sm:w-auto sm:min-w-[160px] px-8"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateServiceView;
