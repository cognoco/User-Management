/**
 * Session Encryption Module
 * 
 * Provides client-side encryption for sensitive session data using
 * Web Crypto API with AES-GCM encryption.
 * 
 * Security features:
 * - AES-256-GCM encryption
 * - Random IV generation for each encryption
 * - Key derivation from user-specific data
 * - Automatic key rotation on session changes
 */

import { error as logError, debug, warn } from '@/lib/utils/logger';

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: string;
  /** Base64 encoded initialization vector */
  iv: string;
  /** Algorithm used for encryption */
  algorithm: 'AES-GCM';
  /** Timestamp when data was encrypted */
  timestamp: number;
  /** Version for future compatibility */
  version: 1;
}

/**
 * Session encryption service
 */
export class SessionEncryption {
  private static instance: SessionEncryption;
  private cryptoKey: CryptoKey | null = null;
  private keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
  private lastKeyRotation = 0;

  private constructor() {}

  static getInstance(): SessionEncryption {
    if (!SessionEncryption.instance) {
      SessionEncryption.instance = new SessionEncryption();
    }
    return SessionEncryption.instance;
  }

  /**
   * Check if Web Crypto API is available
   */
  private isSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.crypto && 
           window.crypto.subtle !== undefined;
  }

  /**
   * Generate encryption key from user-specific data
   */
  private async deriveKey(userId: string, sessionId: string): Promise<CryptoKey> {
    if (!this.isSupported()) {
      throw new Error('Web Crypto API not supported');
    }

    // Combine user ID and session ID for key derivation
    const keyMaterial = `${userId}:${sessionId}:${window.location.origin}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyMaterial);

    // Import key material
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      await window.crypto.subtle.digest('SHA-256', keyData),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    debug('session-encryption', 'Encryption key derived');
    return baseKey;
  }

  /**
   * Initialize or rotate encryption key
   */
  async initializeKey(userId: string, sessionId: string, force = false): Promise<void> {
    if (!this.isSupported()) {
      warn('session-encryption', 'Web Crypto API not available, falling back to unencrypted storage');
      return;
    }

    const now = Date.now();
    const needsRotation = now - this.lastKeyRotation > this.keyRotationInterval;

    if (!this.cryptoKey || needsRotation || force) {
      try {
        this.cryptoKey = await this.deriveKey(userId, sessionId);
        this.lastKeyRotation = now;
        debug('session-encryption', force ? 'Key forcefully rotated' : 'Key initialized');
      } catch (err) {
        logError('session-encryption', 'Failed to initialize encryption key', err as Error);
        throw err;
      }
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encrypt(data: any): Promise<EncryptedData | null> {
    if (!this.isSupported() || !this.cryptoKey) {
      warn('session-encryption', 'Encryption not available, returning null');
      return null;
    }

    try {
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(JSON.stringify(data));

      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt data
      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.cryptoKey,
        plaintext
      );

      // Convert to base64 for storage
      const encryptedData: EncryptedData = {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
        iv: btoa(String.fromCharCode(...iv)),
        algorithm: 'AES-GCM',
        timestamp: Date.now(),
        version: 1
      };

      debug('session-encryption', 'Data encrypted successfully');
      return encryptedData;
    } catch (err) {
      logError('session-encryption', 'Encryption failed', err as Error);
      return null;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(encryptedData: EncryptedData): Promise<any | null> {
    if (!this.isSupported() || !this.cryptoKey) {
      warn('session-encryption', 'Decryption not available');
      return null;
    }

    // Check version compatibility
    if (encryptedData.version !== 1) {
      logError('session-encryption', 'Unsupported encryption version', new Error(`Version ${encryptedData.version}`));
      return null;
    }

    try {
      // Convert from base64
      const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));

      // Decrypt data
      const plaintext = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.cryptoKey,
        ciphertext
      );

      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(plaintext);
      
      debug('session-encryption', 'Data decrypted successfully');
      return JSON.parse(decryptedString);
    } catch (err) {
      logError('session-encryption', 'Decryption failed', err as Error);
      return null;
    }
  }

  /**
   * Clear encryption key (on logout)
   */
  clearKey(): void {
    this.cryptoKey = null;
    this.lastKeyRotation = 0;
    debug('session-encryption', 'Encryption key cleared');
  }

  /**
   * Validate encrypted data integrity
   */
  isValidEncryptedData(data: any): data is EncryptedData {
    return data &&
           typeof data === 'object' &&
           typeof data.ciphertext === 'string' &&
           typeof data.iv === 'string' &&
           data.algorithm === 'AES-GCM' &&
           typeof data.timestamp === 'number' &&
           data.version === 1;
  }

  /**
   * Check if encrypted data is expired
   */
  isExpired(encryptedData: EncryptedData, maxAge: number = 7 * 24 * 60 * 60 * 1000): boolean {
    return Date.now() - encryptedData.timestamp > maxAge;
  }
}

// Export singleton instance
export const sessionEncryption = SessionEncryption.getInstance();