#!/bin/sh
set -eu

domain="${DOMAIN_NAME:-localhost}"
cert_path="${SSL_CERT_PATH:-/etc/letsencrypt/live/$domain/fullchain.pem}"
key_path="${SSL_KEY_PATH:-/etc/letsencrypt/live/$domain/privkey.pem}"

mkdir -p "$(dirname "$cert_path")" "$(dirname "$key_path")"

if [ ! -f "$cert_path" ] || [ ! -f "$key_path" ]; then
  echo "No Let's Encrypt certificate found for $domain. Generating temporary self-signed certificate."
  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -days 30 \
    -keyout "$key_path" \
    -out "$cert_path" \
    -subj "/CN=$domain"
fi

