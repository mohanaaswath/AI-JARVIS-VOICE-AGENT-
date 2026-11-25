import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  Square,
} from "lucide-react";
import { motion } from "framer-motion";
import type { TaskItem } from "../types";
import { getTasks, saveTask, deleteTask } from "../lib/storage";

export default function TasksView() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const list = await getTasks();
    setTasks(list);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const task: TaskItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      completed: false,
      priority,
      createdAt: Date.now(),
    };

    await saveTask(task);
    setNewTitle("");
    loadTasks();
  };

  const handleToggle = async (task: TaskItem) => {
    const updated: TaskItem = {
      ...task,
      completed: !task.completed,
      completedAt: !task.completed ? Date.now() : undefined,
    };
    await saveTask(updated);
    loadTasks();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    loadTasks();
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const getPriorityBadge = (p: "low" | "medium" | "high") => {
    const map = {
      low: { bg: "rgba(103, 232, 249, 0.15)", color: "var(--accent-cyan)", label: "Low" },
      medium: { bg: "rgba(167, 139, 250, 0.15)", color: "var(--accent-purple)", label: "Medium" },
      high: { bg: "rgba(255, 128, 102, 0.15)", color: "var(--accent-coral)", label: "High" },
    };
    const c = map[p];
    return (
      <span
        style={{
          fontSize: "0.75rem",
          padding: "0.2rem 0.5rem",
          borderRadius: "0.4rem",
          background: c.bg,
          color: c.color,
          fontWeight: 600,
        }}
      >
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckSquare size={24} color="var(--accent-purple)" /> Tasks & Reminders
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Offline-first task management. Synced to your browser's IndexedDB.
          </p>
        </div>
      </div>

      {/* Add Task Input Form */}
      <form onSubmit={handleAdd} className="glass" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "0.75rem" }}>
        <input
          type="text"
          placeholder="What do you need JARVIS to remind you to do?"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "0.6rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          style={{
            padding: "0.75rem 0.75rem",
            borderRadius: "0.6rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>

        <button
          type="submit"
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "0.6rem",
            background: "linear-gradient(135deg, var(--accent-purple), var(--accent-blue))",
            color: "#ffffff",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Plus size={18} /> Add
        </button>
      </form>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {(["all", "active", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "0.5rem",
              background: filter === tab ? "var(--nav-active)" : "transparent",
              border: `1px solid ${filter === tab ? "var(--accent-cyan)" : "transparent"}`,
              color: filter === tab ? "var(--accent-cyan)" : "var(--text-secondary)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filteredTasks.length === 0 ? (
          <div className="glass" style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>No tasks found. Add a task above or say: "Add task finish project review".</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              className="glass"
              style={{
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                opacity: task.completed ? 0.6 : 1,
              }}
            >
              <div
                onClick={() => handleToggle(task)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                {task.completed ? (
                  <CheckSquare size={20} color="var(--accent-cyan)" />
                ) : (
                  <Square size={20} color="var(--text-secondary)" />
                )}
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    textDecoration: task.completed ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {getPriorityBadge(task.priority)}
                <button
                  onClick={() => handleDelete(task.id)}
                  title="Delete task"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: "0.25rem",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
