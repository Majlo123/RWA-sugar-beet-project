import { Link } from 'react-router-dom';
import {
  Sprout, Coins, ShieldCheck, TrendingUp, Wallet, Lock,
  ArrowRight, CheckCircle2, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="page-container animate-fade-in">
      {/* Hero */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="text-center max-w-4xl mx-auto">
          <span className="eyebrow mb-8">
            <Sparkles className="w-4 h-4" />
            On Polygon · ERC-20 BEET token
          </span>

          <h1 className="text-balance text-6xl sm:text-7xl xl:text-8xl font-extrabold mb-8 leading-[1.05]">
            Invest in <span className="gradient-text">sugar beet</span> production,
            <br className="hidden sm:block" /> earn yield on-chain.
          </h1>

          <p className="text-pretty text-xl sm:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            BEET tokenizes real-world sugar beet investments as ERC-20 tokens. Each token
            represents 1,000 USD of investment, locked for one production cycle, with
            transparent on-chain yield distribution.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Link to="/profile" className="btn-primary">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary">
                  Start Investing <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="btn-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-base text-slate-400 font-medium">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Audited smart contracts</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Non-custodial</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> 10% yield per cycle</span>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-28">
        {[
          { label: 'Token Price', value: '$1,000', sub: 'per BEET' },
          { label: 'Yield', value: '10%', sub: 'per cycle' },
          { label: 'Cycle Length', value: '1 year', sub: 'lock period' },
          { label: 'Network', value: 'Polygon', sub: 'Polygon PoS mainnet' },
        ].map((s) => (
          <div key={s.label} className="card-padded text-center hover:border-emerald-500/30 transition-colors">
            <p className="section-title mb-3">{s.label}</p>
            <p className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">{s.value}</p>
            <p className="text-base text-slate-400 mt-2 font-medium">{s.sub}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="mb-28">
        <div className="text-center mb-16">
          <p className="section-title mb-3">Process</p>
          <h2 className="text-5xl sm:text-6xl mb-5 text-balance">How it works</h2>
          <p className="text-xl text-slate-400 font-light">Three simple steps from registration to yield.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: Wallet,
              title: 'Register & Connect',
              text: 'Create an account with your Ethereum address, then connect MetaMask to verify ownership.',
            },
            {
              step: '02',
              icon: Coins,
              title: 'Receive BEET Tokens',
              text: 'After admin records your investment on-chain, BEET tokens are minted to your wallet 1:1 with your USD investment.',
            },
            {
              step: '03',
              icon: TrendingUp,
              title: 'Claim Your Yield',
              text: 'After the 1-year cycle matures, claim your 10% yield directly through MetaMask. Fully on-chain, no intermediaries.',
            },
          ].map((s) => (
            <div key={s.step} className="card-padded relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
              <span className="font-display absolute -top-4 -right-4 text-9xl font-extrabold text-slate-800/60 select-none">{s.step}</span>
              <s.icon className="w-12 h-12 text-emerald-400 mb-6" />
              <h3 className="text-2xl mb-3">{s.title}</h3>
              <p className="text-base text-slate-400 leading-relaxed text-pretty">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mb-28">
        <div className="text-center mb-16">
          <p className="section-title mb-3">Why BEET</p>
          <h2 className="text-5xl sm:text-6xl mb-5 text-balance">Built on the right foundations</h2>
          <p className="text-xl text-slate-400 font-light">Modern stack, transparent contracts, secure design.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, title: 'OpenZeppelin', text: 'BEET token built on audited ERC-20 + Ownable contracts.' },
            { icon: Lock, title: 'Non-custodial', text: 'Yield is claimed directly from your wallet — we never hold your tokens.' },
            { icon: Sprout, title: 'Real-world asset', text: 'Each token is backed by an actual sugar beet production investment.' },
            { icon: TrendingUp, title: 'Transparent yield', text: '10% guaranteed yield enforced by smart contract logic, not by trust.' },
            { icon: Coins, title: '1:1 backing', text: '1,000 USD investment = 1 BEET token. No leverage, no surprises.' },
            { icon: Sparkles, title: 'Modern UX', text: 'React 19 + ethers.js + Go backend with full Swagger documentation.' },
          ].map((f) => (
            <div key={f.title} className="card-padded hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl mb-2">{f.title}</h3>
                  <p className="text-base text-slate-400 leading-relaxed text-pretty">{f.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="mb-24">
          <div className="card-padded relative overflow-hidden text-center py-20 px-6 border-emerald-500/30">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10" />
            <h2 className="text-4xl sm:text-5xl mb-5 text-balance">Ready to invest in real assets, on-chain?</h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-light">
              Join the future of agricultural investment. Register in under 2 minutes.
            </p>
            <Link to="/register" className="btn-primary text-lg px-8 py-4">
              Create Account <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;
