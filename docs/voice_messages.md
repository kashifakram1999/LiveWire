# Voice Message Implementation

Detailed reference describing how WhatsApp-style voice notes were delivered end-to-end.

---

## Backend (Django + DRF + Channels)

| Area | Implementation details |
| --- | --- |
| Storage | Native Django `FileField` with default filesystem storage (settings: `MEDIA_ROOT = BASE_DIR / "media"`, `MEDIA_URL = "/media/"`). Files land in `media/voice_messages/`. |
| Model | `chat.models.Message` now contains `audio_file`, `audio_mime_type`, `audio_duration_seconds`. Migration `0002_message_audio_duration_seconds_message_audio_file_and_more.py` adds the columns. |
| Serialization | `MessageSerializer` accepts `audio_file` via DRF’s built-in parsers, validates that at least one of body/attachment/audio is present, and surfaces `audio_url` (absolute URL built from `request.build_absolute_uri`). |
| Upload handling | `MessageListCreateView` extends `parser_classes` to `(MultiPartParser, FormParser, JSONParser)` and reuses existing broadcast logic so WebSocket clients immediately receive the new message payload (now containing audio metadata + url). |
| Serving media | `core.urls` appends `static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)` when `DEBUG` is true, so Vite dev server can fetch audio blobs straight from Django. |

No third-party storage SDKs are used—everything relies on Django’s default file handling plus standard DRF components.

---

## Frontend (React + Vite + TypeScript)

| Area | Implementation details |
| --- | --- |
| Recorder | Browser-native **MediaRecorder API** (no external library). We request `navigator.mediaDevices.getUserMedia({ audio: true })`, instantiate `MediaRecorder`, capture chunks, and track duration with `setInterval`. |
| State mgmt | Added React `useState` hooks for `isRecording`, `recordingDuration`, `isSendingAudio`, `recorderError`, plus refs for chunks, timers, and `MediaRecorder`. Effects ensure resources are cleaned up when switching conversations or unmounting. |
| Upload | `frontend/src/api/chat.ts` extends `sendMessage` to accept a discriminated union payload. When an `audioBlob` is present, it wraps it in `FormData` (filename `voice-${Date.now()}.webm`) and sets `multipart/form-data` header via Axios. Metadata like duration/mime is appended so the backend persists it. |
| UI feedback | Composer (`ChatPage.tsx`) now has mic/stop/cancel buttons with icons from `react-icons` (FiMic, FiStopCircle, FiTrash2). While recording, a red pill shows “Recording…” + timer. Uploading displays “Uploading voice message…”. Audio bubbles render a play/pause button, progress bar, and duration label. |
| Playback | Uses hidden `<audio>` elements per message, tracked via refs. Playback controls call `audio.play()`/`pause()` and update UI progress in `audioPlaybackStates`. When switching playback between messages, other clips auto-pause. |

No specialized waveform or recording packages were introduced; all interactions leverage Web APIs + existing dependencies (React, Axios, react-icons).

---

## Manual Verification Checklist

1. `python manage.py migrate` (ensures new audio columns exist) and `python manage.py runserver`.
2. `cd frontend && npm install && npm run dev` to launch the Vite dev server.
3. In Chrome/Firefox, open the app, select a conversation, click the mic icon, and allow microphone access.
4. Speak a short sentence; confirm the “Recording…” chip increments time.
5. Press stop: uploading indicator appears, then the chat displays a voice bubble with play/pause + duration.
6. Click play to ensure audio streams from `http://localhost:8000/media/voice_messages/...`.
7. Repeat as another user/browser to confirm WebSocket broadcast shows the clip immediately.

Optional: inspect `backend/media/voice_messages/` to see stored `.webm` files, and tail the network tab to verify `multipart/form-data` requests when sending audio.
