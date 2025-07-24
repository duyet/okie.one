import { HttpResponse, http } from "msw"

export const handlers = [
  // Mock Supabase auth
  http.post("*/auth/v1/token*", () => {
    return HttpResponse.json({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: "test@example.com",
      },
    })
  }),

  // Mock chat API
  http.post("/api/chat", () => {
    return new HttpResponse("Mock chat response", {
      headers: {
        "Content-Type": "text/plain",
      },
    })
  }),

  // Mock models API
  http.get("/api/models", () => {
    return HttpResponse.json({
      models: [
        {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5 Turbo",
          provider: "OpenAI",
        },
      ],
    })
  }),
]
