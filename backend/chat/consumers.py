from channels.generic.websocket import AsyncJsonWebsocketConsumer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """Handles websocket connections for real-time chat messaging."""

    async def connect(self):
        # Expecting URL route kwargs to provide conversation id.
        raw_conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        try:
            self.conversation_id = int(raw_conversation_id)
        except (TypeError, ValueError):
            await self.close(code=4001)
        self.room_group_name = f"conversation_{self.conversation_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """Broadcasts arbitrary payloads (messages, typing indicators, etc.)."""
        payload = {
            "kind": content.get("kind", "message"),
            "conversation": self.conversation_id,
            "data": content.get("data") or content.get("payload") or content,
        }
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "payload": payload,
            },
        )

    async def chat_message(self, event):
        await self.send_json(event["payload"])
