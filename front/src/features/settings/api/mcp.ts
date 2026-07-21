import request from "@/api/request";

export interface MCPServer {
  id: string;
  name: string;
  transport: "stdio" | "sse";
  command?: string;
  args?: string[];
  url?: string;
  enabled: boolean;
  connected?: boolean;
  toolCount?: number;
  tools?: Array<{ name: string; description: string }>;
}

export interface RecommendedMCP {
  name: string;
  description: string;
  transport: "stdio";
  command: string;
  args: string[];
  icon: string;
  note?: string;
}

export let RECOMMENDED_MCP: RecommendedMCP[] = [];

export async function listMCPServers(): Promise<MCPServer[]> {
  const res = await request.get<{ data: MCPServer[] }>("/mcp/servers");
  return res.data.data;
}

export async function createMCPServer(data: {
  name: string;
  transport: "stdio" | "sse";
  command?: string;
  args?: string[];
  url?: string;
}): Promise<MCPServer> {
  const res = await request.post<{ data: MCPServer }>("/mcp/servers", data);
  return res.data.data;
}

export async function updateMCPServer(
  id: string,
  data: Partial<MCPServer>,
): Promise<MCPServer> {
  const res = await request.patch<{ data: MCPServer }>(
    `/mcp/servers/${id}`,
    data,
  );
  return res.data.data;
}

export async function deleteMCPServer(id: string): Promise<void> {
  await request.delete(`/mcp/servers/${id}`);
}

export async function connectMCPServer(
  id: string,
): Promise<{ connected: boolean; toolCount: number; tools: Array<{ name: string; description: string }> }> {
  const res = await request.post<{ data: any }>(`/mcp/servers/${id}/connect`);
  return res.data.data;
}

export async function disconnectMCPServer(id: string): Promise<void> {
  await request.post(`/mcp/servers/${id}/disconnect`);
}

export async function getMCPServerTools(
  id: string,
): Promise<Array<{ name: string; description: string }>> {
  const res = await request.get<{ data: any }>(`/mcp/servers/${id}/tools`);
  return res.data.data;
}

export async function seedRecommended(): Promise<{ created: number; alreadyExisted: number }> {
  const res = await request.post<{ data: { created: number; alreadyExisted: number } }>("/mcp/seed");
  return res.data.data;
}

export async function fetchRecommended(): Promise<RecommendedMCP[]> {
  const res = await request.get<{ data: RecommendedMCP[] }>("/mcp/recommended");
  return res.data.data;
}
