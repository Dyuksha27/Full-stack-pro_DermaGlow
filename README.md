# DermaGlow 🧴✨

DermaGlow is a full-stack e-commerce platform for skincare products, built with a modern web architecture. It provides users with a smooth shopping experience through a responsive frontend, RESTful backend APIs, and a PostgreSQL database.

The project is containerized using Docker and Docker Compose to provide a consistent development environment.

---

## 🚀 Features

- User authentication and authorization
- Product listing and browsing
- Search and filter products
- Shopping cart functionality
- REST API-based backend communication
- PostgreSQL database integration
- Docker containerized setup
- Responsive user interface

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- REST API
- JWT Authentication

### Database
- PostgreSQL

### Tools & Deployment
- Docker
- Docker Compose
- Git

---

## 📂 Project Structure

```
DermaGlow/
│
├── frontend/              # React frontend application
│   ├── src/               # Components and UI logic
│   ├── package.json
│   └── Dockerfile
│
├── backend/               # Express backend API
│   ├── src/               # Server logic and routes
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml     # Docker services configuration
│
└── README.md              # Project documentation
```

---

## ⚙️ Installation & Setup

### Prerequisites

Make sure you have installed:

- Docker Desktop
- Git

---

### Clone the Repository

```bash
git clone <repository-url>
```

```bash
cd DermaGlow
```

---

## 🐳 Run Using Docker

Build and start all services:

```bash
docker compose up --build
```

The application will start running:

### Frontend

```
http://localhost:5173
```

### Backend API

```
http://localhost:5000
```

---

## 🔐 Environment Variables

Create a `.env` file and add the required configuration values.

Example:

```env
DATABASE_URL=your_database_connection
JWT_SECRET=your_secret_key
```

---

## 🗄️ Database

DermaGlow uses PostgreSQL to store application data including:

- User accounts
- Product information
- Shopping data

Database data is persisted using Docker volumes, allowing data to remain available after restarting containers.

---

## 🔌 API Overview

The backend provides APIs for:

- User authentication
- Product management
- Cart operations
- Customer data handling
