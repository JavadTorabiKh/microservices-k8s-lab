#!/bin/bash

# Microservices Deployment Script
set -e

echo "🚀 Starting Microservices Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Build Docker images
print_status "Building Docker images..."

print_status "Building auth-service..."
docker build -t auth-service:latest auth-service/

print_status "Building products-service..."
docker build -t products-service:latest products-service/

print_status "Building frontend..."
docker build -t frontend:latest frontend/

print_status "Building api-gateway..."
docker build -t api-gateway:latest api-gateway/

# Load images to Minikube (if using Minikube)
if command -v minikube &> /dev/null; then
    print_status "Loading images to Minikube..."
    minikube image load auth-service:latest
    minikube image load products-service:latest
    minikube image load frontend:latest
    minikube image load api-gateway:latest
fi

# Deploy to Kubernetes
print_status "Deploying to Kubernetes..."

print_status "Creating namespace..."
kubectl apply -f k8s/namespace.yml

print_status "Deploying Redis..."
kubectl apply -f k8s/redis-deployment.yml

print_status "Deploying auth-service..."
kubectl apply -f k8s/auth-deployment.yml

print_status "Deploying products-service..."
kubectl apply -f k8s/products-deployment.yml

print_status "Deploying frontend..."
kubectl apply -f k8s/frontend-deployment.yml

print_status "Deploying api-gateway..."
kubectl apply -f k8s/gateway-deployment.yml

# Wait for deployment to complete
print_status "Waiting for deployments to be ready..."
sleep 30

# Check deployment status
print_status "Checking deployment status..."
kubectl get pods -n microservices

print_status "Checking services..."
kubectl get services -n microservices

# Get application URL
if command -v minikube &> /dev/null; then
    print_status "Getting application URL..."
    minikube service api-gateway -n microservices --url
else
    print_warning "Minikube not found. To access the application, use kubectl port-forward or your cloud provider's load balancer."
fi

print_status "🎉 Deployment completed successfully!"
print_status "📚 Educational Microservices System is now running!"
print_status "💡 You can access the application using the URL above."