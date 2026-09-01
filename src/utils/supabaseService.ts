import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface SupabaseSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  hasConfig: boolean;
  usingEnv: boolean;
}

const SUPABASE_CONFIG_STORAGE_KEY = 'dsi_supabase_custom_config_v1';
const SUPABASE_TABLE_NAME = 'dsi_app_data';

export const SUPABASE_SETUP_SQL = `-- Run this in your Supabase SQL Editor:
-- 1. Create the persistent application data store table
create table if not exists public.dsi_app_data (
  key text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.dsi_app_data enable row level security;

-- 3. Allow read and write access for anon key (Vercel & all clients)
create policy "Allow anon read and write on dsi_app_data"
on public.dsi_app_data
for all
using (true)
with check (true);

-- 4. Enable Realtime updates
alter publication supabase_realtime add table public.dsi_app_data;
`;

let clientInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export const supabaseService = {
  getStoredConfig(): { config: SupabaseConfig | null; isFromEnv: boolean } {
    // 1. Check environment variables
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
    const envUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
    const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

    if (envUrl && envKey) {
      return {
        config: { url: envUrl, anonKey: envKey },
        isFromEnv: true,
      };
    }

    // 2. Check localStorage custom configuration
    try {
      const saved = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SupabaseConfig;
        if (parsed.url && parsed.anonKey) {
          return {
            config: { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() },
            isFromEnv: false,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored Supabase config', e);
    }

    return { config: null, isFromEnv: false };
  },

  saveConfig(url: string, anonKey: string): void {
    try {
      localStorage.setItem(
        SUPABASE_CONFIG_STORAGE_KEY,
        JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
      );
      // Invalidate cached client
      clientInstance = null;
      currentConfigKey = '';
    } catch (e) {
      console.error('Failed to save Supabase config to storage', e);
    }
  },

  clearConfig(): void {
    try {
      localStorage.removeItem(SUPABASE_CONFIG_STORAGE_KEY);
      clientInstance = null;
      currentConfigKey = '';
    } catch (e) {
      console.error('Failed to clear Supabase config', e);
    }
  },

  getClient(): SupabaseClient | null {
    const { config } = this.getStoredConfig();
    if (!config || !config.url || !config.anonKey) {
      return null;
    }

    const key = `${config.url}_${config.anonKey}`;
    if (clientInstance && currentConfigKey === key) {
      return clientInstance;
    }

    try {
      // Clean URL (remove trailing slash)
      const cleanUrl = config.url.replace(/\/+$/, '');
      clientInstance = createClient(cleanUrl, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      currentConfigKey = key;
      return clientInstance;
    } catch (e) {
      console.error('Failed initializing Supabase client:', e);
      return null;
    }
  },

  async testConnection(customUrl?: string, customKey?: string): Promise<{
    success: boolean;
    error?: string;
    tableExists?: boolean;
    message?: string;
  }> {
    let client: SupabaseClient;

    if (customUrl && customKey) {
      try {
        const cleanUrl = customUrl.trim().replace(/\/+$/, '');
        client = createClient(cleanUrl, customKey.trim(), {
          auth: { persistSession: false },
        });
      } catch (e: any) {
        return { success: false, error: e?.message || 'Invalid Supabase URL or Key' };
      }
    } else {
      const active = this.getClient();
      if (!active) {
        return { success: false, error: 'Supabase credentials are not configured yet.' };
      }
      client = active;
    }

    try {
      // Test querying the dsi_app_data table
      const { data, error } = await client
        .from(SUPABASE_TABLE_NAME)
        .select('key, updated_at')
        .limit(1);

      if (error) {
        // Table not found error
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          return {
            success: true,
            tableExists: false,
            message: 'Connected to Supabase project! However, the `dsi_app_data` table has not been created yet.',
          };
        }
        return {
          success: false,
          error: `${error.message} (${error.code || 'API Error'})`,
        };
      }

      return {
        success: true,
        tableExists: true,
        message: 'Successfully connected to Supabase database! Table `dsi_app_data` is ready and verified.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network connection error when reaching Supabase.',
      };
    }
  },

  async fetchAllData(): Promise<{
    success: boolean;
    data?: Record<string, any>;
    error?: string;
    tableExists?: boolean;
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'No active Supabase client' };
    }

    try {
      const { data, error } = await client.from(SUPABASE_TABLE_NAME).select('*');

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          return { success: false, tableExists: false, error: 'Table dsi_app_data does not exist yet' };
        }
        return { success: false, error: error.message };
      }

      const map: Record<string, any> = {};
      if (Array.isArray(data)) {
        for (const row of data) {
          if (row.key && row.data !== undefined) {
            map[row.key] = row.data;
          }
        }
      }

      return { success: true, data: map, tableExists: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed fetching from Supabase' };
    }
  },

  async saveData(key: string, value: any): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'No Supabase client configured' };
    }

    try {
      const { error } = await client.from(SUPABASE_TABLE_NAME).upsert(
        {
          key,
          data: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      if (error) {
        console.warn(`Supabase upsert error for key "${key}":`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      console.error(`Supabase save error for key "${key}":`, e);
      return { success: false, error: e?.message || 'Save error' };
    }
  },

  subscribeToChanges(onRemoteUpdate: (key: string, data: any) => void) {
    const client = this.getClient();
    if (!client) return () => {};

    try {
      const channel = client
        .channel('dsi_app_realtime_sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: SUPABASE_TABLE_NAME,
          },
          (payload) => {
            if (payload.new && typeof payload.new === 'object') {
              const row = payload.new as { key?: string; data?: any };
              if (row.key && row.data !== undefined) {
                onRemoteUpdate(row.key, row.data);
              }
            }
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Failed to setup Supabase realtime subscription:', e);
      return () => {};
    }
  },
};
