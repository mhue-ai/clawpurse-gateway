#!/bin/bash
echo "ClawPurse Gateway Deployment Script"
kubectl create namespace clawpurse-gateway
kubectl apply -f k8s/

