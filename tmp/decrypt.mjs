import crypto from 'crypto';

const key = "N4cR8uJ0yB3wE5aK9nX2rP6hS0dF4gJ8lC1mV5uR7tY0pQ9mT2vL6pZ1sH7k";
const payload = "kVVR5m-PV03gO9vo.fidQbFiAruqog2_ldcbovQ.ClUlhm6uEXMsnU1cJ2OnAGRZxOOSg9EtNbWF8fcjCTt69d_KgrA8tEXHG1Dmj50sD-bLg2UURYOsMmN1oDpziz-1fYEJ1TfA1R1gMDmPL0EMaKM31yu-RqxSHAPm8R7hkfTXxy_wDkL5NCB0MYbdDmtSFsHZavWGpI4glEoLMLzg_ZkZVw2PKGo0321EPy64wBkCHHu8pq4TKcVSPmv4Ia552qjHl6qL7HCG61aT-5JCMNI8tLw-8kUtTibx";

function fromBase64(base64) {
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64');
}

async function decrypt() {
    const parts = payload.split('.');
    const iv = fromBase64(parts[0]);
    const p1 = fromBase64(parts[1]);
    const p2 = fromBase64(parts[2]);

    const hash = crypto.createHash('sha256').update(key.trim()).digest();
    
    // Candidate 1: p1 is tag, p2 is ciphertext
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', hash, iv);
        decipher.setAuthTag(p1);
        let decrypted = decipher.update(p2, 'binary', 'utf8');
        decrypted += decipher.final('utf8');
        console.log("Decrypted (Candidate A):");
        console.log(decrypted);
        return;
    } catch (e) {
        // console.log("Candidate A failed");
    }

    // Candidate 2: p2 is tag, p1 is ciphertext
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', hash, iv);
        decipher.setAuthTag(p2);
        let decrypted = decipher.update(p1, 'binary', 'utf8');
        decrypted += decipher.final('utf8');
        console.log("Decrypted (Candidate B):");
        console.log(decrypted);
        return;
    } catch (e) {
        // console.log("Candidate B failed");
    }

    console.log("Both candidates failed to decrypt.");
}

decrypt().catch(console.error);
