# DataPixelArt

Static artwork data for Pixel Art.

## GitHub Releases delivery

Use [data-v1](https://github.com/Sai09082001/DataPixelArt/releases/tag/data-v1) instead of jsDelivr for drawing packs.

- Catalog: [data/catalog.json](data/catalog.json), also attached to the release.
- 12443 stable records; 12180 public drawings in 78 lossless ZIP packs.
- All 263 locked drawing payloads are excluded.
- Each catalog entry identifies its packId; delivery.packs contains its URL, byte counts and SHA-256.
- PNG images and PCAT pixels are unchanged. Check SHA-256 before installing any archive.
- Clients load metadata and thumbnails first, then download and cache only requested packs.
- No application source, Firebase configuration, credentials, user artwork or saved progress is included.

The data directory name is data. Previous pinned snapshots remain in Git history. Content rights remain with their respective rights holders; this repository does not grant additional redistribution rights.
