// usage: node bench.js <url> [requests=10]

const inputUrl = process.argv[2];
const total = parseInt(process.argv[3], 10) || 10;

let parsed;
try {
  parsed = new URL(inputUrl);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('not http(s)');
} catch {
  console.error('Usage: node bench.js <valid http(s) url> [requests]');
  process.exit(1);
}

const fmtBytes = (n) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(2)} ${units[i]}`;
};

async function main() {
  const times = [];
  let totalBytes = 0;
  let failed = 0;

  for (let i = 1; i <= total; i++) {
    const start = Date.now();
    try {
      const res = await fetch(parsed, { cache: 'no-store', 'Accept-Encoding': 'identity' });
      if (!res.ok) {
        await res.body?.cancel();
        throw new Error(`HTTP ${res.status}`);
      }
      const body = await res.arrayBuffer(); // wait for full body
      const ms = Date.now() - start;

      times.push(ms);
      totalBytes += body.byteLength;
      console.log(
        `#${i}: HTTP ${res.status} | ${ms.toFixed(1)} ms | ${fmtBytes(body.byteLength)}`
      );
    } catch (err) {
      failed++;
      console.log(`#${i}: failed (${err.cause?.code || err.message})`);
    }
  }

  if (!times.length) {
    console.error('All requests failed.');
    process.exit(1);
  }

  const totalMs = times.reduce((a, b) => a + b, 0);
  const avgMs = totalMs / times.length;
  const seconds = totalMs / 1000;
  const bytesPerSec = totalBytes / seconds;

  console.log('\n--- Results ---');
  console.log(`Successful requests : ${times.length}/${total}${failed ? ` (${failed} failed)` : ''}`);
  console.log(`Average request time: ${avgMs.toFixed(1)} ms`);
  console.log(`Total downloaded    : ${fmtBytes(totalBytes)}`);
  console.log(`Download speed      : ${fmtBytes(bytesPerSec)}/s (${((bytesPerSec * 8) / 1e6).toFixed(2)} Mbit/s)`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
