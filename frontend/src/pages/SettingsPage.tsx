import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Key, Layout } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { settingsApi } from '@/services/api';
import type { AppSetting } from '@/types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll(),
  });

  useEffect(() => {
    if (settings.length > 0) {
      const initial: Record<string, string> = {};
      settings.forEach((s: AppSetting) => {
        initial[s.key] = s.value;
      });
      setFormData(initial);
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: () => {
      const updates = Object.entries(formData).map(([key, value]) => ({ key, value }));
      return settingsApi.bulkUpdate(updates);
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="text-surface-400" /> Settings
          </h1>
          <p className="text-surface-400 text-sm mt-1">Configure ClassPulse preferences and integrations</p>
        </div>
        <button
          onClick={() => saveSettings.mutate()}
          disabled={saveSettings.isPending}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="space-y-6">
        {/* Integrations */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-surface-800/60 bg-surface-900/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Key size={18} className="text-brand-400" /> Integrations
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-surface-200 mb-1 block">YouTube Data API Key</label>
              <input
                type="password"
                className="input font-mono"
                placeholder="AIzaSy..."
                value={formData.youtube_api_key || ''}
                onChange={e => handleChange('youtube_api_key', e.target.value)}
              />
              <p className="text-xs text-surface-500 mt-1">Required to read live chat from YouTube streams.</p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-surface-800/60 bg-surface-900/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Layout size={18} className="text-accent-violet" /> General Preferences
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-surface-200 mb-1 block">Default Platform</label>
                <select
                  className="input"
                  value={formData.default_platform || 'youtube'}
                  onChange={e => handleChange('default_platform', e.target.value)}
                >
                  <option value="youtube">YouTube Live</option>
                  <option value="twitch" disabled>Twitch (Coming Soon)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-surface-200 mb-1 block">Leaderboard Limit</label>
                <select
                  className="input"
                  value={formData.leaderboard_limit || '10'}
                  onChange={e => handleChange('leaderboard_limit', e.target.value)}
                >
                  <option value="5">Top 5</option>
                  <option value="10">Top 10</option>
                  <option value="20">Top 20</option>
                  <option value="50">Top 50</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-800/60 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded w-4 h-4"
                  checked={formData.show_student_avatars === 'true'}
                  onChange={e => handleChange('show_student_avatars', e.target.checked ? 'true' : 'false')}
                />
                <span className="text-sm text-surface-200">Show student avatars (if available)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded w-4 h-4"
                  checked={formData.quiz_speed_bonus === 'true'}
                  onChange={e => handleChange('quiz_speed_bonus', e.target.checked ? 'true' : 'false')}
                />
                <span className="text-sm text-surface-200">Default enable quiz speed bonus</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
