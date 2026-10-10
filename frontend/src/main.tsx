import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, CircleAlert, ExternalLink, FileCheck2, Fingerprint, GitBranch, Layers3, LoaderCircle, LockKeyhole, Network, Plus, RefreshCw, ShieldCheck, Stamp, Wallet, X } from "lucide-react";
import { CONTRACT_ADDRESS, connectWallet, currentWallet, errorMessage, explorerContract, explorerTx, formatGen, parseGen, readProject, readProjects, sameAddress, short, watchWallet, writeMethod, type TxStatus } from "./genlayer";
import { accountingPresentation, canonicalProofCase, dependencyPresentation, milestoneActionFor, projectActionFor, stateLabel, stateTone } from "./product";
import "./styles.css";
import "./control-system.css";

type Milestone = Record<string, any> & { milestone_id: string; state: string; tranche: number | string; dependencies: string[]; current_submission?: Record<string, any> | null };
type Project = Record<string, any> & { project_id: string; state: string; milestone_ids: string[]; milestones: Milestone[]; client: string; contributor: string };
const CANONICAL_PROJECT_ID = "milestonevault-live-20261009-b";
const HISTORICAL_PROJECT_ID = "milestonevault-live-20261009-a";
const CANONICAL_PROOF_TRANSACTIONS = [
  ["M1 adjudication", "0xd825e8ad78ffffa31eb73a850ef5477e4cec18f82be2995cf8ba7121b0d0d494"],
  ["M1 exact payout", "0x092a131be3759b569911f68d660187dfc0b15b712b97ac8832c064b4ed0f1758"],
  ["M2 rejection", "0x03c9a0c8e9be599282f7dfebdc43b7a62150c6b2ff8edc9517170b4101ce3291"],
  ["M4 unresolved", "0x01c35dcb02fac783bedf4a01572b5162b1c5541f3c1e314c669bad6136925af2"],
  ["Project close / refund", "0x49cb744ea531e3175624156d7faca289357f3a806d32fd040dab8aba35f39e48"],
] as const;

const DEFAULT_CRITERIA = JSON.stringify([
  { criterion_id: "scope", requirement: "The submitted artifact is for the frozen deliverable scope.", required: true },
  { criterion_id: "quality", requirement: "The artifact satisfies the frozen quality requirement.", required: true },
  { criterion_id: "note", requirement: "Optional contextual note is addressed when available.", required: false },
]);
const DEFAULT_EVIDENCE = JSON.stringify([{ evidence_id: "deliverable", requirement: "The public deliverable packet.", required: true }]);
const DEMO_STAGES = [
  { id: "design", title: "Design specification", definition: "A versioned design packet that names the interfaces, user journeys and acceptance boundaries.", amount: "0.01", dependencies: [] as string[] },
  { id: "implementation", title: "Implementation", definition: "A working implementation that follows the frozen design and passes the listed acceptance checks.", amount: "0.01", dependencies: ["design"] },
  { id: "handoff", title: "Deployment + handoff", definition: "A deployment record, operator runbook and handoff packet for the accepted implementation.", amount: "0.01", dependencies: ["implementation"] },
];

function parseStored<T>(value: unknown, fallback: T): T { if (typeof value !== "string") return (value as T) ?? fallback; try { return JSON.parse(value) as T; } catch { return fallback; } }
function genAmount(value: unknown) { try { return formatGen(BigInt(String(value))); } catch { return "—"; } }
function getRoute() { const path = window.location.pathname.replace(/\/+$/, "") || "/"; const match = path.match(/^\/projects\/([^/]+)(?:\/milestones\/([^/]+))?$/); if (match) return { page: match[2] ? "milestone" : "project", projectId: decodeURIComponent(match[1]), milestoneId: match[2] ? decodeURIComponent(match[2]) : undefined }; return { page: ["/", "/projects", "/create", "/proof"].includes(path) ? path.slice(1) || "home" : "home" }; }
function navigate(path: string) { window.history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); window.scrollTo({ top: 0, behavior: "smooth" }); }

