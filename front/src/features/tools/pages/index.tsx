import { Wrench, CloudSun, Search, Database, Globe } from 'lucide-react';
import styles from './index.module.less';

interface ToolDef {
  name: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
  params: { name: string; type: string; required: boolean; desc: string }[];
}

const ACTIVE_TOOLS: ToolDef[] = [
  {
    name: 'get_weather',
    label: '天气查询',
    icon: <CloudSun size={18} />,
    desc: '查询全球城市实时天气，温度、湿度、风速、天气状况。数据来源 Open-Meteo。',
    params: [{ name: 'city', type: 'string', required: true, desc: '城市名称，如"北京"' }],
  },
  {
    name: 'search_knowledge',
    label: '知识库检索',
    icon: <Search size={18} />,
    desc: '搜索已上传文档的内容，基于向量相似度匹配。用于公司制度、操作手册、产品文档等内部知识。',
    params: [
      { name: 'query', type: 'string', required: true, desc: '搜索关键词或自然语言问题' },
      { name: 'topK', type: 'number', required: false, desc: '返回片段数，默认 5，最大 10' },
    ],
  },
  {
    name: 'query_database',
    label: '数据库查询',
    icon: <Database size={18} />,
    desc: '对业务数据库执行只读 SQL 查询，用于统计、分析、报表。仅允许 SELECT。',
    params: [{ name: 'sql', type: 'string', required: true, desc: 'SELECT 查询语句' }],
  },
  {
    name: 'web_search',
    label: '网页搜索',
    icon: <Globe size={18} />,
    desc: '搜索互联网获取最新资讯、百科知识、行业动态。默认使用 DuckDuckGo，也可配置 SearXNG。',
    params: [
      { name: 'query', type: 'string', required: true, desc: '搜索关键词，支持中英文' },
      { name: 'count', type: 'number', required: false, desc: '返回条数，默认 5，最大 8' },
    ],
  },
];

const PLANNED_TOOLS: ToolDef[] = [
  {
    name: 'code_executor',
    label: '代码执行',
    icon: <Wrench size={18} />,
    desc: '在隔离沙箱中执行 Python / JS 代码，用于数据分析、计算。计划接入 Docker executor。',
    params: [
      { name: 'language', type: 'string', required: true, desc: 'python | javascript' },
      { name: 'code', type: 'string', required: true, desc: '代码内容' },
    ],
  },
  {
    name: 'email_sender',
    label: '邮件发送',
    icon: <Database size={18} />,
    desc: '代发邮件通知、报告。计划接入 SMTP。',
    params: [
      { name: 'to', type: 'string', required: true, desc: '收件人地址' },
      { name: 'subject', type: 'string', required: true, desc: '邮件主题' },
      { name: 'body', type: 'string', required: true, desc: '邮件正文' },
    ],
  },
];

function ToolCard({ tool, disabled }: { tool: ToolDef; disabled?: boolean }) {
  return (
    <div className={`${styles.card} ${disabled ? styles.cardOff : ''}`}>
      <div className={styles.cardHead}>
        <span className={styles.icon}>{tool.icon}</span>
        <div className={styles.cardInfo}>
          <span className={styles.cardName}>{tool.label}</span>
          <span className={styles.cardId}>{tool.name}</span>
        </div>
        <span className={`${styles.status} ${disabled ? styles.statusOff : styles.statusOn}`}>
          {disabled ? '待上线' : '运行中'}
        </span>
      </div>
      <p className={styles.desc}>{tool.desc}</p>
      <div className={styles.params}>
        {tool.params.map((p) => (
          <span key={p.name} className={styles.param}>
            {p.name}
            <span className={styles.paramType}>: {p.type}</span>
            {p.required && <span className={styles.req}>*</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ToolsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>工具管理</h1>
        <p className={styles.sub}>Agent 可调用的工具列表，由后端 Tool Registry 控制</p>
      </div>

      <section>
        <h2 className={styles.secTitle}>已启用</h2>
        <div className={styles.grid}>
          {ACTIVE_TOOLS.map((t) => <ToolCard key={t.name} tool={t} />)}
        </div>
      </section>

      <section>
        <h2 className={styles.secTitle}>计划中</h2>
        <div className={styles.grid}>
          {PLANNED_TOOLS.map((t) => <ToolCard key={t.name} tool={t} disabled />)}
        </div>
      </section>
    </div>
  );
}
