'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { toast } from 'sonner';
import { stockDB } from '@/lib/database';
import SimpleSyncService from '@/lib/sync-service';

interface SimpleSyncContextType {
  // State
  isConfigured: boolean;
  syncToken?: string;
  blobFilename?: string;
  lastSync?: number;
  remoteLastSync?: number;
  syncInProgress: boolean;
  isOnline: boolean;

  // Actions
  generateSync: () => Promise<void>;
  joinSync: (token: string) => Promise<boolean>;
  syncNow: () => Promise<void>;
  unSync: () => Promise<void>;
}

const SimpleSyncContext = createContext<SimpleSyncContextType | undefined>(undefined);

export function useSimpleSync() {
  const context = useContext(SimpleSyncContext);
  if (!context) {
    throw new Error('useSimpleSync must be used within a SimpleSyncProvider');
  }
  return context;
}

interface SimpleSyncProviderProps {
  children: ReactNode;
}

export function SimpleSyncProvider({ children }: SimpleSyncProviderProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [syncToken, setSyncToken] = useState<string>();
  const [blobFilename, setBlobFilename] = useState<string>();
  const [lastSync, setLastSync] = useState<number>();
  const [remoteLastSync, setRemoteLastSync] = useState<number>();
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load sync config on mount
  useEffect(() => {
    const config = SimpleSyncService.getSyncConfig();
    if (config) {
      setSyncToken(config.token);
      setBlobFilename(config.blobFilename);
      setIsConfigured(true);
    }

    // Load last sync time from localStorage
    const storedLastSync = localStorage.getItem('suppli_last_sync');
    if (storedLastSync) {
      setLastSync(parseInt(storedLastSync));
    }
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check remote sync status
  const checkRemoteSync = useCallback(async () => {
    if (!blobFilename) return;

    try {
      const response = await fetch(
        `/api/sync/download?blobFilename=${encodeURIComponent(blobFilename)}`
      );
      const data = await response.json();

      if (data.success && data.exists) {
        setRemoteLastSync(data.lastModified);
      }
    } catch (error) {
      console.error('Failed to check remote sync:', error);
    }
  }, [blobFilename]);

  // Check remote sync periodically
  useEffect(() => {
    if (isConfigured && isOnline) {
      checkRemoteSync();
      const interval = setInterval(checkRemoteSync, 15 * 60000); // Check every 15 minutes
      return () => clearInterval(interval);
    }
  }, [isConfigured, isOnline, checkRemoteSync]);

  // Generate sync configuration and upload initial data
  const generateSync = useCallback(async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setSyncInProgress(true);

    try {
      // Generate sync config
      const config = SimpleSyncService.generateSyncConfig();

      // Get all data
      const items = await stockDB.getAllItems();
      const categories = await stockDB.getAllCategories();

      // Create sync data
      const syncData = SimpleSyncService.createSyncData(
        items,
        categories,
        'initial-device'
      );

      // Upload to API
      const response = await fetch('/api/sync/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobFilename: config.blobFilename,
          items: syncData.items,
          categories: syncData.categories,
          deviceId: 'initial-device',
          syncToken: config.token,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Save config locally
        SimpleSyncService.setSyncConfig(config.token, config.blobFilename);
        setSyncToken(config.token);
        setBlobFilename(config.blobFilename);
        setIsConfigured(true);

        toast.success('Sync configured successfully');
      } else {
        toast.error(result.error || 'Failed to configure sync');
      }
    } catch (error) {
      console.error('Generate sync error:', error);
      toast.error('Failed to configure sync');
    } finally {
      setSyncInProgress(false);
    }
  }, [isOnline]);

  // Join existing sync
  const joinSync = useCallback(async (token: string) => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return false;
    }

    if (!token.trim()) {
      toast.error('Please enter a sync token');
      return false;
    }

    setSyncInProgress(true);

    try {
      // Generate blob filename from token
      const blobFilename = `suppli-sync-${token}.json`;

      // Download existing data
      const response = await fetch('/api/sync/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobFilename,
          syncToken: token,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Save config locally
        SimpleSyncService.setSyncConfig(token, blobFilename);
        setSyncToken(token);
        setBlobFilename(blobFilename);
        setIsConfigured(true);

        // Apply downloaded data to local database
        await stockDB.applySyncData({
          version: '1.0.0',
          deviceId: result.data.deviceId,
          timestamp: result.data.lastModified,
          items: result.data.items,
          categories: result.data.categories,
          metadata: {
            lastSyncId: token,
            checksum: '',
            compressed: false,
            deviceId: result.data.deviceId,
            deviceName: 'Joined Device',
          },
        });

        // Update last sync time
        const now = Date.now();
        localStorage.setItem('suppli_last_sync', now.toString());
        setLastSync(now);

        toast.success('Successfully joined sync');
        return true;
      } else {
        toast.error(result.error || 'Failed to join sync');
        return false;
      }
    } catch (error) {
      console.error('Join sync error:', error);
      toast.error('Failed to join sync');
      return false;
    } finally {
      setSyncInProgress(false);
    }
  }, [isOnline]);

  // Sync now - upload local data
  const syncNow = useCallback(async () => {
    if (!isConfigured || !syncToken || !blobFilename) {
      toast.error('Sync not configured');
      return;
    }

    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setSyncInProgress(true);

    try {
      // Get all data
      const items = await stockDB.getAllItems();
      const categories = await stockDB.getAllCategories();

      // Create sync data
      const syncData = SimpleSyncService.createSyncData(
        items,
        categories,
        'current-device'
      );

      // Upload to API
      const response = await fetch('/api/sync/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobFilename,
          items: syncData.items,
          categories: syncData.categories,
          deviceId: 'current-device',
          syncToken,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update last sync time
        const now = Date.now();
        localStorage.setItem('suppli_last_sync', now.toString());
        setLastSync(now);
        setRemoteLastSync(now);

        toast.success('Data synced successfully');
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');
    } finally {
      setSyncInProgress(false);
    }
  }, [isConfigured, syncToken, blobFilename, isOnline]);

  // Unsync - delete sync config and optionally delete blob
  const unSync = useCallback(async () => {
    if (!isConfigured) {
      toast.error('No sync to remove');
      return;
    }

    if (confirm('Are you sure you want to stop syncing? This will not delete your local data.')) {
      // Clear local config
      SimpleSyncService.clearSyncConfig();
      setIsConfigured(false);
      setSyncToken(undefined);
      setBlobFilename(undefined);
      setLastSync(undefined);
      setRemoteLastSync(undefined);

      toast.success('Sync removed successfully');
    }
  }, [isConfigured]);

  const contextValue: SimpleSyncContextType = {
    isConfigured,
    syncToken,
    blobFilename,
    lastSync,
    remoteLastSync,
    syncInProgress,
    isOnline,
    generateSync,
    joinSync,
    syncNow,
    unSync,
  };

  return (
    <SimpleSyncContext.Provider value={contextValue}>
      {children}
    </SimpleSyncContext.Provider>
  );
}
