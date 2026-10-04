"""
Modular Vote Detection Engine for ClassPulse.
Provides base abstraction and implementations for regex-based and AI-based vote detection.
"""
from abc import ABC, abstractmethod
import re
from typing import List, Optional


class BaseVoteDetector(ABC):
    """Abstract base class for vote detection engines."""

    @abstractmethod
    def detect_vote(self, text: str, valid_options: List[str]) -> Optional[str]:
        """
        Analyze chat message text and return the matched valid option keyword,
        or None if no valid vote is detected.
        """
        pass


class RegexVoteDetector(BaseVoteDetector):
    """
    Pattern-based vote detector capable of recognizing:
    - Simple single letters/numbers (A, B, C, D, 1, 2, 3, 4, A., 1), (B))
    - Natural language phrases ("Option A", "I choose B", "Answer is C", "My answer is 2", "I vote D")
    - Repeated character votes ("aaa", "BBB")
    - Validating against active poll options.
    """

    def detect_vote(self, text: str, valid_options: List[str]) -> Optional[str]:
        if not text or not valid_options:
            return None

        # Normalize valid options to upper case strings for lookup
        valid_map = {str(opt).strip().upper(): str(opt).strip().upper() for opt in valid_options}
        cleaned = text.strip()
        cleaned_upper = cleaned.upper()

        # 1. Direct exact match with valid option keyword
        if cleaned_upper in valid_map:
            return valid_map[cleaned_upper]

        # 2. Punctuation wrapped single token like "A.", "1)", "(B)", "[C]"
        m = re.match(r'^\(?([a-zA-Z0-9])[\.\)\:\]]?$', cleaned)
        if m:
            candidate = m.group(1).upper()
            if candidate in valid_map:
                return valid_map[candidate]

        # 3. Repeated character responses like "AAA", "bbb", "ccc"
        m = re.match(r'^([a-zA-Z])\1+$', cleaned)
        if m:
            candidate = m.group(1).upper()
            if candidate in valid_map:
                return valid_map[candidate]

        # 4. Explicit option prefixes: "Option A", "Opt 2", "Ans: C", "Answer B", "#A"
        m = re.search(r'\b(?:option|opt|choice|ans|answer|vote|#)\s*[\:\=\-]?\s*([a-zA-Z0-9])\b', cleaned, re.IGNORECASE)
        if m:
            candidate = m.group(1).upper()
            if candidate in valid_map:
                return valid_map[candidate]

        # 5. Natural speech phrases: "I choose B", "I pick A", "My answer is C", "Answer is D", "I vote 2"
        m = re.search(r'\b(?:i choose|i pick|i vote|i select|my answer is|answer is|ans is)\s*([a-zA-Z0-9])\b', cleaned, re.IGNORECASE)
        if m:
            candidate = m.group(1).upper()
            if candidate in valid_map:
                return valid_map[candidate]

        # 6. Natural speech: "I think C is correct" or "I think B is the answer"
        m = re.search(r'\b(?:i think)\s*([a-zA-Z0-9])\s*(?:is|should be)?\s*(?:correct|right|the answer)\b', cleaned, re.IGNORECASE)
        if m:
            candidate = m.group(1).upper()
            if candidate in valid_map:
                return valid_map[candidate]

        return None


class AIVoteDetector(BaseVoteDetector):
    """
    Extensible AI / LLM Vote Detector.
    Can integrate with local or cloud LLM APIs (e.g., Gemini, OpenAI, Ollama)
    for complex semantic answer detection.
    Falls back to RegexVoteDetector if AI API is disabled or unavailable.
    """

    def __init__(self, fallback_detector: Optional[BaseVoteDetector] = None):
        self.fallback = fallback_detector or RegexVoteDetector()

    def detect_vote(self, text: str, valid_options: List[str]) -> Optional[str]:
        # AI/LLM natural language processing hook can be placed here
        # For default MVP behavior, use fast regex fallback
        return self.fallback.detect_vote(text, valid_options)


# Singleton detector instance
default_vote_detector = RegexVoteDetector()
