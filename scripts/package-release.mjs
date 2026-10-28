import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { deflateRawSync, gunzipSync } from 'node:zlib';

const catalogBytes = fs.readFileSync('data/catalog.json');
const catalog = JSON.parse(catalogBytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const output = 'release-assets';
fs.mkdirSync(output, { recursive: true });
const byId = new Map(catalog.entries.map(entry => [entry.id, entry]));
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const local = [], central = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.path);
    const compressed = deflateRawSync(file.bytes, { level: 9 });
    const crc = crc32(file.bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8); header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(file.bytes.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50); record.writeUInt16LE(20, 4); record.writeUInt16LE(20, 6);
    record.writeUInt16LE(8, 10); record.writeUInt16LE(33, 14);
    record.writeUInt32LE(crc, 16); record.writeUInt32LE(compressed.length, 20);
    record.writeUInt32LE(file.bytes.length, 24); record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42); central.push(record, name);
    offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
const published = new Set();
for (const pack of catalog.delivery.packs) {
  assert(/^pack-[0-9]{3}\.zip$/.test(pack.asset));
  const files = [];
  for (const id of pack.artworkIds) {
    const entry = byId.get(id);
    assert(entry && !entry.locked && entry.packId === pack.id && !published.has(id)); published.add(id);
    for (const [relative, expected] of [[entry.dataPath, entry.dataSha256], [entry.thumbnailPath, entry.thumbnailSha256], [entry.detailPath, entry.detailSha256]]) {
      assert(/^artwork\/[0-9]{10}\/(pixels\.bin|gray\.png|color\.png)$/.test(relative));
      const compressed = relative.endsWith('.bin');
      const raw = fs.readFileSync(path.join('data', relative + (compressed ? '.gz' : '')));
      const bytes = compressed ? gunzipSync(raw) : raw;
      assert.equal(sha(bytes), expected);
      files.push({ path: relative, bytes });
    }
  }
  const archive = zip(files);
  assert.equal(archive.length, pack.bytes); assert.equal(sha(archive), pack.sha256);
  fs.writeFileSync(path.join(output, pack.asset), archive);
}
assert.equal(published.size, 12180);
assert.equal(catalog.entries.filter(entry => entry.locked).length, 263);
fs.writeFileSync(path.join(output, 'catalog.json'), catalogBytes);
fs.writeFileSync(path.join(output, 'catalog.sha256'), `${sha(catalogBytes)}\n`);
fs.writeFileSync(path.join(output, 'notes.md'), `12,443 catalog records; 12,180 public drawings in ${catalog.delivery.packs.length} lossless ZIP packs.\n\nAll 263 locked drawing payloads are excluded. Original pixels, PNG images and stable artwork IDs are unchanged. The catalog contains pack URLs, sizes and SHA-256 checksums. No app source, Firebase config, credentials, user pictures or saved progress is included.\n\nContent rights remain with their respective rights holders.\n`);
console.log(`PASS: ${published.size} original public drawings, ${catalog.delivery.packs.length} byte-identical release archives.`);
