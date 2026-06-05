import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ShieldCheck, Loader2, Upload, FileText, AlertTriangle,
  CheckCircle2, Clock, XCircle, Calendar, MapPin, IdCard,
} from 'lucide-react';
import { getMyKYC, submitKYC } from '../services/kycService';
import { useAuth } from '../context/AuthContext';

const DOC_TYPES = [
  { value: 'id_card', label: 'National ID card' },
  { value: 'passport', label: 'Passport' },
];

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];

function KYCPage() {
  const { user, refreshUser } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState('id_card');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [file, setFile] = useState(null);

  const loadKYC = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMyKYC();
      setKyc(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') loadKYC();
    else setLoading(false);
  }, [user?.role]);

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setError('');
    if (!f) {
      setFile(null);
      return;
    }
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setError('Allowed formats: PDF, JPG, JPEG, PNG.');
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('File is too large (maximum 5 MB).');
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!file) {
      setError('A scanned copy of the document is required.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await submitKYC({
        fullName, documentType, documentNumber, dateOfBirth, country, document: file,
      });
      setKyc(data);
      setMessage('KYC submission received. An administrator will review it shortly.');
      setFile(null);
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const status = kyc?.status || 'none';

  return (
    <div className="page-container py-12 animate-fade-in">
      <div className="mb-10">
        <span className="eyebrow mb-5"><ShieldCheck className="w-3.5 h-3.5" /> Identity Verification</span>
        <h1 className="text-4xl sm:text-6xl mb-3 mt-5">KYC verification</h1>
        <p className="text-lg text-muted text-pretty">
          Identity verification is required before you can receive BEET tokens.
        </p>
      </div>

      <StatusBanner kyc={kyc} />

      {message && <div className="alert-success mt-6">{message}</div>}
      {error && <div className="alert-error mt-6">{error}</div>}

      {status === 'pending' || status === 'verified' ? (
        <SubmissionDetails kyc={kyc} />
      ) : (
        <div className="card-padded mt-8 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl mb-2">Submit your KYC request</h2>
          <p className="text-base text-muted mb-6">
            Fill in your personal details and attach a scan or photo of your document.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Smith"
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="documentType">Document type</label>
                <select
                  id="documentType"
                  className="select"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  {DOC_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="documentNumber">Document number</label>
                <input
                  id="documentNumber"
                  type="text"
                  className="input"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="001234567"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="dateOfBirth">Date of birth</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  className="input"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="country">Country</label>
                <input
                  id="country"
                  type="text"
                  className="input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Serbia"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="document">Document (PDF, JPG, JPEG, PNG, up to 5 MB)</label>
              <label
                htmlFor="document"
                className="flex items-center gap-3 p-5 rounded-xl border-2 border-dashed border-line-strong hover:border-brand-400 hover:bg-brand-50/60 transition-colors cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {file ? (
                    <>
                      <p className="text-base font-display font-semibold text-ink truncate">{file.name}</p>
                      <p className="text-sm text-muted font-medium">
                        {(file.size / 1024).toFixed(0)} KB · Click to replace
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-display font-semibold text-ink">Choose a file</p>
                      <p className="text-sm text-muted font-medium">PDF scan or photo of your document</p>
                    </>
                  )}
                </div>
              </label>
              <input
                id="document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="alert-info text-sm flex gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-pretty">
                Your data is stored securely and used solely for identity verification purposes.
                Documents will not be shared with third parties.
              </span>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full text-base py-3.5">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Submit KYC request</>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function StatusBanner({ kyc }) {
  if (!kyc) return null;
  const status = kyc.status || 'none';

  const map = {
    none: {
      Icon: AlertTriangle,
      title: 'Not verified',
      subtitle: 'Complete the form below to submit your KYC request.',
      cls: 'bg-honey-50 border-honey-100 text-honey-700',
      iconCls: 'text-honey-600',
    },
    pending: {
      Icon: Clock,
      title: 'Submission under review',
      subtitle: 'An administrator is reviewing your details. You will be notified once a decision is made.',
      cls: 'bg-[#eaf0f8] border-[#cfdcef] text-[#345b91]',
      iconCls: 'text-info',
    },
    verified: {
      Icon: CheckCircle2,
      title: 'Verified',
      subtitle: 'Your identity is confirmed. Administrators can now record investments to your wallet.',
      cls: 'bg-brand-50 border-brand-200 text-brand-800',
      iconCls: 'text-brand-600',
    },
    rejected: {
      Icon: XCircle,
      title: 'Submission rejected',
      subtitle: kyc.rejectionReason
        ? `Reason: ${kyc.rejectionReason}`
        : 'You can submit a new request with corrected details.',
      cls: 'bg-[#fbeceb] border-[#f3d2d0] text-[#a83a35]',
      iconCls: 'text-error',
    },
  };
  const m = map[status] || map.none;

  return (
    <div className={`rounded-2xl border p-6 flex items-start gap-4 ${m.cls}`}>
      <div className="w-14 h-14 rounded-2xl bg-white/70 border border-white flex items-center justify-center flex-shrink-0">
        <m.Icon className={`w-7 h-7 ${m.iconCls}`} />
      </div>
      <div>
        <p className="font-display text-2xl font-semibold tracking-tight mb-1">{m.title}</p>
        <p className="text-base text-pretty">{m.subtitle}</p>
      </div>
    </div>
  );
}

function SubmissionDetails({ kyc }) {
  if (!kyc) return null;
  return (
    <div className="card-padded mt-8 max-w-3xl">
      <h2 className="section-title mb-5">Submitted details</h2>
      <div className="space-y-1 text-base">
        <DetailRow icon={IdCard} label="Full name" value={kyc.fullName} />
        <DetailRow
          icon={FileText}
          label="Document"
          value={`${kyc.documentType === 'passport' ? 'Passport' : 'National ID card'} · ${kyc.documentNumber}`}
        />
        <DetailRow icon={Calendar} label="Date of birth" value={kyc.dateOfBirth} />
        <DetailRow icon={MapPin} label="Country" value={kyc.country} />
        {kyc.submittedAt && (
          <DetailRow
            icon={Clock}
            label="Submitted"
            value={new Date(kyc.submittedAt).toLocaleString()}
          />
        )}
        {kyc.reviewedAt && (
          <DetailRow
            icon={CheckCircle2}
            label="Reviewed"
            value={new Date(kyc.reviewedAt).toLocaleString()}
          />
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-line last:border-0">
      <span className="flex items-center gap-2 text-muted">
        <Icon className="w-4 h-4 text-faint" />
        {label}
      </span>
      <span className="text-ink font-medium text-right">{value || '-'}</span>
    </div>
  );
}

export default KYCPage;
