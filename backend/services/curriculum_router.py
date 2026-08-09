import logging
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# ── Structured Technical Interview Curriculum ──────
# Each question has topic, question text, AND expected keywords for evaluation

CURRICULUM_QUESTIONS = [
    {
        "id": "q1_welcome",
        "topic": "System & Architecture Fundamentals",
        "question": "Welcome to your technical interview! Let's start with system fundamentals: How do you approach designing a high-throughput, low-latency API service from scratch?",
        "keywords": ["load balancer", "caching", "horizontal scaling", "microservice", "async", "queue", "api gateway", "latency", "throughput", "database", "redis", "nginx", "cdn", "rest", "grpc", "profiling", "bottleneck", "sharding", "replication", "indexing", "connection pool"],
        "key_concepts": ["scalability", "performance", "architecture", "design"]
    },
    {
        "id": "q2_async",
        "topic": "Async I/O & Concurrency",
        "question": "Great insights! When scaling backend services, how do you handle asynchronous processing vs thread-based concurrency, and what are your preferences for avoiding thread starvation or I/O bottlenecks?",
        "keywords": ["async", "await", "event loop", "thread", "coroutine", "non-blocking", "i/o bound", "cpu bound", "multiprocessing", "asyncio", "concurrency", "parallelism", "thread pool", "worker", "celery", "queue", "message broker", "kafka", "rabbitmq", "starvation", "deadlock", "race condition"],
        "key_concepts": ["asynchronous", "threading", "concurrency", "performance"]
    },
    {
        "id": "q3_databases",
        "topic": "Database Architecture & Tradeoffs",
        "question": "That makes sense. In terms of data storage, how do you evaluate tradeoffs between relational databases (e.g. PostgreSQL) vs NoSQL or distributed key-value stores for persistent state?",
        "keywords": ["sql", "nosql", "postgresql", "postgres", "mongodb", "redis", "dynamodb", "cassandra", "acid", "base", "consistency", "availability", "partition", "cap theorem", "normalization", "denormalization", "schema", "index", "query", "join", "sharding", "replication", "transaction", "relational"],
        "key_concepts": ["database", "tradeoff", "storage", "data model"]
    },
    {
        "id": "q4_caching",
        "topic": "Caching & Invalidation Strategies",
        "question": "Excellent point. How do you design caching layers (e.g. Redis or in-memory LRU caches) and handle cache invalidation, thundering herd problems, or cache stampedes under heavy load?",
        "keywords": ["redis", "memcached", "lru", "ttl", "cache invalidation", "write-through", "write-back", "write-behind", "cache aside", "read-through", "thundering herd", "stampede", "lock", "mutex", "probabilistic", "warm-up", "eviction", "cdn", "hit rate", "miss rate", "stale", "expiry"],
        "key_concepts": ["caching", "invalidation", "performance", "strategy"]
    },
    {
        "id": "q5_resilience",
        "topic": "Distributed Systems Resilience",
        "question": "Very detailed! In a microservices architecture, how do you implement circuit breakers, retry policies with exponential backoff, and graceful degradation during partial downstream failure?",
        "keywords": ["circuit breaker", "retry", "backoff", "exponential", "fallback", "timeout", "health check", "degradation", "graceful", "bulkhead", "rate limit", "idempotent", "saga", "outbox", "dead letter", "monitoring", "alert", "sla", "slo", "fault tolerance", "resilience", "hystrix"],
        "key_concepts": ["resilience", "fault tolerance", "microservices", "reliability"]
    },
    {
        "id": "q6_security",
        "topic": "Security & Authentication",
        "question": "Crucial considerations. How do you approach API security, rate limiting, token-based authentication (JWT/OAuth2), and secret management in production environments?",
        "keywords": ["jwt", "oauth", "oauth2", "token", "bearer", "api key", "rate limit", "throttle", "cors", "csrf", "xss", "injection", "sql injection", "encryption", "tls", "ssl", "https", "hashing", "bcrypt", "argon", "vault", "secret", "rbac", "authorization", "authentication", "2fa", "mfa"],
        "key_concepts": ["security", "authentication", "authorization", "protection"]
    },
    {
        "id": "q7_monitoring",
        "topic": "Observability & Error Handling",
        "question": "Good approach. How do you set up structured logging, distributed tracing (OpenTelemetry), and metrics collection to diagnose complex production incidents quickly?",
        "keywords": ["logging", "log", "trace", "tracing", "opentelemetry", "jaeger", "zipkin", "prometheus", "grafana", "datadog", "metrics", "alert", "dashboard", "structured", "json", "correlation id", "span", "elk", "kibana", "elasticsearch", "sentry", "error tracking", "apm", "latency", "p99", "percentile"],
        "key_concepts": ["observability", "monitoring", "debugging", "tracing"]
    },
    {
        "id": "q8_summary",
        "topic": "Engineering Leadership & Best Practices",
        "question": "Final question: What principles guide your code reviews, testing strategies, and architectural documentation when mentoring team members or shipping critical backend features?",
        "keywords": ["code review", "testing", "unit test", "integration test", "e2e", "ci/cd", "pipeline", "documentation", "adr", "architecture decision", "mentoring", "pair programming", "tdd", "bdd", "coverage", "linting", "static analysis", "clean code", "solid", "dry", "kiss", "refactor", "technical debt", "pr", "pull request"],
        "key_concepts": ["best practices", "testing", "leadership", "quality"]
    }
]

