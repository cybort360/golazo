/**
 * Convert a Phantom-exported private key (base58) into a Solana CLI keypair file.
 *
 * Run in YOUR OWN terminal (NOT via the `!` prefix — that would share output):
 *   node scripts/txline/import-phantom-key.mjs ~/golazo-wallet.json
 *
 * It prompts for the key with HIDDEN input, so the key never lands in your shell
 * history, command args, or this chat. It only prints the derived PUBLIC key so
 * you can confirm it matches the address shown in Phantom.
 *
 * In Phantom: ⚙ Settings → your account → "Show Private Key" → copy the base58 string.
 */
import { writeFileSync } from "node:fs";
import readline from "node:readline";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

const outPath = process.argv[2] || `${process.env.HOME}/golazo-wallet.json`;

function hiddenPrompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // mask everything typed after the question is shown
    let shown = false;
    rl._writeToOutput = (s) => {
      if (!shown) {
        process.stdout.write(s);
        if (s.includes(question)) shown = true;
      }
      // swallow keystrokes once the prompt is on screen
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

const pk = await hiddenPrompt("Paste Phantom private key (base58), then Enter: ");
if (!pk) {
  console.error("No key entered.");
  process.exit(1);
}

let bytes;
try {
  bytes = bs58.decode(pk);
} catch {
  console.error("That doesn't look like base58. Copy the 'Show Private Key' value from Phantom.");
  process.exit(1);
}

let kp;
if (bytes.length === 64) kp = Keypair.fromSecretKey(bytes);
else if (bytes.length === 32) kp = Keypair.fromSeed(bytes);
else {
  console.error(`Unexpected key length ${bytes.length} (expected 32 or 64 bytes).`);
  process.exit(1);
}

writeFileSync(outPath, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
console.log(`\n✓ Wrote keypair to ${outPath}`);
console.log(`  Public key: ${kp.publicKey.toBase58()}`);
console.log(`\n→ Confirm this matches the address in Phantom. If it does, you're set.`);