function App() {
  const [route, setRoute] = useState(getRoute);
  const [account, setAccount] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tx, setTx] = useState<TxStatus | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => { const onPop = () => setRoute(getRoute()); window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop); }, []);
  useEffect(() => { void currentWallet().then(setAccount).catch(() => undefined); return watchWallet(setAccount); }, []);
  const load = useCallback(async () => { if (!CONTRACT_ADDRESS) return; setLoading(true); setError(""); try { const ids = await readProjects(); const requestedIds = route.page === "proof" ? [CANONICAL_PROJECT_ID] : ids.filter((id) => id !== HISTORICAL_PROJECT_ID); setProjects(await Promise.all(requestedIds.map(async (id) => await readProject(id) as Project))); } catch (cause) { setError(errorMessage(cause)); } finally { setLoading(false); } }, [route.page]);
  useEffect(() => { if (["projects", "project", "milestone", "proof"].includes(route.page)) void load(); }, [load, refreshToken, route.page]);
  const write = async (method: string, args: unknown[], value = 0n) => { try { const signer = account || await connectWallet(); setAccount(signer); const hash = await writeMethod(signer, method, args, value, setTx); setTx({ stage: "CONFIRMED", message: "Authoritative project state updated.", hash }); setRefreshToken((token) => token + 1); return hash; } catch (cause) { setTx({ stage: "EXECUTION FAILED", message: errorMessage(cause), error: errorMessage(cause) }); return null; } };
  const project = route.projectId ? projects.find((item) => item.project_id === route.projectId) : undefined;
  return <div className="site-shell"><Header account={account} readOnly={route.page === "proof"} onConnect={async () => { try { setAccount(await connectWallet()); } catch (cause) { setTx({ stage: "WALLET ERROR", message: errorMessage(cause), error: errorMessage(cause) }); } }} />
    {route.page === "home" && <Landing />}
    {route.page === "projects" && <Registry projects={projects} loading={loading} error={error} onRefresh={() => void load()} />}
    {route.page === "project" && <ProjectDossier project={project} loading={loading} error={error} account={account} tx={tx} onWrite={write} />}
    {route.page === "milestone" && <MilestoneDossier project={project} milestoneId={route.milestoneId} loading={loading} error={error} account={account} tx={tx} onWrite={write} />}
    {route.page === "create" && <CreatePage account={account} onWrite={write} />}
    {route.page === "proof" && <ProofPage project={projects.find((item) => item.project_id === CANONICAL_PROJECT_ID)} loading={loading} error={error} onRefresh={() => void load()} />}
    <Footer />
  </div>;
}


function Header({ account, readOnly, onConnect }: { account: string | null; readOnly?: boolean; onConnect: () => void }) {
 return <header className="site-header"><div className="header-inner">
   <button className="brand" onClick={()=>navigate("/")} aria-label="MilestoneVault home">
     <span className="brand-mark"><GitBranch size={23}/></span><span><strong>MILESTONE<span>VAULT</span></strong><small>PROJECT CONTROL / GENLAYER</small></span>
   </button>
   <nav aria-label="Main navigation">
     <button onClick={()=>navigate("/projects")}>Projects</button>
     <button onClick={()=>navigate("/proof")}>Live verification</button>
     <button className="nav-create" onClick={()=>navigate("/create")}><Plus size={13}/> New project</button>
   </nav>
   <div className="header-meta"><a href={explorerContract()} target="_blank" rel="noreferrer"><i/> STUDIO DEV <ExternalLink size={12}/></a>
     {readOnly?<span className="observer-badge">LIVE / READ-ONLY</span>:<button className="wallet-button" onClick={onConnect}><Wallet size={14}/>{account?short(account,5,4):"Connect wallet"}</button>}
   </div>
 </div></header>;
}



function ControlState({ state }: {state:string}) { return <span className={`control-state ${stateTone(state)}`}>{stateLabel(state)}</span>; }

type ScheduleEntry = { id:string; name:string; sub:string; state:string; amount:string; left?:number; width?:number };
const HERO_SCHEDULE:ScheduleEntry[]=[
 {id:"01",name:"Design specification",sub:"ROOT / M1",state:"PAID",amount:"0.01",left:2,width:26},
 {id:"02",name:"Implementation",sub:"AFTER M1",state:"REJECTED",amount:"0.01",left:30,width:37},
 {id:"03",name:"Release handoff",sub:"AFTER M2",state:"BLOCKED",amount:"0.01",left:70,width:19},
 {id:"04",name:"Independent verification",sub:"ROOT / M4",state:"UNRESOLVED",amount:"0.01",left:4,width:52},
];
function ScheduleGrid({entries,heading="WORK PACKAGES",compact=false}:{entries:ScheduleEntry[];heading?:string;compact?:boolean}) {
 return <div className={`control-schedule ${compact?"is-compact":""}`}>
  <div className="control-schedule-top"><div style={{display:"flex",alignItems:"center",gap:11}}><span className="control-schedule-dot"><i/><i/><i/></span><strong>{heading}</strong></div><span>DEPENDENCY TRACKER / 01—04</span></div>
  <div className="control-grid-head"><span>Milestone</span><span>Execution window</span><span>Tranche</span><span>State</span></div>
  {entries.map(e=><div className="control-grid-row" key={e.id}>
    <div className="control-grid-id"><strong>{e.name}</strong><small>{e.id} · {e.sub}</small></div>
    <div className="control-grid-track"><span className={`control-grid-bar ${stateTone(e.state)}`} style={{marginLeft:`${e.left??0}%`,width:`${e.width??65}%`}}/></div>
    <span className="control-amount">{e.amount}</span><ControlState state={e.state}/>
  </div>)}
  <div className="control-schedule-bottom"><span>FROZEN RULES · DETERMINISTIC TRANCHE SETTLEMENT</span><strong>GEN / ONCHAIN</strong></div>
 </div>;
}

