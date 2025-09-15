# LiveWire Project Roadmap

## Phase 1: Project Setup & Fundamentals
- Initialize monorepo with `backend/`, `frontend/`, and `docs/`.
- Configure PostgreSQL and Redis locally.
- Create Git branches: `main`, `develop`, and feature branches.

## Phase 2: Authentication
- Backend: Django REST Framework, JWT auth, Google OAuth (allauth).
- Frontend: Auth context, Login/Signup UI, Protected routes.

## Phase 3: Real-Time Messaging
- Setup Django Channels + Redis.
- Models: Conversation, Message.
- REST APIs for message history.
- WebSocket for live messaging.

## Phase 4: Advanced Chat Features
- Online presence tracking.
- Typing indicators.
- Read receipts.

## Phase 5: Media & File Sharing
- Support images, files, and voice notes.
- Local storage for development.

## Phase 6: Group Chat / Channels
- Group model with members & permissions.
- Group chat UI and notifications.

## Phase 7: Extra Features (Optional)
- Push notifications (Firebase/Web Push).
- Message reactions, search, filters.
- Dark/Light theme.

## Phase 8: Documentation & Testing
- Swagger API docs.
- Unit & integration tests.
- CI/CD workflows with GitHub Actions.
