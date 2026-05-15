#!/bin/sh
set -eu

domain="${DOMAIN_NAME:-localhost}"
email="${LETSENCRYPT_EMAIL:-}"
webroot="/var/www/certbot"
renewal_conf_path="/etc/letsencrypt/renewal/$domain.conf"
live_dir_path="/etc/letsencrypt/live/$domain"
archive_dir_path="/etc/letsencrypt/archive/$domain"
sleep_interval="${CERT_CHECK_INTERVAL:-21600}"

cleanup_stale_paths() {
  if [ -f "$renewal_conf_path" ]; then
    return 0
  fi

  if [ -f "$live_dir_path/fullchain.pem" ] && [ ! -L "$live_dir_path/fullchain.pem" ]; then
    echo "Removing stale non-Certbot live directory for $domain"
    rm -rf "$live_dir_path"
  fi

  if [ -d "$archive_dir_path" ] && [ -z "$(find "$archive_dir_path" -mindepth 1 -print -quit 2>/dev/null)" ]; then
    rmdir "$archive_dir_path" || true
  fi
}

issue_certificate() {
  if [ "$domain" = "localhost" ] || [ -z "$email" ]; then
    echo "Skipping Let's Encrypt issue step: configure DOMAIN_NAME and LETSENCRYPT_EMAIL for public certificates."
    return 0
  fi

  echo "Requesting certificate for $domain"
  certbot certonly \
    --webroot \
    -w "$webroot" \
    --email "$email" \
    --agree-tos \
    --no-eff-email \
    --keep-until-expiring \
    -d "$domain"
}

renew_certificate() {
  echo "Running certbot renew"
  certbot renew --webroot -w "$webroot" --quiet || true
}

while :; do
  if [ ! -f "$renewal_conf_path" ]; then
    cleanup_stale_paths
    issue_certificate || true
  else
    renew_certificate
  fi

  sleep "$sleep_interval" &
  wait $!
done
