import crypto from 'crypto';

const key = "N4cR8uJ0yB3wE5aK9nX2rP6hS0dF4gJ8lC1mV5uR7tY0pQ9mT2vL6pZ1sH7k";
const payload = "Sw5FQfiNjlL3B8Jk.m9qohxjjbmVgseBWDFYlIA.dIx3pfnBEQAOslujoHpUsK3DZjWW-5_b8lyG6KOP1Yuh4Vr2qiU5KaAOhRgkvK7KKRQVSqSqOqP-vYC-edlbINUZtvOmtxRLL0lDHI4w-8sZuAlbuS0peWKbel0wgNuyZ3ZVGzMo_afHWuk7yzR3Rtulu9sDltXpv20iA2R8IlPocd6zaycr2e5Wd8hwOl4bWQ6ju3YXMWbUhQpclrVDcc0lkQtYyCQ5KB7Rfikkqwoz2_rE-DN-";

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
