# Self-Hosted Runner Deployment Setup

Step-by-step guide to enable automatic deployment when a PR is merged to `main`.

## How It Works

```
Push to branch → Open PR → CI runs (typecheck, test, build, docker) →
Merge to main → Deploy job runs on your server → git pull + docker compose up
```

## Step 1: Install the GitHub Actions Runner

On your server:

1. Go to your repo on GitHub → **Settings** → **Actions** → **Runners**
2. Click **"New self-hosted runner"**
3. Select **Linux** and your architecture (likely x64)
4. Follow the download and configure commands shown on the page — they'll look like:

```bash
# Create a directory for the runner
mkdir actions-runner && cd actions-runner

# Download the runner (URL will be provided by GitHub)
curl -o actions-runner-linux-x64.tar.gz -L <URL_FROM_GITHUB>

# Extract
tar xzf actions-runner-linux-x64.tar.gz

# Configure — use the token GitHub provides
./config.sh --url https://github.com/matticus99/food-tracker --token <TOKEN_FROM_GITHUB>
```

## Step 2: Run the Runner as a Service

So it survives reboots and runs in the background:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

Verify it's running:

```bash
sudo ./svc.sh status
```

You should also see the runner appear as **"Idle"** on the GitHub Runners settings page.

## Step 3: Ensure the Runner User Has Docker Access

The user running the GitHub Actions service needs to be in the `docker` group:

```bash
# Check which user the service runs as
sudo ./svc.sh status

# Add that user to the docker group (replace USERNAME)
sudo usermod -aG docker USERNAME

# Restart the service for the group change to take effect
sudo ./svc.sh stop
sudo ./svc.sh start
```

Verify with:

```bash
# As the runner user
docker ps
```

## Step 4: Set the DEPLOY_PATH Variable in GitHub

1. Go to your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Click the **"Variables"** tab
3. Click **"New repository variable"**
4. Name: `DEPLOY_PATH`
5. Value: the absolute path to your project on the server (e.g. `/home/matt/food-tracker`)

## Step 5: Verify the Setup

1. Make sure your project repo is cloned on the server at the `DEPLOY_PATH` location
2. Ensure `docker-compose.yml` exists in that directory
3. Test manually first:

```bash
cd /home/matt/food-tracker  # your DEPLOY_PATH
git pull origin main
docker compose up -d --build
```

## Step 6: Test the Full Pipeline

1. Create a feature branch and make a small change
2. Push and open a PR — CI should run (typecheck, test, build, docker build)
3. Merge the PR to `main`
4. Watch the **Actions** tab — the deploy job should run on your self-hosted runner
5. Verify your server has the latest changes and containers are running

## Troubleshooting

### Runner not picking up jobs
- Check the service is running: `sudo ./svc.sh status`
- Check the runner appears as "Idle" on GitHub Settings → Actions → Runners
- Check the runner logs: `journalctl -u actions.runner.*`

### Docker permission denied
- Ensure the runner user is in the `docker` group
- Restart the runner service after adding to the group

### Deploy fails on git pull
- Make sure the repo on the server has `origin` pointing to GitHub
- Make sure there are no local uncommitted changes on the server (the server copy should never be edited directly)

### Containers fail to start
- SSH into the server and run `docker compose up` without `-d` to see logs
- Check `.env` file exists and has the required environment variables
