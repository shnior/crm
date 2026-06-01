import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Edit3, Save, X, FileText, CheckCircle2, Clock, Wallet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STORAGE_KEY = "video_editing_crm_v1";

const emptyJob = {
  id: "",
  clientName: "",
  phone: "",
  projectName: "",
  editType: "קליפ",
  editDate: "",
  description: "",
  amount: "",
  invoiceIssued: false,
  invoiceNumber: "",
  paid: false,
  paymentDate: "",
  notes: "",
};

const editTypes = ["קליפ", "סרטון אירוע", "היילייט", "פרסומת", "תיקוני צבע", "עריכת סאונד", "כתוביות", "אחר"];

function currency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(num);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function statusBadge(job) {
  if (job.paid) return "שולם";
  if (job.invoiceIssued) return "חשבונית יצאה";
  return "ממתין";
}

export default function VideoEditingCRM() {
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ ...emptyJob, editDate: todayISO() });
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setJobs(JSON.parse(saved));
    } catch (error) {
      console.error("Failed loading CRM data", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const totals = useMemo(() => {
    const total = jobs.reduce((sum, job) => sum + Number(job.amount || 0), 0);
    const paid = jobs.filter((job) => job.paid).reduce((sum, job) => sum + Number(job.amount || 0), 0);
    const debt = jobs.filter((job) => !job.paid).reduce((sum, job) => sum + Number(job.amount || 0), 0);
    const invoices = jobs.filter((job) => job.invoiceIssued).length;
    return { total, paid, debt, invoices };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        if (filter === "paid") return job.paid;
        if (filter === "debt") return !job.paid;
        if (filter === "invoice") return job.invoiceIssued && !job.paid;
        if (filter === "no-invoice") return !job.invoiceIssued;
        return true;
      })
      .filter((job) => {
        const text = `${job.clientName} ${job.phone} ${job.projectName} ${job.editType} ${job.description} ${job.invoiceNumber} ${job.notes}`.toLowerCase();
        return text.includes(query.toLowerCase());
      })
      .sort((a, b) => (b.editDate || "").localeCompare(a.editDate || ""));
  }, [jobs, query, filter]);

  function resetForm() {
    setForm({ ...emptyJob, editDate: todayISO() });
    setEditingId(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.clientName.trim()) return alert("צריך להכניס שם לקוח");
    if (!form.projectName.trim()) return alert("צריך להכניס שם עבודה / פרויקט");

    const clean = {
      ...form,
      id: editingId || crypto.randomUUID(),
      amount: Number(form.amount || 0),
      paymentDate: form.paid && !form.paymentDate ? todayISO() : form.paymentDate,
      invoiceNumber: form.invoiceIssued ? form.invoiceNumber : "",
    };

    if (editingId) {
      setJobs((prev) => prev.map((job) => (job.id === editingId ? clean : job)));
    } else {
      setJobs((prev) => [clean, ...prev]);
    }
    resetForm();
  }

  function editJob(job) {
    setForm({ ...job, amount: String(job.amount || "") });
    setEditingId(job.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteJob(id) {
    if (confirm("למחוק את העבודה הזו?")) setJobs((prev) => prev.filter((job) => job.id !== id));
  }

  function togglePaid(id) {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id
          ? { ...job, paid: !job.paid, paymentDate: !job.paid ? todayISO() : "" }
          : job
      )
    );
  }

  function exportCSV() {
    const headers = ["לקוח", "טלפון", "פרויקט", "סוג עריכה", "תאריך עריכה", "פירוט", "סכום", "חשבונית יצאה", "מספר חשבונית", "שולם", "תאריך תשלום", "הערות"];
    const rows = jobs.map((j) => [
      j.clientName,
      j.phone,
      j.projectName,
      j.editType,
      j.editDate,
      j.description,
      j.amount,
      j.invoiceIssued ? "כן" : "לא",
      j.invoiceNumber,
      j.paid ? "כן" : "לא",
      j.paymentDate,
      j.notes,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video-editing-crm.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-neutral-50 text-neutral-900 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-br from-neutral-950 to-neutral-800 text-white p-6 md:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-300 mb-2">מערכת ניהול עבודות עריכת וידאו</p>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">CRM לקוחות וחשבונות</h1>
              <p className="mt-3 text-neutral-300 max-w-2xl">ניהול לקוחות, עבודות, תאריכי עריכה, חשבוניות, תשלומים וחובות — הכל במקום אחד.</p>
            </div>
            <Button onClick={exportCSV} className="rounded-2xl bg-white text-neutral-950 hover:bg-neutral-100 gap-2">
              <Download size={18} /> ייצוא לאקסל CSV
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><Wallet /><div><p className="text-sm text-neutral-500">סה״כ עבודות</p><p className="text-2xl font-bold">{currency(totals.total)}</p></div></div></CardContent></Card>
          <Card className="rounded-3xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><CheckCircle2 /><div><p className="text-sm text-neutral-500">שולם</p><p className="text-2xl font-bold">{currency(totals.paid)}</p></div></div></CardContent></Card>
          <Card className="rounded-3xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><Clock /><div><p className="text-sm text-neutral-500">חוב פתוח</p><p className="text-2xl font-bold">{currency(totals.debt)}</p></div></div></CardContent></Card>
          <Card className="rounded-3xl shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><FileText /><div><p className="text-sm text-neutral-500">חשבוניות שיצאו</p><p className="text-2xl font-bold">{totals.invoices}</p></div></div></CardContent></Card>
        </section>

        <Card className="rounded-3xl shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">{editingId ? <Edit3 size={22} /> : <Plus size={22} />} {editingId ? "עריכת עבודה" : "הוספת עבודה חדשה"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input className="input" placeholder="שם לקוח" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              <input className="input" placeholder="טלפון" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="input" placeholder="שם עבודה / פרויקט" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
              <select className="input" value={form.editType} onChange={(e) => setForm({ ...form, editType: e.target.value })}>{editTypes.map((t) => <option key={t}>{t}</option>)}</select>
              <input className="input" type="date" value={form.editDate} onChange={(e) => setForm({ ...form, editDate: e.target.value })} />
              <input className="input" type="number" placeholder="סכום לתשלום" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <label className="checkboxBox"><input type="checkbox" checked={form.invoiceIssued} onChange={(e) => setForm({ ...form, invoiceIssued: e.target.checked })} /> חשבונית יצאה</label>
              <input className="input" placeholder="מספר חשבונית" disabled={!form.invoiceIssued} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
              <label className="checkboxBox"><input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} /> בוצע תשלום</label>
              <input className="input" type="date" disabled={!form.paid} value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
              <textarea className="input md:col-span-2" rows={3} placeholder="איזה עריכות בוצעו / פירוט העבודה" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <textarea className="input md:col-span-2" rows={3} placeholder="הערות פנימיות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="md:col-span-2 lg:col-span-4 flex flex-wrap gap-3">
                <Button type="submit" className="rounded-2xl gap-2"><Save size={18} /> {editingId ? "שמירת שינויים" : "הוספה למערכת"}</Button>
                {editingId && <Button type="button" variant="outline" onClick={resetForm} className="rounded-2xl gap-2"><X size={18} /> ביטול עריכה</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-5">
              <h2 className="text-2xl font-bold">רשימת עבודות</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute right-3 top-3 text-neutral-400" size={18} />
                  <input className="input pr-10 min-w-[260px]" placeholder="חיפוש לקוח, פרויקט, חשבונית..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">הכל</option>
                  <option value="debt">חובות פתוחים</option>
                  <option value="paid">שולם</option>
                  <option value="invoice">חשבונית יצאה ולא שולם</option>
                  <option value="no-invoice">ללא חשבונית</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-neutral-100 text-neutral-600">
                  <tr>
                    <th className="th">לקוח</th>
                    <th className="th">פרויקט</th>
                    <th className="th">תאריך עריכה</th>
                    <th className="th">סוג</th>
                    <th className="th">פירוט</th>
                    <th className="th">סכום</th>
                    <th className="th">חשבונית</th>
                    <th className="th">תשלום</th>
                    <th className="th">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr><td colSpan="9" className="p-8 text-center text-neutral-500">אין עדיין נתונים להצגה</td></tr>
                  ) : filteredJobs.map((job) => (
                    <tr key={job.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="td font-semibold"><div>{job.clientName}</div><div className="text-xs text-neutral-500">{job.phone}</div></td>
                      <td className="td">{job.projectName}</td>
                      <td className="td">{job.editDate}</td>
                      <td className="td">{job.editType}</td>
                      <td className="td max-w-[260px]"><div className="line-clamp-2">{job.description}</div>{job.notes && <div className="text-xs text-neutral-500 mt-1">הערה: {job.notes}</div>}</td>
                      <td className="td font-bold">{currency(job.amount)}</td>
                      <td className="td"><span className={`badge ${job.invoiceIssued ? "badgeOk" : "badgeWait"}`}>{job.invoiceIssued ? `כן ${job.invoiceNumber ? `#${job.invoiceNumber}` : ""}` : "לא"}</span></td>
                      <td className="td"><button onClick={() => togglePaid(job.id)} className={`badge ${job.paid ? "badgeOk" : "badgeDebt"}`}>{statusBadge(job)}{job.paymentDate ? ` · ${job.paymentDate}` : ""}</button></td>
                      <td className="td">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editJob(job)} className="rounded-xl"><Edit3 size={15} /></Button>
                          <Button size="sm" variant="outline" onClick={() => deleteJob(job.id)} className="rounded-xl"><Trash2 size={15} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        .input { border: 1px solid #d4d4d4; background: white; border-radius: 16px; padding: 11px 14px; outline: none; width: 100%; }
        .input:focus { border-color: #171717; box-shadow: 0 0 0 3px rgba(23,23,23,0.08); }
        .input:disabled { background: #f5f5f5; color: #a3a3a3; }
        .checkboxBox { border: 1px solid #d4d4d4; background: white; border-radius: 16px; padding: 11px 14px; display: flex; align-items: center; gap: 10px; }
        .th { text-align: right; padding: 14px; font-weight: 700; }
        .td { padding: 14px; vertical-align: top; }
        .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; white-space: nowrap; border: 1px solid transparent; }
        .badgeOk { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
        .badgeWait { background: #f5f5f5; color: #525252; border-color: #d4d4d4; }
        .badgeDebt { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
      `}</style>
    </div>
  );
}
