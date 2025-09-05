/**
 * @fileoverview Manager for communicating with the encryption SharedWorker
 * Handles worker initialization, message passing, and fallback behavior
 */

/**
 * Manager class for handling SharedWorker communication
 */
class EncryptionWorkerManager {
  constructor() {
    this.worker = null;
    this.port = null;
    this.isSupported = this.checkSharedWorkerSupport();
    this.isInitialized = false;
    this.messageQueue = [];
    this.responseCallbacks = new Map();
    this.eventListeners = new Map();
    this.messageId = 0;
    this.pingInterval = null;
    this.PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Checks if SharedWorker is supported in the current browser
   * @returns {boolean} True if SharedWorker is supported
   */
  checkSharedWorkerSupport() {
    return typeof SharedWorker !== 'undefined';
  }

  /**
   * Initializes the SharedWorker connection
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    if (!this.isSupported) {
      console.warn('[EncryptionWorkerManager] SharedWorker not supported in this browser');
      return false;
    }

    try {
      // Create the SharedWorker
      this.worker = new SharedWorker(
        new URL('../workers/encryptionKeyWorker.js', import.meta.url),
        { type: 'module' }
      );
      
      this.port = this.worker.port;
      
      // Set up message handlers
      this.port.onmessage = this.handleMessage.bind(this);
      this.port.onmessageerror = this.handleMessageError.bind(this);
      
      // Start the port
      this.port.start();
      
      // Wait for initial connection confirmation
      await this.waitForConnection();
      
      this.isInitialized = true;
      console.log('[EncryptionWorkerManager] SharedWorker initialized successfully');
      
      // Process any queued messages
      this.processMessageQueue();
      
      // Start periodic ping to keep connection alive and reset inactivity
      this.startPingInterval();
      
      return true;
    } catch (error) {
      console.error('[EncryptionWorkerManager] Failed to initialize SharedWorker:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Waits for initial connection to be established
   * @returns {Promise<void>}
   */
  waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SharedWorker connection timeout after 3 seconds'));
      }, 3000); // Reduced timeout

      const handleMessage = (event) => {
        console.log('[EncryptionWorkerManager] Received initial message:', event.data.type);
        if (event.data.type === 'KEY_STATUS') {
          clearTimeout(timeout);
          this.port.removeEventListener('message', handleMessage);
          resolve();
        }
      };

      this.port.addEventListener('message', handleMessage);
    });
  }

  /**
   * Handles incoming messages from the SharedWorker
   * @param {MessageEvent} event - The message event
   */
  handleMessage(event) {
    const { type, messageId, ...data } = event.data;
    
    console.log(`[EncryptionWorkerManager] Received message: ${type}`);
    
    // Handle responses with messageId (for promise-based methods)
    if (messageId && this.responseCallbacks.has(messageId)) {
      const callback = this.responseCallbacks.get(messageId);
      this.responseCallbacks.delete(messageId);
      callback(event.data);
      return;
    }
    
    // Handle broadcast messages (events)
    this.emitEvent(type, data);
  }

  /**
   * Handles message errors from the SharedWorker
   * @param {MessageEvent} event - The error event
   */
  handleMessageError(event) {
    console.error('[EncryptionWorkerManager] Message error:', event);
    this.emitEvent('error', { error: event });
  }

  /**
   * Sends a message to the SharedWorker
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   * @param {boolean} expectResponse - Whether to expect a response
   * @returns {Promise<any>} Response from worker (if expectResponse is true)
   */
  async sendMessage(type, payload = {}, expectResponse = false) {
    if (!this.isInitialized) {
      // Queue the message if not initialized yet
      return new Promise((resolve, reject) => {
        this.messageQueue.push({ type, payload, expectResponse, resolve, reject });
      });
    }

    const message = {
      type,
      payload,
      timestamp: Date.now()
    };

    if (expectResponse) {
      message.messageId = ++this.messageId;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.responseCallbacks.delete(message.messageId);
          reject(new Error(`Message timeout for ${type}`));
        }, 10000); // 10 second timeout

        this.responseCallbacks.set(message.messageId, (response) => {
          clearTimeout(timeout);
          if (response.success !== false) {
            // Resolve if success is true or undefined (for status queries)
            resolve(response);
          } else {
            reject(new Error(response.error || 'Worker operation failed'));
          }
        });

        this.port.postMessage(message);
      });
    } else {
      this.port.postMessage(message);
    }
  }

  /**
   * Processes queued messages after initialization
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { type, payload, expectResponse, resolve, reject } = this.messageQueue.shift();
      
      this.sendMessage(type, payload, expectResponse)
        .then(resolve)
        .catch(reject);
    }
  }

  /**
   * Starts the periodic ping to keep worker active
   */
  startPingInterval() {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(async () => {
      try {
        await this.sendMessage('PING');
      } catch (error) {
        console.error('[EncryptionWorkerManager] Ping failed:', error);
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Stops the periodic ping
   */
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Adds an event listener for worker events
   * @param {string} eventType - The event type to listen for
   * @param {Function} listener - The event listener function
   */
  addEventListener(eventType, listener) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(listener);
  }

  /**
   * Removes an event listener
   * @param {string} eventType - The event type
   * @param {Function} listener - The event listener function
   */
  removeEventListener(eventType, listener) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(listener);
    }
  }

  /**
   * Emits an event to registered listeners
   * @param {string} eventType - The event type
   * @param {Object} data - The event data
   */
  emitEvent(eventType, data) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[EncryptionWorkerManager] Event listener error for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Stores an encryption key in the SharedWorker
   * @param {string} base64Key - Base64 encoded encryption key
   * @returns {Promise<boolean>} True if successful
   */
  async storeKey(base64Key) {
    try {
      await this.sendMessage('STORE_KEY', { key: base64Key }, true);
      return true;
    } catch (error) {
      console.error('[EncryptionWorkerManager] Failed to store key:', error);
      return false;
    }
  }

  /**
   * Retrieves the encryption key from the SharedWorker
   * @returns {Promise<string|null>} The base64 encoded key or null if not available
   */
  async retrieveKey() {
    try {
      const response = await this.sendMessage('RETRIEVE_KEY', {}, true);
      return response.key || null;
    } catch (error) {
      console.error('[EncryptionWorkerManager] Failed to retrieve key:', error);
      return null;
    }
  }

  /**
   * Clears the encryption key from the SharedWorker
   * @returns {Promise<boolean>} True if successful
   */
  async clearKey() {
    try {
      await this.sendMessage('CLEAR_KEY', {}, true);
      return true;
    } catch (error) {
      console.error('[EncryptionWorkerManager] Failed to clear key:', error);
      return false;
    }
  }

  /**
   * Checks if an encryption key is available in the SharedWorker
   * @returns {Promise<boolean>} True if a key is available
   */
  async hasKey() {
    try {
      const response = await this.sendMessage('HAS_KEY', {}, true);
      return response.hasKey || false;
    } catch (error) {
      console.error('[EncryptionWorkerManager] Failed to check key availability:', error);
      return false;
    }
  }

  /**
   * Cleans up resources and closes the SharedWorker connection
   */
  cleanup() {
    this.stopPingInterval();
    
    // Clear response callbacks
    this.responseCallbacks.clear();
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Clear message queue
    this.messageQueue = [];
    
    if (this.port) {
      this.port.close();
      this.port = null;
    }
    
    this.worker = null;
    this.isInitialized = false;
    
    console.log('[EncryptionWorkerManager] Cleaned up SharedWorker connection');
  }

  /**
   * Gets the support status of SharedWorker
   * @returns {boolean} True if SharedWorker is supported
   */
  getSupported() {
    return this.isSupported;
  }

  /**
   * Gets the initialization status
   * @returns {boolean} True if the manager is initialized
   */
  getInitialized() {
    return this.isInitialized;
  }
}

// Create and export a singleton instance
export const encryptionWorkerManager = new EncryptionWorkerManager();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  encryptionWorkerManager.cleanup();
});