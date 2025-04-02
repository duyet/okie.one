import { checkUsage } from "@/app/chat/lib/api";
import { validateUserIdentity } from "@/app/chat/lib/server/api";

export async function POST(request: Request) {
  try {
    const { userId, title, model, isAuthenticated, systemPrompt } =
      await request.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
      });
    }

    console.log(
      "userId",
      userId,
      "title",
      title,
      "model",
      model,
      "isAuthenticated",
      isAuthenticated,
      "systemPrompt",
      systemPrompt
    );

    const supabase = await validateUserIdentity(userId, isAuthenticated);

    // Only check usage but don't increment
    await checkUsage(supabase, userId);

    console.log("yo");

    // Insert a new chat record in the chats table
    const { data: chatData, error: chatError } = await supabase
      .from("chats")
      .insert({
        user_id: userId,
        title: title || "New Chat",
        model: model,
        system_prompt: systemPrompt || "You are a helpful assistant.",
      })
      .select("*")
      .single();

    if (chatError || !chatData) {
      console.error("Error creating chat record:", chatError);
      return new Response(
        JSON.stringify({
          error: "Failed to create chat record",
          details: chatError?.message,
        }),
        { status: 500 }
      );
    }

    // Return the new chatId
    return new Response(JSON.stringify({ chatId: chatData.id }), {
      status: 200,
    });
  } catch (err: any) {
    console.error("Error in create-chat endpoint:", err);

    if (err.code === "DAILY_LIMIT_REACHED") {
      return new Response(
        JSON.stringify({ error: err.message, code: err.code }),
        { status: 403 }
      );
    }

    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
