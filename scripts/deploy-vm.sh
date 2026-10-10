#!/usr/bin/env bash
set -euo pipefail
if [ "$(id -u)" != 0 ]; then echo 'Run with sudo.' >&2; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends nginx certbot python3-certbot-nginx build-essential python3 ca-certificates curl xz-utils
if ! id chapters >/dev/null 2>&1; then
  useradd --system --home-dir /srv/chapters --create-home --shell /usr/sbin/nologin chapters
fi
install -d -o chapters -g chapters -m 750 /srv/chapters/app /srv/chapters/data
if ! swapon --show | grep -q /swapfile; then
  if [ ! -f /swapfile ]; then fallocate -l 4G /swapfile; chmod 600 /swapfile; mkswap /swapfile; fi
  swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi
fi
tar -xzf /tmp/chapters-deploy.tar.gz -C /srv/chapters/app
if [ ! -f /srv/chapters/data/chapters.sqlite ]; then
  cp /srv/chapters/app/deploy-data/chapters.sqlite /srv/chapters/data/chapters.sqlite
  cp -a /srv/chapters/app/deploy-data/objects /srv/chapters/data/objects
fi
if [ ! -f /srv/chapters/app/.env.local ]; then
  auth_secret=$(openssl rand -hex 32)
  printf 'DATABASE_URL=/srv/chapters/data/chapters.sqlite\nBETTER_AUTH_URL=https://cinematic-chapters.co.uk\nBETTER_AUTH_SECRET=%s\nSTORAGE_DRIVER=local\nLOCAL_STORAGE_PATH=/srv/chapters/data/objects\nSTORAGE_ALLOWANCE_BYTES=10737418240\nEMAIL_DRIVER=preview\nALLOW_EXTERNAL_MESSAGES=false\n' "$auth_secret" > /srv/chapters/app/.env.local
fi
chmod 600 /srv/chapters/app/.env.local
chown -R chapters:chapters /srv/chapters
cd /srv/chapters/app
bash scripts/install-node-lts.sh
runuser -u chapters -- npm ci --no-audit --no-fund
runuser -u chapters -- npm run db:migrate
runuser -u chapters -- env NODE_OPTIONS=--max-old-space-size=512 npm run build -- --webpack
cat > /etc/systemd/system/chapters-web.service <<'EOF'
[Unit]
Description=Cinematic Chapters website
After=network.target
[Service]
User=chapters
Group=chapters
WorkingDirectory=/srv/chapters/app
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=384
ExecStart=/usr/local/bin/npm start
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
UMask=0077
[Install]
WantedBy=multi-user.target
EOF
cat > /etc/systemd/system/chapters-worker.service <<'EOF'
[Unit]
Description=Cinematic Chapters background worker
After=network.target chapters-web.service
[Service]
User=chapters
Group=chapters
WorkingDirectory=/srv/chapters/app
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=256
ExecStart=/usr/local/bin/npm run worker
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
UMask=0077
[Install]
WantedBy=multi-user.target
EOF
cat > /etc/nginx/sites-available/chapters <<'EOF'
server {
    listen 80 default_server;
    server_name cinematic-chapters.co.uk www.cinematic-chapters.co.uk;
    client_max_body_size 100m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
EOF
if [ -L /etc/nginx/sites-enabled/default ]; then unlink /etc/nginx/sites-enabled/default; fi
ln -sf /etc/nginx/sites-available/chapters /etc/nginx/sites-enabled/chapters
nginx -t
systemctl daemon-reload
systemctl enable --now chapters-web chapters-worker
systemctl restart nginx
for attempt in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/; then echo 'Website ready for DNS and HTTPS.'; exit 0; fi
  sleep 2
done
systemctl status chapters-web --no-pager
exit 1
