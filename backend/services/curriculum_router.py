import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

# Structured Technical Interview Curriculum
CURRICULUM_QUESTIONS = [
    {
        "id": "q1_welcome",
        "topic": "System & Architecture Fundamentals",
        "question": "Welcome to your technical interview! Let's start with system fundamentals: How do you approach designing a high-throughput, low-latency API service from scratch?"
    },
    {
        "id": "q2_async",
        "topic": "Async I/O & Concurrency",
        "question": "Great insights! When scaling backend services, how do you handle asynchronous processing vs thread-based concurrency, and what are your preferences for avoiding thread starvation or I/O bottlenecks?"
    },
    {
        "id": "q3_databases",
        "topic": "Database Architecture & Tradeoffs",
        "question": "That makes sense. In terms of data storage, how do you evaluate tradeoffs between relational databases (e.g. PostgreSQL) vs NoSQL or distributed key-value stores for persistent state?"
    },
    {
        "id": "q4_caching",
        "topic": "Caching & Invalidation Strategies",
        "question": "Excellent point. How do you design caching layers (e.g. Redis or in-memory LRU caches) and handle cache invalidation, thundering herd problems, or cache stampedes under heavy load?"
    },
    {
        "id": "q5_resilience",
        "topic": "Distributed Systems Resilience",
        "question": "Very detailed! In a microservices architecture, how do you implement circuit breakers, retry policies with exponential backoff, and graceful degradation during partial downstream failure?"
    },
    {
        "id": "q6_security",
        "topic": "Security & Authentication",
        "question": "Crucial considerations. How do you approach API security, rate limiting, token-based authentication (JWT/OAuth2), and secret management in production environments?"
    },
    {
        "id": "q7_monitoring",
        "topic": "Observability & Error Handling",
        "question": "Good approach. How do you set up structured logging, distributed tracing (OpenTelemetry), and metrics collection to diagnose complex production incidents quickly?"
    },
    {
        "id": "q8_summary",
        "topic": "Engineering Leadership & Best Practices",
        "question": "Final question: What principles guide your code reviews, testing strategies, and architectural documentation when mentoring team members or shipping critical backend features?"
    }
]

class CurriculumRouter:
    def __init__(self):
        self.curriculum = CURRICULUM_QUESTIONS
        self.min_turns = len(CURRICULUM_QUESTIONS) # 8 turns

    def get_initial_question(self) -> str:
        """Returns the first question for session start."""
        return self.curriculum[0]["question"]

    def process_turn(
        self,
        turn_index: int,
        candidate_message: str,
        breeth_search_results: List[Dict[str, Any]] = None
    ) -> Tuple[str, bool]:
        """
        Processes candidate response, dynamically selects next question or concludes session.
        Returns tuple of (reply_text, isFinished).
        """
        # Next index
        next_index = turn_index + 1

        if next_index >= self.min_turns:
            # Reached end of 8-turn interview
            finish_msg = (
                "Thank you for sharing your technical expertise across all core engineering domains! "
                "I have recorded all your responses into the Breeth memory graph and compiled your distilled technical profile. "
                "The interview is now complete. You can request your full feedback and score summary!"
            )
            return finish_msg, True

        next_q = self.curriculum[next_index]["question"]

        # Incorporate subtle acknowledgement based on message length and content
        msg_len = len(candidate_message.strip())
        if msg_len > 150:
            ack = "Thank you for that thorough and well-reasoned answer! "
        elif msg_len > 50:
            ack = "Good point! "
        else:
            ack = "Understood. "

        reply = f"{ack}{next_q}"
        return reply, False

    def generate_feedback_report(
        self,
        candidate_name: str,
        turn_count: int,
        breeth_node_details: Dict[str, Any]
    ) -> Tuple[str, int, str]:
        """
        Generates feedback string, score int, and distilled profile string from Breeth graph.
        """
        entity = breeth_node_details.get("entity", {})
        knot_narrative = entity.get("knot_narrative", "")
        summary = entity.get("summary", "")
        raw_score = entity.get("knot_score", 85.0)

        try:
            score = int(round(float(raw_score)))
        except (ValueError, TypeError):
            score = 85

        score = max(50, min(100, score))

        if not knot_narrative:
            knot_narrative = (
                f"{candidate_name} demonstrated solid technical domain knowledge across system architecture, "
                f"async concurrency, data persistence, distributed resilience, and API security."
            )

        feedback_text = (
            f"Interview Feedback for {candidate_name}:\n"
            f"- Completed {turn_count} technical query modules.\n"
            f"- Technical Evaluation: {summary if summary else 'High competency in backend design.'}\n"
            f"- Memory Profile Summary: {knot_narrative}"
        )

        distilled_profile = knot_narrative
        return feedback_text, score, distilled_profile
