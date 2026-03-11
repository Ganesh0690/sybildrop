import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS, CHAIN_CONFIG } from "./contract";

const BILLIONS_VERIFY_URL = "https://signup.billions.network/";

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [status, setStatus] = useState("idle");
  const [eligibility, setEligibility] = useState(null);
  const [stats, setStats] = useState({ totalClaimed: 0, maxClaimable: 0, airdropAmount: "0", endTime: 0 });
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask to continue");
      return;
    }
    try {
      setError(null);
      const p = new ethers.BrowserProvider(window.ethereum);
      const accounts = await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_CONFIG.chainId }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [CHAIN_CONFIG],
          });
        }
      }

      setProvider(p);
      setSigner(s);
      setAccount(accounts[0]);
    } catch (err) {
      setError("Failed to connect wallet");
    }
  };

  const fetchStats = useCallback(async () => {
    if (!provider || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const [totalClaimed, maxClaimable, airdropAmount, endTime] = await Promise.all([
        contract.totalClaimed(),
        contract.maxClaimable(),
        contract.airdropAmount(),
        contract.airdropEndTime(),
      ]);
      setStats({
        totalClaimed: Number(totalClaimed),
        maxClaimable: Number(maxClaimable),
        airdropAmount: ethers.formatEther(airdropAmount),
        endTime: Number(endTime),
      });
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }, [provider]);

  const checkEligibility = useCallback(async () => {
    if (!account || !provider || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const [verified, claimed, active] = await contract.isEligible(account);
      setEligibility({ verified, claimed, active });
    } catch (err) {
      console.error("Eligibility check error:", err);
    }
  }, [account, provider]);

  useEffect(() => {
    fetchStats();
    checkEligibility();
  }, [fetchStats, checkEligibility]);

  const handleClaim = async () => {
    if (!signer) return;
    try {
      setStatus("claiming");
      setError(null);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.claim();
      setTxHash(tx.hash);
      setStatus("confirming");
      await tx.wait();
      setStatus("claimed");
      await fetchStats();
      await checkEligibility();
    } catch (err) {
      setStatus("error");
      if (err.reason) setError(err.reason);
      else if (err.message?.includes("NotVerified")) setError("You must verify with Billions first");
      else if (err.message?.includes("AlreadyClaimed")) setError("You have already claimed this airdrop");
      else setError("Transaction failed. Please try again.");
    }
  };

  const timeRemaining = () => {
    if (!stats.endTime) return "—";
    const now = Math.floor(Date.now() / 1000);
    const diff = stats.endTime - now;
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const claimProgress = stats.maxClaimable > 0 ? (stats.totalClaimed / stats.maxClaimable) * 100 : 0;

  return (
    <div style={styles.root}>
      <style>{globalStyles}</style>

      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logo}>
            <div style={styles.logoMark}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="14" fill="#1a2e1a" />
                <path d="M8 14C8 10.686 10.686 8 14 8C17.314 8 20 10.686 20 14" stroke="#7cc49f" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="14" cy="17" r="3" fill="#7cc49f" />
              </svg>
            </div>
            <span style={styles.logoText}>SybilDrop</span>
          </div>
          <div style={styles.navLinks}>
            <a href="https://billions.network" target="_blank" rel="noreferrer" style={styles.navLink}>Billions Network</a>
            <a href="https://docs.privado.id" target="_blank" rel="noreferrer" style={styles.navLink}>Docs</a>
            {account ? (
              <div style={styles.walletBadge}>
                <div style={styles.walletDot} />
                {account.slice(0, 6)}...{account.slice(-4)}
              </div>
            ) : (
              <button onClick={connectWallet} style={styles.connectBtn}>Connect Wallet</button>
            )}
          </div>
        </div>
      </nav>

      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.tagRow}>
            <span style={styles.tag}><span style={{ ...styles.tagDot, background: "#e8b931" }} />Powered by Billions Network</span>
            <span style={styles.tag}><span style={{ ...styles.tagDot, background: "#6db8d4" }} />Built on Base</span>
          </div>
          <div style={styles.tagRow}>
            <span style={styles.tag}><span style={{ ...styles.tagDot, background: "#5da87e" }} />Zero-Knowledge Verified</span>
            <span style={styles.tag}><span style={{ ...styles.tagDot, background: "#d4856d" }} />One Human, One Claim</span>
          </div>

          <h1 style={styles.heroTitle}>
            Claim Your Airdrop.<br />
            <span style={styles.heroTitleAccent}>Prove You're Human.</span>
          </h1>
          <p style={styles.heroSub}>
            SybilDrop uses Billions Network's privacy-preserving verification
            to ensure fair token distribution. No bots. No multi-wallets.
            Just verified humans on Base.
          </p>

          {!account ? (
            <button onClick={connectWallet} style={styles.ctaBtn}>
              Connect Wallet
            </button>
          ) : (
            <div style={styles.ctaGroup}>
              {eligibility && !eligibility.verified && (
                <a href={BILLIONS_VERIFY_URL} target="_blank" rel="noreferrer" style={styles.ctaBtn}>
                  Verify with Billions
                </a>
              )}
              {eligibility && eligibility.verified && !eligibility.claimed && eligibility.active && (
                <button
                  onClick={handleClaim}
                  disabled={status === "claiming" || status === "confirming"}
                  style={{
                    ...styles.ctaBtn,
                    opacity: status === "claiming" || status === "confirming" ? 0.7 : 1,
                  }}
                >
                  {status === "claiming" ? "Signing..." : status === "confirming" ? "Confirming..." : "Claim Airdrop"}
                </button>
              )}
              {eligibility && eligibility.claimed && (
                <div style={styles.claimedBadge}>Already Claimed</div>
              )}
            </div>
          )}

          {error && <p style={styles.errorText}>{error}</p>}
          {txHash && (
            <a
              href={`${CHAIN_CONFIG.blockExplorerUrls[0]}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              style={styles.txLink}
            >
              View transaction on BaseScan
            </a>
          )}
          {status === "claimed" && (
            <p style={styles.successText}>Airdrop claimed successfully</p>
          )}
        </div>

        <svg style={{ ...styles.landscape, transform: `translateY(${scrollY * 0.15}px)` }} viewBox="0 0 1440 420" fill="none" preserveAspectRatio="none">
          <ellipse cx="200" cy="500" rx="350" ry="280" fill="#8eb87a" opacity="0.5" />
          <ellipse cx="700" cy="480" rx="500" ry="300" fill="#7aad6a" opacity="0.6" />
          <ellipse cx="1200" cy="520" rx="400" ry="260" fill="#6a9e5c" opacity="0.5" />
          <path d="M0 280Q200 180 400 240Q600 300 800 220Q1000 140 1200 200Q1350 240 1440 220V420H0Z" fill="#6d9e5a" />
          <path d="M0 320Q300 240 500 300Q700 360 900 280Q1100 200 1300 260Q1400 290 1440 270V420H0Z" fill="#5c8a4c" />
          <path d="M0 360Q200 310 450 340Q700 370 950 330Q1150 300 1350 340L1440 350V420H0Z" fill="#4a7640" />

          <g transform="translate(900,160)">
            <rect x="-2" y="0" width="4" height="80" fill="#4a5568" rx="2" />
            <line x1="0" y1="10" x2="-25" y2="25" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
            <line x1="0" y1="10" x2="20" y2="-10" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
            <line x1="0" y1="10" x2="5" y2="35" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
          </g>
          <g transform="translate(960,170)">
            <rect x="-2" y="0" width="4" height="70" fill="#4a5568" rx="2" />
            <line x1="0" y1="8" x2="-22" y2="22" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
            <line x1="0" y1="8" x2="18" y2="-8" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
            <line x1="0" y1="8" x2="4" y2="30" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
          </g>
          <g transform="translate(1040,150)">
            <rect x="-2" y="0" width="4" height="90" fill="#4a5568" rx="2" />
            <line x1="0" y1="12" x2="-28" y2="28" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
            <line x1="0" y1="12" x2="22" y2="-12" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
            <line x1="0" y1="12" x2="6" y2="38" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
          </g>

          <g transform="translate(120,250)">
            <rect x="0" y="20" width="70" height="50" fill="#c0392b" rx="3" />
            <polygon points="0,20 35,-5 70,20" fill="#922B21" />
            <rect x="25" y="40" width="18" height="30" fill="#5D3A1A" rx="2" />
            <rect x="5" y="30" width="14" height="14" fill="#f5d6a8" rx="1" />
            <rect x="50" y="30" width="14" height="14" fill="#f5d6a8" rx="1" />
            <rect x="70" y="25" width="35" height="45" fill="#a93226" rx="2" />
            <rect x="75" y="30" width="12" height="14" fill="#f5d6a8" rx="1" />
          </g>

          <circle cx="1100" cy="200" r="40" fill="#f7dc6f" opacity="0.5" />
          <circle cx="1100" cy="200" r="30" fill="#f9e67e" opacity="0.7" />

          <g transform="translate(300,240)" opacity="0.4">
            <circle cx="0" cy="0" r="8" fill="#2d5016" />
            <circle cx="6" cy="-4" r="6" fill="#2d5016" />
            <circle cx="-5" cy="-3" r="5" fill="#2d5016" />
            <rect x="-1" y="8" width="3" height="10" fill="#5D3A1A" />
          </g>
          <g transform="translate(340,230)" opacity="0.35">
            <circle cx="0" cy="0" r="10" fill="#2d5016" />
            <circle cx="7" cy="-5" r="7" fill="#2d5016" />
            <circle cx="-6" cy="-4" r="6" fill="#2d5016" />
            <rect x="-1" y="10" width="3" height="12" fill="#5D3A1A" />
          </g>
        </svg>
      </section>

      <section style={styles.statsSection}>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Tokens per Claim</span>
            <span style={styles.statValue}>{stats.airdropAmount} SDROP</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Claims</span>
            <span style={styles.statValue}>{stats.totalClaimed} / {stats.maxClaimable}</span>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${claimProgress}%` }} />
            </div>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Time Remaining</span>
            <span style={styles.statValue}>{timeRemaining()}</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Your Status</span>
            <span style={styles.statValue}>
              {!account
                ? "Not Connected"
                : !eligibility
                ? "Loading..."
                : eligibility.claimed
                ? "Claimed"
                : eligibility.verified
                ? "Verified"
                : "Not Verified"}
            </span>
          </div>
        </div>
      </section>

      <section style={styles.howSection}>
        <h2 style={styles.sectionTitle}>How It Works</h2>
        <div style={styles.stepsGrid}>
          <div style={styles.stepCard}>
            <div style={styles.stepNum}>01</div>
            <h3 style={styles.stepTitle}>Verify with Billions</h3>
            <p style={styles.stepDesc}>
              Download the Billions app and complete identity verification using your passport and phone. Your data stays private through zero-knowledge proofs.
            </p>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNum}>02</div>
            <h3 style={styles.stepTitle}>Connect on Base</h3>
            <p style={styles.stepDesc}>
              Connect your wallet to Base network. The smart contract checks the on-chain UniversalVerifier to confirm your Proof of Humanity credential.
            </p>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNum}>03</div>
            <h3 style={styles.stepTitle}>Claim Your Tokens</h3>
            <p style={styles.stepDesc}>
              Once verified, claim your SDROP tokens in a single transaction. Each verified human can claim exactly once — no Sybil attacks possible.
            </p>
          </div>
        </div>
      </section>

      <section style={styles.techSection}>
        <div style={styles.techInner}>
          <h2 style={{ ...styles.sectionTitle, color: "#d4edda" }}>Architecture</h2>
          <div style={styles.techGrid}>
            <div style={styles.techCard}>
              <div style={styles.techIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="4" width="24" height="24" rx="4" stroke="#7cc49f" strokeWidth="2" />
                  <path d="M11 16L14 19L21 12" stroke="#7cc49f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h4 style={styles.techLabel}>Privado ID / Billions</h4>
              <p style={styles.techDesc}>ZK-based identity verification. Users prove they are human without revealing personal data.</p>
            </div>
            <div style={styles.techCard}>
              <div style={styles.techIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="#7cc49f" strokeWidth="2" />
                  <circle cx="16" cy="16" r="4" fill="#7cc49f" />
                  <line x1="16" y1="4" x2="16" y2="10" stroke="#7cc49f" strokeWidth="2" />
                  <line x1="16" y1="22" x2="16" y2="28" stroke="#7cc49f" strokeWidth="2" />
                </svg>
              </div>
              <h4 style={styles.techLabel}>UniversalVerifier</h4>
              <p style={styles.techDesc}>Pre-deployed Privado ID smart contract on Base that stores ZK proof verification results on-chain.</p>
            </div>
            <div style={styles.techCard}>
              <div style={styles.techIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M6 22L16 6L26 22H6Z" stroke="#7cc49f" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="16" cy="17" r="3" fill="#7cc49f" />
                </svg>
              </div>
              <h4 style={styles.techLabel}>ZKAirdrop Contract</h4>
              <p style={styles.techDesc}>ERC-20 token with built-in claim logic. Checks UniversalVerifier before minting — one claim per verified identity.</p>
            </div>
            <div style={styles.techCard}>
              <div style={styles.techIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="12" width="24" height="14" rx="3" stroke="#7cc49f" strokeWidth="2" />
                  <path d="M10 12V9C10 5.7 12.7 3 16 3C19.3 3 22 5.7 22 9V12" stroke="#7cc49f" strokeWidth="2" />
                  <circle cx="16" cy="19" r="2" fill="#7cc49f" />
                </svg>
              </div>
              <h4 style={styles.techLabel}>Base Network</h4>
              <p style={styles.techDesc}>Fast, low-cost L2 by Coinbase. All verification and claiming happens on-chain with minimal gas fees.</p>
            </div>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLeft}>
            <div style={styles.logo}>
              <div style={styles.logoMark}>
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="14" fill="#1a2e1a" />
                  <path d="M8 14C8 10.686 10.686 8 14 8C17.314 8 20 10.686 20 14" stroke="#7cc49f" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="14" cy="17" r="3" fill="#7cc49f" />
                </svg>
              </div>
              <span style={{ ...styles.logoText, fontSize: "15px" }}>SybilDrop</span>
            </div>
            <p style={styles.footerNote}>
              Sybil-resistant token distribution powered by Billions Network and Privado ID on Base.
            </p>
          </div>
          <div style={styles.footerLinks}>
            <a href="https://billions.network" target="_blank" rel="noreferrer" style={styles.footerLink}>Billions Network</a>
            <a href="https://docs.privado.id" target="_blank" rel="noreferrer" style={styles.footerLink}>Privado ID Docs</a>
            <a href="https://base.org" target="_blank" rel="noreferrer" style={styles.footerLink}>Base</a>
            <a href="https://github.com/iden3/contracts" target="_blank" rel="noreferrer" style={styles.footerLink}>Smart Contracts</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const globalStyles = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'DM Sans', -apple-system, sans-serif;
    background: #0d1f0d;
    color: #e8f0e8;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  a { text-decoration: none; }
  button { cursor: pointer; border: none; font-family: inherit; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const styles = {
  root: { minHeight: "100vh" },

  nav: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    background: "rgba(13, 31, 13, 0.85)", backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(124, 196, 159, 0.1)",
  },
  navInner: {
    maxWidth: "1200px", margin: "0 auto", padding: "16px 32px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  logo: { display: "flex", alignItems: "center", gap: "10px" },
  logoMark: { display: "flex" },
  logoText: {
    fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: "17px",
    color: "#e8f0e8", letterSpacing: "-0.5px",
  },
  navLinks: { display: "flex", alignItems: "center", gap: "24px" },
  navLink: {
    color: "rgba(232, 240, 232, 0.6)", fontSize: "14px", fontWeight: 500,
    transition: "color 0.2s",
  },
  connectBtn: {
    background: "#7cc49f", color: "#0d1f0d", fontSize: "13px", fontWeight: 600,
    padding: "10px 20px", borderRadius: "100px", letterSpacing: "0.2px",
    transition: "all 0.2s",
  },
  walletBadge: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "rgba(124, 196, 159, 0.12)", border: "1px solid rgba(124, 196, 159, 0.2)",
    padding: "8px 16px", borderRadius: "100px",
    fontFamily: "'Space Mono', monospace", fontSize: "13px", color: "#7cc49f",
  },
  walletDot: { width: 8, height: 8, borderRadius: "50%", background: "#7cc49f" },

  hero: {
    position: "relative", minHeight: "100vh", overflow: "hidden",
    background: "linear-gradient(175deg, #1a3a2a 0%, #2a5a3a 30%, #4a8a5a 60%, #6aaa6a 80%, #8aba7a 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    paddingTop: "100px",
  },
  heroContent: {
    position: "relative", zIndex: 10, textAlign: "center",
    maxWidth: "720px", padding: "0 32px",
    animation: "fadeUp 0.8s ease-out",
  },
  tagRow: {
    display: "flex", justifyContent: "center", gap: "10px",
    marginBottom: "10px", flexWrap: "wrap",
  },
  tag: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    background: "rgba(255,255,255,0.92)", color: "#1a2e1a",
    padding: "8px 18px", borderRadius: "100px",
    fontSize: "13px", fontWeight: 500, letterSpacing: "0.1px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  tagDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  heroTitle: {
    fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(36px, 5vw, 56px)",
    fontWeight: 700, lineHeight: 1.1, color: "#fff",
    marginTop: "32px", marginBottom: "20px",
    textShadow: "0 2px 20px rgba(0,0,0,0.15)",
  },
  heroTitleAccent: { color: "#d4f5e0" },
  heroSub: {
    fontSize: "17px", lineHeight: 1.7, color: "rgba(255,255,255,0.8)",
    maxWidth: "560px", margin: "0 auto 36px",
  },
  ctaBtn: {
    display: "inline-block",
    background: "#1a2e1a", color: "#e8f0e8",
    fontSize: "16px", fontWeight: 600,
    padding: "16px 40px", borderRadius: "100px",
    letterSpacing: "0.3px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    transition: "all 0.25s",
    textDecoration: "none",
  },
  ctaGroup: { display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" },
  claimedBadge: {
    display: "inline-flex", alignItems: "center",
    background: "rgba(124, 196, 159, 0.15)",
    border: "1px solid rgba(124, 196, 159, 0.3)",
    color: "#7cc49f", padding: "16px 40px", borderRadius: "100px",
    fontSize: "16px", fontWeight: 600,
  },
  errorText: {
    color: "#ff8a80", fontSize: "14px", marginTop: "16px",
    fontWeight: 500,
  },
  successText: {
    color: "#7cc49f", fontSize: "14px", marginTop: "16px",
    fontWeight: 600,
  },
  txLink: {
    color: "#7cc49f", fontSize: "13px", marginTop: "12px",
    display: "inline-block", fontWeight: 500,
    borderBottom: "1px solid rgba(124, 196, 159, 0.3)",
  },
  landscape: {
    position: "absolute", bottom: 0, left: 0, width: "100%", height: "420px",
    zIndex: 1,
  },

  statsSection: {
    background: "#0d1f0d", padding: "80px 32px",
  },
  statsGrid: {
    maxWidth: "1000px", margin: "0 auto",
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px",
  },
  statCard: {
    background: "rgba(124, 196, 159, 0.06)",
    border: "1px solid rgba(124, 196, 159, 0.1)",
    borderRadius: "16px", padding: "28px 24px",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  statLabel: {
    fontSize: "12px", fontWeight: 500, color: "rgba(232, 240, 232, 0.45)",
    textTransform: "uppercase", letterSpacing: "1.5px",
  },
  statValue: {
    fontFamily: "'Space Mono', monospace", fontSize: "22px",
    fontWeight: 700, color: "#e8f0e8",
  },
  progressBar: {
    width: "100%", height: "4px", background: "rgba(124, 196, 159, 0.15)",
    borderRadius: "2px", marginTop: "8px", overflow: "hidden",
  },
  progressFill: {
    height: "100%", background: "#7cc49f", borderRadius: "2px",
    transition: "width 0.5s ease",
  },

  howSection: { background: "#0f230f", padding: "100px 32px" },
  sectionTitle: {
    fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(28px, 3.5vw, 40px)",
    fontWeight: 700, color: "#e8f0e8", textAlign: "center",
    marginBottom: "56px", letterSpacing: "-0.5px",
  },
  stepsGrid: {
    maxWidth: "1000px", margin: "0 auto",
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px",
  },
  stepCard: {
    background: "rgba(124, 196, 159, 0.04)",
    border: "1px solid rgba(124, 196, 159, 0.08)",
    borderRadius: "20px", padding: "36px 28px",
  },
  stepNum: {
    fontFamily: "'Space Mono', monospace", fontSize: "48px",
    fontWeight: 700, color: "rgba(124, 196, 159, 0.15)",
    lineHeight: 1, marginBottom: "16px",
  },
  stepTitle: {
    fontSize: "18px", fontWeight: 600, color: "#e8f0e8",
    marginBottom: "12px",
  },
  stepDesc: {
    fontSize: "14px", lineHeight: 1.7,
    color: "rgba(232, 240, 232, 0.55)",
  },

  techSection: {
    background: "#1a2e1a", padding: "100px 32px",
  },
  techInner: { maxWidth: "1000px", margin: "0 auto" },
  techGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px",
  },
  techCard: {
    background: "rgba(0,0,0,0.2)",
    border: "1px solid rgba(124, 196, 159, 0.12)",
    borderRadius: "16px", padding: "28px 24px",
  },
  techIcon: { marginBottom: "16px" },
  techLabel: {
    fontSize: "15px", fontWeight: 600, color: "#d4edda",
    marginBottom: "8px",
  },
  techDesc: {
    fontSize: "13px", lineHeight: 1.65,
    color: "rgba(212, 237, 218, 0.55)",
  },

  footer: {
    background: "#0a170a",
    borderTop: "1px solid rgba(124, 196, 159, 0.08)",
    padding: "48px 32px",
  },
  footerInner: {
    maxWidth: "1000px", margin: "0 auto",
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    flexWrap: "wrap", gap: "32px",
  },
  footerLeft: { maxWidth: "360px" },
  footerNote: {
    fontSize: "13px", lineHeight: 1.6,
    color: "rgba(232, 240, 232, 0.35)",
    marginTop: "12px",
  },
  footerLinks: {
    display: "flex", flexDirection: "column", gap: "10px",
  },
  footerLink: {
    color: "rgba(232, 240, 232, 0.45)", fontSize: "13px", fontWeight: 500,
    transition: "color 0.2s",
  },
};

export default App;
