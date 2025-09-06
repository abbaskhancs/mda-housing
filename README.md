# MDA Housing - Development Setup

## Prerequisites

Before setting up the MDA Housing application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v16 or higher)
- **MinIO** (latest version)
- **Git**

## Development Environment Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd MDA_Housing

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your local configuration
# The default values should work for local development
```

### 3. PostgreSQL Setup

#### Windows Installation

1. **Download PostgreSQL:**
   - Visit [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)
   - Download the installer for PostgreSQL 16
   - Run the installer and follow the setup wizard

2. **Create Database and User:**
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres

   -- Create database
   CREATE DATABASE mda_housing_db;

   -- Create user
   CREATE USER mda_user WITH PASSWORD 'mda_password';

   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE mda_housing_db TO mda_user;

   -- Exit psql
   \q
   ```

3. **Start/Stop PostgreSQL Service:**
   ```bash
   # Start PostgreSQL service
   net start postgresql-x64-16

   # Stop PostgreSQL service
   net stop postgresql-x64-16

   # Check service status
   sc query postgresql-x64-16
   ```

#### macOS Installation

1. **Install via Homebrew:**
   ```bash
   # Install PostgreSQL
   brew install postgresql@16

   # Start PostgreSQL service
   brew services start postgresql@16

   # Stop PostgreSQL service
   brew services stop postgresql@16
   ```

2. **Create Database and User:**
   ```bash
   # Connect to PostgreSQL
   psql postgres

   -- Create database
   CREATE DATABASE mda_housing_db;

   -- Create user
   CREATE USER mda_user WITH PASSWORD 'mda_password';

   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE mda_housing_db TO mda_user;

   -- Exit psql
   \q
   ```

#### Linux (Ubuntu/Debian) Installation

1. **Install PostgreSQL:**
   ```bash
   # Update package list
   sudo apt update

   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib

   # Start PostgreSQL service
   sudo systemctl start postgresql

   # Enable auto-start on boot
   sudo systemctl enable postgresql
   ```

2. **Create Database and User:**
   ```bash
   # Switch to postgres user
   sudo -u postgres psql

   -- Create database
   CREATE DATABASE mda_housing_db;

   -- Create user
   CREATE USER mda_user WITH PASSWORD 'mda_password';

   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE mda_housing_db TO mda_user;

   -- Exit psql
   \q
   ```

3. **Start/Stop PostgreSQL Service:**
   ```bash
   # Start PostgreSQL service
   sudo systemctl start postgresql

   # Stop PostgreSQL service
   sudo systemctl stop postgresql

   # Check service status
   sudo systemctl status postgresql
   ```

### 4. MinIO Setup

#### Windows Installation

1. **Download MinIO:**
   - Visit [MinIO Downloads](https://min.io/download)
   - Download the Windows binary (minio.exe)
   - Place it in a directory (e.g., `C:\minio\`)

2. **Create Data Directory:**
   ```bash
   # Create data directory
   mkdir C:\minio\data
   ```

3. **Start MinIO Server:**
   ```bash
   # Navigate to MinIO directory
   cd C:\minio

   # Start MinIO server
   .\minio.exe server C:\minio\data --console-address ":9001"
   ```

4. **Access MinIO:**
   - **API Endpoint:** http://localhost:9000
   - **Console:** http://localhost:9001
   - **Default Credentials:** `minioadmin` / `minioadmin123`

#### macOS Installation

1. **Install via Homebrew:**
   ```bash
   # Install MinIO
   brew install minio/stable/minio

   # Create data directory
   mkdir ~/minio-data

   # Start MinIO server
   minio server ~/minio-data --console-address ":9001"
   ```

2. **Access MinIO:**
   - **API Endpoint:** http://localhost:9000
   - **Console:** http://localhost:9001
   - **Default Credentials:** `minioadmin` / `minioadmin123`

#### Linux Installation

1. **Download and Install:**
   ```bash
   # Download MinIO binary
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   sudo mv minio /usr/local/bin/

   # Create data directory
   sudo mkdir /opt/minio-data
   sudo chown $USER:$USER /opt/minio-data
   ```

2. **Start MinIO Server:**
   ```bash
   # Start MinIO server
   minio server /opt/minio-data --console-address ":9001"
   ```

3. **Access MinIO:**
   - **API Endpoint:** http://localhost:9000
   - **Console:** http://localhost:9001
   - **Default Credentials:** `minioadmin` / `minioadmin123`

### 5. MinIO Bucket Setup

After MinIO is running, create the required bucket:

1. **Using MinIO Console (Web UI):**
   - Open http://localhost:9001
   - Login with `minioadmin` / `minioadmin123`
   - Click "Create Bucket"
   - Name: `mda-housing-documents`
   - Set as public if needed

2. **Using MinIO Client (mc):**
   ```bash
   # Install MinIO client
   # Windows: Download mc.exe from MinIO downloads
   # macOS: brew install minio/stable/mc
   # Linux: wget https://dl.min.io/client/mc/release/linux-amd64/mc

   # Configure alias
   mc alias set local http://localhost:9000 minioadmin minioadmin123

   # Create bucket
   mc mb local/mda-housing-documents

   # Set bucket policy (optional)
   mc policy set public local/mda-housing-documents
   ```

## Development Commands

### Start Development Services

```bash
# Start PostgreSQL (Windows)
net start postgresql-x64-16

# Start PostgreSQL (macOS/Linux)
brew services start postgresql@16
# OR
sudo systemctl start postgresql

# Start MinIO
minio server /path/to/data --console-address ":9001"
```

### Stop Development Services

```bash
# Stop PostgreSQL (Windows)
net stop postgresql-x64-16

# Stop PostgreSQL (macOS/Linux)
brew services stop postgresql@16
# OR
sudo systemctl stop postgresql

# Stop MinIO
# Press Ctrl+C in the terminal where MinIO is running
```

### Verify Services

```bash
# Check PostgreSQL connection
psql -h localhost -U mda_user -d mda_housing_db

# Check MinIO API
curl http://localhost:9000/minio/health/live

# Check MinIO Console
# Open http://localhost:9001 in browser
```

## Environment Variables

The following environment variables are configured in `.env.example`:

- **Database:** `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **MinIO:** `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`
- **API:** `PORT`, `NODE_ENV`, `API_BASE_URL`
- **JWT:** `JWT_SECRET`, `JWT_EXPIRES_IN`
- **PDF:** `PDF_GENERATION_ENABLED`, `PDF_TEMPLATE_PATH`

## Troubleshooting

### PostgreSQL Issues

- **Connection refused:** Ensure PostgreSQL service is running
- **Authentication failed:** Check username/password in `.env` file
- **Database doesn't exist:** Run the database creation commands above

### MinIO Issues

- **Port already in use:** Change the port in MinIO startup command
- **Access denied:** Check MinIO credentials in `.env` file
- **Bucket not found:** Create the bucket using MinIO console or mc client

### General Issues

- **Port conflicts:** Ensure ports 3001 (API), 5432 (PostgreSQL), 9000 (MinIO API), 9001 (MinIO Console) are available
- **Environment variables:** Double-check `.env` file configuration
- **Dependencies:** Run `npm install` to ensure all packages are installed

## Next Steps

After completing the setup:

1. Run database migrations: `npx prisma migrate dev`
2. Seed the database: `npx prisma db seed`
3. Start the development server: `npm run dev`

## Support

For issues with this setup, check:
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MinIO Documentation](https://docs.min.io/)
- [Node.js Documentation](https://nodejs.org/docs/)
