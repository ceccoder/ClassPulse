"""
Chat polling service - background task that polls YouTube Live chat
and feeds messages to the ChatProcessor.
"""
import asyncio
from datetime import datetime, timezone
from typing import Dict, Optional
from app.connectors import get_connector
from app.services.chat_processor import ChatProcessor
from app.database import AsyncSessionLocal


class ChatPollingService:
    """Manages active polling tasks for each session."""

    def __init__(self):
        self.active_tasks: Dict[int, asyncio.Task] = {}
        self.processor = ChatProcessor(AsyncSessionLocal)

    async def start_polling(
        self,
        session_id: int,
        platform: str,
        live_chat_id: str,
        api_key: str = ""
    ):
        """Start polling for a session."""
        if session_id in self.active_tasks:
            await self.stop_polling(session_id)

        config = {"api_key": api_key}
        connector = get_connector(platform, config)

        task = asyncio.create_task(
            self._poll_loop(session_id, connector, live_chat_id)
        )
        self.active_tasks[session_id] = task
        print(f"[Polling] Started for session {session_id}")

    async def stop_polling(self, session_id: int):
        """Stop polling for a session."""
        task = self.active_tasks.pop(session_id, None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        print(f"[Polling] Stopped for session {session_id}")

    async def _poll_loop(self, session_id: int, connector, live_chat_id: str):
        """Main polling loop."""
        page_token = None
        start_time = datetime.now(timezone.utc)

        while True:
            try:
                messages, next_token, interval_ms = await connector.fetch_messages(
                    live_chat_id, page_token
                )
                page_token = next_token

                if messages:
                    for msg in messages:
                        # Make sure msg.timestamp has timezone info (or treat as UTC)
                        ts = msg.timestamp
                        if ts.tzinfo is None:
                            ts = ts.replace(tzinfo=timezone.utc)
                        
                        if ts >= start_time:
                            try:
                                await self.processor.process_message(msg, session_id)
                            except Exception as e:
                                print(f"[Polling] Error processing message: {e}")

                await asyncio.sleep(interval_ms / 1000)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[Polling] Error in poll loop: {e}")
                await asyncio.sleep(5)

    def is_polling(self, session_id: int) -> bool:
        return session_id in self.active_tasks


# Singleton instance
polling_service = ChatPollingService()
