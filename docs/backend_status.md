# Backend Implementation Status

Status derived from `docs/Roadmap.md` and the current Django codebase.

## Implemented Work (backend)

### Phase 1 – Project setup
- Monorepo with `backend/`, `frontend/`, and `docs/` exists along with Django project scaffolding and custom apps (`users`, `chat`).
- PostgreSQL and Redis configuration is wired via environment variables in `backend/core/settings.py`, including dynamic channel layer selection for Redis vs in-memory (useful for local dev and matches the architecture's Redis layer).

### Phase 2 – Authentication (partial)
- Custom email-first `User` model (`backend/users/models.py`) with profile metadata plus Google subject placeholder field to support future OAuth.
- Registration endpoint using `RegisterSerializer` validates/creates users with hashed passwords.
- JWT authentication handled entirely by `djangorestframework-simplejwt`, configured in settings with rotation and blacklist, and exposed via `/api/auth/token/` & `/api/auth/token/refresh/`. Responses also return serialized user data (see `LiveWireTokenObtainPairSerializer`).
- User info endpoints: `/api/auth/me/` returns authenticated user, `/api/auth/users/` lists/searches other users—enabling the frontend to build participant pickers.
- **Pending inside phase**: Google OAuth flow is not implemented despite roadmap mention; there is no allauth/adapter wiring or OAuth views.

### Phase 3 – Real-time messaging (core delivered)
- Chat domain models exist (conversations, participants, messages) including metadata for group chats, timestamps, attachments, edit tracking.
- REST endpoints:
  - `/api/chat/conversations/` list/create scoped to current user with automatic self-inclusion and participant syncing.
  - `/api/chat/conversations/<id>/` retrieve/update/delete with membership checks.
  - `/api/chat/conversations/<id>/messages/` list/create messages, updating conversation `updated_at`, permission checks, and restful serialization of sender info.
  - `/api/chat/conversations/<id>/messages/<message_id>/` retrieve/update/delete with edit/delete permissions limited to sender.
- Django Channels + Redis configured; `core/asgi.py` wires HTTP + WebSocket via `AuthMiddlewareStack`.
- `ChatConsumer` broadcasts room messages and arbitrary payloads (typing indicators, etc.) through channel groups, enabling architecture's WebSocket layer. REST message creation also emits group events to push new messages to connected clients.

## Pending / Not Implemented Yet

### Roadmap Phase 2 gaps
- Google OAuth (allauth) integration is absent; no social login endpoints, signals, or settings. Email verification logic is also not present.

### Phase 4 – Advanced chat features
- Online presence, typing indicators, and read receipts are not persisted/processed beyond the generic `kind` payload router. There are no models/fields/APIs to represent presence or read state.

### Phase 5 – Media & file sharing
- Although `Message` supports an `attachment_url`, there is no upload API, storage config, validation, or processing for images/files/voice notes.

### Phase 6 – Group chat enhancements
- Base group capability exists (flag + participant table), but no role/permission management beyond a string field, no invitation/approval flows, and no dedicated notification endpoints as suggested in the roadmap.

### Phase 7 – Optional extras
- Push notifications, reactions, search filters beyond simple conversation listing, and theming are not present server-side.

### Phase 8 – Documentation & testing
- No Swagger/OpenAPI generation, automated unit/integration tests, or CI/CD workflows are committed in the repository.
