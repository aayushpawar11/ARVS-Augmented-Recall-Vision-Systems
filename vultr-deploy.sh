#!/bin/bash

# Vultr Deployment Script for MemoryGlass
# This script sets up the application on a Vultr server

echo "🚀 Starting MemoryGlass deployment on Vultr..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install MongoDB (if not using Atlas)
# Uncomment if you want to run MongoDB locally
# wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
# echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
# sudo apt-get update
# sudo apt-get install -y mongodb-org

# Install Nginx
sudo apt-get install -y nginx

# Create application directory
sudo mkdir -p /var/www/memoryglass
sudo chown -R $USER:$USER /var/www/memoryglass

# Clone or copy application files
# cd /var/www/memoryglass
# git clone <your-repo-url> .

# Install dependencies
cd /var/www/memoryglass
npm install

# Install server dependencies
cd server
npm install

# Set up environment variables
# Make sure to add your .env file with all API keys
# cp .env.example .env
# nano .env

# Build frontend
cd /var/www/memoryglass
npm run build

# Start backend server with PM2
cd server
pm2 start index.js --name memoryglass-api
pm2 save
pm2 startup

# Configure Nginx
sudo tee /etc/nginx/sites-available/memoryglass > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.tech;

    # Frontend
    location / {
        root /var/www/memoryglass/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Upload size limit
    client_max_body_size 500M;
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/memoryglass /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up SSL with Let's Encrypt (optional but recommended)
# sudo apt-get install -y certbot python3-certbot-nginx
# sudo certbot --nginx -d your-domain.tech

echo "✅ Deployment complete!"
echo "📝 Next steps:"
echo "1. Add your .env file with all API keys"
echo "2. Update Nginx config with your domain name"
echo "3. Set up SSL certificate"
echo "4. Configure firewall: sudo ufw allow 80,443,22/tcp"

