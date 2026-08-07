import json
from google import genai
from google.genai import types
import logging
import re

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = None
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        self.model_name = 'gemini-2.0-flash'

    def _extract_json(self, text: str) -> str:
        """Extract JSON from markdown code blocks or raw text."""
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
        if match:
            return match.group(1)
        # Try to find raw JSON array or object
        arr_match = re.search(r'(\[.*\])', text, re.DOTALL)
        if arr_match:
            return arr_match.group(1)
        obj_match = re.search(r'(\{.*\})', text, re.DOTALL)
        if obj_match:
            return obj_match.group(1)
        return text

    async def generate_questions(self, role: str, domain: str, difficulty: str, count: int) -> list[dict]:
        if not self.client:
            return self._mock_questions(count, difficulty)
        
        try:
            prompt = (
                f"You are an expert technical interviewer. Generate {count} interview questions "
                f"for a {role} position in the {domain} domain at {difficulty} difficulty.\n"
                f"Respond ONLY with a JSON array where each object has these exact keys:\n"
                f"- 'text' (the question itself)\n"
                f"- 'category' (e.g. System Design, Data Structures, Domain Knowledge, Behavioral)\n"
                f"- 'difficulty' (should be '{difficulty}')\n"
                f"Do NOT include any explanation, markdown headers, or extra text. ONLY the JSON array."
            )
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    response_mime_type="application/json",
                )
            )
            json_str = self._extract_json(response.text)
            questions = json.loads(json_str)
            if isinstance(questions, list):
                return questions[:count]
            return self._mock_questions(count, difficulty)
        except Exception as e:
            logger.error(f"Error generating questions via Gemini: {e}")
            return self._mock_questions(count, difficulty)

    async def evaluate_answer(self, question_text: str, answer_text: str, role: str, domain: str) -> dict:
        if not self.client:
            return self._mock_evaluation()

        try:
            prompt = (
                f"You are an expert technical interviewer evaluating a candidate's answer.\n"
                f"Role: {role}, Domain: {domain}\n"
                f"Question: {question_text}\n"
                f"Candidate Answer: {answer_text}\n\n"
                f"Evaluate the answer and respond ONLY with a JSON object containing:\n"
                f"- 'score' (float from 0.0 to 100.0)\n"
                f"- 'feedback' (string, a constructive paragraph)\n"
                f"- 'strengths' (array of 2-3 strings, what they did well)\n"
                f"- 'improvements' (array of 2-3 strings, areas to improve)\n"
                f"Do NOT include any explanation outside the JSON."
            )
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    response_mime_type="application/json",
                )
            )
            json_str = self._extract_json(response.text)
            evaluation = json.loads(json_str)
            # Validate required keys
            if not all(k in evaluation for k in ['score', 'feedback', 'strengths', 'improvements']):
                return self._mock_evaluation()
            return evaluation
        except Exception as e:
            logger.error(f"Error evaluating answer via Gemini: {e}")
            return self._mock_evaluation()

    def _mock_questions(self, count: int, difficulty: str) -> list[dict]:
        mock_data = {
            "easy": [
                {"text": "What is a REST API and how does it differ from SOAP?", "category": "Web Development", "difficulty": "easy"},
                {"text": "Explain the difference between SQL and NoSQL databases.", "category": "Databases", "difficulty": "easy"},
                {"text": "What is version control and why is it important?", "category": "DevOps", "difficulty": "easy"},
                {"text": "Describe the HTTP request-response cycle.", "category": "Networking", "difficulty": "easy"},
                {"text": "What are the main principles of Object-Oriented Programming?", "category": "Programming", "difficulty": "easy"},
            ],
            "medium": [
                {"text": "Design a URL shortening service like bit.ly. What are the key components?", "category": "System Design", "difficulty": "medium"},
                {"text": "Explain the CAP theorem and its implications for distributed systems.", "category": "Distributed Systems", "difficulty": "medium"},
                {"text": "How would you optimize a slow database query? Walk through your approach.", "category": "Databases", "difficulty": "medium"},
                {"text": "Describe the differences between authentication and authorization. Give examples.", "category": "Security", "difficulty": "medium"},
                {"text": "What is the difference between horizontal and vertical scaling? When would you use each?", "category": "Architecture", "difficulty": "medium"},
            ],
            "hard": [
                {"text": "Design a real-time collaborative document editing system like Google Docs.", "category": "System Design", "difficulty": "hard"},
                {"text": "How would you design a distributed rate limiter that works across multiple servers?", "category": "Distributed Systems", "difficulty": "hard"},
                {"text": "Explain eventual consistency and how you would handle conflict resolution in a CRDT-based system.", "category": "Distributed Systems", "difficulty": "hard"},
                {"text": "Design a notification system that can handle millions of users with different delivery preferences.", "category": "System Design", "difficulty": "hard"},
                {"text": "How would you implement a circuit breaker pattern in a microservices architecture?", "category": "Architecture", "difficulty": "hard"},
            ]
        }
        questions = mock_data.get(difficulty, mock_data["medium"])
        return questions[:count]

    def _mock_evaluation(self) -> dict:
        return {
            "score": 72.0,
            "feedback": "Your answer demonstrates understanding of the core concepts. Consider providing more specific examples and discussing edge cases to strengthen your response.",
            "strengths": [
                "Good understanding of fundamental concepts",
                "Clear and structured response"
            ],
            "improvements": [
                "Include concrete real-world examples",
                "Discuss potential trade-offs and limitations"
            ]
        }
