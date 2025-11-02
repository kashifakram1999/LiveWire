from channels.generic.websocket import AsyncJsonWebsocketConsumer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """Handles websocket connections for real-time chat messaging."""

    async def connect(self):
        # Expecting URL route kwargs to provide conversation id.
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.room_group_name = f"conversation_{self.conversation_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """Placeholder for handling inbound messages."""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "payload": content,
            },
        )

    async def chat_message(self, event):
        await self.send_json(event["payload"])
