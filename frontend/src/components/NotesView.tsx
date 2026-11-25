import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Download,
  Search,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { NoteItem } from "../types";
import { getNotes, saveNote, deleteNote } from "../lib/storage";

export default function NotesView() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const list = await getNotes();
    setNotes(list);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    const note: NoteItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim() || "Untitled Note",
      content: newContent.trim(),
      tags: ["web"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveNote(note);
    setNewTitle("");
    setNewContent("");
    setIsCreating(false);
    loadNotes();
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    loadNotes();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (note: NoteItem) => {
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={24} color="var(--accent-cyan)" /> Local Notes
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Stored securely in your browser's IndexedDB. Fully accessible offline.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.2rem",
            borderRadius: "0.75rem",
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
            color: "#08090d",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={18} /> New Note
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        <Search
          size={18}
          color="var(--text-secondary)"
          style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          placeholder="Search saved notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem 0.75rem 2.75rem",
            borderRadius: "0.75rem",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
      </div>

      {/* Create Note Modal / Box */}
      <AnimatePresence>
        {isCreating && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreate}
            className="glass"
            style={{ padding: "1.5rem", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <input
              type="text"
              placeholder="Note title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontWeight: 600,
                outline: "none",
              }}
            />
            <textarea
              placeholder="Write your note content here..."
              rows={4}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                outline: "none",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "0.5rem",
                  background: "var(--accent-cyan)",
                  color: "#08090d",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Save Note
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div
          className="glass"
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <FileText size={48} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
          <p>No notes found. Create a note above or ask JARVIS: "Save this explanation in my notes".</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              layout
              className="glass"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {note.title}
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                    marginBottom: "1rem",
                  }}
                >
                  {note.content}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border)",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                }}
              >
                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleCopy(note.id, note.content)}
                    title="Copy to clipboard"
                    style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                  >
                    {copiedId === note.id ? <Check size={15} color="var(--accent-cyan)" /> : <Copy size={15} />}
                  </button>
                  <button
                    onClick={() => handleDownload(note)}
                    title="Download note"
                    style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    title="Delete note"
                    style={{ background: "transparent", border: "none", color: "var(--accent-coral)", cursor: "pointer" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
