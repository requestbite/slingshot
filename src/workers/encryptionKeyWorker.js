/**
 * @fileoverview SharedWorker for managing encryption keys across browser tabs
 * Provides secure cross-tab encryption key sharing with automatic cleanup
 */

/**
 * Encryption key storage and management
 */
class EncryptionKeyManager {
  constructor() {
    this.keyBase64 = null;
    this.connectedPorts = new Set();
    this.inactivityTimeout = null;
    this.INACTIVITY_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  }

  /**
   * Registers a new port (tab connection)
   * @param {MessagePort} port - The port to register
   */
  addPort(port) {
    this.connectedPorts.add(port);
    console.log(`[EncryptionWorker] Port added. Total connected: ${this.connectedPorts.size}`);
    
    // Reset inactivity timer when a new tab connects
    this.resetInactivityTimer();
    
    // Send current key status to the new port
    port.postMessage({
      type: 'KEY_STATUS',
      hasKey: !!this.keyBase64,
      timestamp: Date.now()
    });
  }

  /**
   * Unregisters a port (tab disconnection)
   * @param {MessagePort} port - The port to unregister
   */
  removePort(port) {
    this.connectedPorts.delete(port);
    console.log(`[EncryptionWorker] Port removed. Total connected: ${this.connectedPorts.size}`);
    
    // If no more tabs are connected, clear the key and terminate worker
    if (this.connectedPorts.size === 0) {
      console.log('[EncryptionWorker] No more connected tabs, clearing key and terminating');
      this.clearKey();
      // Worker will terminate naturally when no ports are connected
    } else {
      // Reset inactivity timer for remaining tabs
      this.resetInactivityTimer();
    }
  }

