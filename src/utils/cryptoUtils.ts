/**
 * Simple XOR-based encryption for localStorage.
 * Note: For high-security needs, use a library like CryptoJS.
 * This provides basic protection against casual inspection.
 */

const getSecretKey = () => {
    // Attempt to create a unique device/user key
    const base = 'smart-teaching-v2-secure-key';
    const extra = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    return base + extra;
};

export const encrypt = (text: string): string => {
    if (!text) return '';
    const key = getSecretKey();
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    return btoa(encodeURIComponent(result));
};

export const decrypt = (encoded: string): string => {
    if (!encoded) return '';
    // Basic check: if it doesn't look like our Base64 pattern, return as is (legacy support)
    if (!/^[A-Za-z0-9+/=]+$/.test(encoded)) {
        return encoded;
    }

    try {
        const decoded = atob(encoded);
        const text = decodeURIComponent(decoded);
        const key = getSecretKey();
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    } catch (e) {
        // If decryption fails for any reason, return the original (might be plaintext)
        return encoded;
    }
};
