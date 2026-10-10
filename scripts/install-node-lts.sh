#!/usr/bin/env bash
set -euo pipefail
if [ "$(id -u)" != 0 ]; then echo 'Run with sudo.' >&2; exit 1; fi
if [ -x /usr/local/bin/node ] && /usr/local/bin/node --version | grep -q '^v24\.'; then
  /usr/local/bin/node --version
  exit 0
fi
base=https://nodejs.org/dist/latest-v24.x
manifest=$(mktemp)
curl --fail --silent --show-error --location "$base/SHASUMS256.txt" -o "$manifest"
archive=$(awk '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' "$manifest")
if [ -z "$archive" ] || [ "$(printf '%s\n' "$archive" | wc -l)" != 1 ]; then echo 'No unique official Node 24 archive.' >&2; exit 1; fi
curl --fail --silent --show-error --location "$base/$archive" -o "/tmp/$archive"
grep "  $archive$" "$manifest" > /tmp/node-checksums.txt
(cd /tmp && sha256sum --check node-checksums.txt)
install -d /opt/node24
tar -xJf "/tmp/$archive" -C /opt/node24 --strip-components=1
for command in node npm npx; do ln -sf "/opt/node24/bin/$command" "/usr/local/bin/$command"; done
/usr/local/bin/node --version
/usr/local/bin/npm --version
