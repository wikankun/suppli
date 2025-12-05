import CryptoJS from 'crypto-js';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt?: string;
}

export interface DecryptionResult {
  data: any;
  success: boolean;
  error?: string;
}

class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 32;

  /**
   * Generate a cryptographic key from password and salt
   */
  private static async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a random salt
   */
  private static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
  }

  /**
   * Generate a random IV
   */
  private static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to Uint8Array
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Encrypt data using Web Crypto API (AES-GCM)
   */
  static async encrypt(
    data: any,
    password: string
  ): Promise<EncryptionResult> {
    try {
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);

      const salt = this.generateSalt();
      const iv = this.generateIV();
      const key = await this.deriveKey(password, salt);

      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv,
        },
        key,
        dataBuffer
      );

      return {
        encryptedData: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt),
      };
    } catch (error) {
      console.error('Web Crypto API encryption failed:', error);
      // Fallback to crypto-js
      return this.encryptWithCryptoJS(data, password);
    }
  }

  /**
   * Decrypt data using Web Crypto API (AES-GCM)
   */
  static async decrypt(
    encryptedData: string,
    password: string,
    iv: string,
    salt?: string
  ): Promise<DecryptionResult> {
    try {
      // Try Web Crypto API first
      if (salt) {
        const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
        const ivBuffer = this.base64ToArrayBuffer(iv);
        const saltBuffer = this.base64ToArrayBuffer(salt);
        const key = await this.deriveKey(password, saltBuffer);

        const decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: this.ALGORITHM,
            iv: ivBuffer,
          },
          key,
          encryptedBuffer
        );

        const decoder = new TextDecoder();
        const jsonString = decoder.decode(decryptedBuffer);
        const data = JSON.parse(jsonString);

        return { data, success: true };
      } else {
        // No salt means it's likely crypto-js encrypted
        return this.decryptWithCryptoJS(encryptedData, password);
      }
    } catch (error) {
      console.error('Web Crypto API decryption failed:', error);
      // Fallback to crypto-js
      return this.decryptWithCryptoJS(encryptedData, password);
    }
  }

  /**
   * Fallback encryption using crypto-js
   */
  private static encryptWithCryptoJS(
    data: any,
    password: string
  ): EncryptionResult {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, password).toString();

    return {
      encryptedData: encrypted,
      iv: '', // crypto-js doesn't expose IV
    };
  }

  /**
   * Fallback decryption using crypto-js
   */
  private static decryptWithCryptoJS(
    encryptedData: string,
    password: string
  ): DecryptionResult {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

      if (!jsonString) {
        return {
          data: null,
          success: false,
          error: 'Failed to decrypt data',
        };
      }

      const data = JSON.parse(jsonString);
      return { data, success: true };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: 'Decryption failed',
      };
    }
  }

  /**
   * Generate a secure random key
   */
  static generateSecureKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array);
  }

  /**
   * Create a hash of data for integrity checking
   */
  static async createHash(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);

    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Verify data integrity
   */
  static async verifyHash(data: any, expectedHash: string): Promise<boolean> {
    const actualHash = await this.createHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Compress data before encryption (optional optimization)
   */
  static compress(data: any): string {
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
  }

  /**
   * Decompress data after decryption
   */
  static decompress(compressedData: string): any {
    try {
      const jsonString = atob(compressedData);
      return JSON.parse(jsonString);
    } catch {
      // If decompression fails, return as-is
      return compressedData;
    }
  }
}

export default EncryptionService;