function Landing() {
 return <main className="control-home">
  <section className="control-hero"><div className="page-width control-hero-inner">
    <div><div className="control-kicker">FUNDED PROJECT CONTROL</div>
      <h1>Work moves.<br/><span>Funds follow.</span></h1>
      <p>Build a dependency-aware delivery plan, fund its exact tranches, and release value only when each stage satisfies its frozen acceptance criteria.</p>
      <div className="control-hero-actions">
        <button className="button button-dark" onClick={()=>navigate(`/projects/${CANONICAL_PROJECT_ID}`)}>Explore live project <ArrowUpRight size={16}/></button>
        <button className="control-ghost-button" onClick={()=>navigate("/create")}>Create a project <ArrowRight size={15}/></button>
      </div>
      <div className="control-hero-foot"><span>32 MAX MILESTONES</span><span>CRITERION-LEVEL AI REVIEW</span><span>EXACT GEN RELEASE</span></div>
    </div>
    <div><ScheduleGrid entries={HERO_SCHEDULE} heading="REFERENCE PROJECT / VERIFIED LIVE STATES"/></div>
  </div></section>
  <div className="page-width">
    <section className="control-benefits">
      <div className="control-benefit"><GitBranch size={22}/><h3>Dependencies are enforceable.</h3><p>Upstream acceptance unlocks the correct successor. Failed work blocks its dependents, without freezing unrelated milestones.</p></div>
      <div className="control-benefit"><ShieldCheck size={22}/><h3>Acceptance has a real standard.</h3><p>Each stage commits criteria and evidence before funding. GenLayer judges meaning; the contract applies the result.</p></div>
      <div className="control-benefit"><LockKeyhole size={22}/><h3>Every tranche is accounted for.</h3><p>Earned value pays the contributor exactly once. Unused terminal tranches return to the client on safe close.</p></div>
    </section>
    <section className="control-live-teaser">
      <div className="control-section-heading"><div><span className="mono-label">CANONICAL STUDIO DEV PROJECT</span><h2>Four milestones. One closed ledger.</h2></div><p>See the onchain acceptance, rejection, blocked dependency and unavailable-evidence paths in a single funded project.</p></div>
      <div className="control-teaser-grid">
        <div className="control-teaser-display"><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><strong style={{fontSize:14}}>MilestoneVault / live-20261009-b</strong><ControlState state="CLOSED"/></div><div className="control-grid-head"><span>Work package</span><span>Release path</span><span>GEN</span><span>Outcome</span></div>{HERO_SCHEDULE.map(e=><div className="control-grid-row" key={e.id}><div className="control-grid-id"><strong>{e.name}</strong><small>{e.sub}</small></div><div className="control-grid-track"><span className={`control-grid-bar ${stateTone(e.state)}`} style={{marginLeft:`${e.left}%`,width:`${e.width}%`}}/></div><span className="control-amount">{e.amount}</span><ControlState state={e.state}/></div>)}</div>
        <aside className="control-teaser-summary"><div><span>RETURNED TO CLIENT</span><strong>0.03</strong><p>GEN of 0.04 funded. A 0.01 GEN tranche was paid for accepted work; everything else was safely closed.</p></div><button onClick={()=>navigate("/proof")}>Inspect verified settlement <ArrowUpRight size={17}/></button></aside>
      </div>
    </section>
  </div>
 </main>;
}



function Registry({ projects, loading, error, onRefresh }: { projects: Project[]; loading: boolean; error: string; onRefresh: () => void }) {
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState("ALL");
 const filtered=projects.filter(p=>(p.title+" "+p.project_id+" "+p.scope).toLowerCase().includes(search.toLowerCase())&&(filter==="ALL"||p.state===filter));
 return <main className="page-width control-workspace">
  <div className="control-app-head"><div><div className="mono-label">WORKSPACE / PROJECT REGISTER</div><h1>Project control center</h1><p>Funded schedules, acceptance state, dependencies and GEN tranches. Every record is read from the deployed contract.</p></div><button className="button button-dark" onClick={()=>navigate("/create")}><Plus size={16}/> Build a project</button></div>
  <div className="control-toolbar"><div className="control-toolbar-left"><input className="control-search" placeholder="Search projects or reference…" aria-label="Search projects" value={search} onChange={e=>setSearch(e.target.value)}/><div className="control-tabs">{["ALL","ACTIVE","COMPLETED","CLOSED"].map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f==="ALL"?"All projects":stateLabel(f)}</button>)}</div></div><button className="icon-button" aria-label="Refresh live registry" onClick={onRefresh}><RefreshCw size={17}/></button></div>
  {error&&<Notice message={error}/>}
  {loading?<LoadingState label="Synchronizing onchain project register…"/>:<div className="control-registry">
    <div className="control-registry-head"><span>Project / reference</span><span>Milestones</span><span>Progress</span><span>Funded</span><span>Lifecycle</span><span/></div>
    {filtered.length?filtered.map(p=>{
     const ms=p.milestones||[], paid=ms.filter(m=>m.state==="PAID").length;
     return <button key={p.project_id} className="control-registry-row" onClick={()=>navigate(`/projects/${encodeURIComponent(p.project_id)}`)}>
      <div className="control-registry-name"><strong>{p.title}</strong><small>{p.project_id}</small></div>
      <strong>{ms.length} work packages</strong>
      <div className="control-progress"><div className="control-progress-rail"><span style={{width:`${ms.length?paid/ms.length*100:0}%`}}/></div><small>{paid}/{ms.length} paid</small></div>
      <strong className="control-registry-amount">{genAmount(p.initial_escrow||p.total_tranches)}</strong>
      <ControlState state={p.state}/><ArrowUpRight size={17}/>
     </button>
    }):<EmptyState title="No matching projects" copy="Try clearing your filters or create a funded project schedule."/>}
  </div>}
 </main>;
}


