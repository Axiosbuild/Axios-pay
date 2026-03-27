Axios Pay: Interswitch x Enyata Hackathon Edition
Axios Pay is a high-performance cross-border payment platform engineered to solve liquidity and currency exchange challenges across Africa. Developed specifically for the Interswitch x Enyata Hackathon, the platform leverages the Interswitch ecosystem to facilitate seamless, real-time currency swaps.
For example, a user traveling from Nigeria to Uganda can instantly swap Naira (NGN) within the app and receive the Ugandan Shilling (UGX) equivalent via a partner bank or mobile wallet—all powered by secure, local financial rails.

🚀 Key Features
 * Interswitch Integration: Utilizes Interswitch's robust payment gateway for secure collections and payouts.
 * Real-Time FX Engine: Dynamic currency swap logic providing competitive rates for intra-African corridors.
 * Microservices-Ready: Modular architecture separating core business logic, financial services, and user management.
 * Secure Wallet System: Multi-currency wallet support built on top of a resilient database layer.
🛠 Tech Stack
 * Languages: TypeScript (94%), JavaScript, CSS
 * Backend: Node.js (Express) with Prisma ORM
 * Frontend: Next.js (located in apps/web)
 * Caching & Messaging: Redis & Socket.io (for real-time transaction updates)
 * Infrastructure: Docker & Docker Compose
   
👥 The Team & Contributions
Fortitude Odunlami — Product Manager
Fortitude defined the product roadmap and hackathon strategy, ensuring the solution met the technical and business requirements of the Interswitch ecosystem.
 * Product Strategy: Defined the Nigeria-Uganda corridor use case and mapped out the Interswitch service touchpoints.
 * Logic Design: Specified the business rules for fx.service.ts to handle spread calculations and transaction limits.
 * API Documentation: Managed the technical documentation and workflow for the Interswitch API integration.
 * Stakeholder Alignment: Coordinated between technical and design requirements to meet hackathon milestones.
   
Emmanuel Duke — Full Stack Developer
Emmanuel architected and implemented the entire codebase, from the financial service integrations to the real-time user interface.
 * Service Architecture: Implemented interswitch.service.ts to bridge the platform with Interswitch’s payment infrastructure.
 * Core Logic: Built the transaction and wallet management systems (transactions.ts, wallets.ts, fx.service.ts).
 * Database & Security: Engineered the schema using Prisma and implemented robust authentication via auth.middleware.ts and jwt.ts.
 * Infrastructure: Set up the Docker environment and CI/CD workflows for consistent deployment.
   
📂 Repository Structure
Axios-pay/
├── apps/web/           # Next.js frontend application
├── backend/            # core server-side logic
├── infra/              # Infrastructure-as-Code and deployment configs
├── interswitch.service.ts # Integration layer for Interswitch APIs
├── fx.service.ts       # Foreign Exchange and currency swap logic
├── prisma.ts           # Database ORM configuration
├── docker-compose.yml  # Container orchestration
└── server.ts           # Application entry point

🏗 Setup and Installation
 * Clone the repository:
   git clone https://github.com/Axiosbuild/Axios-pay.git
cd Axios-pay

 * Environment Configuration:
   Create a .env file based on the provided environment variables for Interswitch credentials and database URLs.
 * Launch with Docker:
   docker-compose up --build

 * Initialize Database:
   npx prisma migrate dev

🏆 Hackathon Context
This project was submitted for the Interswitch x Enyata Hackathon, focusing on building scalable financial technology that leverages existing African payment infrastructure to drive continental trade and mobility.
Built with ❤️ by the Axios Team.
