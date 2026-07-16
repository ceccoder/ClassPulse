"""
Base connector class for streaming platforms.
Extend this to add new platforms (Twitch, Kick, etc.)
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ChatMessage:
    """Normalized chat message from any platform."""
    message_id: str
    author_id: str
    author_name: str
    author_avatar: Optional[str]
    text: str
    timestamp: datetime
    platform: str


class BaseConnector(ABC):
    """Base class for streaming platform connectors."""

    platform_name: str = "base"

    def __init__(self, config: dict):
        self.config = config
        self._running = False

    @abstractmethod
    async def fetch_messages(self, live_chat_id: str, page_token: str = None) -> tuple[List[ChatMessage], str, int]:
        """
        Fetch chat messages from the platform.
        Returns: (messages, next_page_token, polling_interval_ms)
        """
        pass

    @abstractmethod
    async def get_live_chat_id(self, stream_id: str) -> Optional[str]:
        """Get the live chat ID for a given stream."""
        pass

    @abstractmethod
    async def validate_stream(self, stream_id: str) -> bool:
        """Validate that a stream ID is valid and live."""
        pass
