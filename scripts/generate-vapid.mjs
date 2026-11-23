// Locally run `node scripts/generate-vapid.mjs`; place values only in Vercel env, never git.
import {createECDH} from 'node:crypto';
const k=createECDH('prime256v1');k.generateKeys();
console.log('VAPID_PUBLIC_KEY='+k.getPublicKey(null,'uncompressed').toString('base64url'));
console.log('VAPID_PRIVATE_KEY='+k.getPrivateKey().toString('base64url'));
console.log('VAPID_SUBJECT=mailto:YOUR_ADMIN_EMAIL@example.org');
