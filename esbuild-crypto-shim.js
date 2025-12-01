// Crypto shim for esbuild - ensures crypto is available in bundled code
import { webcrypto } from 'node:crypto';

// Make crypto available globally for jose library
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}

