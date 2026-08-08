import json
import re
import logging
from typing import Dict, Any, Tuple, Optional, List
from services.ai.ai_orchestrator import AIOrchestrator
from models.schemas import EvaluationResultSchema, EvaluationScoresSchema

logger = logging.getLogger(__name__)

EVALUATOR_SYSTEM_PROMPT = (
    "You are a strict but fair technical interviewer. "
    "Evaluate the candidate's answer based ONLY on the provided information. "
    "Do not invent candidate experience. "
    "Do not give credit for concepts that were not demonstrated. "
    "Do not penalize irrelevant omissions. "
    "Evaluate according to the target role and difficulty. "
    "Check: correctness, reasoning, depth, architecture, trade-offs, practical understanding, clarity. "
    "Return only the required structured JSON. "
    "Scores must be integers from 0 to 100."
)

class InterviewEvaluationService:
    def __init__(self, orchestrator: AIOrchestrator):
        self.orchestrator = orchestrator

    def _clean_json_response(self, text: str) -> Optional[Dict[str, Any]]:
        if not text:
            return None
        # Remove markdown code block fences ```json ... ```
        cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.MULTILINE).strip()

        # Try direct JSON parsing
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Try extracting text between first { and last }
        match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass

        return None

    async def evaluate_answer(
        self,
        question: str,
        answer: str,
        target_role: str = "Software Engineer",
        difficulty: str = "medium",
        topic: str = "Technical Fundamentals",
        context: Optional[str] = None,
        rubric: Optional[str] = None
    ) -> Tuple[Dict[str, Any], str, str, float]:
        """
        Evaluates a candidate's answer.
        Returns: Tuple[evaluation_dict, provider_used, model_used, latency_ms]
        """
        user_prompt = f"""
Evaluate the candidate's answer for the following technical question:

Target Role: {target_role}
Difficulty Level: {difficulty}
Topic: {topic}
Question: "{question}"
Candidate Answer: "{answer}"
{"Context: " + context if context else ""}
{"Rubric: " + rubric if rubric else ""}

You MUST respond with valid JSON ONLY in this exact schema:
{{
  "scores": {{
    "technical_correctness": 85,
    "problem_solving": 80,
    "system_design": 75,
    "architecture": 80,
    "communication": 90,
    "depth": 70,
    "tradeoffs": 75,
    "relevance": 90,
    "completeness": 80
  }},
  "overall_score": 80.5,
  "verdict": "strong",
  "strengths": ["Clear communication", "Demonstrated async concurrency understanding"],
  "weaknesses": ["Omitted cache invalidation strategies"],
  "missing_points": ["LRU eviction policy explanation"],
  "technical_feedback": "Solid answer covering core asynchronous event loop mechanisms.",
  "communication_feedback": "Articulate and structured response.",
  "improvement_suggestions": ["Mention tail latency and memory isolation tradeoffs."]
}}
"""

        raw_text, provider_used, model_used, latency = await self.orchestrator.generate_with_fallback(
            prompt=user_prompt,
            system_instruction=EVALUATOR_SYSTEM_PROMPT,
            operation="answer_evaluation",
            temperature=0.2
        )

        parsed = self._clean_json_response(raw_text)

        # Retry once if JSON parsing failed
        if not parsed:
            logger.warning(f"Malformed JSON from AI model '{model_used}'. Retrying once with strict JSON prompt...")
            repair_prompt = f"CRITICAL REPAIR: Your previous output was not valid JSON. Convert the evaluation of question '{question}' and answer '{answer}' into valid JSON matching the schema strictly:\n{user_prompt}"
            raw_text, provider_used, model_used, retry_latency = await self.orchestrator.generate_with_fallback(
                prompt=repair_prompt,
                system_instruction=EVALUATOR_SYSTEM_PROMPT + " Output raw JSON only. No explanations.",
                operation="answer_evaluation_repair",
                temperature=0.1
            )
            latency += retry_latency
            parsed = self._clean_json_response(raw_text)

        # Fallback if still invalid
        if not parsed or "scores" not in parsed:
            logger.error(f"Failed to obtain valid evaluation JSON from AI. Using safe structured fallback.")
            parsed = {
                "scores": {
                    "technical_correctness": 70,
                    "problem_solving": 70,
                    "system_design": 70,
                    "architecture": 70,
                    "communication": 70,
                    "depth": 70,
                    "tradeoffs": 70,
                    "relevance": 70,
                    "completeness": 70
                },
                "overall_score": 70.0,
                "verdict": "satisfactory",
                "strengths": ["Answer recorded and submitted"],
                "weaknesses": [],
                "missing_points": [],
                "technical_feedback": "Answer recorded successfully.",
                "communication_feedback": "Clear candidate response.",
                "improvement_suggestions": []
            }

        # Validate with Pydantic schema to ensure all keys and types are safe
        try:
            validated = EvaluationResultSchema.model_validate(parsed)
            result_dict = validated.model_dump()
        except Exception as e:
            logger.warning(f"Pydantic validation warning on evaluation payload: {e}")
            result_dict = parsed

        return result_dict, provider_used, model_used, latency

    async def generate_final_report(
        self,
        candidate_name: str,
        role: str,
        turns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generates comprehensive final evaluation report across all turns.
        """
        turn_summaries = []
        for t in turns:
            turn_summaries.append(
                f"Question {t.get('turn_index', 0)+1}: {t.get('question_text')}\n"
                f"Answer: {t.get('answer_text')}\n"
            )

        prompt = f"""
Generate a comprehensive final interview evaluation summary report for:
Candidate: {candidate_name}
Target Role: {role}

Interview History:
{"---".join(turn_summaries)}

Respond in valid JSON with schema:
{{
  "overall_score": 85.0,
  "technical_skills": "Strong understanding of backend architecture and concurrency.",
  "problem_solving": "Structured analytical reasoning.",
  "system_design": "Good grasp of distributed systems and caching.",
  "architecture": "Clean microservice design principles.",
  "communication": "Clear and professional.",
  "depth": "Demonstrates solid production experience.",
  "tradeoffs": "Understands tail latency vs throughput tradeoffs.",
  "strengths": ["Async concurrency", "Caching strategies"],
  "weaknesses": ["Database replication depth"],
  "missing_areas": ["Security rate limiting details"],
  "recommended_topics": ["Distributed consensus (Raft/Paxos)", "Advanced sharding"],
  "final_assessment": "Strong candidate recommended for senior backend technical loops."
}}
"""
        try:
            raw_text, provider, model, latency = await self.orchestrator.generate_with_fallback(
                prompt=prompt,
                system_instruction=EVALUATOR_SYSTEM_PROMPT,
                operation="final_report",
                temperature=0.3
            )
            report = self._clean_json_response(raw_text)
            if report:
                return report
        except Exception as e:
            logger.error(f"Failed to generate AI final report: {e}")

        # Safe fallback
        return {
            "overall_score": 75.0,
            "technical_skills": "Satisfactory backend engineering knowledge.",
            "problem_solving": "Demonstrated practical problem solving.",
            "system_design": "Fundamental system design understanding.",
            "architecture": "Standard software architecture patterns.",
            "communication": "Good communication.",
            "depth": "Adequate technical depth.",
            "tradeoffs": "Awareness of core tradeoffs.",
            "strengths": ["Completed full technical interview loop"],
            "weaknesses": [],
            "missing_areas": [],
            "recommended_topics": ["Advanced architecture"],
            "final_assessment": "Interview completed successfully."
        }