# ── Negative / Low-Effort Patterns ─────────────────
LOW_EFFORT_PATTERNS = [
    "i don't know", "i dont know", "idk", "no idea", "not sure",
    "i have no idea", "pass", "skip", "sorry", "nothing",
    "can't answer", "cant answer", "no clue", "dunno",
    "i am not sure", "i'm not sure", "maybe", "hmm",
    "ok", "okay", "fine", "yes", "no", "nah",
]


class CurriculumRouter:
    def __init__(self):
        self.curriculum = CURRICULUM_QUESTIONS
        self.min_turns = len(CURRICULUM_QUESTIONS)  # 8 turns
        self.turn_scores: List[Dict[str, Any]] = []

    def get_initial_question(self) -> str:
        """Returns the first question for session start."""
        return self.curriculum[0]["question"]

    def populate_turn_scores(self, historical_evaluations: List[Any]) -> None:
        """
        Dynamically reconstruct self.turn_scores from database history for the current session.
        Prevents stateless request loss and guarantees multi-user session isolation.
        """
        self.turn_scores = []
        for item in historical_evaluations:
            if isinstance(item, dict):
                score_val = item.get("score") or item.get("overall_score") or 0.0
                topic_val = item.get("topic") or "Technical Module"
                strengths = item.get("strengths") or []
                improvements = item.get("improvements") or item.get("weaknesses") or []
                feedback = item.get("feedback") or item.get("technical_feedback") or ""
                self.turn_scores.append({
                    "score": float(score_val),
                    "topic": topic_val,
                    "feedback": feedback,
                    "strengths": strengths if isinstance(strengths, list) else [],
                    "improvements": improvements if isinstance(improvements, list) else []
                })
            elif hasattr(item, "score") and item.score is not None:
                topic_val = self.curriculum[item.turn_index]["topic"] if getattr(item, "turn_index", 0) < len(self.curriculum) else "Technical Module"
                self.turn_scores.append({
                    "score": float(item.score),
                    "topic": topic_val,
                    "feedback": f"Turn {getattr(item, 'turn_index', 0)+1} evaluation",
                    "strengths": [],
                    "improvements": []
                })
            elif hasattr(item, "overall_score") and item.overall_score is not None:
                turn_idx = getattr(item, "turn_index", len(self.turn_scores))
                topic_val = self.curriculum[turn_idx]["topic"] if turn_idx < len(self.curriculum) else "Technical Module"
                self.turn_scores.append({
                    "score": float(item.overall_score),
                    "topic": topic_val,
                    "feedback": getattr(item, "technical_feedback", "") or getattr(item, "verdict", ""),
                    "strengths": [],
                    "improvements": []
                })

    def evaluate_answer(self, turn_index: int, candidate_message: str) -> Dict[str, Any]:
        """
        Evaluate a candidate's answer against the expected keywords and concepts
        for the current curriculum question. Returns score, feedback, strengths, improvements.
        """
        if turn_index >= len(self.curriculum):
            return {"score": 0.0, "feedback": "Invalid turn.", "strengths": [], "improvements": [], "matched_keywords": [], "topic": "Unknown"}

        question_data = self.curriculum[turn_index]
        answer_lower = candidate_message.lower().strip()
        word_count = len(candidate_message.split())

        # ── Check for low-effort / non-answers ─────
        is_low_effort = False
        for pattern in LOW_EFFORT_PATTERNS:
            if answer_lower == pattern or (len(answer_lower) < 30 and pattern in answer_lower):
                is_low_effort = True
                break

        if is_low_effort or word_count < 5:
            evaluation = {
                "score": float(max(5, min(15, word_count * 2))),
                "feedback": f"Your answer to '{question_data['topic']}' was insufficient. You did not demonstrate knowledge of the core concepts. A strong answer would discuss {', '.join(question_data['key_concepts'][:3])}.",
                "strengths": [],
                "improvements": [
                    f"Study fundamentals of {question_data['topic']}",
                    f"Provide concrete examples and technical terminology",
                    f"Aim for at least 3-4 sentences with specific tools, patterns, or frameworks"
                ],
                "matched_keywords": [],
                "topic": question_data["topic"]
            }
            self.turn_scores.append(evaluation)
            return evaluation

        # ── Keyword matching ───────────────────────
        keywords = question_data["keywords"]
        key_concepts = question_data["key_concepts"]

        matched_keywords = []
        for kw in keywords:
            if kw in answer_lower:
                matched_keywords.append(kw)

        matched_concepts = []
        for concept in key_concepts:
            if concept in answer_lower:
                matched_concepts.append(concept)

        # ── Score calculation ──────────────────────
        # Keyword coverage (0-40 points)
        kw_ratio = len(matched_keywords) / max(len(keywords), 1)
        kw_score = min(40.0, kw_ratio * 120)  # 33% coverage = 40 pts

        # Answer depth / length (0-25 points)
        if word_count >= 80:
            depth_score = 25.0
        elif word_count >= 50:
            depth_score = 20.0
        elif word_count >= 30:
            depth_score = 15.0
        elif word_count >= 15:
            depth_score = 10.0
        else:
            depth_score = 5.0

        # Concept alignment (0-20 points)
        concept_score = min(20.0, (len(matched_concepts) / max(len(key_concepts), 1)) * 20)

        # Structure bonus: sentences with technical depth (0-15 points)
        sentence_count = max(1, answer_lower.count('.') + answer_lower.count('!') + answer_lower.count('?'))
        has_examples = any(w in answer_lower for w in ["for example", "such as", "e.g.", "like", "instance", "use case", "scenario"])
        has_comparison = any(w in answer_lower for w in ["vs", "versus", "compared to", "unlike", "whereas", "however", "tradeoff", "trade-off"])

        structure_score = 0.0
        if sentence_count >= 3:
            structure_score += 5.0
        if has_examples:
            structure_score += 5.0
        if has_comparison:
            structure_score += 5.0

        total_score = round(min(100.0, max(10.0, kw_score + depth_score + concept_score + structure_score)), 1)

        # ── Generate dynamic feedback ──────────────
        if total_score >= 80:
            feedback = f"Excellent answer on {question_data['topic']}! You accurately covered key concepts including {', '.join(matched_keywords[:4])}. Your response shows deep practical knowledge."
            strengths = [
                f"Strong coverage of {question_data['topic']} fundamentals ({len(matched_keywords)} key terms identified)",
                f"Well-structured response with {word_count} words"
            ]
            if has_examples:
                strengths.append("Provided concrete examples to support claims")
            improvements = [
                f"Could further explore edge cases in {question_data['topic'].lower()}"
            ]
        elif total_score >= 55:
            feedback = f"Good answer on {question_data['topic']}. You covered some important areas like {', '.join(matched_keywords[:3]) if matched_keywords else 'general concepts'}. However, there are gaps in your coverage."
            strengths = [
                f"Demonstrated working knowledge of {question_data['topic']}",
            ]
            if matched_keywords:
                strengths.append(f"Correctly mentioned: {', '.join(matched_keywords[:3])}")
            missing_important = [kw for kw in keywords[:6] if kw not in matched_keywords][:3]
            improvements = [
                f"Discuss missing concepts: {', '.join(missing_important)}" if missing_important else "Add more technical depth",
                f"Provide specific tool/framework names and real-world scenarios"
            ]
        elif total_score >= 30:
            feedback = f"Your answer on {question_data['topic']} shows basic awareness but lacks technical depth. Key areas like {', '.join(keywords[:3])} were not adequately addressed."
            strengths = [
                "Attempted the question with some relevant context"
            ]
            missing_important = [kw for kw in keywords[:8] if kw not in matched_keywords][:4]
            improvements = [
                f"Study core concepts: {', '.join(missing_important)}",
                f"Expand your answer with specific examples and architectural patterns",
                f"Aim for at least 50+ words with concrete technical terminology"
            ]
        else:
            feedback = f"Your answer on {question_data['topic']} was too brief or off-topic. A strong answer would cover concepts like {', '.join(keywords[:4])} with practical examples."
            strengths = []
            improvements = [
                f"Review fundamentals of {question_data['topic']}",
                f"Include specific technologies, patterns, and tradeoffs",
                f"Provide a structured response of at least 3-4 sentences"
            ]

        evaluation = {
            "score": total_score,
            "feedback": feedback,
            "strengths": strengths,
            "improvements": improvements,
            "matched_keywords": matched_keywords,
            "topic": question_data["topic"]
        }
        self.turn_scores.append(evaluation)
        return evaluation

    def process_turn(
        self,
        turn_index: int,
        candidate_message: str,
        breeth_search_results: List[Dict[str, Any]] = None,
        historical_evaluations: Optional[List[Any]] = None
    ) -> Tuple[str, bool, Dict[str, Any]]:
        """
        Processes candidate response, evaluates it, then selects next question or concludes.
        Rehydrates self.turn_scores from historical_evaluations if passed.
        Returns tuple of (reply_text, isFinished, evaluation_dict).
        """
        if historical_evaluations is not None:
            self.populate_turn_scores(historical_evaluations)

        # Evaluate this turn's answer
        evaluation = self.evaluate_answer(turn_index, candidate_message)
        score = evaluation["score"]

        # Next index
        next_index = turn_index + 1

        if next_index >= self.min_turns:
            # Reached end of 8-turn interview — include final score hint
            avg_score = self.get_average_score()
            finish_msg = (
                f"Thank you for completing all 8 technical interview modules! "
                f"Your responses have been analyzed and scored across each domain. "
                f"Your estimated performance is {'strong' if avg_score >= 70 else 'moderate' if avg_score >= 45 else 'below expectations'}. "
                f"Click 'View Feedback & Score' to see your detailed evaluation, per-topic breakdown, and distilled cognitive profile!"
            )
            return finish_msg, True, evaluation

        next_q = self.curriculum[next_index]["question"]

        # Dynamic acknowledgement based on SCORE, not just length
        if score >= 75:
            ack = "Excellent answer! Your technical depth is impressive. "
        elif score >= 55:
            ack = "Good response with some solid points. "
        elif score >= 30:
            ack = "Thanks for your answer — there's room to go deeper on that topic. "
        else:
            ack = "That answer was quite brief. Let's move on. "

        reply = f"{ack}{next_q}"
        return reply, False, evaluation

    def get_average_score(self) -> float:
        """Calculate average score across all evaluated turns."""
        if not self.turn_scores:
            return 0.0
        return round(sum(t["score"] for t in self.turn_scores) / len(self.turn_scores), 1)

    def generate_feedback_report(
        self,
        candidate_name: str,
        turn_count: int,
        breeth_node_details: Dict[str, Any],
        historical_evaluations: Optional[List[Any]] = None
    ) -> Tuple[str, int, str]:
        """
        Generates feedback string, score int, and distilled profile from actual evaluation data.
        Hydrates self.turn_scores from historical_evaluations if passed.
        """
        if historical_evaluations is not None:
            self.populate_turn_scores(historical_evaluations)

        # Use actual accumulated scores if available
        if self.turn_scores:
            avg_score = self.get_average_score()
            score = max(0, min(100, int(round(avg_score))))

            # Build per-topic breakdown
            topic_lines = []
            for i, ts in enumerate(self.turn_scores):
                emoji = "🟢" if ts["score"] >= 70 else "🟡" if ts["score"] >= 40 else "🔴"
                topic_lines.append(f"  {emoji} {ts['topic']}: {ts['score']}/100")

            # Build strengths/improvements summary
            all_strengths = [s for ts in self.turn_scores for s in ts.get("strengths", [])]
            all_improvements = [imp for ts in self.turn_scores for imp in ts.get("improvements", [])]

            # Deduplicate
            unique_strengths = list(dict.fromkeys(all_strengths))[:5]
            unique_improvements = list(dict.fromkeys(all_improvements))[:5]

            feedback_text = (
                f"Interview Feedback for {candidate_name}:\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"Overall Score: {score}/100\n"
                f"Modules Completed: {turn_count}\n\n"
                f"📊 Per-Topic Breakdown:\n" +
                "\n".join(topic_lines) + "\n\n"
                f"✅ Strengths:\n" +
                "\n".join(f"  • {s}" for s in unique_strengths) + "\n\n" if unique_strengths else "" +
                f"⚠️ Areas for Improvement:\n" +
                "\n".join(f"  • {imp}" for imp in unique_improvements)
            )

            # Distilled profile
            if score >= 75:
                profile_level = "advanced"
                profile_desc = "exhibits strong command of backend systems, architectural patterns, and production best practices"
            elif score >= 50:
                profile_level = "intermediate"
                profile_desc = "shows working knowledge of core engineering concepts with room for deeper technical exploration"
            elif score >= 30:
                profile_level = "developing"
                profile_desc = "demonstrates basic awareness of technical topics but needs significant study in key engineering domains"
            else:
                profile_level = "beginner"
                profile_desc = "provided minimal technical content and needs foundational study across all evaluated domains"

            distilled_profile = (
                f"{candidate_name} ({profile_level} level) {profile_desc}. "
                f"Completed {turn_count} modules with an average score of {avg_score}/100."
            )

        else:
            # Fallback to Breeth graph data
            entity = breeth_node_details.get("entity", {})
            knot_narrative = entity.get("knot_narrative", "")
            summary = entity.get("summary", "")
            raw_score = entity.get("knot_score", 50.0)

            try:
                score = int(round(float(raw_score)))
            except (ValueError, TypeError):
                score = 50

            score = max(0, min(100, score))

            if not knot_narrative:
                knot_narrative = (
                    f"{candidate_name} completed the interview but detailed per-topic evaluation data is unavailable."
                )

            feedback_text = (
                f"Interview Feedback for {candidate_name}:\n"
                f"- Completed {turn_count} technical query modules.\n"
                f"- Technical Evaluation: {summary if summary else 'Evaluation pending.'}\n"
                f"- Memory Profile Summary: {knot_narrative}"
            )
            distilled_profile = knot_narrative

        return feedback_text, score, distilled_profile
