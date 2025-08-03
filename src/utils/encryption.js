/**
 * @fileoverview Encryption utilities for RequestBite Slingshot
 * Provides WebCrypto-based encryption/decryption for environment secrets
 */

const SESSION_KEY_NAME = 'requestbite_encryption_key';
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256; // bits

/**
 * Generates a random salt for key derivation
 * @returns {Uint8Array} Random salt bytes
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generates a random initialization vector for encryption
 * @returns {Uint8Array} Random IV bytes
 */
export function generateIV() {
  return crypto.getRandomValues(new Uint8Array(12)); // 96 bits for AES-GCM
}

/**
 * Derives an encryption key from a password using PBKDF2
 * @param {string} password - User password
 * @param {Uint8Array} salt - Salt bytes
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
export async function deriveKeyFromPassword(password, salt) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import the password as a key for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ENCRYPTION_ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // Allow export for session storage
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypts a value using AES-GCM
 * @param {string} value - Plain text value to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<{encryptedData: ArrayBuffer, iv: Uint8Array}>} Encrypted data and IV
 */
export async function encryptValue(value, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const iv = generateIV();

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
    },
    key,
    data
  );

  return { encryptedData, iv };
}

/**
 * Decrypts a value using AES-GCM
 * @param {ArrayBuffer} encryptedData - Encrypted data
 * @param {Uint8Array} iv - Initialization vector
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>} Decrypted plain text value
 */
export async function decryptValue(encryptedData, iv, key) {
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
    },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

/**
 * Converts a CryptoKey to a base64 string for storage
 * @param {CryptoKey} key - Key to export
 * @returns {Promise<string>} Base64 encoded key
 */
export async function exportKeyToBase64(key) {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Imports a CryptoKey from a base64 string
 * @param {string} base64Key - Base64 encoded key
 * @returns {Promise<CryptoKey>} Imported key
 */
export async function importKeyFromBase64(base64Key) {
  const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: ENCRYPTION_ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Stores the encryption key in session storage
 * @param {CryptoKey} key - Key to store
 * @returns {Promise<void>}
 */
export async function storeSessionKey(key) {
  try {
    const base64Key = await exportKeyToBase64(key);
    sessionStorage.setItem(SESSION_KEY_NAME, base64Key);
  } catch (error) {
    console.error('Failed to store session key:', error);
    throw new Error('Failed to store encryption key');
  }
}

/**
 * Retrieves the encryption key from session storage
 * @returns {Promise<CryptoKey|null>} Stored key or null if not found
 */
export async function getSessionKey() {
  try {
    const base64Key = sessionStorage.getItem(SESSION_KEY_NAME);
    if (!base64Key) {
      return null;
    }
    return await importKeyFromBase64(base64Key);
  } catch (error) {
    console.error('Failed to retrieve session key:', error);
    // Clear invalid key
    clearSessionKey();
    return null;
  }
}

/**
 * Clears the encryption key from session storage
 */
export function clearSessionKey() {
  sessionStorage.removeItem(SESSION_KEY_NAME);
}

/**
 * Checks if an encryption key exists in session storage
 * @returns {boolean} True if key exists
 */
export function hasSessionKey() {
  return sessionStorage.getItem(SESSION_KEY_NAME) !== null;
}

/**
 * Converts Uint8Array to base64 string
 * @param {Uint8Array} bytes - Bytes to convert
 * @returns {string} Base64 string
 */
export function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Converts base64 string to Uint8Array
 * @param {string} base64 - Base64 string to convert
 * @returns {Uint8Array} Converted bytes
 */
export function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

/**
 * Converts ArrayBuffer to base64 string
 * @param {ArrayBuffer} buffer - Buffer to convert
 * @returns {string} Base64 string
 */
export function arrayBufferToBase64(buffer) {
  return bytesToBase64(new Uint8Array(buffer));
}

/**
 * Converts base64 string to ArrayBuffer
 * @param {string} base64 - Base64 string to convert
 * @returns {ArrayBuffer} Converted buffer
 */
export function base64ToArrayBuffer(base64) {
  return base64ToBytes(base64).buffer;
}

/**
 * High-level function to encrypt a secret value
 * Requires a session key to be available
 * @param {string} value - Value to encrypt
 * @returns {Promise<{encrypted_value: string, iv: string}>} Encrypted data in base64 format
 * @throws {Error} If no session key is available
 */
export async function encryptSecret(value) {
  const key = await getSessionKey();
  if (!key) {
    throw new Error('No encryption key available. Please provide your password.');
  }

  const { encryptedData, iv } = await encryptValue(value, key);
  
  return {
    encrypted_value: arrayBufferToBase64(encryptedData),
    iv: bytesToBase64(iv)
  };
}

/**
 * High-level function to decrypt a secret value
 * Requires a session key to be available
 * @param {string} encryptedValue - Base64 encoded encrypted value
 * @param {string} ivBase64 - Base64 encoded IV
 * @returns {Promise<string>} Decrypted value
 * @throws {Error} If no session key is available or decryption fails
 */
export async function decryptSecret(encryptedValue, ivBase64) {
  const key = await getSessionKey();
  if (!key) {
    throw new Error('No encryption key available. Please provide your password.');
  }

  try {
    const encryptedData = base64ToArrayBuffer(encryptedValue);
    const iv = base64ToBytes(ivBase64);
    
    return await decryptValue(encryptedData, iv, key);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt secret. Please check your password.');
  }
}

/**
 * Stores an encrypted reference value in localStorage for password verification
 * @param {string} password - User password
 * @param {Uint8Array} salt - Salt used for key derivation
 * @returns {Promise<void>}
 */
export async function storeEncryptedReference(password, salt) {
  try {
    const key = await deriveKeyFromPassword(password, salt);
    const { encryptedData, iv } = await encryptValue('slingshot', key);
    const encryptedReference = {
      encrypted_value: arrayBufferToBase64(encryptedData),
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt)
    };
    localStorage.setItem('encrypted-reference', JSON.stringify(encryptedReference));
  } catch (error) {
    console.error('Failed to store encrypted reference:', error);
    throw new Error('Failed to store password verification');
  }
}

/**
 * Verifies a password by trying to decrypt the stored reference
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} True if password is correct
 */
export async function verifyPassword(password) {
  try {
    const storedReference = localStorage.getItem('encrypted-reference');
    if (!storedReference) {
      return false; // No reference stored
    }

    const { encrypted_value, iv, salt } = JSON.parse(storedReference);
    const saltBytes = base64ToBytes(salt);
    const key = await deriveKeyFromPassword(password, saltBytes);

    // Try to decrypt the reference value
    const decryptedValue = await decryptValue(
      base64ToArrayBuffer(encrypted_value),
      base64ToBytes(iv),
      key
    );

    return decryptedValue === 'slingshot';
  } catch (error) {
    return false; // Decryption failed, wrong password
  }
}

/**
 * Sets up encryption key from user password
 * @param {string} password - User password
 * @param {Uint8Array} [salt] - Optional salt (generates new one if not provided)
 * @returns {Promise<{key: CryptoKey, salt: Uint8Array}>} Derived key and salt
 */
export async function setupEncryptionKey(password, salt = null) {
  if (!salt) {
    salt = generateSalt();
  }
  
  const key = await deriveKeyFromPassword(password, salt);
  await storeSessionKey(key);
  
  return { key, salt };
}