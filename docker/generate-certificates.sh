#!/bin/bash
# Generate Self-Signed SSL Certificates for Nginx Load Balancer
# Use this for development/testing. For production, use proper CA-signed certificates.

mkdir -p ssl

# Generate private key (4096-bit RSA)
openssl genrsa -out ssl/server.key 4096

# Generate certificate signing request (CSR)
openssl req -new \
  -key ssl/server.key \
  -out ssl/server.csr \
  -subj "/C=RS/ST=Serbia/L=Belgrade/O=PSP/CN=localhost"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req \
  -days 365 \
  -in ssl/server.csr \
  -signkey ssl/server.key \
  -out ssl/server.crt \
  -extfile <(printf "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1")

# Set proper permissions
chmod 600 ssl/server.key
chmod 644 ssl/server.crt
chmod 644 ssl/server.csr

# Display certificate info
echo "Certificate generation complete!"
echo "Certificate details:"
openssl x509 -in ssl/server.crt -text -noout | grep -A 3 "Validity"
echo ""
echo "To use in production, replace these self-signed certificates with:"
echo "  - Certificate signed by a trusted Certificate Authority (CA)"
echo "  - Ensure TLS 1.2 or higher is used"
echo "  - Use strong ciphers (minimum 2048-bit RSA or better)"
