import request from "@/api/request";

export interface Skill {
  name: string;
  description: string;
  icon: string;
  category: string;
  allowedTools: string[];
}

export interface SkillsData {
  skills: Skill[];
  grouped: Record<string, Skill[]>;
}

export async function fetchSkills(): Promise<SkillsData> {
  const res = await request.get<{ data: SkillsData }>("/skills");
  return res.data.data;
}
