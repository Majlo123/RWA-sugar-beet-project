#!/bin/bash

# Initialize replication user and configure pg_hba.conf for streaming replication
set -e

echo "======================================"
echo "Initializing PostgreSQL Replication"
echo "======================================"

# Create replication role if it doesn't exist
psql -v ON_ERROR_STOP=1 <<-EOSQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'replicator') THEN
        CREATE ROLE replicator WITH REPLICATION LOGIN ENCRYPTED PASSWORD 'replicate';
    END IF;
END
\$\$;
EOSQL

echo "Replication user created/verified"

# Configure pg_hba.conf for replication connections from any address
PG_HBA="/var/lib/postgresql/data/pg_hba.conf"
if ! grep -qE "^host\s+replication\s+replicator\s+0\.0\.0\.0/0\s+md5" "$PG_HBA"; then
    echo "host replication replicator 0.0.0.0/0 md5" >> "$PG_HBA"
fi

echo "pg_hba.conf configured for replication"

echo "======================================"
echo "Replication initialization complete!"
echo "======================================"
