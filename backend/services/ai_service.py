import json
import google.generativeai as genai
import logging
import re

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model_name = 'gemini-2.0-flash'

    def _extract_json(self, text: str) -> str:
        match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if match:
            return match.group(1)
        return text

    async def generate_questions(self, role: str, domain: str, difficulty: str, count: int) -> list[dict]:
        if not self.api_key:
            return self._mock_questions(count, difficulty)
        
        try:
            model = genai.GenerativeModel(self.model_name)
            prompt = (
                f"You are an expert technical interviewer. Generate {count} interview questions "
                f"for a {role} position in the {domain} domain at {difficulty} difficulty.\n"
                f"Respond ONLY with a JSON array where each object has these exact keys:\n"
                f"- 'text' (the question itself)\n"
                f"- 'category' (e.g. System Design, Data Structures, Domain Knowledge)\n"
                f"- 'difficulty' (should be {difficulty})\n"
            )
            response = await model.generate_content_async(prompt)
            json_str = self._extract_json(response.text)
            questions = json.loads(json_str)
            return questions
        except Exception as e:
            logger.error(f"Error generating questions via AI: {e}")
            return self._mock_questions(count, difficulty)

    async def evaluate_answer(self, question_text: str, answer_text: str, role: str, domain: str) -> dict:
        if not self.api_key:
            return self._mock_evaluation()

        try:
            model = genai.GenerativeModel(self.model_name)
            prompt = (
                f"You are an expert technical interviewer. Evaluate the candidate's answer to the following question.\n"
                f"Role: {role}, Domain: {domain}\n"
                f"Question: {question_text}\n"
                f"Candidate Answer: {answer_text}\n\n"
                f"Respond ONLY with a JSON object containing:\n"
                f"- 'score' (float from 0.0 to 100.0)\n"
                f"- 'feedback' (string, a short paragraph of constructive feedback)\n"
                f"- 'strengths' (array of strings, what they did well)\n"
                f"- 'improvements' (array of strings, what they could improve)\n"
            )
            response = await model.generate_content_async(prompt)
            json_str = self._extract_json(response.text)
            evaluation = json.loads(json_str)
            return evaluation
        except Exception as e:
            logger.error(f"Error evaluating answer via AI: {e}")
            return self._mock_evaluation()

    def _mock_questions(self, count: int, difficulty: str) -> list[dict]:
        return [
            {
                "text": f"Mock Question {i+1} for difficulty {difficulty}",
                "category": "General",
                "difficulty": difficulty
            } for i in range(count)
        ]

    def _mock_evaluation(self) -> dict:
        return {
            "score": 75.0,
            "feedback": "This is mock feedback because the AI generation failed or is missing an API key.",
            "strengths": ["Mock strength 1", "Mock strength 2"],
            "improvements": ["Mock improvement 1", "Mock improvement 2"]
        }
