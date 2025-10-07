import { generateText, type Message } from 'ai';
import type { IProviderSetting } from '~/types/model';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROVIDER_LIST } from '~/utils/constants';
import { extractCurrentContext, extractPropertiesFromMessage, simplifyBoltActions } from './utils';
import { createScopedLogger } from '~/utils/logger';
import { LLMManager } from '~/lib/modules/llm/manager';

const logger = createScopedLogger('create-summary');

const SYSTEM_PROMPT = `You are a software engineer. You are working on a project. you need to summarize the work till now and provide a summary of the chat till now.

Please only use the following format to generate the summary:
---
# Project Overview
- **Project**: {project_name} - {brief_description}
- **Current Phase**: {phase}
- **Tech Stack**: {languages}, {frameworks}, {key_dependencies}
- **Environment**: {critical_env_details}

# Conversation Context
- **Last Topic**: {main_discussion_point}
- **Key Decisions**: {important_decisions_made}
- **User Context**:
  - Technical Level: {expertise_level}
  - Preferences: {coding_style_preferences}
  - Communication: {preferred_explanation_style}

# Implementation Status
## Current State
- **Active Feature**: {feature_in_development}
- **Progress**: {what_works_and_what_doesn't}
- **Blockers**: {current_challenges}

## Code Evolution
- **Recent Changes**: {latest_modifications}
- **Working Patterns**: {successful_approaches}
- **Failed Approaches**: {attempted_solutions_that_failed}

# Requirements
- **Implemented**: {completed_features}
- **In Progress**: {current_focus}
- **Pending**: {upcoming_features}
- **Technical Constraints**: {critical_constraints}

# Critical Memory
- **Must Preserve**: {crucial_technical_context}
- **User Requirements**: {specific_user_needs}
- **Known Issues**: {documented_problems}

# Next Actions
- **Immediate**: {next_steps}
- **Open Questions**: {unresolved_issues}

---
Note: Keep the summary concise but comprehensive.`;

function sanitizeLogInput(input: string): string {
  return input.replace(/[\r\n\t]/g, ' ').substring(0, 100);
}

function extractTextContent(message: Message): string {
  return Array.isArray(message.content)
    ? (message.content.find((item) => item.type === 'text')?.text as string) || ''
    : message.content;
}

/**
 * Safely finds the index of a message by ID
 * @param messages - Array of messages to search
 * @param chatId - The sanitized ID to search for
 * @returns The index of the message or -1 if not found
 */
function findMessageIndex(messages: Message[], chatId: string): number {
  // Validate chatId to prevent injection attacks
  if (!chatId || typeof chatId !== 'string') {
    return -1;
  }

  // Sanitize chatId by removing any special characters that could be used for log injection
  const sanitizedChatId = chatId.replace(/[\r\n\t]/g, '');

  return messages.findIndex((msg) => msg.id === sanitizedChatId);
}

export async function createSummary(props: {
  messages: Message[];
  env?: any;
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, IProviderSetting>;
}) {
  try {
    const { messages, env: serverEnv, apiKeys, providerSettings } = props;
    let currentModel: string = DEFAULT_MODEL;
    let currentProvider = DEFAULT_PROVIDER.name;

    const processedMessages = messages.map((message) => {
      if (message.role === 'user') {
        const { model, provider, content } = extractPropertiesFromMessage(message);

        if (model) {
          currentModel = model;
        }

        if (provider) {
          currentProvider = provider;
        }

        return { ...message, content };
      } else if (message.role === 'assistant') {
        let content = message.content;

        content = simplifyBoltActions(content);
        content = content.replace(/<div class=\\"__boltThought__\\">.*?<\/div>/gs, '');
        content = content.replace(/<think>.*?<\/think>/gs, '');

        return { ...message, content };
      }

      return message;
    });

    const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;
    const staticModels = LLMManager.getInstance().getStaticModelListFromProvider(provider);
    let modelDetails = staticModels.find((m) => m.name === currentModel);

    if (!modelDetails) {
      const modelsList = [
        ...(provider.staticModels || []),
        ...(await LLMManager.getInstance().getModelListFromProvider(provider, {
          apiKeys,
          providerSettings,
          serverEnv: serverEnv as any,
        })),
      ];

      if (!modelsList.length) {
        throw new Error(`No models found for provider: ${sanitizeLogInput(provider.name)}`);
      }

      modelDetails = modelsList.find((m) => m.name === currentModel);

      if (!modelDetails) {
        logger.warn(
          `Model not found, using fallback: ${sanitizeLogInput(currentModel)} -> ${sanitizeLogInput(modelsList[0].name)}`,
        );
        modelDetails = modelsList[0];
      }
    }

    let slicedMessages = processedMessages;
    const { summary } = extractCurrentContext(processedMessages);
    let chatId: string | undefined;

    if (summary && summary.type === 'chatSummary') {
      chatId = summary.chatId;

      if (chatId) {
        const index = findMessageIndex(processedMessages, chatId);

        if (index !== -1) {
          slicedMessages = processedMessages.slice(index + 1);
        }
      }
    }

    logger.debug(`Processing ${slicedMessages.length} messages`);

    const modelInstance = provider.getModelInstance({
      model: modelDetails.name,
      serverEnv: serverEnv as any,
      apiKeys,
      providerSettings,
    });

    const resp = await generateText({
      model: modelInstance,
      system: SYSTEM_PROMPT,
      messages: slicedMessages.map((message) => ({
        role: message.role,
        content: extractTextContent(message),
      })),
    });

    return {
      summary: resp.text,
      chatId,
    };
  } catch (error) {
    logger.error('Failed to create summary:', error);
    throw new Error('Summary generation failed');
  }
}
