<div align="center">
  <img src="assets/logo.png" alt="ResqNet Logo" width="150" height="150">
  <h1>ResqNet</h1>
  <p><em>Next-Generation Real-Time Disaster Response & Coordination Platform</em></p>
  
  [![License: CC BY-ND 4.0](https://img.shields.io/badge/License-CC%20BY--ND%204.0-lightgrey.svg)](http://creativecommons.org/licenses/by-nd/4.0/)
  [![Live Demo](https://img.shields.io/badge/LIVE_DEMO-RISHISHARMA029.GITHUB.IO%2FRESQNET-73e7ae?style=for-the-badge&logo=github&logoColor=white&labelColor=555555)](https://rishisharma029.github.io/resqnet)
  <br/>
  [![Repo](https://img.shields.io/badge/-GITHUB.COM%2FRISHISHARMA029%2FRESQNET-73e7ae?style=for-the-badge)](https://github.com/Rishisharma029/resqnet)
  [![GitHub](https://img.shields.io/badge/GITHUB-RISHISHARMA029-ffffff?style=for-the-badge&logo=github&logoColor=white&labelColor=555555)](https://github.com/Rishisharma029)
  <br/>
  [![Email](https://img.shields.io/badge/EMAIL-I.RISHISHARMA2007%40GMAIL.COM-73e7ae?style=for-the-badge&logo=telegram&logoColor=white&labelColor=555555)](mailto:i.rishisharma2007@gmail.com)
</div>

<br />

## 🌍 Project Intro

**ResqNet** is an advanced, real-time emergency management and coordination system designed to bridge the gap between distressed individuals, first responders, and command centers during critical disaster events. By leveraging real-time geospatial tracking, AI-assisted incident analysis, and high-availability websocket communications, ResqNet empowers teams to make data-driven decisions when every second counts.

<p align="center">
  <img src="assets/demo.gif" alt="ResqNet Demo GIF" width="800">
</p>

---

## 📸 Screenshots

| Dashboard Overview | Live Tracking Map |
|:---:|:---:|
| <img src="screenshots/dashboard.png" alt="Dashboard" width="400"> | <img src="screenshots/map.png" alt="Live Map" width="400"> |
| **Command Center Analytics** | **AI Assistant & Incident Triage** |
| <img src="screenshots/analytics.png" alt="Analytics" width="400"> | <img src="screenshots/ai-assistant.png" alt="AI Assistant" width="400"> |

<div align="center">
  <strong>Shelter Capacity & Management System</strong><br>
  <img src="screenshots/shelter-system.png" alt="Shelter System" width="600">
</div>

---

## 🏗️ Architecture Diagrams

ResqNet uses a distributed architecture to ensure high availability and low latency during peak traffic (disaster events).

### System Flow Diagram
```mermaid
graph TD
    User([End User / Victim]) -->|SOS Signal| Client(ResqNet Client / PWA)
    Client -->|REST / WSS| LoadBalancer[Load Balancer]
    LoadBalancer --> API[API Gateway]
    LoadBalancer --> WSS[WebSocket Server]
    API --> Services[Backend Microservices]
    WSS --> PubSub[(Redis Pub/Sub)]
    Services --> DB[(PostgreSQL)]
    Services --> ML[AI Triage Engine]
    PubSub --> WSS
    WSS --> Responder([First Responder Terminal])
```

### Backend Services Diagram
```mermaid
graph LR
    Gateway[API Gateway] --> Auth[Auth Service]
    Gateway --> Incident[Incident Service]
    Gateway --> Geo[Geo-Spatial Service]
    Gateway --> Shelter[Shelter Management]
    Incident --> DB[(Primary DB)]
    Geo --> Redis[(Cache & Location)]
    Incident --> Kafka[Event Bus]
```

### WebSocket Flow (Real-Time Communication)
```mermaid
sequenceDiagram
    participant C as Client (Victim)
    participant W as WebSocket Node
    participant R as Redis Pub/Sub
    participant D as Dispatcher UI
    
    C->>W: Connect (Token)
    W-->>C: Ack & Subscribe
    C->>W: Emit 'location_update' {lat, lng}
    W->>R: Publish 'incident:123'
    R->>W: Fan-out to Subscribers
    W->>D: Push 'location_update'
    D-->>W: Acknowledge
```

---

## ✨ Features

- **Real-Time Incident Dashboard**: Bird's-eye view of all active incidents, severity levels, and resource allocations.
- **Geospatial Tracking (Map)**: Live tracking of responders, assets, and SOS signals on an interactive 3D map.
- **Advanced Analytics**: Post-incident reports, response time heatmaps, and resource utilization metrics.
- **AI Assistant**: NLP-based triage system that prioritizes incidents based on incoming distress text/audio.
- **Shelter Management System**: Real-time capacity tracking, inventory management, and routing for displaced persons.
- **Offline Capabilities**: Core functionalities are cached via PWA for intermittent connectivity zones.

### 🧪 Simulated Features
*To demonstrate the full potential of the architecture without requiring hardware integrations, the following features are simulated within the platform:*
- **Drone Feeds**: Pre-recorded aerial footage fed through the streaming pipeline.
- **Satellite Monitoring**: Historical thermal anomaly data replayed as real-time events.
- **Blockchain Logging**: Simulated immutable ledger transactions for audit trails.
- **Thermal AI**: Mocked object detection bounding boxes on thermal video feeds.

---

## 🛠️ Tech Stack

**Frontend:**
- React (Vite) / Next.js
- Tailwind CSS
- Mapbox GL JS / Deck.gl
- Socket.io-client / Zustand

**Backend:**
- Node.js (Express / NestJS)
- PostgreSQL (PostGIS)
- Redis (Pub/Sub & Caching)
- Socket.io
- Prisma ORM

**Infrastructure (Simulated/Planned):**
- Docker & Kubernetes
- AWS (EC2, S3, RDS)
- NGINX

---

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rishisharma029/resqnet.git
   cd resqnet
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   # Update .env with your specific keys (DB, Mapbox, etc.)
   ```

3. **Install Dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

4. **Run the Application**
   ```bash
   # In terminal 1 (Backend)
   cd server
   npm run dev

   # In terminal 2 (Frontend)
   cd client
   npm run dev
   ```

---

## 🗺️ Roadmap

- [x] Phase 1: Core authentication and basic SOS routing.
- [x] Phase 2: Real-time map integration and WebSocket setup.
- [ ] Phase 3: AI Assistant NLP integration for automatic triage.
- [ ] Phase 4: Mobile App (React Native) deployment for offline-first usage.
- [ ] Phase 5: Hardware integration (IoT sensors, actual drone feeds).

---

> **Note on Commits & Contribution:**
> This repository follows conventional commit standards. 
> Example: `feat: implement realtime incident dashboard`, `refactor: optimize websocket event handling`.
