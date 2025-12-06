import { v4 as uuidv4 } from 'uuid';

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  userAgent: string;
  createdAt: number;
  lastSeen: number;
  version: string;
}

export interface SyncGroup {
  id: string;
  name: string;
  devices: DeviceInfo[];
  createdAt: number;
  updatedAt: number;
}

class DeviceManager {
  private static readonly DEVICE_ID_KEY = 'suppli_device_id';
  private static readonly DEVICE_INFO_KEY = 'suppli_device_info';
  private static readonly SYNC_GROUP_KEY = 'suppli_sync_group';
  private static readonly USER_PIN_KEY = 'suppli_user_pin';

  /**
   * Check if localStorage is available (client-side)
   */
  private static isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * Get or create device ID
   */
  static getDeviceId(): string {
    if (!this.isClient()) {
      // Server-side, return a temporary ID
      return 'server-temp-id';
    }

    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  }

  /**
   * Get or create device info
   */
  static getDeviceInfo(): DeviceInfo {
    if (!this.isClient()) {
      // Server-side, return minimal device info
      return {
        id: this.getDeviceId(),
        name: 'Server Device',
        platform: 'Server',
        userAgent: 'Server',
        createdAt: Date.now(),
        lastSeen: Date.now(),
        version: '1.0.0',
      };
    }

    const stored = localStorage.getItem(this.DEVICE_INFO_KEY);

    if (stored) {
      try {
        const info = JSON.parse(stored);
        // Update last seen timestamp
        info.lastSeen = Date.now();
        localStorage.setItem(this.DEVICE_INFO_KEY, JSON.stringify(info));
        return info;
      } catch (error) {
        console.error('Failed to parse device info:', error);
      }
    }

    // Create new device info
    const info: DeviceInfo = {
      id: this.getDeviceId(),
      name: this.generateDeviceName(),
      platform: this.getPlatform(),
      userAgent: navigator.userAgent,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      version: '1.0.0',
    };

    localStorage.setItem(this.DEVICE_INFO_KEY, JSON.stringify(info));
    return info;
  }

  /**
   * Generate a friendly device name
   */
  private static generateDeviceName(): string {
    if (!this.isClient()) {
      return 'Server Device';
    }
    const platform = this.getPlatform();
    const timestamp = new Date().toLocaleDateString();

    const deviceNames = {
      'iPhone': 'iPhone',
      'iPad': 'iPad',
      'Android': 'Android',
      'Windows': 'Windows PC',
      'Mac': 'Mac',
      'Linux': 'Linux',
    };

    const baseName = deviceNames[platform as keyof typeof deviceNames] || 'Device';

    // Add a suffix if there are multiple devices with the same name
    const existingName = localStorage.getItem(`${this.DEVICE_INFO_KEY}_name`);
    if (existingName && existingName.startsWith(baseName)) {
      const match = existingName.match(/\((\d+)\)$/);
      const suffix = match ? parseInt(match[1]) + 1 : 2;
      return `${baseName} (${suffix})`;
    }

    return `${baseName} - ${timestamp}`;
  }

  /**
   * Get platform string
   */
  private static getPlatform(): string {
    if (!this.isClient()) {
      return 'Server';
    }
    const userAgent = navigator.userAgent;

    if (/iPhone/.test(userAgent)) return 'iPhone';
    if (/iPad/.test(userAgent)) return 'iPad';
    if (/Android/.test(userAgent)) return 'Android';
    if (/Win/.test(userAgent)) return 'Windows';
    if (/Mac/.test(userAgent)) return 'Mac';
    if (/Linux/.test(userAgent)) return 'Linux';

    return 'Unknown';
  }

  /**
   * Update device name
   */
  static updateDeviceName(name: string): void {
    if (!this.isClient()) {
      return; // Server-side cannot update localStorage
    }
    const info = this.getDeviceInfo();
    info.name = name;
    localStorage.setItem(this.DEVICE_INFO_KEY, JSON.stringify(info));
  }