function ProjectCard({ project }: { project: Project }) { const milestones = project.milestones || []; const paid = milestones.filter((item) => item.state === "PAID").length; return <button className="project-card" onClick={() => navigate(`/projects/${encodeURIComponent(project.project_id)}`)}><div className="card-top"><span className="mono-label">{project.project_id}</span><StatePill state={project.state} /></div><h2>{project.title}</h2><p>{project.scope}</p><div className="card-graph">{milestones.map((item, index) => <div className={`card-node ${stateTone(item.state)}`} key={item.milestone_id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><em>{item.state}</em></div>)}</div><div className="card-foot"><span>{paid} / {milestones.length} tranches paid</span><span>{genAmount(project.total_tranches)} planned <ArrowUpRight size={14} /></span></div></button>; }


function ProjectDossier({ project, loading, error, account, tx, onWrite }: { project?: Project; loading: boolean; error: string; account: string | null; tx: TxStatus | null; onWrite: (method: string, args: unknown[], value?: bigint) => Promise<string | null> }) {
 const [selected,setSelected]=useState("");
 if (loading&&!project) return <main className="page-width centered"><LoadingState label="Reading project controls…"/></main>;
 if (!project) return <main className="page-width centered"><Notice message={error||"The project is unavailable."}/></main>;
 const ms=project.milestones||[], choice=ms.find(m=>m.milestone_id===selected)||ms[0], accounting=accountingPresentation(project.accounting||{});
 return <main className="page-width control-workspace">
   <div className="control-breadcrumb"><button onClick={()=>navigate("/projects")}>Project register</button><ArrowRight size={12}/><span>{project.project_id}</span></div>
   <div className="control-project-head"><div><span className="mono-label">PROJECT WORKSPACE / DEPENDENCY CONTROL</span><h1>{project.title}</h1><p>{project.scope}</p></div><ControlState state={project.state}/></div>
   <div className="control-summary-strip">
    <div><span>Funded capital</span><strong>{genAmount(project.initial_escrow||project.total_tranches)}</strong></div>
    <div><span>Released</span><strong>{genAmount(accounting.values.paidTotal)}</strong></div>
    <div><span>Still locked</span><strong>{genAmount(accounting.values.stillLocked)}</strong></div>
    <div><span>Refundable*</span><strong>{genAmount(accounting.values.refundableAmount)}</strong></div>
    <div><span>Work packages</span><strong>{ms.length}</strong></div>
   </div>
   <div className="control-workspace-grid">
    <section className="control-panel">
     <div className="control-panel-top"><div><span className="mono-label">LIVE DEPENDENCY SCHEDULE</span><h2 style={{marginTop:6}}>Execution map</h2></div><small>SELECT A WORK PACKAGE TO INSPECT</small></div>
     <ControlGantt milestones={ms} selected={choice?.milestone_id||""} onSelect={setSelected}/>
     <div className="control-panel-body" style={{borderTop:"1px solid #e4eaf2"}}><div className="control-kicker" style={{color:"#5d7496"}}>SETTLEMENT RULE</div><p style={{fontSize:12,color:"#667a93",lineHeight:1.75,margin:"15px 0 0"}}>Only accepted predecessor work unlocks a dependent stage. A rejected predecessor blocks its downstream tranches. Schedules show dependency order, not fabricated calendar dates.</p></div>
    </section>
    <aside className="control-rail-stack">
     {choice&&<section className="control-panel control-inspector">
       <div className="control-panel-top"><h2>Work package inspector</h2><ControlState state={choice.state}/></div>
       <div className="control-panel-body"><span className="mono-label">{choice.milestone_id}</span><h3 className="control-inspector-title">{choice.title}</h3><p className="control-inspector-text">{choice.deliverable_definition}</p>
         <dl className="control-inspector-dl">
           <div><dt>Tranche</dt><dd>{genAmount(choice.tranche)}</dd></div>
           <div><dt>Dependencies</dt><dd>{choice.dependencies?.length?choice.dependencies.join(", "):"Root / none"}</dd></div>
           <div><dt>Repair budget</dt><dd>{String(choice.repair_budget??0)}</dd></div>
           <div><dt>Paid to contributor</dt><dd>{genAmount(choice.paid_amount||0)}</dd></div>
         </dl>
         <div className="control-inspector-action"><button className="button button-dark" onClick={()=>navigate(`/projects/${encodeURIComponent(project.project_id)}/milestones/${encodeURIComponent(choice.milestone_id)}`)}>Open work package <ArrowUpRight size={15}/></button></div>
       </div>
     </section>}
     <ActionRail project={project} account={account} canClient={sameAddress(account,project.client)} canContributor={sameAddress(account,project.contributor)} onWrite={onWrite} tx={tx}/>
     <Accounting accounting={project.accounting||{}} project={project}/>
    </aside>
   </div>
 </main>;
}



function ControlGantt({ milestones, selected="", onSelect, readOnly=false }: { milestones: Milestone[]; selected?:string; onSelect?:(id:string)=>void;readOnly?:boolean }) {
 const count=Math.max(1,milestones.length);
 return <div className="control-gantt"><div className="control-gantt-head"><span>WORK PACKAGE / PREDECESSOR</span><span>DEPENDENCY-ORDER TRACK</span><span style={{textAlign:"right"}}>TRANCHE</span></div>
 {milestones.map((m,i)=>{
  const deps=m.dependencies||[], blocked=deps.length&&["BLOCKED","LOCKED"].includes(m.state);
  return <button type="button" key={m.milestone_id} className={`control-gantt-row ${selected===m.milestone_id?"selected":""}`} onClick={()=>onSelect?.(m.milestone_id)} aria-label={`Inspect ${m.title}, ${m.state}`}>
    <div className="control-gantt-name"><span className="control-gantt-ordinal">{String(i+1).padStart(2,"0")}</span><div><strong>{m.title}</strong><small>{deps.length?`AFTER ${deps.join(", ")}`:"ROOT / NO PREDECESSOR"}</small></div></div>
    <div className="control-gantt-track"><span className={`control-gantt-bar ${stateTone(m.state)}`} style={{left:`${Math.min(i*15,65)}%`,width:`${Math.max(18,72-i*8)}%`}}/>{blocked&&<LockKeyhole size={13} className="control-gantt-arrow"/>}</div>
    <div className="control-gantt-amount"><strong>{genAmount(m.tranche)}</strong><ControlState state={m.state}/></div>
  </button>;
 })}
 </div>;
}


function MilestoneRow({ milestone, index }: { milestone: Milestone; index: number }) { return <button className="milestone-row" onClick={() => navigate(`/projects/${encodeURIComponent(milestone.project_id)}/milestones/${encodeURIComponent(milestone.milestone_id)}`)}><span className="milestone-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{milestone.title}</strong><small>{milestone.dependencies?.length ? `Depends on ${milestone.dependencies.join(", ")}` : "Root milestone"} · deadline {milestone.deadline_utc}</small></div><span className="milestone-amount">{genAmount(milestone.tranche)}</span><StatePill state={milestone.state} /><ArrowUpRight size={17} /></button>; }
function ActionRail({ project, account, canClient, canContributor, onWrite, tx }: { project: Project; account: string | null; canClient: boolean; canContributor: boolean; onWrite: (method: string, args: unknown[], value?: bigint) => Promise<string | null>; tx: TxStatus | null }) { const role = canClient ? "client" : canContributor ? "contributor" : "observer"; const action = projectActionFor(project.state, role); const next = action === "FUND" ? "Fund the exact plan" : action === "ACTIVATE" ? "Activate the funded plan" : action === "CLOSE" ? "Safe close / refund unused" : project.state === "CLOSED" ? "Plan closed" : "Review the next available stage"; return <section className="action-rail"><span className="mono-label">NEXT MOVE</span><h3>{next}</h3><p>{project.state === "DRAFT" ? "Funding freezes the whole milestone packet and its dependency graph." : project.state === "FUNDED" ? "Activation opens only root milestones; dependent stages remain locked." : "Each milestone carries its own evidence and settlement action."}</p>{action === "FUND" && <button className="button button-green wide" onClick={() => void onWrite("fund_project", [project.project_id], BigInt(project.total_tranches))}><LockKeyhole size={15} /> Fund {genAmount(project.total_tranches)}</button>}{action === "ACTIVATE" && <button className="button button-dark wide" onClick={() => void onWrite("activate_project", [project.project_id])}>Activate project <ArrowRight size={15} /></button>}{action === "CLOSE" && <button className="button button-orange wide" onClick={() => void onWrite("close_project", [project.project_id])}>Safe close / refund unused <ArrowRight size={15} /></button>}{!account && <small className="action-hint">Connect a wallet to authorize actions.</small>}{account && !canClient && !canContributor && <small className="action-hint">Connected wallet is not one of the frozen project roles.</small>}{tx && <TxBox tx={tx} />}</section>; }
function MilestoneDossier({ project, milestoneId, loading, error, account, tx, onWrite }: { project?: Project; milestoneId?: string; loading: boolean; error: string; account: string | null; tx: TxStatus | null; onWrite: (method: string, args: unknown[], value?: bigint) => Promise<string | null> }) { const milestone = project?.milestones?.find((item) => item.milestone_id === milestoneId); if (loading && !project) return <main className="page-width centered"><LoadingState label="Loading deliverable dossier…" /></main>; if (!project || !milestone) return <main className="page-width centered"><Notice message={error || "Milestone not found."} /></main>; const canClient = sameAddress(account, project.client); const canContributor = sameAddress(account, project.contributor); const sourceUrl = `https://evidence.milestonevault.example/${project.project_id}/${milestone.milestone_id}`; const manifest = JSON.stringify([{ evidence_id: "deliverable", url: sourceUrl, sha256: "", project_id: project.project_id, milestone_id: milestone.milestone_id }]); const submit = () => void onWrite("submit_milestone", [project.project_id, milestone.milestone_id, manifest]); const repair = () => void onWrite("repair_milestone", [project.project_id, milestone.milestone_id, manifest]); return <main className="page-width milestone-dossier"><button className="back-link" onClick={() => navigate(`/projects/${encodeURIComponent(project.project_id)}`)}><ArrowRight size={14} className="back-icon" /> Back to project packet</button><div className="milestone-hero"><div><div className="eyebrow">Deliverable dossier / {milestone.milestone_id}</div><h1>{milestone.title}</h1><p>{milestone.deliverable_definition}</p></div><StatePill state={milestone.state} /></div><div className="dossier-grid milestone-layout"><section><div className="packet-sheet"><div className="sheet-top"><span>FROZEN ACCEPTANCE PACKET</span><Fingerprint size={15} /></div><h2>What must be true</h2>{(milestone.criteria || []).map((criterion: Record<string, any>) => <div className="criterion" key={criterion.criterion_id}><span className="criterion-dot" /><div><strong>{criterion.requirement}</strong><small>{criterion.required ? "Required for acceptance" : "Optional context"}</small></div>{milestone.adjudication?.criteria?.find((item: Record<string, any>) => item.criterion_id === criterion.criterion_id) && <StatePill state={milestone.adjudication.criteria.find((item: Record<string, any>) => item.criterion_id === criterion.criterion_id).status} />}</div>)}<div className="packet-divider" /><div className="packet-facts"><Meta label="Exact tranche" value={genAmount(milestone.tranche)} /><Meta label="Dependencies" value={milestone.dependencies?.length ? milestone.dependencies.join(" · ") : "None / root stage"} /><Meta label="Repair budget" value={`${milestone.repair_budget} revisions`} /><Meta label="Deadline" value={milestone.deadline_utc} /></div></div>{milestone.adjudication && <ResultCard milestone={milestone} />}</section><aside className="side-rail"><section className="action-rail"><span className="mono-label">DELIVERABLE ACTION</span><h3>{milestone.state === "AVAILABLE" ? "Submit evidence" : milestone.state === "SUBMITTED" ? "Await semantic review" : milestone.state === "ACCEPTED" ? "Release exact tranche" : milestone.state === "REPAIRABLE" ? "Submit bounded repair" : milestone.state === "PAID" ? "Paid once" : milestone.state}</h3><p>{milestone.state === "AVAILABLE" ? "Commit a source manifest bound to this project and milestone." : "The state machine decides which action is legal next."}</p>{milestone.state === "AVAILABLE" && <button className="button button-dark wide" disabled={!canContributor} onClick={submit}><FileCheck2 size={15} /> Submit evidence packet</button>}{milestone.state === "REPAIRABLE" && <button className="button button-dark wide" disabled={!canContributor} onClick={repair}>Submit repair revision <ArrowRight size={15} /></button>}{milestone.state === "SUBMITTED" && <button className="button button-green wide" disabled={!canClient} onClick={() => void onWrite("adjudicate_milestone", [project.project_id, milestone.milestone_id])}><ShieldCheck size={15} /> Run GenLayer review</button>}{milestone.state === "ACCEPTED" && <button className="button button-green wide" disabled={!canContributor} onClick={() => void onWrite("settle_milestone", [project.project_id, milestone.milestone_id])}>Release {genAmount(milestone.tranche)} <ArrowRight size={15} /></button>}{tx && <TxBox tx={tx} />}</section><AccountingMini milestone={milestone} /></aside></div></main>; }
function ResultCard({ milestone }: { milestone: Milestone }) { const result = milestone.adjudication; return <div className={`result-card ${stateTone(milestone.state)}`}><div className="result-card-top"><span className="mono-label">GENLAYER REVIEW / {milestone.result_fingerprint ? short(milestone.result_fingerprint, 10, 6) : "pending"}</span><StatePill state={result.outcome} /></div><h2>{result.outcome === "ACCEPTED" ? "Tranche earned." : result.outcome === "REJECTED" ? "Release held." : "Evidence unresolved."}</h2><p>{result.reasoning}</p>{result.criteria?.map((item: Record<string, any>) => <div className="review-line" key={item.criterion_id}><span>{stateLabel(item.criterion_id)}</span><strong className={`text-${stateTone(item.status)}`}>{item.status}</strong></div>)}</div>; }
function CreatePage({ account, onWrite }: { account: string | null; onWrite: (method: string, args: unknown[], value?: bigint) => Promise<string | null> }) { const [form, setForm] = useState({ projectId: `plan-${Date.now().toString(36)}`, contributor: "", title: "Northstar release plan", scope: "A staged product build with a clear path from design to production handoff." }); const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value }); const create = async () => { if (!form.contributor || !form.title || !form.scope) return; const created = await onWrite("create_project", [form.projectId, form.contributor, form.title, form.scope]); if (!created) return; for (const stage of DEMO_STAGES) { const added = await onWrite("add_milestone", [form.projectId, stage.id, stage.title, stage.definition, DEFAULT_CRITERIA, DEFAULT_EVIDENCE, parseGen(stage.amount), JSON.stringify(stage.dependencies), 1, "2099-01-01T00:00:00Z"]); if (!added) return; } navigate(`/projects/${encodeURIComponent(form.projectId)}`); }; return <main className="page-width create-page"><div className="create-intro"><div className="eyebrow">03 / Build a project plan</div><h1>Draw the<br /><em>release map.</em></h1><p>Start with three stages. The packet freezes before funding, and the graph remains readable after the project is live.</p></div><section className="builder"><div className="builder-side"><span className="builder-step active">01 <strong>Project brief</strong></span><span className="builder-step">02 <strong>Milestone schedule</strong></span><span className="builder-step">03 <strong>Fund the plan</strong></span><p>Creation uses the connected wallet as the client. Each milestone carries a one-revision repair allowance in this starter plan.</p></div><div className="builder-form"><Field label="Project reference" value={form.projectId} onChange={(value) => update("projectId", value)} /><Field label="Contributor wallet" value={form.contributor} onChange={(value) => update("contributor", value)} placeholder="0x…" /><Field label="Plan title" value={form.title} onChange={(value) => update("title", value)} /><label className="field wide"><span>Scope of work</span><textarea value={form.scope} onChange={(event) => update("scope", event.target.value)} rows={4} /></label><div className="schedule-preview"><span className="mono-label">SCHEDULE PREVIEW</span>{DEMO_STAGES.map((stage) => <div className="schedule-row" key={stage.id}><span>{stage.id}</span><strong>{stage.title}</strong><small>{stage.dependencies.length ? `after ${stage.dependencies.join(", ")}` : "root stage"}</small><em>{stage.amount} GEN</em></div>)}</div><button className="button button-dark wide" disabled={!account || !form.contributor} onClick={() => void create()}><LockKeyhole size={15} /> Create frozen project packet <ArrowRight size={15} /></button><small className="form-note">This starter builder submits one project and three immutable milestone records. Funding is a separate exact-value action.</small></div></section></main>; }
function ProofPage({ project, loading, error, onRefresh }: { project?: Project; loading: boolean; error: string; onRefresh: () => void }) {
  if (loading && !project) return <main className="proof-page"><section className="proof-hero page-width"><div className="eyebrow light">04 / Canonical live proof</div><h1>Reading the<br /><em>authoritative ledger.</em></h1><LoadingState label="Reading the canonical project from Studio Dev…" /></section></main>;
  if (!project) return <main className="proof-page"><section className="proof-hero page-width"><div className="eyebrow light">04 / Canonical live proof</div><h1>The live proof<br /><em>is unavailable.</em></h1><p>{error || "The canonical project could not be read from the deployed contract."}</p><button className="button button-green" onClick={onRefresh}><RefreshCw size={15} /> Retry live read</button></section></main>;
  const milestones = project.milestones || [];
  const byId = new Map(milestones.map((milestone) => [milestone.milestone_id, milestone]));
  const accounting = accountingPresentation(project.accounting || {});
  const m1 = byId.get("m1-design-b");
  const m2 = byId.get("m2-build-b");
  const m3 = byId.get("m3-handoff-b");
  const m4 = byId.get("m4-unavailable-b");
  return <main className="proof-page"><section className="proof-hero page-width"><div className="eyebrow light"><span>04 / Canonical live proof</span><span>READ-ONLY / FROM CHAIN</span></div><h1>Follow value<br /><em>through the graph.</em></h1><p>This page reads the deployed MilestoneVault contract directly. No wallet is required to verify the canonical project, its dependency consequence or its final ledger.</p><div className="proof-meta"><span>Studio Dev · 61997</span><span>{project.project_id}</span><span>project {stateLabel(project.state)}</span><span>contract {short(CONTRACT_ADDRESS, 8, 6)}</span></div></section><section className="page-width proof-live"><div className="proof-live-header"><div><span className="mono-label">AUTHORITATIVE PROJECT READ</span><h2>{project.title}</h2><p>{project.scope}</p></div><StatePill state={project.state} /></div><div className="proof-ledger"><ProofMetric label="Initial escrow" value={genAmount(accounting.values.initialEscrow)} /><ProofMetric label="Paid to contributor" value={genAmount(accounting.values.paidTotal)} accent="good" /><ProofMetric label="Client refund" value={genAmount(accounting.values.refundableAmount)} accent="warn" /><ProofMetric label="Ledger" value={accounting.balanced ? "BALANCED" : "CHECK"} accent={accounting.balanced ? "good" : "bad"} /></div><small className="proof-ledger-note">At close: 0.04 GEN = 0.01 GEN paid + 0 GEN locked + 0.03 GEN refundable. Contract principal remaining after close: 0 GEN.</small></section><section className="page-width proof-dependency"><div className="section-heading"><div><span className="mono-label">DEPENDENCY CONSEQUENCE</span><h2>One accepted tranche opens the next. One failed predecessor stops the chain.</h2></div></div><div className="proof-chain"><span className="chain-node good">M1 success</span><ArrowRight size={18} /><span className="chain-node blue">M2 unlocked</span><ArrowRight size={18} /><span className="chain-node bad">M2 rejection</span><ArrowRight size={18} /><span className="chain-node bad">M3 blocked</span></div></section><section className="page-width proof-milestones"><ProofMilestone mark="M1" title="Design" milestone={m1} consequence="Accepted and paid once; M2 became AVAILABLE." /><ProofMilestone mark="M2" title="Implementation" milestone={m2} consequence="Material criterion failure; no payout; M3 became BLOCKED." /><ProofMilestone mark="M3" title="Deployment + handoff" milestone={m3} consequence="Blocked by rejected predecessor; unrelated value was not released." /><ProofMilestone mark="M4" title="Unavailable evidence" milestone={m4} consequence="Independent root case; first unavailable result was terminal UNRESOLVED with repair budget 0." /></section><section className="page-width proof-support"><div className="section-heading"><div><span className="mono-label">SUPPORTING TRANSACTIONS</span><h2>Finalized Studio Dev evidence</h2></div><a className="button button-outline proof-contract-link" href={explorerContract()} target="_blank" rel="noreferrer">Open contract <ExternalLink size={14} /></a></div><div className="proof-tx-list">{CANONICAL_PROOF_TRANSACTIONS.map(([label, hash]) => <a key={hash} href={explorerTx(hash)} target="_blank" rel="noreferrer"><span>{label}</span><code>{short(hash, 12, 8)}</code><ExternalLink size={14} /></a>)}</div><div className="proof-support-footer"><a className="button button-green" href={`/projects/${encodeURIComponent(CANONICAL_PROJECT_ID)}`}>Open canonical project dossier <ArrowUpRight size={15} /></a><span>Historical failed attempt <code>{HISTORICAL_PROJECT_ID}</code> remains documented separately and is not part of this proof.</span></div></section></main>;
}
function ProofMetric({ label, value, accent = "" }: { label: string; value: string; accent?: string }) { return <div className={`proof-metric ${accent}`}><span>{label}</span><strong>{value}</strong></div>; }
function ProofMilestone({ mark, title, milestone, consequence }: { mark: string; title: string; milestone?: Milestone; consequence: string }) { const state = milestone?.state || "MISSING"; return <article className={`proof-milestone ${stateTone(state)}`}><div className="proof-milestone-mark">{mark}</div><div className="proof-milestone-body"><div className="proof-milestone-top"><div><span className="mono-label">{title}</span><h3>{milestone?.milestone_id || "Canonical milestone not found"}</h3></div><StatePill state={state} /></div><p>{consequence}</p><div className="proof-milestone-meta"><span>Tranche <strong>{milestone ? genAmount(milestone.tranche) : "—"}</strong></span><span>Paid <strong>{milestone ? genAmount(milestone.paid_amount || 0) : "—"}</strong></span><span>Depends on <strong>{milestone?.dependencies?.length ? milestone.dependencies.join(", ") : "root stage"}</strong></span></div></div></article>; }
function ProofCase({ proof, mark, tone: caseTone, title, copy }: { proof: ReturnType<typeof canonicalProofCase>; mark: string; tone: string; title: string; copy: string }) { return <article className={`proof-case ${caseTone}`}><span className="proof-mark">{mark}</span><div><span className="mono-label">CASE {mark} / {proof.route}</span><h2>{title}</h2><p>{copy}</p></div><div className="proof-law"><span>SETTLEMENT LAW</span><strong>{proof.settlementLaw}</strong></div></article>; }

