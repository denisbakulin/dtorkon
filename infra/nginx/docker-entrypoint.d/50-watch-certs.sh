#!/bin/sh
set -eu

cert_path="${SSL_CERT_PATH:-/etc/letsencrypt/live/localhost/fullchain.pem}"
key_path="${SSL_KEY_PATH:-/etc/letsencrypt/live/localhost/privkey.pem}"
poll_interval="${CERT_CHECK_INTERVAL:-21600}"

watch_certificates() {
  last_signature=""

  while :; do
    if [ -f "$cert_path" ] && [ -f "$key_path" ]; then
      current_signature="$(sha256sum "$cert_path" "$key_path" 2>/dev/null | sha256sum | awk '{print $1}')"

      if [ -n "$last_signature" ] && [ "$current_signature" != "$last_signature" ]; then
        echo "Certificate files changed. Reloading nginx."
        nginx -s reload || true
      fi

      last_signature="$current_signature"
    fi

    sleep "$poll_interval"
  done
}

watch_certificates &

