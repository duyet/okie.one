import { saveFinalAssistantMessage } from "@/app/api/chat/db";
import type {
  ChatApiParams,
  LogUserMessageParams,
  StoreAssistantMessageParams,
  SupabaseClientType,
} from "@/app/types/api.types"
import {
  FREE_MODELS_IDS,
  MESSAGE_MAX_LENGTH,
  NON_AUTH_ALLOWED_MODELS,
} from "@/lib/config"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { sanitizeUserInput } from "@/lib/sanitize"
import { validateUserIdentity } from "@/lib/server/api"
import { checkUsageByModel, incrementUsage } from "@/lib/usage"
import { getUserKey, type ProviderWithoutOllama } from "@/lib/user-keys"

export async function validateAndTrackUsage({
  userId,
  model,
  isAuthenticated,
}: ChatApiParams): Promise<SupabaseClientType | null> {
  const supabase = await validateUserIdentity(userId, isAuthenticated);
  if (!supabase) return null;

  // SECURITY: Verify authentication status from database - DO NOT trust client value
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("anonymous")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    console.error("Failed to verify user authentication status:", userError);
    throw new Error(`Failed to verify user status: ${userError.message}`);
  }

  // Use database value as source of truth (anonymous = false means authenticated)
  const isActuallyAuthenticated = userData ? !userData.anonymous : false;

  // Check if user is authenticated using VERIFIED status
  if (!isActuallyAuthenticated) {
    // For unauthenticated users, only allow specific models
    if (!NON_AUTH_ALLOWED_MODELS.includes(model)) {
      throw new Error(
        "This model requires authentication. Please sign in to access more models.",
      );
    }
  } else {
    // For authenticated users, check API key requirements
    const provider = getProviderForModel(model);

    if (provider !== "ollama") {
      const userApiKey = await getUserKey(
        userId,
        provider as ProviderWithoutOllama,
      );

      // If no API key and model is not in free list, deny access
      if (!userApiKey && !FREE_MODELS_IDS.includes(model)) {
        throw new Error(
          `This model requires an API key for ${provider}. Please add your API key in settings or use a free model.`,
        );
      }
    }
  }

  // Check usage limits for the model using VERIFIED status
  await checkUsageByModel(supabase, userId, model, isActuallyAuthenticated);

  return supabase;
}

export async function incrementMessageCount({
  supabase,
  userId,
}: {
  supabase: SupabaseClientType;
  userId: string;
}): Promise<void> {
  if (!supabase) return;

  try {
    await incrementUsage(supabase, userId);
  } catch (err) {
    console.error("Failed to increment message count:", err);
    // Don't throw error as this shouldn't block the chat
  }
}

export async function logUserMessage({
  supabase,
  userId,
  chatId,
  content,
  attachments,
  model,
  isAuthenticated,
  message_group_id,
}: LogUserMessageParams): Promise<void> {
  if (!supabase) return;
  console.log(`Model: ${model}, isAuthenticated: ${isAuthenticated}`);

  // Security: Validate input BEFORE database insertion
  // 1. Type validation - ensure content is string
  if (typeof content !== "string") {
    console.error("Invalid message content: content must be a string");
    throw new Error("Message content must be a string");
  }

  // 2. Sanitize content first (defense in depth against XSS/SQL injection)
  const sanitizedContent = sanitizeUserInput(content);

  // 3. Length validation - prevent oversized inputs
  if (sanitizedContent.length > MESSAGE_MAX_LENGTH) {
    console.error(
      `Message content exceeds maximum length: ${sanitizedContent.length} > ${MESSAGE_MAX_LENGTH}`,
    );
    throw new Error(
      `Message content exceeds maximum length of ${MESSAGE_MAX_LENGTH} characters`,
    );
  }

  // 4. Empty content validation - disallow empty messages
  if (sanitizedContent.trim().length === 0) {
    console.error("Invalid message content: message cannot be empty");
    throw new Error("Message content cannot be empty");
  }

  // Insert sanitized and validated content into database
  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    role: "user",
    content: sanitizedContent,
    experimental_attachments: attachments,
    user_id: userId,
    message_group_id,
  });

  if (error) {
    console.error("Error saving user message:", error);

    // If it's a foreign key constraint error, it means the chat doesn't exist
    if (error.code === "23503") {
      console.log(
        "Chat doesn't exist in database (likely a guest user without proper anonymous auth). Skipping user message save.",
      );
    }
  }
}

export async function storeAssistantMessage({
  supabase,
  chatId,
  messages,
  message_group_id,
  model,
  artifactParts,
}: StoreAssistantMessageParams): Promise<string | null> {
  if (!supabase) return null;
  try {
    const messageId = await saveFinalAssistantMessage(
      supabase,
      chatId,
      messages,
      message_group_id,
      model,
      artifactParts,
    );
    return messageId;
  } catch (err) {
    console.error("Failed to save assistant messages:", err);
    return null;
  }
}
