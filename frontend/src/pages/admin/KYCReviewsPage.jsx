import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, RefreshCcw, Loader2, CheckCircle2, XCircle,
  Clock, AlertTriangle, FileText, Eye, X,
} from 'lucide-react';
import { listKYCSubmissions, approveKYC, rejectKYC, downloadKYCDocument } from '../../services/adminService';

const STATUS_META = {
  pending:  { label: 'Pending',  class: 'badge-info',    Icon: Clock },
  verified: { label: 'Verified', class: 'badge-success', Icon: CheckCircle2 },
  rejected: { label: 'Rejected', class: 'badge-error',   Icon: XCircle },
  none:     { label: 'Not submitted', class: 'badge-neutral', Icon: AlertTriangle },
};

const FILTERS = [
  { value: '',         label: 'All' },
  { value: 'pending',  label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

function KYCReviewsPage() {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [actionId, setActionId] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, userId: null, reason: '' });
  const [documentURL, setDocumentURL] = useState({ url: null, userId: null });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listKYCSubmissions('');
      setAllItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const items = useMemo(() => {
    if (!filter) return allItems;
    return allItems.filter((i) => i.status === filter);
  }, [allItems, filter]);

  const counts = useMemo(() => {
    const c = { pending: 0, verified: 0, rejected: 0 };
    allItems.forEach((i) => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [allItems]);

  const handleApprove = async (userId) => {
    try {
      setActionId(userId);
      await approveKYC(userId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const openReject = (userId) => setRejectModal({ open: true, userId, reason: '' });
  const closeReject = () => setRejectModal({ open: false, userId: null, reason: '' });

  const submitReject = async () => {
    if (!rejectModal.reason.trim()) return;
    try {
      setActionId(rejectModal.userId);
      await rejectKYC(rejectModal.userId, rejectModal.reason);
      closeReject();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const viewDocument = async (userId) => {
    try {
      const url = await downloadKYCDocument(userId);
      setDocumentURL({ url, userId });
    } catch (err) {
      setError(err.message);
    }
  };

  const closeDocument = () => {
    if (documentURL.url) URL.revokeObjectURL(documentURL.url);
    setDocumentURL({ url: null, userId: null });
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <span className="eyebrow-amber mb-3 inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Admin Access</span>
        <h1 className="text-5xl sm:text-6xl">KYC Reviews</h1>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-display font-bold transition-colors ${
                filter === f.value
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800/40 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-sm">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <CountCard label="Pending" value={counts.pending} Icon={Clock} accent="blue" />
        <CountCard label="Verified" value={counts.verified} Icon={CheckCircle2} accent="emerald" />
        <CountCard label="Rejected" value={counts.rejected} Icon={XCircle} accent="rose" />
      </section>

      {loading && items.length === 0 ? (
        <div className="card-padded text-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="card-padded text-center py-16">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No KYC submissions to display.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => {
            const meta = STATUS_META[it.status] || STATUS_META.none;
            const isBusy = actionId === it.userId;
            return (
              <div key={it.userId} className="card-padded">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <p className="font-display text-2xl font-extrabold tracking-tight">{it.username}</p>
                      <span className={meta.class}>
                        <meta.Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <Field label="Full name" value={it.fullName} />
                      <Field
                        label="Document"
                        value={
                          it.documentType
                            ? `${it.documentType === 'passport' ? 'Passport' : 'National ID card'} · ${it.documentNumber}`
                            : '-'
                        }
                      />
                      <Field label="Date of birth" value={it.dateOfBirth} />
                      <Field label="Country" value={it.country} />
                      <Field
                        label="ETH address"
                        value={<span className="font-mono text-xs">{it.ethAddress}</span>}
                      />
                      <Field
                        label="Submitted"
                        value={it.submittedAt ? new Date(it.submittedAt).toLocaleString() : '-'}
                      />
                      {it.status === 'rejected' && (
                        <Field
                          label="Rejection reason"
                          value={<span className="text-rose-300">{it.rejectionReason}</span>}
                        />
                      )}
                      {it.status === 'verified' && it.reviewedAt && (
                        <Field
                          label="Verified at"
                          value={new Date(it.reviewedAt).toLocaleString()}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:w-56 flex-shrink-0">
                    {it.hasDocument && (
                      <button
                        onClick={() => viewDocument(it.userId)}
                        className="btn-secondary text-sm justify-center"
                      >
                        <Eye className="w-4 h-4" />
                        View document
                      </button>
                    )}
                    {it.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(it.userId)}
                          disabled={isBusy}
                          className="btn-primary text-sm justify-center"
                        >
                          {isBusy ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Working…</>
                          ) : (
                            <><CheckCircle2 className="w-4 h-4" /> Approve</>
                          )}
                        </button>
                        <button
                          onClick={() => openReject(it.userId)}
                          disabled={isBusy}
                          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-display font-bold text-sm bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectModal.open && (
        <Modal onClose={closeReject} title="Reject KYC submission">
          <p className="text-base text-slate-400 mb-4 font-light">
            Provide a reason for the rejection. The user will see this message.
          </p>
          <textarea
            value={rejectModal.reason}
            onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
            className="input min-h-[120px]"
            placeholder="e.g. The document is not legible. Please upload a clearer photo."
            autoFocus
          />
          <div className="flex gap-3 mt-5 justify-end">
            <button onClick={closeReject} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={submitReject}
              disabled={!rejectModal.reason.trim() || actionId === rejectModal.userId}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-display font-bold text-sm bg-rose-500 text-white hover:bg-rose-400 transition-colors disabled:opacity-50"
            >
              {actionId === rejectModal.userId ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><XCircle className="w-4 h-4" /> Reject submission</>
              )}
            </button>
          </div>
        </Modal>
      )}

      {documentURL.url && (
        <Modal onClose={closeDocument} title="KYC document" wide>
          <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <iframe
              src={documentURL.url}
              title="KYC document"
              className="w-full h-[70vh]"
            />
          </div>
          <div className="flex justify-end mt-4">
            <a
              href={documentURL.url}
              download={`kyc-user-${documentURL.userId}`}
              className="btn-secondary text-sm"
            >
              <FileText className="w-4 h-4" />
              Download
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CountCard({ label, value, Icon, accent }) {
  const styles = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  }[accent];
  return (
    <div className="card-padded">
      <div className="flex items-start justify-between mb-4">
        <p className="section-title">{label}</p>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${styles}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="font-display text-4xl font-extrabold text-white tracking-tight leading-none">{value}</p>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="text-slate-200 text-right truncate">{value || '-'}</span>
    </div>
  );
}

function Modal({ children, onClose, title, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`card relative w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} p-6 sm:p-8`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-2xl font-display font-extrabold tracking-tight mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default KYCReviewsPage;
