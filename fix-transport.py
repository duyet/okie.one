#!/usr/bin/env python3

import re

# Fix multi-chat file
filepath = "/Users/duet/project/okie/okie.one/app/components/multi-chat/use-multi-chat.ts"
with open(filepath, 'r') as f:
    content = f.read()

# Replace transport with api
content = re.sub(
    r'transport: new DefaultChatTransport\({ api: "/api/chat" }\)',
    'api: "/api/chat"',
    content
)

# Also fix the sendMessage calls
content = re.sub(
    r'chatHook\.sendMessage\(message as UIMessage\)',
    'chatHook.append(message as UIMessage)',
    content
)

content = re.sub(
    r'chatHook\.sendMessage\({ text: \(message as any\)\.content \|\| "" }\)',
    'chatHook.append({ role: "user", content: (message as any).content || "" } as UIMessage)',
    content
)

# Fix the import
content = re.sub(
    r'import type { Message as UIMessage } from "@ai-sdk/ui-utils"',
    'import type { UIMessage, Message } from "@/lib/ai-sdk-types"',
    content
)

with open(filepath, 'w') as f:
    f.write(content)
print(f"Fixed {filepath}")

# Fix project-view file
filepath = "/Users/duet/project/okie/okie.one/app/p/[projectId]/project-view.tsx"
with open(filepath, 'r') as f:
    content = f.read()

# Replace transport with api
content = re.sub(
    r'transport: new DefaultChatTransport\({ api: API_ROUTE_CHAT }\)',
    'api: API_ROUTE_CHAT',
    content
)

# Fix import
content = re.sub(
    r'import { generateId } from "ai"',
    'import { generateId } from "ai"\nimport type { UIMessage, Message } from "@/lib/ai-sdk-types"',
    content
)

# Fix sendMessage to append
content = re.sub(
    r'sendMessage,\s*regenerate',
    'append, reload',
    content
)

with open(filepath, 'w') as f:
    f.write(content)
print(f"Fixed {filepath}")