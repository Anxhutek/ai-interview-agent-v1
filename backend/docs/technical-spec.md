# AI Interview Agent API Specification

## Main Endpoint
`POST /api/interview`

## Requirements
- No login/authentication is required.
- Uses `sessionId` to maintain conversational state across multiple requests.
- The first request starts the interview and provides candidate information (e.g., candidate ID).
- Subsequent requests send candidate answers using the same `sessionId`.
- The AI must reply to each message conversationally, asking follow-up questions or new topics based on the curriculum.
- When the interview concludes, `done` becomes `true`.
- At the end, the AI provides structured feedback containing: `summary`, `strengths`, `gaps`, `next`.

## Request Payload
```json
{
  "sessionId": "uuid-string",
  "candidateId": "cand-123",
  "message": "Candidate's answer or initial message"
}
```

## Response Payload
```json
{
  "reply": "AI's next question or response",
  "done": false,
  "feedback": null
}
```
(When done=true, feedback contains the structured feedback object)
