/**
 * Storage utility with error recovery and memory fallback
 */
class SafeStorage {
    fallbackMemory = new Map();
    getItem(key, defaultValue) {
        try {
            let raw = null;
            if (typeof window !== 'undefined' && window.localStorage) {
                raw = window.localStorage.getItem(key);
            }
            else {
                raw = this.fallbackMemory.get(key) ?? null;
            }
            if (raw === null) {
                return defaultValue;
            }
            return JSON.parse(raw);
        }
        catch (err) {
            console.warn(`[storage] Could not read key "${key}":`, err);
            return defaultValue;
        }
    }
    setItem(key, value) {
        try {
            const serialized = JSON.stringify(value);
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, serialized);
            }
            else {
                this.fallbackMemory.set(key, serialized);
            }
            return true;
        }
        catch (err) {
            console.warn(`[storage] Could not write key "${key}":`, err);
            try {
                this.fallbackMemory.set(key, JSON.stringify(value));
            }
            catch {
                // Ignore fallback failure
            }
            return false;
        }
    }
    removeItem(key) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
            this.fallbackMemory.delete(key);
        }
        catch (err) {
            console.warn(`[storage] Could not remove key "${key}":`, err);
        }
    }
}
export const storage = new SafeStorage();
