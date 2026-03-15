import { InMemoryCache } from '@apollo/client';
import { persistCache } from 'apollo3-cache-persist';
import * as FileSystem from 'expo-file-system';

// AsyncStorage-compatible interface backed by expo-file-system.
// All cache entries are stored in a single JSON file to avoid per-key file overhead.
class FileSystemStorage {
  private readonly path = `${FileSystem.documentDirectory}apollo-cache.json`;

  async getItem(key: string): Promise<string | null> {
    try {
      const info = await FileSystem.getInfoAsync(this.path);
      if (!info.exists) return null;
      const content = await FileSystem.readAsStringAsync(this.path);
      const store = JSON.parse(content) as Record<string, string>;
      return store[key] ?? null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      let store: Record<string, string> = {};
      try {
        const content = await FileSystem.readAsStringAsync(this.path);
        store = JSON.parse(content) as Record<string, string>;
      } catch {
        // File does not exist or is malformed — start fresh.
      }
      store[key] = value;
      await FileSystem.writeAsStringAsync(this.path, JSON.stringify(store));
    } catch {
      // Swallow write errors — cache persistence is best-effort.
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const content = await FileSystem.readAsStringAsync(this.path);
      const store = JSON.parse(content) as Record<string, string>;
      delete store[key];
      await FileSystem.writeAsStringAsync(this.path, JSON.stringify(store));
    } catch {
      // Swallow errors — cache persistence is best-effort.
    }
  }
}

/**
 * Hydrates the provided InMemoryCache from the on-disk snapshot, if one exists.
 * This is an additive, non-blocking enhancement — call it in a useEffect after
 * the ApolloClient has already been created synchronously.
 */
export async function initApolloCache(cache: InMemoryCache): Promise<void> {
  await persistCache({
    cache,
    storage: new FileSystemStorage(),
    maxSize: 1048576, // 1 MB cap
    debug: __DEV__,
  });
}
