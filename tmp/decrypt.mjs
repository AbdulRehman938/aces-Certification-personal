import crypto from 'crypto';

const key = "N4cR8uJ0yB3wE5aK9nX2rP6hS0dF4gJ8lC1mV5uR7tY0pQ9mT2vL6pZ1sH7k";
const payload = "MSzLM2RhwwuAFd5j._0YZ-d226Le0W3apvm8DUw.6KdFkcFt_RaUbiKNwbnifWMKnIrHi8m195g9fKL9gHUgeBQCYW3OxOA7hDnFhHbI4cDpnJaY-auKGZp7WPNCjbRpxoHYHO0MdVvljkSUeYyqL02ttJ5hFGF3YxkShd7zvTuNc4Xhzbg-PxRy-s8QAY1S_mNjYue5ev1GERNLST-r-DaiuRl-opxja3wAgHVU9SCEK4pAPZyF17m031RYYSwy4uF6iodw9uPlei1avdcvkTb8nVVlBjrZivSFDwqIvvKvMzo_qzvUjiWIarx3xJYR9DUsBWvWymMLRSYwhQ8ht2jvulVJ8a2PkTwb5kJVfstZP2bK9G2SksPw5TLB99GXlIOn6-F9iVtnujeoEm6BrvflFYXeBBeD9IKJ4eIGbwJmdHuPhJY1IhjhAGjSK4MWHyj68eCqFcR_5O1seTvawQxGkgEQZCYe2GVjckVC4FtndXF9QVcQ9KjayogN82-mpNR5XtlKrz9eCpp9no-PVS6YondQoX8ZtSmij8tZf_zqqTsK5JQiOMxMPLewVaznzf6FhhR8a9MVqxk-11EHm3fOoEzcnCdeSfDlr6Ri3RnNIV2t0xVpqFKktYUgvMICitfee3KpNzd_Pa0LJQ1F1bLVWB7zy2IpS5nIrmppAIDv8yXfJUGg3yvxeJZnx-GbLSjPi72rOb59z6ITBu82afbp8A";

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
