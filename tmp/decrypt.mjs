import crypto from 'crypto';

const key = "N4cR8uJ0yB3wE5aK9nX2rP6hS0dF4gJ8lC1mV5uR7tY0pQ9mT2vL6pZ1sH7k";
const payload = "LNKGh43N_QqCsu4j.AQ1HdpQNRgmYT1pAUD1xMA.u0Dp2oZKW8oULYQ-3mlC2-XQ943ATzSYhSbgLRT8tthV_ZXnXE9vi9gGQuPGmOXtZ8BET1ZWc6Q5vNSu90t270qAAjBNc7GQgrr0vdc5xhpcEgdoff3KNSjIGjt-vvR5IpbwPpMXywTZA7e4vCxaN1OlapO7tXP-Jz-nm7s_LZWlOGZpN5uSPWW4PV3bQdEGwwdxafmqhjJssmytA9guIf_loe6J_6IJCWVEilcuCOGPos05Fcqn215KxGrb2AI8wA";

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
    
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', hash, iv);
        decipher.setAuthTag(p1);
        let decrypted = decipher.update(p2, 'binary', 'utf8');
        decrypted += decipher.final('utf8');
        console.log("Decrypted (Candidate A):");
        try {
            const json = JSON.parse(decrypted);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log(decrypted);
        }
        return;
    } catch (e) {
    }

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', hash, iv);
        decipher.setAuthTag(p2);
        let decrypted = decipher.update(p1, 'binary', 'utf8');
        decrypted += decipher.final('utf8');
        console.log("Decrypted (Candidate B):");
        try {
            const json = JSON.parse(decrypted);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log(decrypted);
        }
        return;
    } catch (e) {
        // console.log("Candidate B failed");
    }

    console.log("Both candidates failed to decrypt.");
}

decrypt().catch(console.error);
