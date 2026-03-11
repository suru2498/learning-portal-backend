Backend Architecture
    Stack
        Node.js
        Express
        TypeScript
        MySQL
        JWT Authentication
        REST APIs

    Architecture Style
        Layered Architecture (Controller → Service → DB)
    
    Structure
        ├── routes
        │     ├── adminRoutes.ts
        │     ├── userRoutes.ts
        │     ├── categoryRoutes.ts
        │     ├── topicRoutes.ts
        │     └── problemRoutes.ts
        │
        ├── controllers
        │     ├── userController.ts
        │     ├── topicController.ts
        │
        ├── middleware
        │     ├── authMiddleware.ts
        │
        ├── db
        │     └── connection.ts
        │
        ├── utils
        │     └── logger.ts
        │
        └── index.ts

    Flow
        Client Request
            ↓
        Route Layer
            ↓
        Controller Layer
            ↓
        Business Logic
            ↓
        Database Queries
            ↓
        Response to Client