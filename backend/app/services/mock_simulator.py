"""
Mock Chat Simulator Service for ClassPulse.
Simulates live YouTube chat traffic with student names, votes, attendance, and general chat messages.
"""
import asyncio
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional
from sqlalchemy import select

from app.connectors.base import ChatMessage
from app.database import AsyncSessionLocal
from app.models import Poll, PollOption, PollStatus
from app.services.chat_processor import ChatProcessor


MOCK_STUDENTS = [
    {"id": "UC_alex_r", "name": "Alex Rivera", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"},
    {"id": "UC_priya_s", "name": "Priya Sharma", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"},
    {"id": "UC_david_c", "name": "David Chen", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=David"},
    {"id": "UC_sarah_j", "name": "Sarah Jenkins", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"},
    {"id": "UC_michael_b", "name": "Michael Brown", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael"},
    {"id": "UC_elena_r", "name": "Elena Rostova", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena"},
    {"id": "UC_marcus_v", "name": "Marcus Vance", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus"},
    {"id": "UC_aisha_k", "name": "Aisha Khan", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha"},
    {"id": "UC_liam_o", "name": "Liam O'Connor", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Liam"},
    {"id": "UC_sophia_w", "name": "Sophia Wang", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia"},
]

CHAT_TEMPLATES = [
    "Hello everyone!",
    "Great session today teacher!",
    "Could you explain step 2 again?",
    "Will these slides be shared after class?",
    "Thank you for the detailed example!",
    "#present",
    "#hand"
]


class MockChatSimulator:
    """Manages active mock simulation loops for sessions."""

    def __init__(self):
        self.active_tasks: Dict[int, asyncio.Task] = {}
        self.processor = ChatProcessor(AsyncSessionLocal)

    async def start_simulation(self, session_id: int, interval_seconds: float = 1.5):
        """Start auto-generating simulated chat for a session."""
        if session_id in self.active_tasks:
            await self.stop_simulation(session_id)

        task = asyncio.create_task(self._simulation_loop(session_id, interval_seconds))
        self.active_tasks[session_id] = task
        print(f"[MockSimulator] Started simulation for session {session_id}")

    async def stop_simulation(self, session_id: int):
        """Stop mock chat simulation."""
        task = self.active_tasks.pop(session_id, None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        print(f"[MockSimulator] Stopped simulation for session {session_id}")

    def is_simulating(self, session_id: int) -> bool:
        return session_id in self.active_tasks

    async def send_single_message(self, session_id: int, text: str, author_name: str = "Test Student"):
        """Send a single custom test message into the chat processor."""
        msg = ChatMessage(
            message_id=f"mock_{int(datetime.utcnow().timestamp() * 1000)}",
            author_id=f"UC_custom_{hash(author_name) % 10000}",
            author_name=author_name,
            author_avatar=f"https://api.dicebear.com/7.x/avataaars/svg?seed={author_name}",
            text=text,
            timestamp=datetime.now(timezone.utc),
            platform="youtube_mock"
        )
        await self.processor.process_message(msg, session_id)

    async def _simulation_loop(self, session_id: int, interval_seconds: float):
        """Loop that continuously emits mock messages."""
        msg_counter = 0

        while True:
            try:
                msg_counter += 1
                student = random.choice(MOCK_STUDENTS)

                # Check if there is an active poll
                active_keywords = await self._get_active_poll_keywords(session_id)

                if active_keywords and random.random() < 0.75:
                    # Generate a vote
                    target_kw = random.choice(active_keywords)
                    text = self._format_vote_message(target_kw)
                else:
                    # Generate general chat or command
                    text = random.choice(CHAT_TEMPLATES)

                msg = ChatMessage(
                    message_id=f"mock_loop_{msg_counter}_{int(datetime.utcnow().timestamp())}",
                    author_id=student["id"],
                    author_name=student["name"],
                    author_avatar=student["avatar"],
                    text=text,
                    timestamp=datetime.now(timezone.utc),
                    platform="youtube_mock"
                )

                await self.processor.process_message(msg, session_id)
                await asyncio.sleep(interval_seconds)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[MockSimulator] Error in simulation loop: {e}")
                await asyncio.sleep(3)

    async def _get_active_poll_keywords(self, session_id: int) -> List[str]:
        """Fetch option keywords for the currently active poll."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Poll).where(Poll.session_id == session_id, Poll.status == PollStatus.active)
            )
            poll = result.scalar_one_or_none()
            if not poll:
                return []
            opts_res = await db.execute(select(PollOption).where(PollOption.poll_id == poll.id))
            options = opts_res.scalars().all()
            return [o.keyword for o in options]

    def _format_vote_message(self, keyword: str) -> str:
        """Format vote keyword into various natural variations."""
        formats = [
            f"{keyword}",
            f"{keyword.lower()}",
            f"Option {keyword}",
            f"option {keyword.lower()}",
            f"I choose {keyword}",
            f"Answer is {keyword}",
            f"My answer is {keyword}",
            f"I think {keyword} is correct",
            f"{keyword}!",
            f"{keyword * 3}"
        ]
        return random.choice(formats)


mock_simulator = MockChatSimulator()
