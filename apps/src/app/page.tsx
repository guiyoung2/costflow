"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import s from "./landing.module.css";

interface ParticleNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  hub: boolean;
}

export default function LandingPage() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const cbRef = useRef<HTMLDivElement>(null);
  const ccRef = useRef<HTMLSpanElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const hcRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cv = cvRef.current;
    const navEl = navRef.current;
    if (!cv || !navEl) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    let nodes: ParticleNode[] = [];
    const mouse = { x: -9999, y: -9999 };
    const targetMouse = { x: -9999, y: -9999 };
    let rafId: number;

    function setup() {
      W = cv!.width = window.innerWidth;
      H = cv!.height = window.innerHeight;
      const count = Math.min(Math.floor((W * H) / 9000), 120);
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() < 0.08 ? Math.random() * 2.5 + 2 : Math.random() * 1.2 + 0.5,
        phase: Math.random() * Math.PI * 2,
        hub: i < count * 0.08,
      }));
    }

    function tick() {
      ctx!.clearRect(0, 0, W, H);
      const t = Date.now() / 1000;

      mouse.x += (targetMouse.x - mouse.x) * 0.1;
      mouse.y += (targetMouse.y - mouse.y) * 0.1;

      if (targetMouse.x > 0) {
        const g = ctx!.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 260);
        g.addColorStop(0, "rgba(34,211,238,0.07)");
        g.addColorStop(1, "rgba(34,211,238,0)");
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, W, H);
      }

      const ax = W * 0.5 + Math.sin(t * 0.2) * W * 0.25;
      const ay = H * 0.4 + Math.cos(t * 0.15) * H * 0.2;
      const ag = ctx!.createRadialGradient(ax, ay, 0, ax, ay, Math.max(W, H) * 0.6);
      ag.addColorStop(0, "rgba(34,211,238,0.03)");
      ag.addColorStop(1, "rgba(34,211,238,0)");
      ctx!.fillStyle = ag;
      ctx!.fillRect(0, 0, W, H);

      const LINK = 130, ML = 200;

      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > LINK) continue;
          const mx = (nodes[i].x + nodes[j].x) / 2 - mouse.x;
          const my = (nodes[i].y + nodes[j].y) / 2 - mouse.y;
          const md = Math.sqrt(mx * mx + my * my);
          const boost = md < ML ? Math.pow(1 - md / ML, 1.5) : 0;
          const alpha = (1 - d / LINK) * (0.12 + boost * 0.55);
          const width = 0.8 + boost * 1.8 + (nodes[i].hub || nodes[j].hub ? 0.5 : 0);
          ctx!.beginPath();
          ctx!.moveTo(nodes[i].x, nodes[i].y);
          ctx!.lineTo(nodes[j].x, nodes[j].y);
          ctx!.strokeStyle = `rgba(34,211,238,${alpha})`;
          ctx!.lineWidth = width;
          ctx!.stroke();
        }
      }

      nodes.forEach((n) => {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const md = Math.sqrt(dx * dx + dy * dy);
        const nearMouse = md < ML;
        const boost = nearMouse ? Math.pow(1 - md / ML, 1.2) : 0;
        const pulse = 0.5 + 0.5 * Math.sin(t * (n.hub ? 1.2 : 1.8) + n.phase);
        const alpha = nearMouse ? 0.9 + boost * 0.1 : (n.hub ? 0.5 + pulse * 0.4 : pulse * 0.45);
        const r = n.r * (nearMouse ? 1 + boost * 1.5 : (n.hub ? 1 + pulse * 0.4 : 1));

        if (n.hub) {
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, r + 6 + pulse * 4, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(34,211,238,${0.04 + pulse * 0.04})`;
          ctx!.fill();
        }
        if (nearMouse) {
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, r + 10 * boost, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(34,211,238,${0.12 * boost})`;
          ctx!.fill();
        }
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(34,211,238,${alpha})`;
        ctx!.fill();
      });

      rafId = requestAnimationFrame(tick);
    }

    function onScroll() {
      navEl!.classList.toggle(s.navScrolled, window.scrollY > 10);
    }

    function onMouseMove(e: MouseEvent) {
      targetMouse.x = e.clientX;
      targetMouse.y = e.clientY;
    }

    function onMouseLeave() {
      targetMouse.x = -9999;
      targetMouse.y = -9999;
    }

    function countUp(
      el: HTMLSpanElement | null,
      end: number,
      fmt: (v: number) => string,
      ms = 1800
    ) {
      if (!el) return;
      let start: number | undefined;
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / ms, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(end * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(s.rvIn);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    setup();
    rafId = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("resize", setup);
    window.addEventListener("scroll", onScroll);

    const counterTimer = setTimeout(() => {
      countUp(ccRef.current, 4.32, (v) => "$" + v.toFixed(2));
      countUp(tcRef.current, 1240000, (v) =>
        v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : Math.round(v).toLocaleString()
      );
      countUp(hcRef.current, 68, (v) => Math.round(v) + "%");
      if (cbRef.current) cbRef.current.style.width = "68%";
    }, 300);

    document.querySelectorAll(`.${s.rv}`).forEach((el) => obs.observe(el));

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(counterTimer);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", setup);
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, []);

  const chartBars = [
    { h: "42%", o: 0.22, delay: ".05s" },
    { h: "67%", o: 0.22, delay: ".1s" },
    { h: "51%", o: 0.22, delay: ".15s" },
    { h: "88%", o: 0.8,  delay: ".2s",  glow: true },
    { h: "72%", o: 0.35, delay: ".25s" },
    { h: "56%", o: 0.22, delay: ".3s" },
    { h: "33%", o: 0.22, delay: ".35s" },
  ];

  return (
    <div style={{ background: "#060a0e", color: "#f0f0f2", minHeight: "100vh", overflowX: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" }}>
      <canvas ref={cvRef} className={s.cv} />

      <nav ref={navRef} className={s.nav}>
        <div className={s.logo}>
          Cost<span style={{ color: "#22d3ee" }}>flow</span>
        </div>
        <Link href="/login" className={s.loginBtn}>Login →</Link>
      </nav>

      <div className={s.layer}>
        {/* ── HERO ── */}
        <section className={s.hero}>
          <div className={s.heroGrid} />
          <div className={s.heroInner}>
            <div>
              <div className={s.tag}>
                <div className={s.tagDot} />
                Claude Code · Codex Analytics
              </div>
              <h1 className={s.h1}>
                Token cost,<br />
                <em style={{ fontStyle: "normal", color: "#22d3ee" }}>finally</em><br />
                visible.
              </h1>
              <p className={s.sub}>
                Claude Code와 Codex 사용량을 세션별로 추적합니다.<br />
                추측 말고 데이터로, 지금 바로.
              </p>
              <div className={s.ctaRow}>
                <Link href="/login" className={s.btn}>
                  Get Started
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <span className={s.note}>무료 · 설치 5분</span>
              </div>
            </div>

            {/* Live Widget */}
            <div className={s.widget}>
              <div className={s.wBar}>
                <div className={s.dot} style={{ background: "#ff5f57" }} />
                <div className={s.dot} style={{ background: "#ffbd2e" }} />
                <div className={s.dot} style={{ background: "#28ca41" }} />
                <span className={s.wTitle}>costflow — live</span>
              </div>
              <div className={s.wBody}>
                <div className={s.mRow}>
                  <div className={s.mc}>
                    <div className={s.ml}>Today Cost</div>
                    <div className={`${s.mv} ${s.mvAccent}`}>
                      <span ref={ccRef}>$0.00</span>
                    </div>
                    <div className={`${s.ms} ${s.up}`}>↑ +$0.80 vs yesterday</div>
                  </div>
                  <div className={s.mc}>
                    <div className={s.ml}>Tokens</div>
                    <div className={s.mv}><span ref={tcRef}>0</span></div>
                    <div className={s.ms}>this session</div>
                  </div>
                </div>
                <div className={s.mc}>
                  <div className={s.ml}>Cache Hit Rate</div>
                  <div className={s.mv}><span ref={hcRef}>0%</span></div>
                  <div className={s.cbWrap}>
                    <div className={s.cbBg}>
                      <div ref={cbRef} className={s.cbFill} />
                    </div>
                  </div>
                </div>
                <div className={s.cw}>
                  <div className={s.ch}>
                    <span className={s.clb}>7-day usage</span>
                    <span className={s.cv2}>1.24M tok</span>
                  </div>
                  <div className={s.bars}>
                    {chartBars.map((bar, i) => (
                      <div
                        key={i}
                        className={s.bar}
                        style={{
                          height: bar.h,
                          opacity: bar.o,
                          animationDelay: bar.delay,
                          ...(bar.glow ? { boxShadow: "0 0 8px rgba(34,211,238,.5)" } : {}),
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className={s.si}>
                    <div className={s.sd} style={{ background: "#22d3ee" }} />
                    <span className={s.sn}>costflow/dashboard</span>
                    <span className={s.st}>248k tok</span>
                  </div>
                  <div className={s.si}>
                    <div className={s.sd} style={{ background: "#4b5563" }} />
                    <span className={s.sn}>my-project/api</span>
                    <span className={s.st}>91k tok</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className={s.features}>
          <div className={s.eyebrow}>Why Costflow</div>
          <div className={s.secTitle}>
            필요한 것만.<br />정확하게.
          </div>
          <div className={s.fg}>
            <div className={`${s.fc} ${s.fcLg} ${s.rv}`}>
              <div className={s.fi}>◈</div>
              <div className={`${s.fn} ${s.fnLg}`}>세션별 실시간 추적</div>
              <div className={s.fd}>
                Claude Code hook과 연동해 매 턴마다 토큰·비용을 기록합니다. 세션이 끝나면 바로 대시보드에 반영됩니다.
              </div>
              <div className={s.miniC}>
                <div style={{ fontSize: "10px", color: "#4b5563", fontFamily: "monospace" }}>LIVE · session #42</div>
                <div className={s.miniBars}>
                  <div className={s.mb} style={{ height: "40%", opacity: 0.3 }} />
                  <div className={s.mb} style={{ height: "70%", opacity: 0.45 }} />
                  <div className={s.mb} style={{ height: "55%", opacity: 0.35 }} />
                  <div className={s.mb} style={{ height: "90%", opacity: 0.8, boxShadow: "0 0 6px rgba(34,211,238,.5)" }} />
                  <div className={s.mb} style={{ height: "65%", opacity: 0.5 }} />
                </div>
              </div>
            </div>
            <div className={`${s.fc} ${s.rv} ${s.d1}`}>
              <div className={s.fi}>⬡</div>
              <div className={s.fn}>Claude + Codex 통합</div>
              <div className={s.fd}>두 도구의 사용량을 하나의 대시보드에서 비교합니다.</div>
            </div>
            <div className={`${s.fc} ${s.rv} ${s.d2}`}>
              <div className={s.fi}>◎</div>
              <div className={s.fn}>캐시 절감 분석</div>
              <div className={s.fd}>캐시 히트율과 절감 비용을 수치로 확인하세요.</div>
            </div>
            <div className={`${s.fc} ${s.rv} ${s.d1}`}>
              <div className={s.fi}>◇</div>
              <div className={s.fn}>프로젝트별 드릴다운</div>
              <div className={s.fd}>어느 프로젝트에서 얼마나 썼는지 세션 단위로 파악합니다.</div>
            </div>
            <div className={`${s.fc} ${s.rv} ${s.d2}`}>
              <div className={s.fi}>⚡</div>
              <div className={s.fn}>설치 5분</div>
              <div className={s.fd}>npm install 하나로 시작. 별도 인프라 없이 즉시 연동됩니다.</div>
            </div>
          </div>
        </section>

        {/* ── DASHBOARD PREVIEW ── */}
        <section className={s.preview}>
          <div className={s.prevInner}>
            <div className={s.prevHdr}>
              <div>
                <div className={s.eyebrow}>Preview</div>
                <div className={s.secTitle} style={{ marginBottom: 0 }}>대시보드 미리보기</div>
              </div>
              <Link href="/login" className={s.prevLink}>지금 시작하기 →</Link>
            </div>
            <div className={`${s.pw} ${s.rv}`}>
              <div className={s.pb}>
                <div className={s.dot} style={{ background: "#ff5f57" }} />
                <div className={s.dot} style={{ background: "#ffbd2e" }} />
                <div className={s.dot} style={{ background: "#28ca41" }} />
                <span className={s.pu}>costflow.app / dashboard</span>
              </div>
              <div className={s.pbody}>
                <div className={s.psb}>
                  <div className={`${s.pi} ${s.piOn}`} />
                  <div className={s.pi} />
                  <div className={s.pi} />
                  <div className={s.pi} />
                </div>
                <div className={s.pm}>
                  <div className={s.psr}>
                    {[
                      { label: "Input",  value: "842K" },
                      { label: "Output", value: "391K" },
                      { label: "Cache",  value: "68%" },
                      { label: "Cost",   value: "$4.32" },
                    ].map((stat) => (
                      <div key={stat.label} className={s.ps}>
                        <div className={s.psl}>{stat.label}</div>
                        <div className={s.psv}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className={s.pca}>
                    <div className={s.pct}>DAILY TOKEN USAGE · 7 DAYS</div>
                    <div className={s.pbs}>
                      {[38, 62, 48, 85, 71, 54, 31].map((h, i) => (
                        <div key={i} className={s.pbar} style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={s.cta}>
          <div className={`${s.ctaInner} ${s.rv}`}>
            <div className={s.ct}>
              지금 얼마 쓰고<br />있는지 아세요?
            </div>
            <div className={s.cs}>
              5분이면 연동됩니다. 오늘의 토큰·비용을 바로 확인하세요.
            </div>
            <Link href="/login" className={`${s.btn} ${s.btnLg}`}>
              무료로 시작하기
              <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
