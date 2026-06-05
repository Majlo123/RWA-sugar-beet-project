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
      <div className="mb-2">
        <span className="eyebrow-honey mb-3 inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Admin Access</span>
        <h1 className="text-4xl sm:text-6xl mt-4">KYC Reviews</h1>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                filter === f.value
                  ? 'bg-brand-50 text-brand-700 border-brand-300'
                  : 'bg-surface text-muted border-line-strong hover:text-brand-700 hover:border-brand-300'
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
        <CountCard label="Pending" value={counts.pending} Icon={Clock} accent="info" />
        <CountCard label="Verified" value={counts.verified} Icon={CheckCircle2} accent="brand" />
        <CountCard label="Rejected" value={counts.rejected} Icon={XCircle} accent="error" />
      </section>

      {loading && items.length === 0 ? (
        <div className="card-padded text-center py-16">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="card-padded text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-cream-deep border border-line flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-faint" />
          </div>
          <p className="text-ink font-semibold text-lg">Nothing to review</p>
          <p className="text-muted text-sm mt-1.5">No KYC submissions to display for this filter.</p>
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
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <p className="font-display text-2xl font-semibold tracking-tight text-ink">{it.username}</p>
                      <span className={meta.class}>
                        <meta.Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
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
                          value={<span className="text-error">{it.rejectionReason}</span>}
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
                          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm bg-[#fbeceb] text-[#a83a35] border border-[#f3d2d0] hover:bg-[#f7ddda] transition-colors disabled:opacity-50"
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
          <p className="text-base text-muted mb-4">
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
              className="btn-danger text-sm"
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
          <div className="bg-cream-deep rounded-xl overflow-hidden border border-line">
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
    brand: 'text-brand-600 bg-brand-50 border-brand-200',
    info: 'text-info bg-[#eaf0f8] border-[#cfdcef]',
    error: 'text-error bg-[#fbeceb] border-[#f3d2d0]',
  }[accent];
  return (
    <div className="card-padded">
      <div className="flex items-start justify-between mb-4">
        <p className="section-title">{label}</p>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${styles}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="font-display text-4xl font-semibold text-ink tracking-tight leading-none">{value}</p>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-line/70 last:border-0">
      <span className="text-muted font-medium">{label}</span>
      <span className="text-ink text-right truncate">{value || '-'}</span>
    </div>
  );
}

function Modal({ children, onClose, title, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className={`card relative w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} p-6 sm:p-8 animate-fade-in`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-ink hover:bg-cream-deep transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-2xl font-display font-semibold tracking-tight mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default KYCReviewsPage;
