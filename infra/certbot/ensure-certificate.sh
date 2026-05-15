#!/bin/sh
set -eu

domain="${DOMAIN_NAME:-localhost}"
email="${LETSENCRYPT_EMAIL:-}"
webroot="/var/www/certbot"
certificate_path="/etc/letsencrypt/live/$domain/fullchain.pem"
sleep_interval="${CERT_CHECK_INTERVAL:-21600}"

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
  if [ ! -f "$certificate_path" ]; then
    issue_certificate || true
  else
    renew_certificate
  fi

  sleep "$sleep_interval" &
  wait $!
done
