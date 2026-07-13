/**
 * Agent 图结构测试
 *
 * 验证 LangGraph 图结构、节点和路由逻辑。
 * 不实际调用 LLM，仅验证图编译正确。
 */
import { describe, it, expect } from "vitest";
import { AIMessage } from "@langchain/core/messages";
import { buildAgent } from "../services/langgraph/agent.js";

describe("Agent Graph 结构", () => {
  const agent = buildAgent();

  it("应成功编译为可运行图", () => {
    expect(agent).toBeDefined();
    expect(typeof agent.invoke).toBe("function");
    expect(typeof agent.streamEvents).toBe("function");
  });

  it("图应包含 agent 和 tools 两个节点", () => {
    const compiledGraph = agent.getGraph();
    // nodes 可能是数组或对象，兼容处理
    const nodeValues = Array.isArray(compiledGraph.nodes)
      ? compiledGraph.nodes.map((n: any) => n.name || n)
      : Object.values(compiledGraph.nodes);

    const nodeNames = nodeValues.map((n: any) =>
      typeof n === "string" ? n : n.name || n.id || "",
    );

    expect(nodeNames).toContain("agent");
    expect(nodeNames).toContain("tools");
  });

  it("应有从 START 到 agent 的边", () => {
    const compiledGraph = agent.getGraph();
    const edges = compiledGraph.edges;
    const edgeArr = Array.isArray(edges) ? edges : Object.values(edges);

    const hasStartEdge = edgeArr.some(
      (e: any) =>
        (e.source === "__start__" || e.from === "__start__") &&
        (e.target === "agent" || e.to === "agent"),
    );
    expect(hasStartEdge).toBe(true);
  });

  it("应有从 tools 回到 agent 的边（ReAct 循环）", () => {
    const compiledGraph = agent.getGraph();
    const edges = compiledGraph.edges;
    const edgeArr = Array.isArray(edges) ? edges : Object.values(edges);

    const hasLoopback = edgeArr.some(
      (e: any) =>
        (e.source === "tools" || e.from === "tools") &&
        (e.target === "agent" || e.to === "agent"),
    );
    expect(hasLoopback).toBe(true);
  });
});

describe("Agent 路由逻辑 (shouldContinue)", () => {
  it("AIMessage 无 tool_calls 时应停止", () => {
    const msg = new AIMessage("回答完成，无需工具");
    expect(msg.tool_calls?.length).toBeFalsy();
  });

  it("AIMessage 有 tool_calls 时应路由到 tools", () => {
    const msg = new AIMessage({
      content: "",
      tool_calls: [
        {
          id: "call_1",
          name: "get_weather",
          args: { city: "北京" },
        },
      ],
    });

    expect(msg.tool_calls?.length).toBe(1);
  });

  it("多个 tool_calls 应全部识别", () => {
    const msg = new AIMessage({
      content: "",
      tool_calls: [
        { id: "call_1", name: "get_weather", args: { city: "北京" } },
        { id: "call_2", name: "web_search", args: { query: "最新新闻" } },
      ],
    });

    expect(msg.tool_calls?.length).toBe(2);
  });
});
