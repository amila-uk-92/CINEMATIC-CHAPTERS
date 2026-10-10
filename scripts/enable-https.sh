#!/usr/bin/env bash
set -euo pipefail
if [ "$(id -u)" != 0 ]; then echo 'Run with sudo.' >&2; exit 1; fi
certbot certonly --nginx --non-interactive --agree-tos --email amila.indrajith.ukwattage@gmail.com -d cinematic-chapters.co.uk -d www.cinematic-chapters.co.uk
cat > /etc/nginx/sites-available/chapters <<'EOF'
server {
    listen 80 default_server;
    server_name cinematic-chapters.co.uk www.cinematic-chapters.co.uk;
    return 301 https://cinematic-chapters.co.uk$request_uri;
}
server {
    listen 443 ssl;
    server_name www.cinematic-chapters.co.uk;
    ssl_certificate /etc/letsencrypt/live/cinematic-chapters.co.uk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cinematic-chapters.co.uk/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    return 301 https://cinematic-chapters.co.uk$request_uri;
}
server {
    listen 443 ssl;
    server_name cinematic-chapters.co.uk;
    ssl_certificate /etc/letsencrypt/live/cinematic-chapters.co.uk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cinematic-chapters.co.uk/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
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
nginx -t
systemctl reload nginx
systemctl enable --now certbot.timer
echo 'HTTPS configured with automatic certificate renewal and canonical domain redirects.'
