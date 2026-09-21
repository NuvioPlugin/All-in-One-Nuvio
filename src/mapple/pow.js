import CryptoJS from 'crypto-js';

let nodeCrypto = null;
try {
    const req = require;
    nodeCrypto = req('crypto');
} catch (e) {}

function countLeadingZeroBitsBytes(bytes) {
    let count = 0;
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (b === 0) {
            count += 8;
        } else {
            for (let bit = 7; bit >= 0; bit--) {
                if ((b & (1 << bit)) !== 0) return count;
                count++;
            }
        }
    }
    return count;
}

function countLeadingZeroBitsWords(words) {
    let count = 0;
    for (let i = 0; i < words.length; i++) {
        const w = words[i] >>> 0;
        const lz = Math.clz32(w);
        count += lz;
        if (lz < 32) break;
    }
    return count;
}

export function solvePow(challenge, difficulty) {
    const maxAttempts = 50000000;
    let nonce = 0;

    if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
        while (nonce < maxAttempts) {
            const hash = nodeCrypto.createHash('sha256').update(challenge + nonce).digest();
            if (countLeadingZeroBitsBytes(hash) >= difficulty) {
                return nonce.toString();
            }
            nonce++;
        }
    } else {
        while (nonce < maxAttempts) {
            const hash = CryptoJS.SHA256(challenge + nonce);
            if (countLeadingZeroBitsWords(hash.words) >= difficulty) {
                return nonce.toString();
            }
            nonce++;
        }
    }
    throw new Error(`PoW solve exceeded max attempts (difficulty=${difficulty})`);
}