  /**
   * Get sync group
   */
  static getSyncGroup(): SyncGroup | null {
    // Check if window exists
    console.log('window:', typeof window);

    // Check if localStorage exists
    console.log('localStorage:', typeof localStorage);

    // Try to use localStorage
    try {
      localStorage.setItem('test', 'value');
      console.log('localStorage works!');
      localStorage.removeItem('test');
    } catch (e) {
      console.error('localStorage error:', e);
    }
    if (!this.isClient()) {
      return null; // Server-side cannot access localStorage
    }

    const stored = localStorage.getItem(this.SYNC_GROUP_KEY);

    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse sync group:', error);
      }
    }

    return null;
  }

  /**
   * Create or update sync group
   */
  static updateSyncGroup(group: SyncGroup): void {
    if (!this.isClient()) {
      return; // Server-side cannot update localStorage
    }
    group.updatedAt = Date.now();
    localStorage.setItem(this.SYNC_GROUP_KEY, JSON.stringify(group));
  }

  /**
   * Add device to sync group
   */
  static addDeviceToSyncGroup(device: DeviceInfo): void {
    let group = this.getSyncGroup();

    if (!group) {
      // Create new sync group
      group = {
        id: uuidv4(),
        name: `${device.name}'s Sync Group`,
        devices: [device],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    } else {
      // Add device to existing group
      const existingIndex = group.devices.findIndex(d => d.id === device.id);

      if (existingIndex >= 0) {
        group.devices[existingIndex] = device;
      } else {
        group.devices.push(device);
      }
    }

    this.updateSyncGroup(group);
  }

  /**
   * Remove device from sync group
   */
  static removeDeviceFromSyncGroup(deviceId: string): void {
    const group = this.getSyncGroup();

    if (group) {
      group.devices = group.devices.filter(d => d.id !== deviceId);

      if (group.devices.length === 0) {
        // Remove sync group if empty
        if (this.isClient()) {
          localStorage.removeItem(this.SYNC_GROUP_KEY);
        }
      } else {
        this.updateSyncGroup(group);
      }
    }
  }

  /**
   * Get all devices in sync group
   */
  static getSyncGroupDevices(): DeviceInfo[] {
    const group = this.getSyncGroup();
    return group?.devices || [];
  }

  /**
   * Check if device is in sync group
   */
  static isInSyncGroup(): boolean {
    const deviceId = this.getDeviceId();
    const devices = this.getSyncGroupDevices();
    return devices.some(d => d.id === deviceId);
  }

  /**
   * Leave sync group
   */
  static leaveSyncGroup(): void {
    this.removeDeviceFromSyncGroup(this.getDeviceId());
  }

  /**
   * Set user PIN for encryption
   */
  static setUserPin(pin: string): void {
    // Store a hash of the PIN for verification
    // In production, use a proper password hashing library
    if (!this.isClient()) {
      return; // Server-side cannot set localStorage
    }
    const hash = btoa(pin + 'suppli-salt');
    localStorage.setItem(this.USER_PIN_KEY, hash);
  }

  /**
   * Verify user PIN
   */
  static verifyUserPin(pin: string): boolean {
    if (!this.isClient()) {
      return false; // Server-side cannot verify PIN
    }
    const storedHash = localStorage.getItem(this.USER_PIN_KEY);
    if (!storedHash) return false;

    const hash = btoa(pin + 'suppli-salt');
    return hash === storedHash;
  }

  /**
   * Check if user PIN is set
   */
  static hasUserPin(): boolean {
    if (!this.isClient()) {
      return false; // Server-side cannot check localStorage
    }
    return !!localStorage.getItem(this.USER_PIN_KEY);
  }

  /**
   * Generate sync key from device ID and user PIN
   */
  static generateSyncKey(userPin?: string): string {
    const deviceId = this.getDeviceId();
    const pin = userPin || '';

    // Create a consistent key from device ID and PIN
    const combined = `${deviceId}-${pin}`;
    return btoa(combined);
  }

  /**
   * Get pairing token for QR code
   */
  static generatePairingToken(): string {
    const deviceId = this.getDeviceId();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);

    const payload = {
      deviceId,
      timestamp,
      random,
    };

    // In production, sign this token with a secret key
    return btoa(JSON.stringify(payload));
  }

  /**
   * Parse pairing token from QR code
   */
  static parsePairingToken(token: string): {
    deviceId: string;
    timestamp: number;
    valid: boolean;
  } | null {
    try {
      const decoded = atob(token);
      const payload = JSON.parse(decoded);

      // Check if token is not too old (24 hours)
      const valid = Date.now() - payload.timestamp < 24 * 60 * 60 * 1000;

      return {
        deviceId: payload.deviceId,
        timestamp: payload.timestamp,
        valid,
      };
    } catch (error) {
      console.error('Failed to parse pairing token:', error);
      return null;
    }
  }

  /**
   * Clean up old device info (devices not seen for 30 days)
   */
  static cleanupOldDevices(): void {
    const group = this.getSyncGroup();

    if (group) {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      group.devices = group.devices.filter(d => d.lastSeen > thirtyDaysAgo);
      this.updateSyncGroup(group);
    }
  }

  /**
   * Export all device data for backup
   */
  static exportDeviceData(): {
    deviceId: string;
    deviceInfo: DeviceInfo;
    syncGroup: SyncGroup | null;
    hasPin: boolean;
  } {
    return {
      deviceId: this.getDeviceId(),
      deviceInfo: this.getDeviceInfo(),
      syncGroup: this.getSyncGroup(),
      hasPin: this.hasUserPin(),
    };
  }

  /**
   * Import device data
   */
  static importDeviceData(data: {
    deviceId?: string;
    deviceInfo?: DeviceInfo;
    syncGroup?: SyncGroup;
  }): void {
    if (!this.isClient()) {
      return; // Server-side cannot import to localStorage
    }
    if (data.deviceId) {
      localStorage.setItem(this.DEVICE_ID_KEY, data.deviceId);
    }

    if (data.deviceInfo) {
      localStorage.setItem(this.DEVICE_INFO_KEY, JSON.stringify(data.deviceInfo));
    }

    if (data.syncGroup) {
      localStorage.setItem(this.SYNC_GROUP_KEY, JSON.stringify(data.syncGroup));
    }
  }

  /**
   * Reset all device data
   */
  static reset(): void {
    if (!this.isClient()) {
      return; // Server-side cannot reset localStorage
    }
    localStorage.removeItem(this.DEVICE_ID_KEY);
    localStorage.removeItem(this.DEVICE_INFO_KEY);
    localStorage.removeItem(this.SYNC_GROUP_KEY);
    localStorage.removeItem(this.USER_PIN_KEY);
  }
}

export default DeviceManager;
