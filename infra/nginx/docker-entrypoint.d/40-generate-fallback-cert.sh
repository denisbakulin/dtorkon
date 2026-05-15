#!/bin/sh
set -eu

domain="${DOMAIN_NAME:-localhost}"
fallback_dir="/etc/nginx/ssl/fallback"
live_dir="/etc/nginx/ssl/live"
fallback_cert_path="$fallback_dir/fullchain.pem"
fallback_key_path="$fallback_dir/privkey.pem"
real_cert_path="/etc/letsencrypt/live/$domain/fullchain.pem"
real_key_path="/etc/letsencrypt/live/$domain/privkey.pem"
renewal_conf_path="/etc/letsencrypt/renewal/$domain.conf"

mkdir -p "$fallback_dir" "$live_dir"

if [ ! -f "$fallback_cert_path" ] || [ ! -f "$fallback_key_path" ]; then
  echo "No Let's Encrypt certificate found for $domain. Generating temporary self-signed certificate."
  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -days 30 \
    -keyout "$fallback_key_path" \
    -out "$fallback_cert_path" \
    -subj "/CN=$domain" \
    -addext "subjectAltName=DNS:$domain"
fi

if [ -f "$renewal_conf_path" ] && [ -f "$real_cert_path" ] && [ -f "$real_key_path" ]; then
  ln -sf "$real_cert_path" "$live_dir/fullchain.pem"
  ln -sf "$real_key_path" "$live_dir/privkey.pem"
else
  ln -sf "$fallback_cert_path" "$live_dir/fullchain.pem"
  ln -sf "$fallback_key_path" "$live_dir/privkey.pem"
fi
