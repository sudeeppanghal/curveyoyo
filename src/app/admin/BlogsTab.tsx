"use client";
import { useState, useEffect } from "react";

export function BlogsTab() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", readTime: "5 min", published: true });

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blogs");
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleSave = async () => {
    try {
      const url = editingBlog ? `/api/admin/blogs/${editingBlog.id}` : "/api/admin/blogs";
      const method = editingBlog ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      setShowModal(false);
      setEditingBlog(null);
      fetchBlogs();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blog?")) return;
    await fetch(`/api/admin/blogs/${id}`, { method: "DELETE" });
    fetchBlogs();
  };

  const openNew = () => {
    setForm({ title: "", slug: "", excerpt: "", content: "", readTime: "5 min", published: true });
    setEditingBlog(null);
    setShowModal(true);
  };

  const openEdit = (b: any) => {
    setForm({ title: b.title, slug: b.slug, excerpt: b.excerpt, content: b.content, readTime: b.readTime, published: b.published });
    setEditingBlog(b);
    setShowModal(true);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: "#2d3748" }}>Blog Management</h2>
        <button onClick={openNew} style={{ padding: "8px 16px", borderRadius: 12, background: "#d97706", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
          + New Blog
        </button>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {blogs.map(b => (
            <div key={b.id} style={{ padding: 16, borderRadius: 16, background: "#eef2f7", border: "1px solid rgba(200, 208, 231, 0.4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 16, margin: "0 0 4px", fontWeight: 800 }}>{b.title}</h3>
                <p style={{ fontSize: 13, margin: 0, color: "#718096" }}>/{b.slug} — {b.published ? "Published" : "Draft"}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(b)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(217,119,6,0.1)", color: "#d97706", fontWeight: 700, cursor: "pointer" }}>Edit</button>
                <button onClick={() => handleDelete(b.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#eef2f7", padding: 24, borderRadius: 24, width: "100%", maxWidth: 800, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginTop: 0 }}>{editingBlog ? "Edit Blog" : "New Blog"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ padding: 12, borderRadius: 8, border: "1px solid #ccc" }} />
              <input placeholder="Slug (e.g., my-post)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={{ padding: 12, borderRadius: 8, border: "1px solid #ccc" }} />
              <input placeholder="Read Time (e.g., 5 min)" value={form.readTime} onChange={e => setForm({ ...form, readTime: e.target.value })} style={{ padding: 12, borderRadius: 8, border: "1px solid #ccc" }} />
              <textarea placeholder="Excerpt" value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} style={{ padding: 12, borderRadius: 8, border: "1px solid #ccc", minHeight: 60 }} />
              <textarea placeholder="Content (HTML/Markdown)" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ padding: 12, borderRadius: 8, border: "1px solid #ccc", minHeight: 400, fontFamily: "monospace" }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                <input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />
                Published
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#d97706", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
