"""
YouTube Live connector using YouTube Data API v3.
Polls live chat messages and normalizes them.
"""
import asyncio
from datetime import datetime, timezone
from typing import List, Optional
import httpx

from app.connectors.base import BaseConnector, ChatMessage


YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


class YouTubeConnector(BaseConnector):
    """YouTube Live chat connector."""

    platform_name = "youtube"

    def __init__(self, config: dict):
        super().__init__(config)
        self.api_key = config.get("api_key", "")
        self._client = httpx.AsyncClient(timeout=30.0)

    async def get_live_chat_id(self, stream_id: str) -> Optional[str]:
        """
        Get the liveChatId from a YouTube video ID.
        stream_id should be the YouTube video ID (e.g., 'dQw4w9WgXcQ').
        """
        if not self.api_key:
            return None

        # Extract YouTube video ID if stream_id is a URL
        import re
        clean_id = stream_id.strip()
        patterns = [
            r"(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([^&\s?#]+)",
            r"(?:https?://)?(?:www\.)?youtu\.be/([^&\s?#]+)",
            r"(?:https?://)?(?:www\.)?youtube\.com/embed/([^&\s?#]+)",
            r"(?:https?://)?(?:www\.)?youtube\.com/v/([^&\s?#]+)",
            r"(?:https?://)?(?:www\.)?youtube\.com/live/([^&\s?#]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, clean_id)
            if match:
                clean_id = match.group(1)
                break

        url = f"{YOUTUBE_API_BASE}/videos"
        params = {
            "part": "liveStreamingDetails",
            "id": clean_id,
            "key": self.api_key
        }
        try:
            resp = await self._client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            items = data.get("items", [])
            if not items:
                return None
            details = items[0].get("liveStreamingDetails", {})
            return details.get("activeLiveChatId")
        except Exception as e:
            print(f"[YouTubeConnector] Error fetching live chat ID: {e}")
            return None

    async def validate_stream(self, stream_id: str) -> bool:
        """Check if the stream is live."""
        chat_id = await self.get_live_chat_id(stream_id)
        return chat_id is not None

    async def fetch_messages(
        self,
        live_chat_id: str,
        page_token: str = None
    ) -> tuple[List[ChatMessage], str, int]:
        """
        Poll YouTube live chat for new messages.
        Returns (messages, next_page_token, polling_interval_ms).
        """
        if not self.api_key:
            return [], "", 5000

        url = f"{YOUTUBE_API_BASE}/liveChat/messages"
        params = {
            "part": "id,snippet,authorDetails",
            "liveChatId": live_chat_id,
            "key": self.api_key,
            "maxResults": 200
        }
        if page_token:
            params["pageToken"] = page_token

        try:
            resp = await self._client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            messages = []
            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                author = item.get("authorDetails", {})

                # Only process text messages
                if snippet.get("type") != "textMessageEvent":
                    continue

                published = snippet.get("publishedAt", "")
                try:
                    ts = datetime.fromisoformat(published.replace("Z", "+00:00"))
                except Exception:
                    ts = datetime.now(timezone.utc)

                messages.append(ChatMessage(
                    message_id=item.get("id", ""),
                    author_id=author.get("channelId", ""),
                    author_name=author.get("displayName", "Unknown"),
                    author_avatar=author.get("profileImageUrl"),
                    text=snippet.get("displayMessage", ""),
                    timestamp=ts,
                    platform="youtube"
                ))

            next_token = data.get("nextPageToken", "")
            polling_ms = data.get("pollingIntervalMillis", 5000)

            return messages, next_token, polling_ms

        except Exception as e:
            print(f"[YouTubeConnector] Error fetching messages: {e}")
            return [], page_token or "", 5000

    async def close(self):
        await self._client.aclose()
