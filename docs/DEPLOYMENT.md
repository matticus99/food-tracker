# Deployment Guide

## Prerequisites

- **Docker** and **Docker Compose** (v2) installed
- **Git** installed
- A server with at least 1 GB RAM (Ubuntu 22.04+ recommended)

## Quick Start (Local)

```bash
# 1. Clone the repo
git clone https://github.com/your-user/food-tracker.git
cd food-tracker

# 2. Create environment file from template
cp .env.docker.example .env.docker

# 3. Edit .env.docker — set a strong POSTGRES_PASSWORD and update DATABASE_URL to match
nano .env.docker

# 4. Build and start all services
docker compose up -d --build

# 5. (First time) Seed default foods and user
docker compose run --rm api node -e "
  import('./dist/db/seed.js').then(m => m.default ? m.default() : null)
"
```

The app is now running at **http://localhost**.

## Services Overview

| Service   | Description                        | Port |
|-----------|------------------------------------|------|
| `db`      | PostgreSQL 16                      | 5432 (internal) |
| `migrate` | Runs schema migrations, then exits | —    |
| `api`     | Express.js backend                 | 3001 (internal) |
| `nginx`   | Static files + reverse proxy       | 80   |

## Environment Variables

All variables are set in `.env.docker`:

| Variable            | Description                          | Example                                         |
|---------------------|--------------------------------------|--------------------------------------------------|
| `POSTGRES_USER`     | PostgreSQL username                  | `postgres`                                       |
| `POSTGRES_PASSWORD` | PostgreSQL password                  | `changeme`                                       |
| `POSTGRES_DB`       | Database name                        | `food_tracker`                                   |
| `DATABASE_URL`      | Full connection string               | `postgresql://postgres:changeme@db:5432/food_tracker` |
| `PORT`              | Express server port                  | `3001`                                           |
| `CORS_ORIGIN`       | Allowed CORS origin                  | `http://localhost` or `https://yourdomain.com`   |

## Production Deployment (Ubuntu Server)

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Clone and Configure

```bash
git clone https://github.com/your-user/food-tracker.git
cd food-tracker
cp .env.docker.example .env.docker
nano .env.docker
# Set POSTGRES_PASSWORD to a strong random value
# Update DATABASE_URL to use the same password
# Set CORS_ORIGIN to https://yourdomain.com
```

### 3. Build and Launch

```bash
docker compose up -d --build
```

### 4. SSL/HTTPS with Certbot

Install Certbot on the host and use it to obtain certificates, then mount them into the nginx container.

```bash
# Install certbot
sudo apt install certbot -y

# Obtain certificate (stop nginx temporarily)
docker compose stop nginx
sudo certbot certonly --standalone -d yourdomain.com
docker compose start nginx
```

To use the certificates, add a volume mount to the nginx service in `docker-compose.yml`:

```yaml
nginx:
  # ... existing config ...
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
  ports:
    - "80:80"
    - "443:443"
```

Then update `nginx/nginx.conf` to add an HTTPS server block:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... same location blocks as port 80 ...
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Set up auto-renewal:

```bash
sudo crontab -e
# Add: 0 3 * * * certbot renew --pre-hook "docker compose -f /path/to/docker-compose.yml stop nginx" --post-hook "docker compose -f /path/to/docker-compose.yml start nginx"
```

### 5. DNS Setup

Create an **A record** pointing your domain to the server's public IP address.

## Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
```

### Update Application

```bash
git pull origin main
docker compose up -d --build
```

### Database Backup

```bash
docker compose exec db pg_dump -U postgres food_tracker > backup_$(date +%Y%m%d).sql
```

### Database Restore

```bash
cat backup.sql | docker compose exec -T db psql -U postgres food_tracker
```

### Reset Database

```bash
docker compose down -v     # removes volumes (all data!)
docker compose up -d --build
```
