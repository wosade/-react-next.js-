import pool from "../lib/db.js";
import { generateId, nowISO } from "../lib/utils.js";
import type { StepRecord, Step } from "../types/index.js";

interface StepRow {
  id: string;
  message_id: string;
  step_order: number;
  tool_name: string;
  tool_input: string | null;
  tool_output: string | null;
  status: string;
  created_at: string;
}

function toStep(row: StepRow): Step {
  return {
    id: row.id,
    messageId: row.message_id,
    stepOrder: row.step_order,
    toolName: row.tool_name,
    toolInput: row.tool_input
      ? (typeof row.tool_input === 'string' ? JSON.parse(row.tool_input) : row.tool_input)
      : {},
    toolOutput: row.tool_output ?? "",
    status: row.status as Step["status"],
    createdAt: row.created_at,
  };
}

export async function batchInsertSteps(
  messageId: string,
  steps: StepRecord[],
): Promise<Step[]> {
  if (steps.length === 0) return [];

  const now = nowISO();
  const results: Step[] = [];

  for (let i = 0; i < steps.length; i++) {
    const id = generateId();
    const step = steps[i];

    await pool.execute(
      `INSERT INTO steps (id, message_id, step_order, tool_name, tool_input, tool_output, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        messageId,
        i,
        step.toolName,
        JSON.stringify(step.toolInput),
        step.toolOutput,
        step.status,
        now,
      ],
    );

    results.push({ id, messageId, stepOrder: i, ...step, createdAt: now });
  }

  return results;
}

export async function findStepsByMessageId(messageId: string): Promise<Step[]> {
  const [rows] = await pool.execute(
    "SELECT * FROM steps WHERE message_id = ? ORDER BY step_order ASC",
    [messageId],
  );
  return (rows as StepRow[]).map(toStep);
}

export async function findStepsByMessageIds(
  messageIds: string[],
): Promise<Map<string, Step[]>> {
  if (messageIds.length === 0) return new Map();

  const placeholders = messageIds.map(() => "?").join(", ");
  const [rows] = await pool.execute(
    `SELECT * FROM steps WHERE message_id IN (${placeholders}) ORDER BY step_order ASC`,
    messageIds,
  );

  const map = new Map<string, Step[]>();
  for (const row of rows as StepRow[]) {
    const step = toStep(row);
    const list = map.get(step.messageId);
    list ? list.push(step) : map.set(step.messageId, [step]);
  }
  return map;
}
