import { put, list, head, del } from '@vercel/blob';
import EncryptionService from './encryption';
import { StockItem, Category } from './database';

export interface SimpleSyncData {
  items: StockItem[];
  categories: Category[];
  lastModified: number;
  deviceId: string;
}

class SimpleSyncService {
  private static readonly SYNC_TOKEN_KEY = 'suppli_sync_token';
  private static readonly BLOB_FILENAME_KEY = 'suppli_blob_filename';

  /**
   * Get sync configuration from localStorage
   */
  static getSyncConfig(): { token?: string; blobFilename?: string } | null {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem(this.SYNC_TOKEN_KEY);
    const blobFilename = localStorage.getItem(this.BLOB_FILENAME_KEY);

    if (token && blobFilename) {
      return { token, blobFilename };
    }

    return null;
  }

  /**
   * Set sync configuration in localStorage
   */
  static setSyncConfig(token: string, blobFilename: string): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(this.SYNC_TOKEN_KEY, token);
    localStorage.setItem(this.BLOB_FILENAME_KEY, blobFilename);
  }

  /**
   * Clear sync configuration from localStorage
   */
  static clearSyncConfig(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(this.SYNC_TOKEN_KEY);
    localStorage.removeItem(this.BLOB_FILENAME_KEY);
  }

  /**
   * Generate a unique sync token and blob filename
   */
  static generateSyncConfig(): { token: string; blobFilename: string } {
    const token = crypto.randomUUID();
    const blobFilename = `suppli-sync-${token}.json`;
    return { token, blobFilename };
  }

  /**
   * Upload data to Vercel Blob with encryption
   */
  static async uploadToBlob(
    blobFilename: string,
    data: SimpleSyncData,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Encrypt data
      const encrypted = await EncryptionService.encrypt(data, password);

      // Upload to Vercel Blob
      const blob = await put(blobFilename, JSON.stringify(encrypted), {
        access: 'private',
      });

      return { success: !!blob.url };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, error: 'Upload failed' };
    }
  }

  /**
   * Download and decrypt data from Vercel Blob
   */
  static async downloadFromBlob(
    blobFilename: string,
    password: string
  ): Promise<{ data?: SimpleSyncData; error?: string }> {
    try {
      // List blobs to find our file
      const blobs = await list({ prefix: blobFilename });

      if (blobs.blobs.length === 0) {
        return { error: 'No data found' };
      }

      // Get the blob
      const response = await fetch(blobs.blobs[0].url);
      const encryptedData = await response.json();

      // Decrypt data
      const result = await EncryptionService.decrypt(
        encryptedData.encryptedData,
        password,
        encryptedData.iv,
        encryptedData.salt
      );

      if (result.success) {
        return { data: result.data };
      } else {
        return { error: 'Failed to decrypt data' };
      }
    } catch (error) {
      console.error('Download error:', error);
      return { error: 'Download failed' };
    }
  }

  /**
   * Check if blob exists and get its last modified time
   */
  static async getBlobInfo(blobFilename: string): Promise<{
    exists: boolean;
    lastModified?: number;
  }> {
    try {
      const blobs = await list({ prefix: blobFilename });

      if (blobs.blobs.length === 0) {
        return { exists: false };
      }

      return {
        exists: true,
        lastModified: blobs.blobs[0].uploadedAt
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Delete blob from Vercel Blob
   */
  static async deleteBlob(blobFilename: string): Promise<boolean> {
    try {
      const blobs = await list({ prefix: blobFilename });

      for (const blob of blobs.blobs) {
        await del(blob.url);
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  /**
   * Create sync data from items and categories
   */
  static createSyncData(
    items: StockItem[],
    categories: Category[],
    deviceId: string
  ): SimpleSyncData {
    return {
      items,
      categories,
      lastModified: Date.now(),
      deviceId,
    };
  }

  /**
   * Generate encryption key from sync token
   */
  static getEncryptionKey(token: string): string {
    return token; // Use token as the encryption key
  }
}

export default SimpleSyncService;