  /**
   * Stores the encryption key
   * @param {string} base64Key - Base64 encoded encryption key
   * @param {MessagePort} sourcePort - Port that requested the key storage
   * @param {Function} sendResponse - Response sender function
   */
  storeKey(base64Key, sourcePort, sendResponse) {
    try {
      this.keyBase64 = base64Key;
      console.log('[EncryptionWorker] Encryption key stored');
      
      // Reset inactivity timer
      this.resetInactivityTimer();
      
      // Notify all connected tabs about the new key
      this.broadcastToAllPorts({
        type: 'KEY_STORED',
        timestamp: Date.now()
      });
      
      // Send success response to the requesting port
      sendResponse({
        type: 'STORE_KEY_RESPONSE',
        success: true
      });
    } catch (error) {
      console.error('[EncryptionWorker] Failed to store key:', error);
      sendResponse({
        type: 'STORE_KEY_RESPONSE',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Retrieves the encryption key
   * @param {MessagePort} sourcePort - Port that requested the key
   * @param {Function} sendResponse - Response sender function
   */
  retrieveKey(sourcePort, sendResponse) {
    try {
      if (this.keyBase64) {
        console.log('[EncryptionWorker] Encryption key retrieved');
        
        // Reset inactivity timer
        this.resetInactivityTimer();
        
        sendResponse({
          type: 'RETRIEVE_KEY_RESPONSE',
          success: true,
          key: this.keyBase64
        });
      } else {
        sendResponse({
          type: 'RETRIEVE_KEY_RESPONSE',
          success: false,
          error: 'No encryption key available'
        });
      }
    } catch (error) {
      console.error('[EncryptionWorker] Failed to retrieve key:', error);
      sendResponse({
        type: 'RETRIEVE_KEY_RESPONSE',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Clears the stored encryption key
   * @param {MessagePort} [sourcePort] - Optional port that requested the clear
   * @param {Function} [sendResponse] - Optional response sender function
   */
  clearKey(sourcePort = null, sendResponse = null) {
    try {
      this.keyBase64 = null;
      console.log('[EncryptionWorker] Encryption key cleared');
      
      // Clear inactivity timer
      this.clearInactivityTimer();
      
      // Notify all connected tabs about the key being cleared
      this.broadcastToAllPorts({
        type: 'KEY_CLEARED',
        timestamp: Date.now()
      });
      
      if (sendResponse) {
        sendResponse({
          type: 'CLEAR_KEY_RESPONSE',
          success: true
        });
      }
    } catch (error) {
      console.error('[EncryptionWorker] Failed to clear key:', error);
      if (sendResponse) {
        sendResponse({
          type: 'CLEAR_KEY_RESPONSE',
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Checks if an encryption key is available
   * @param {MessagePort} sourcePort - Port that requested the check
   * @param {Function} sendResponse - Response sender function
   */
  hasKey(sourcePort, sendResponse) {
    sendResponse({
      type: 'HAS_KEY_RESPONSE',
      success: true,
      hasKey: !!this.keyBase64
    });
  }

  /**
   * Broadcasts a message to all connected ports
   * @param {Object} message - Message to broadcast
   */
  broadcastToAllPorts(message) {
    this.connectedPorts.forEach(port => {
      try {
        port.postMessage(message);
      } catch (error) {
        console.error('[EncryptionWorker] Failed to send message to port:', error);
        // Remove failed ports
        this.connectedPorts.delete(port);
      }
    });
  }

  /**
   * Resets the inactivity timer
   */
  resetInactivityTimer() {
    this.clearInactivityTimer();
    
    this.inactivityTimeout = setTimeout(() => {
      console.log('[EncryptionWorker] Inactivity timeout reached, clearing key');
      this.clearKey();
      
      // Notify all tabs about the timeout
      this.broadcastToAllPorts({
        type: 'INACTIVITY_TIMEOUT',
        timestamp: Date.now()
      });
    }, this.INACTIVITY_DURATION);
  }

  /**
   * Clears the inactivity timer
   */
  clearInactivityTimer() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
  }

  /**
   * Handles incoming messages from ports
   * @param {MessageEvent} event - The message event
   * @param {MessagePort} port - The port that sent the message
   */
  handleMessage(event, port) {
    const { type, payload = {}, messageId } = event.data;
    
    console.log(`[EncryptionWorker] Received message: ${type}${messageId ? ` (${messageId})` : ''}`);
    
    // Create a response sender that includes messageId if present
    const sendResponse = (responseData) => {
      const response = {
        ...responseData,
        timestamp: Date.now()
      };
      if (messageId) {
        response.messageId = messageId;
      }
      port.postMessage(response);
    };
    
    switch (type) {
      case 'STORE_KEY':
        this.storeKey(payload.key, port, sendResponse);
        break;
        
      case 'RETRIEVE_KEY':
        this.retrieveKey(port, sendResponse);
        break;
        
      case 'CLEAR_KEY':
        this.clearKey(port, sendResponse);
        break;
        
      case 'HAS_KEY':
        this.hasKey(port, sendResponse);
        break;
        
      case 'PING':
        // Reset inactivity timer on ping
        this.resetInactivityTimer();
        sendResponse({
          type: 'PONG'
        });
        break;
        
      default:
        console.warn(`[EncryptionWorker] Unknown message type: ${type}`);
        sendResponse({
          type: 'ERROR',
          error: `Unknown message type: ${type}`
        });
    }
  }
}

// Initialize the key manager
const keyManager = new EncryptionKeyManager();

// Handle new connections
self.onconnect = function(event) {
  const port = event.ports[0];
  console.log('[EncryptionWorker] New connection established');
  
  // Register the port
  keyManager.addPort(port);
  
  // Set up message handler
  port.onmessage = function(messageEvent) {
    keyManager.handleMessage(messageEvent, port);
  };
  
  // Handle port closure
  port.onmessageerror = function(error) {
    console.error('[EncryptionWorker] Port message error:', error);
    keyManager.removePort(port);
  };
  
  // Note: There's no reliable way to detect port closure in SharedWorker
  // We rely on the main thread to send a disconnect message or use periodic pings
  
  // Start the port
  port.start();
};

// Handle worker errors
self.onerror = function(error) {
  console.error('[EncryptionWorker] Worker error:', error);
};

console.log('[EncryptionWorker] SharedWorker initialized and ready');