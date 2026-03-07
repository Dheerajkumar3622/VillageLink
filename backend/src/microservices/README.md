# Microservices Directory Structure

This file documents the microservices architecture

## Services Overview

1. **API Gateway** (Port 3000) - Kong/Nginx
2. **Auth Service** (Port 3001) - User authentication, JWT
3. **Booking Service** (Port 3002) - Tickets, Passes, Rentals
4. **Tracking Service** (Port 3003) - Real-time GPS, Driver allocation
5. **Food Service** (Port 3004) - Vendor discovery, Orders
6. **Payment Service** (Port 3005) - Razorpay, Wallet, GramCoin
7. **Notification Service** (Port 3006) - SMS (MSG91), Email, Push
8. **ML Service** (Port 5000) - Python Flask, Recommendations, NLP

## Database Mapping

| Service | Primary DB | Secondary DB |
| :--- | :--- | :--- |
| Auth | PostgreSQL | - |
| Booking | MongoDB | PostgreSQL (transactions) |
| Tracking | Redis | MongoDB |
| Food | MongoDB | - |
| Payment | PostgreSQL | - |
| Notification | Redis (queue) | MongoDB (logs) |
| ML | Redis (cache) | PostgreSQL (models) |

## Inter-Service Communication

- REST APIs for synchronous calls
- RabbitMQ/Redis Pub-Sub for async events
- gRPC for high-performance internal calls (future)
