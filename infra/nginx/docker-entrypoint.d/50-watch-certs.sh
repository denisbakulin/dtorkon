#!/bin/sh
set -eu

domain="${DOMAIN_NAME:-localhost}"
real_cert_path="/etc/letsencrypt/live/$domain/fullchain.pem"
real_key_path="/etc/letsencrypt/live/$domain/privkey.pem"
renewal_conf_path="/etc/letsencrypt/renewal/$domain.conf"
fallback_cert_path="/etc/nginx/ssl/fallback/fullchain.pem"
fallback_key_path="/etc/nginx/ssl/fallback/privkey.pem"
live_cert_path="/etc/nginx/ssl/live/fullchain.pem"
live_key_path="/etc/nginx/ssl/live/privkey.pem"
poll_interval="${CERT_CHECK_INTERVAL:-21600}"

resolve_desired_targets() {
  if [ -f "$renewal_conf_path" ] && [ -f "$real_cert_path" ] && [ -f "$real_key_path" ]; then
    printf '%s\n%s\n' "$real_cert_path" "$real_key_path"
  else
    printf '%s\n%s\n' "$fallback_cert_path" "$fallback_key_path"
  fi
}

link_targets() {
  cert_target="$1"
  key_target="$2"

  ln -sf "$cert_target" "$live_cert_path"
  ln -sf "$key_target" "$live_key_path"
}

watch_certificates() {
  last_signature=""

  while :; do
    desired_cert_path="$(resolve_desired_targets | sed -n '1p')"
    desired_key_path="$(resolve_desired_targets | sed -n '2p')"

    if [ -f "$desired_cert_path" ] && [ -f "$desired_key_path" ]; then
      link_targets "$desired_cert_path" "$desired_key_path"
      current_signature="$(sha256sum "$desired_cert_path" "$desired_key_path" 2>/dev/null | sha256sum | awk '{print $1}')"

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
