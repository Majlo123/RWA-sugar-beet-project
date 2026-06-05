import { Link } from 'react-router-dom';
import {
  Sprout, Coins, ShieldCheck, TrendingUp, Wallet, Lock,
  ArrowRight, CheckCircle2, Sparkles, Leaf,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in overflow-hidden">
      {/* ===================== HERO ===================== */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-60 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)]" />
          <div className="blob bg-brand-300/30 w-[520px] h-[520px] -top-32 -left-24" />
          <div className="blob bg-honey-300/30 w-[460px] h-[460px] -top-24 right-0" />
          <div className="blob bg-beet-200/25 w-[420px] h-[420px] top-40 left-1/3" />
        </div>

        <div className="page-container pt-16 sm:pt-24 pb-16 text-center">
          <Reveal as="span" className="eyebrow mb-7">
            <Sparkles className="w-3.5 h-3.5" />
            On Polygon · ERC-20 BEET token
          </Reveal>

          <Reveal as="h1" delay={60} className="text-balance text-[3rem] sm:text-7xl xl:text-[5.5rem] font-semibold mb-7 leading-[1.04] max-w-5xl mx-auto">
            Invest in <span className="text-beet-gradient italic">sugar beet</span> production,
            <br className="hidden sm:block" /> earn yield on-chain.
          </Reveal>

          <Reveal as="p" delay={120} className="text-pretty text-lg sm:text-2xl text-muted mb-10 max-w-3xl mx-auto leading-relaxed">
            BEET tokenizes real-world sugar beet investments as ERC-20 tokens. Each token
            represents <span className="text-ink font-semibold">1,000 USD</span> of investment, locked
            for one production cycle, with transparent on-chain yield distribution.
          </Reveal>

          <Reveal delay={180} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Link to="/profile" className="btn-primary text-lg px-7 py-3.5">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-lg px-7 py-3.5">
                  Start Investing <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="btn-secondary text-lg px-7 py-3.5">
                  Sign In
                </Link>
              </>
            )}
          </Reveal>

          <Reveal delay={240} className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[15px] text-muted font-medium">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-brand-500" /> Audited smart contracts</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-brand-500" /> Non-custodial</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-brand-500" /> 10% yield per cycle</span>
          </Reveal>
        </div>

        {/* Product showcase panel */}
        <div className="page-container pb-20">
          <Reveal delay={120} className="max-w-3xl mx-auto">
            <div className="card-padded relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-brand-100/60 blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-6 relative">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.14em] font-semibold text-faint">BEET Balance</p>
                    <p className="font-display text-3xl font-semibold text-ink leading-tight">
                      <CountUp value={12} /> <span className="text-muted text-xl font-sans">BEET</span>
                    </p>
                  </div>
                </div>
                <span className="badge-success">
                  <TrendingUp className="w-3.5 h-3.5" /> +10% yield
                </span>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between text-sm text-muted mb-2">
                  <span className="font-medium">Cycle progress</span>
                  <span className="font-mono text-honey-700">~ 8 months to maturity</span>
                </div>
                <div className="h-2.5 rounded-full bg-cream-deep overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: '34%' }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 relative">
                {[
                  { label: 'Invested', value: '$12,000' },
                  { label: 'Est. yield', value: '$1,200' },
                  { label: 'Unlocks', value: 'in 1 yr' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-surface-soft border border-line p-3.5 text-center">
                    <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-faint">{s.label}</p>
                    <p className="font-display text-xl font-semibold text-ink mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              <p className="text-[12px] text-faint text-center mt-5">Illustrative preview — your live portfolio appears on the dashboard.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="page-container">
        {/* ===================== STATS ===================== */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-28">
          {[
            { icon: Coins, label: 'Token Price', render: <><span className="text-muted text-3xl">$</span><CountUp value={1000} /></>, sub: 'per BEET' },
            { icon: TrendingUp, label: 'Yield', render: <><CountUp value={10} /><span className="text-muted text-3xl">%</span></>, sub: 'per cycle' },
            { icon: Lock, label: 'Cycle Length', render: <><CountUp value={1} /><span className="text-muted text-3xl"> yr</span></>, sub: 'lock period' },
            { icon: Leaf, label: 'Network', render: <span className="text-[2.1rem] sm:text-[2.6rem]">Polygon</span>, sub: 'PoS mainnet' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="card card-hover p-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
                <s.icon className="w-5 h-5 text-brand-600" />
              </div>
              <p className="section-title mb-2">{s.label}</p>
              <p className="font-display text-4xl sm:text-5xl font-semibold text-ink tracking-tight">{s.render}</p>
              <p className="text-sm text-muted mt-2 font-medium">{s.sub}</p>
            </Reveal>
          ))}
        </section>

        {/* ===================== HOW IT WORKS ===================== */}
        <section className="mb-28">
          <Reveal className="text-center mb-14">
            <p className="section-title mb-3">Process</p>
            <h2 className="text-4xl sm:text-5xl mb-4 text-balance">How it works</h2>
            <p className="text-lg text-muted">Three simple steps from registration to yield.</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-[3.2rem] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />
            {[
              { step: '01', icon: Wallet, title: 'Register & Connect', text: 'Create an account with your Ethereum address, then connect MetaMask to verify ownership.' },
              { step: '02', icon: Coins, title: 'Receive BEET Tokens', text: 'After your KYC-verified investment is recorded on-chain, BEET tokens are minted to your wallet 1:1 with your USD.' },
              { step: '03', icon: TrendingUp, title: 'Claim Your Yield', text: 'After the 1-year cycle matures, claim your 10% yield directly through MetaMask. Fully on-chain, no intermediaries.' },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 100} className="card card-hover p-7 relative bg-surface">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200 flex items-center justify-center mb-5 relative z-10 mx-auto">
                  <s.icon className="w-7 h-7 text-brand-600" />
                </div>
                <span className="font-display block text-center text-[13px] font-bold tracking-[0.2em] text-honey-600 mb-2">STEP {s.step}</span>
                <h3 className="text-xl mb-3 text-center">{s.title}</h3>
                <p className="text-[15px] text-muted leading-relaxed text-pretty text-center">{s.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ===================== FEATURES ===================== */}
        <section className="mb-28">
          <Reveal className="text-center mb-14">
            <p className="section-title mb-3">Why BEET</p>
            <h2 className="text-4xl sm:text-5xl mb-4 text-balance">Built on the right foundations</h2>
            <p className="text-lg text-muted">Modern stack, transparent contracts, secure by design.</p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: ShieldCheck, title: 'OpenZeppelin', text: 'BEET token built on audited ERC-20 + Ownable contracts.' },
              { icon: Lock, title: 'Non-custodial', text: 'Yield is claimed directly from your wallet — we never hold your tokens.' },
              { icon: Sprout, title: 'Real-world asset', text: 'Each token is backed by an actual sugar beet production investment.' },
              { icon: TrendingUp, title: 'Transparent yield', text: '10% yield enforced by smart-contract logic, not by trust.' },
              { icon: Coins, title: '1:1 backing', text: '1,000 USD investment = 1 BEET token. No leverage, no surprises.' },
              { icon: Sparkles, title: 'Modern UX', text: 'React 19 + ethers.js + a Go backend with full Swagger docs.' },
            ].map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80} className="card card-hover p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="text-lg mb-1.5">{f.title}</h3>
                    <p className="text-[15px] text-muted leading-relaxed text-pretty">{f.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ===================== CTA ===================== */}
        {!user && (
          <section className="mb-24">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-brand-200 text-center py-16 sm:py-20 px-6"
                   style={{ backgroundImage: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-600) 55%, var(--color-brand-500))' }}>
                <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-28 -right-10 w-80 h-80 rounded-full bg-beet-500/25 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-[12.5px] font-semibold uppercase tracking-[0.14em] mb-6">
                    <Leaf className="w-3.5 h-3.5" /> Harvest season
                  </span>
                  <h2 className="text-3xl sm:text-5xl mb-4 text-balance text-white">Ready to invest in real assets, on-chain?</h2>
                  <p className="text-lg text-white/85 mb-9 max-w-2xl mx-auto">
                    Join the future of agricultural investment. Register in under 2 minutes.
                  </p>
                  <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-brand-700 font-semibold text-lg px-8 py-4 shadow-float hover:-translate-y-0.5 transition-transform">
                    Create Account <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </Reveal>
          </section>
        )}
      </div>
    </div>
  );
}

export default HomePage;
