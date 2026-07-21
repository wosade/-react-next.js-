import { useState, useEffect } from "react";
import { Plus, Trash2, Link, Unlink, Zap, Download } from "lucide-react";
import {
  listMCPServers,
  createMCPServer,
  deleteMCPServer,
  connectMCPServer,
  disconnectMCPServer,
  seedRecommended,
  fetchRecommended,
  type MCPServer,
  type RecommendedMCP,
} from "../api/mcp";
import styles from "./MCPSettings.module.less";

export default function MCPSettings() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [recommended, setRecommended] = useState<RecommendedMCP[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    try {
      const [list, recs] = await Promise.all([
        listMCPServers(),
        fetchRecommended(),
      ]);
      setServers(list);
      setRecommended(recs);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleConnect = async (server: MCPServer) => {
    setLoading(true);
    try {
      const result = await connectMCPServer(server.id);
      alert(
        `连接成功！获得 ${result.toolCount} 个工具:\n${result.tools
          .map((t) => `  • ${t.name} — ${t.description}`)
          .join("\n")}`,
      );
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "连接失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await disconnectMCPServer(id);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "断开失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此 MCP Server？")) return;
    try {
      await deleteMCPServer(id);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "删除失败");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedRecommended();
      if (result.created > 0) {
        alert(`已添加 ${result.created} 个推荐服务器！`);
      } else {
        alert("推荐服务器已全部添加过了");
      }
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "批量添加失败");
    } finally {
      setSeeding(false);
    }
  };

  const handleAddRecommended = async (rec: RecommendedMCP) => {
    setLoading(true);
    try {
      await createMCPServer({
        name: rec.name,
        transport: rec.transport,
        command: rec.command,
        args: rec.args,
      });
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "添加失败");
    } finally {
      setLoading(false);
    }
  };

  const isAdded = (name: string) => servers.some((s) => s.name === name);

  return (
    <div className={styles.wrapper}>
      {/* 推荐区域 */}
      <div className={styles.recommendBox}>
        <div className={styles.recHeader}>
          <Zap size={15} className={styles.recIcon} />
          <span>热门推荐 — 一键添加，面试加分</span>
          <button
            className={styles.seedBtn}
            onClick={handleSeed}
            disabled={seeding}
          >
            <Download size={13} />
            {seeding ? "添加中..." : "一键全部添加"}
          </button>
        </div>
        <div className={styles.recGrid}>
          {recommended.map((rec) => (
            <div
              key={rec.name}
              className={`${styles.recCard} ${isAdded(rec.name) ? styles.recCardAdded : ""}`}
            >
              <div className={styles.recTop}>
                <span className={styles.recEmoji}>{rec.icon}</span>
                <div>
                  <div className={styles.recName}>{rec.name}</div>
                  <div className={styles.recDesc}>{rec.description}</div>
                </div>
              </div>
              {rec.note && (
                <div className={styles.recNote}>💡 {rec.note}</div>
              )}
              <button
                className={styles.recAddBtn}
                onClick={() => handleAddRecommended(rec)}
                disabled={isAdded(rec.name) || loading}
              >
                {isAdded(rec.name) ? (
                  <>✅ 已添加</>
                ) : (
                  <><Plus size={12} /> 添加</>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 已添加列表 */}
      <div className={styles.header}>
        <h3 className={styles.title}>已添加 ({servers.length})</h3>
      </div>

      <div className={styles.list}>
        {servers.length === 0 && (
          <p className={styles.empty}>👆 上方推荐里选一个添加吧</p>
        )}
        {servers.map((s) => (
          <div key={s.id} className={styles.card}>
            <div className={styles.cardInfo}>
              <div className={styles.cardName}>
                <span
                  className={styles.dot}
                  style={{
                    background: s.connected
                      ? "var(--palette-green, #22c55e)"
                      : "var(--text-muted, #999)",
                  }}
                />
                {s.name}
              </div>
              <div className={styles.cardMeta}>
                <code>{s.command} {s.args?.join(" ")}</code>
                <span
                  className={styles.badge}
                  style={{
                    background: s.enabled
                      ? "var(--accent-bg, #e8f0fe)"
                      : "var(--border-subtle, #eee)",
                    color: s.enabled
                      ? "var(--accent, #2563eb)"
                      : "var(--text-muted, #999)",
                  }}
                >
                  {s.enabled ? "已启用" : "已禁用"}
                </span>
              </div>
            </div>
            <div className={styles.cardActions}>
              {s.connected ? (
                <button
                  className={styles.actionBtn}
                  onClick={() => handleDisconnect(s.id)}
                  title="断开"
                >
                  <Unlink size={14} />
                </button>
              ) : (
                <button
                  className={styles.actionBtn}
                  onClick={() => handleConnect(s)}
                  title="连接"
                  disabled={!s.enabled || loading}
                >
                  <Link size={14} />
                </button>
              )}
              <button
                className={styles.actionBtn}
                onClick={() => handleDelete(s.id)}
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