function Accounting({ accounting, project }: { accounting: Record<string, any>; project: Project }) { const presentation = accountingPresentation(accounting); return <section className="accounting"><div className="section-heading"><span className="mono-label">TRANCHE LEDGER</span><span className="balance-mark"><Check size={13} /> {presentation.balanced ? "balanced" : "check ledger"}</span></div><div className="accounting-total"><span>Initial escrow</span><strong>{genAmount(presentation.values.initialEscrow || BigInt(project.initial_escrow || 0))}</strong></div><div className="accounting-lines">{presentation.rows.map((row) => <Meta key={row.key} label={row.label} value={genAmount(row.value)} />)}</div><small>initial = paid + locked + refundable</small></section>; }
function AccountingMini({ milestone }: { milestone: Milestone }) { return <section className="accounting"><span className="mono-label">FROZEN TRANCHE</span><div className="accounting-total"><span>Payable amount</span><strong>{genAmount(milestone.tranche)}</strong></div><div className="accounting-lines"><Meta label="Revision" value={String(milestone.revision || 0)} /><Meta label="Repair budget" value={String(milestone.repair_budget)} /><Meta label="Payout" value={milestone.payout_fingerprint ? short(milestone.payout_fingerprint, 8, 6) : "not released"} /></div></section>; }
function Meta({ label: title, value }: { label: string; value: string }) { return <div className="meta-item"><span className="mono-label">{title}</span><strong>{value}</strong></div>; }
function StatePill({ state }: { state: string }) { return <span className={`state-pill ${stateTone(state)}`}><i />{stateLabel(state)}</span>; }
function Notice({ message }: { message: string }) { return <div className="notice"><CircleAlert size={17} /><span>{message}</span></div>; }
function LoadingState({ label: text }: { label: string }) { return <div className="loading-state"><LoaderCircle size={23} className="spin" /><span>{text}</span></div>; }
function EmptyState({ title, copy }: { title: string; copy: string }) { return <div className="empty-state"><FileCheck2 size={30} /><h2>{title}</h2><p>{copy}</p><button className="button button-dark" onClick={() => navigate("/create")}>Create a plan <ArrowRight size={15} /></button></div>; }
function Field({ label: title, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="field"><span>{title}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>; }
function TxBox({ tx }: { tx: TxStatus }) { return <div className={`tx-box ${tx.error ? "failed" : ""}`}><div><strong>{tx.stage}</strong><span>{tx.message}</span></div>{tx.hash && <a href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={12} /></a>}</div>; }
function Footer() { return <footer className="site-footer"><div><strong>Milestone<span>Vault</span></strong><small>semantic acceptance for staged work</small></div><div><span>Studio Dev / 61997</span><span>native GEN settlement</span><span>v1 packet schema</span></div></footer>; }

createRoot(document.getElementById("root")!).render(<App />);
