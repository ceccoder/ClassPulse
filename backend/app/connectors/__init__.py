from app.connectors.base import BaseConnector, ChatMessage
from app.connectors.youtube import YouTubeConnector

CONNECTORS = {
    "youtube": YouTubeConnector,
}

def get_connector(platform: str, config: dict) -> BaseConnector:
    """Factory function to get a platform connector."""
    cls = CONNECTORS.get(platform)
    if cls is None:
        raise ValueError(f"Unknown platform: {platform}")
    return cls(config)

__all__ = ["BaseConnector", "ChatMessage", "YouTubeConnector", "get_connector"]
