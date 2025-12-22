#!/bin/bash

# Casper x402 Demo Setup Script
# This script sets up the complete x402 demo environment

set -e

echo "🚀 Setting up Casper x402 Demo Environment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 16+ and try again."
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
}

# Install dependencies for all components
install_dependencies() {
    print_status "Installing dependencies for all components..."
    
    # Root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Facilitator dependencies
    print_status "Installing facilitator dependencies..."
    cd facilitator
    npm install
    cd ..
    
    # API dependencies
    print_status "Installing API dependencies..."
    cd api
    npm install
    cd ..
    
    # Client dependencies
    print_status "Installing client dependencies..."
    cd client
    npm install
    cd ..
    
    print_success "All dependencies installed successfully"
}

# Create keys directory and generate sample keys
setup_keys() {
    print_status "Setting up keys directory..."
    
    mkdir -p keys
    
    # Create sample key files (these should be replaced with real keys)
    if [ ! -f "keys/facilitator-secret.pem" ]; then
        print_warning "Creating sample facilitator key file"
        cat > keys/facilitator-secret.pem << 'EOF'
-----BEGIN PRIVATE KEY-----
# REPLACE THIS WITH YOUR ACTUAL FACILITATOR PRIVATE KEY
# This is a placeholder file for demo purposes
# Generate your keys using: casper-client keygen keys/
-----END PRIVATE KEY-----
EOF
    fi
    
    if [ ! -f "keys/payer-secret.pem" ]; then
        print_warning "Creating sample payer key file"
        cat > keys/payer-secret.pem << 'EOF'
-----BEGIN PRIVATE KEY-----
# REPLACE THIS WITH YOUR ACTUAL PAYER PRIVATE KEY
# This is a placeholder file for demo purposes
# Generate your keys using: casper-client keygen keys/
-----END PRIVATE KEY-----
EOF
    fi
    
    print_success "Keys directory setup complete"
}

# Copy environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_warning "Created .env file from .env.example"
        print_warning "Please edit .env file with your actual configuration values"
    else
        print_success ".env file already exists"
    fi
}

# Create run scripts
create_run_scripts() {
    print_status "Creating run scripts..."
    
    # Start all services script
    cat > scripts/start-all.sh << 'EOF'
#!/bin/bash

# Start all x402 demo services

echo "🚀 Starting Casper x402 Demo Services"
echo "===================================="

# Function to cleanup on exit
cleanup() {
    echo "Stopping all services..."
    pkill -f "node.*facilitator/server.js" || true
    pkill -f "node.*api/server.js" || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start facilitator service
echo "Starting facilitator service..."
cd facilitator
node server.js &
FACILITATOR_PID=$!
cd ..

# Wait a moment for facilitator to start
sleep 2

# Start protected API service
echo "Starting protected API service..."
cd api
node server.js &
API_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo "📍 Facilitator: http://localhost:3001"
echo "📍 Protected API: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for services
wait $FACILITATOR_PID $API_PID
EOF

    # Run demo script
    cat > scripts/run-demo.sh << 'EOF'
#!/bin/bash

# Run the x402 client demo

echo "🎬 Running Casper x402 Client Demo"
echo "================================="

# Check if services are running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s "$url/health" > /dev/null 2>&1; then
        echo "✅ $name is running"
        return 0
    else
        echo "❌ $name is not running"
        return 1
    fi
}

echo "Checking services..."
if ! check_service "http://localhost:3001" "Facilitator"; then
    echo "Please start the facilitator service first: npm run start:facilitator"
    exit 1
fi

if ! check_service "http://localhost:3002" "Protected API"; then
    echo "Please start the protected API service first: npm run start:api"
    exit 1
fi

echo ""
echo "Running client demo..."
cd client
node demo.js
EOF

    # Test script
    cat > scripts/test.sh << 'EOF'
#!/bin/bash

# Run tests for the x402 demo

echo "🧪 Running Casper x402 Demo Tests"
echo "================================="

# Test facilitator service
echo "Testing facilitator service..."
cd facilitator
npm test
cd ..

# Test API service
echo "Testing API service..."
cd api
npm test
cd ..

# Test client
echo "Testing client..."
cd client
npm test
cd ..

echo "✅ All tests completed"
EOF

    # Make scripts executable
    chmod +x scripts/*.sh
    
    print_success "Run scripts created successfully"
}

# Update package.json with scripts
update_package_scripts() {
    print_status "Updating package.json scripts..."
    
    # Create a temporary package.json with updated scripts
    cat > package.json.tmp << 'EOF'
{
  "name": "casper-x402-demo",
  "version": "1.0.0",
  "description": "Casper x402 Payment Protocol Demo - Similar to Solana Kora",
  "main": "client/demo.js",
  "scripts": {
    "setup": "./scripts/setup.sh",
    "start": "./scripts/start-all.sh",
    "start:facilitator": "cd facilitator && node server.js",
    "start:api": "cd api && node server.js",
    "demo": "./scripts/run-demo.sh",
    "test": "./scripts/test.sh",
    "clean": "rm -rf node_modules facilitator/node_modules api/node_modules client/node_modules",
    "install:all": "npm install && cd facilitator && npm install && cd ../api && npm install && cd ../client && npm install"
  },
  "keywords": [
    "casper",
    "x402",
    "payment",
    "protocol",
    "blockchain",
    "demo"
  ],
  "author": "Casper x402 Demo",
  "license": "MIT",
  "dependencies": {
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
EOF

    mv package.json.tmp package.json
    print_success "Package.json updated with demo scripts"
}

# Main setup function
main() {
    echo ""
    print_status "Starting setup process..."
    
    check_nodejs
    check_npm
    install_dependencies
    setup_keys
    setup_environment
    create_run_scripts
    update_package_scripts
    
    echo ""
    print_success "🎉 Casper x402 Demo setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your actual configuration values"
    echo "2. Replace sample keys in keys/ directory with real keys"
    echo "3. Start services: npm start"
    echo "4. Run demo: npm run demo"
    echo ""
    echo "Available commands:"
    echo "  npm start          - Start all services"
    echo "  npm run demo       - Run client demo"
    echo "  npm test           - Run tests"
    echo "  npm run clean      - Clean all node_modules"
    echo ""
}

# Run main function
main "$@"