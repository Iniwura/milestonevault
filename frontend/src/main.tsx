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

function MilestoneDossier({ project, milestoneId, loading, error, account, tx, onWrite }: { project?: Project; milestoneId?: string; loading: boolean; error: string; account: string | null; tx: TxStatus | null; onWrite: (method: string, args: unknown[], value?: bigint) => Promise<string | null> }) {
 const [evidenceUrls,setEvidenceUrls]=useState<Record<string,string>>({});
 const [evidenceHashes,setEvidenceHashes]=useState<Record<string,string>>({});
 const [localError,setLocalError]=useState("");
 const milestone=project?.milestones?.find(item=>item.milestone_id===milestoneId);
 if(loading&&!project)return <main className="page-width centered"><LoadingState label="Loading the live work package…"/></main>;
 if(!project||!milestone)return <main className="page-width centered"><Notice message={error||"Milestone not found."}/></main>;
 const criteria=parseStored<Record<string,any>[]>(milestone.criteria,[]);
 const requirements=parseStored<Record<string,any>[]>(milestone.evidence_requirements,[]);
 const accepted=milestone.adjudication?.criteria||[];
 const canClient=sameAddress(account,project.client), canContributor=sameAddress(account,project.contributor);
 const editable=["AVAILABLE","REPAIRABLE"].includes(milestone.state);
 const makeManifest=()=>{
   if(!requirements.length)throw Error("No frozen evidence requirements were returned by the contract.");
   const entries=requirements.filter(r=>String(evidenceUrls[r.evidence_id]||"").trim()).map(r=>({
     evidence_id:r.evidence_id,url:String(evidenceUrls[r.evidence_id]).trim(),
     sha256:String(evidenceHashes[r.evidence_id]||"").trim(),
     project_id:project.project_id,milestone_id:milestone.milestone_id
   }));
   if(requirements.some(r=>r.required&&!entries.some(e=>e.evidence_id===r.evidence_id)))throw Error("Provide a public HTTPS URL for each required evidence source.");
   if(entries.some(e=>!/^https:\/\//i.test(e.url)||e.sha256&&!/^[0-9a-fA-F]{64}$/.test(e.sha256)))throw Error("Sources must be HTTPS; SHA-256 commitments must be exactly 64 hex characters if entered.");
   return JSON.stringify(entries);
 };
 const submit=async(repair:boolean)=>{
   setLocalError("");
   try{const manifest=makeManifest();await onWrite(repair?"repair_milestone":"submit_milestone",[project.project_id,milestone.milestone_id,manifest]);}
   catch(cause){setLocalError(errorMessage(cause));}
 };
 const dependents=(project.milestones||[]).filter(m=>(m.dependencies||[]).includes(milestone.milestone_id));
 return <main className="page-width control-dossier">
   <div className="control-breadcrumb"><button onClick={()=>navigate("/projects")}>Projects</button><ArrowRight size={12}/><button onClick={()=>navigate(`/projects/${encodeURIComponent(project.project_id)}`)}>{project.project_id}</button><ArrowRight size={12}/><span>{milestone.milestone_id}</span></div>
   <div className="control-dossier-header"><div className="mono-label">WORK PACKAGE / FROZEN ACCEPTANCE</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:18,flexWrap:"wrap"}}><div><h1>{milestone.title}</h1><p style={{maxWidth:640,color:"#6f8095",fontSize:13,lineHeight:1.65}}>{milestone.deliverable_definition}</p></div><ControlState state={milestone.state}/></div></div>
   <div className="control-summary-strip" style={{marginTop:26}}>
     <div><span>Allocated tranche</span><strong>{genAmount(milestone.tranche)}</strong></div>
     <div><span>Released</span><strong>{genAmount(milestone.paid_amount||0)}</strong></div>
     <div><span>Predecessors</span><strong>{(milestone.dependencies||[]).length}</strong></div>
     <div><span>Downstream stages</span><strong>{dependents.length}</strong></div>
     <div><span>Repair allowance</span><strong>{String(milestone.repair_budget??0)}</strong></div>
   </div>
   <div className="control-dossier-grid">
    <div style={{display:"grid",gap:17}}>
      <section className="control-panel"><div className="control-panel-top"><div><div className="mono-label">ACCEPTANCE CONTROL / IMMUTABLE</div><h2 style={{marginTop:5}}>Decision requirements</h2></div><Fingerprint size={18} color="#7891b2"/></div>
        <table className="control-criterion-table"><thead><tr><th>Criterion</th><th>Review finding</th><th>State</th></tr></thead><tbody>{criteria.map(c=>{const result=accepted.find((v:Record<string,any>)=>v.criterion_id===c.criterion_id);return <tr key={c.criterion_id}><td><strong>{c.requirement}</strong><div><small>{c.required?"REQUIRED":"OPTIONAL"} · {c.criterion_id}</small></div></td><td>{result?.observed_fact||"Awaiting validator review"}</td><td>{result?<ControlState state={result.status}/>:<ControlState state="LOCKED"/>}</td></tr>})}</tbody></table>
      </section>
      <section className="control-panel"><div className="control-panel-top"><h2>Evidence register</h2><small>HTTPS SOURCES / FROZEN PACKET</small></div><div className="control-panel-body">
        {requirements.map(r=><div key={r.evidence_id} style={{borderBottom:"1px solid #e5edf5",padding:"12px 0",fontSize:12}}><strong>{r.evidence_id}</strong><span style={{color:"#708299",marginLeft:12}}>{r.required?"Required":"Optional"}</span><p style={{color:"#75859b",lineHeight:1.6}}>{r.requirement}</p></div>)}
        {milestone.current_submission&&<div style={{marginTop:20}}><div className="mono-label">CURRENT ONCHAIN SUBMISSION</div><code style={{display:"block",overflowWrap:"anywhere",fontSize:11,marginTop:10,color:"#526e93"}}>{milestone.current_submission.submission_id||milestone.current_submission_id||"Immutable submitted packet"}</code></div>}
        {editable&&<div className="control-evidence-form"><div className="mono-label">SUBMIT PUBLIC SOURCE MANIFEST</div>{requirements.map(r=><div key={r.evidence_id} style={{display:"grid",gap:9}}><label>{r.evidence_id} · HTTPS URL<input value={evidenceUrls[r.evidence_id]||""} onChange={e=>setEvidenceUrls(p=>({...p,[r.evidence_id]:e.target.value}))} placeholder="https://example.org/your-deliverable.txt"/></label><label>STUDIO-RENDERED SHA-256 (OPTIONAL)<input value={evidenceHashes[r.evidence_id]||""} onChange={e=>setEvidenceHashes(p=>({...p,[r.evidence_id]:e.target.value}))} placeholder="64-character hex commitment"/></label></div>)}<p className="control-evidence-note">Use independently accessible public HTTPS evidence. If committing a hash, calculate it from the Studio-rendered text, not local transport bytes.</p>{localError&&<Notice message={localError}/>}<button className="button button-dark" disabled={!canContributor} onClick={()=>void submit(milestone.state==="REPAIRABLE")}>{milestone.state==="REPAIRABLE"?"Submit bounded revision":"Submit evidence packet"} <ArrowRight size={15}/></button></div>}
      </div></section>
      {milestone.adjudication&&<ResultCard milestone={milestone}/>}
    </div>
    <aside className="side-rail">
      <div className="control-dossier-impact"><span>SETTLEMENT CONSEQUENCE</span><strong>{milestone.state==="PAID"?genAmount(milestone.paid_amount||0):"0 GEN"}</strong><ControlState state={milestone.state}/><p>{milestone.state==="PAID"?"Exact tranche paid once to the frozen contributor.":milestone.state==="REJECTED"?"Criterion failure prevented payment and blocked dependent work.":milestone.state==="BLOCKED"?"An upstream milestone failed. This tranche cannot be released.":milestone.state==="UNRESOLVED"?"Insufficient evidence never becomes payment.":"Funds move only after the frozen acceptance conditions are satisfied."}</p></div>
      <section className="action-rail"><span className="mono-label">AUTHORIZED PROTOCOL ACTION</span><h3>{milestone.state==="SUBMITTED"?"Run acceptance review":milestone.state==="ACCEPTED"?"Release earned tranche":milestone.state==="REPAIRABLE"?"Repair or finalize":milestone.state==="AVAILABLE"?"Evidence needed":stateLabel(milestone.state)}</h3><p>Role-gated by the deployed contract. Connect the right wallet before any state-changing action.</p>
        {milestone.state==="SUBMITTED"&&<button className="button button-dark wide" disabled={!canClient} onClick={()=>void onWrite("adjudicate_milestone",[project.project_id,milestone.milestone_id])}>Run GenLayer review <ArrowRight size={15}/></button>}
        {milestone.state==="ACCEPTED"&&<button className="button button-green wide" disabled={!canContributor} onClick={()=>void onWrite("settle_milestone",[project.project_id,milestone.milestone_id])}>Release {genAmount(milestone.tranche)} <ArrowRight size={15}/></button>}
        {milestone.state==="REPAIRABLE"&&<button className="button button-outline wide" disabled={!canClient} onClick={()=>void onWrite("finalize_unresolved",[project.project_id,milestone.milestone_id])}>Finalize unresolved / no payout</button>}
        {tx&&<TxBox tx={tx}/>}
      </section>
      <section className="control-panel"><div className="control-panel-top"><h2>Dependency impact</h2></div><div className="control-panel-body">{dependents.length?dependents.map(d=><button className="button button-outline" key={d.milestone_id} style={{marginBottom:8,width:"100%",justifyContent:"space-between"}} onClick={()=>navigate(`/projects/${encodeURIComponent(project.project_id)}/milestones/${encodeURIComponent(d.milestone_id)}`)}>{d.title}<ControlState state={d.state}/></button>):<p style={{color:"#73859b",fontSize:12}}>No direct dependents. This stage does not unlock another work package.</p>}</div></section>
    </aside>
   </div>
 </main>;
}


function ResultCard({ milestone }: { milestone: Milestone }) { const result = milestone.adjudication; return <div className={`result-card ${stateTone(milestone.state)}`}><div className="result-card-top"><span className="mono-label">GENLAYER REVIEW / {milestone.result_fingerprint ? short(milestone.result_fingerprint, 10, 6) : "pending"}</span><StatePill state={result.outcome} /></div><h2>{result.outcome === "ACCEPTED" ? "Tranche earned." : result.outcome === "REJECTED" ? "Release held." : "Evidence unresolved."}</h2><p>{result.reasoning}</p>{result.criteria?.map((item: Record<string, any>) => <div className="review-line" key={item.criterion_id}><span>{stateLabel(item.criterion_id)}</span><strong className={`text-${stateTone(item.status)}`}>{item.status}</strong></div>)}</div>; }

type StageDraft={id:string;title:string;definition:string;acceptance:string;amount:string;dependency:string};
const SEED_STAGES:StageDraft[]=[
 {id:"design",title:"Design specification",definition:"Versioned design specification and acceptance boundaries.",acceptance:"The submitted design packet contains the frozen deliverable scope and acceptance specifications.",amount:"0.01",dependency:""},
 {id:"build",title:"Implementation",definition:"Working product matching the accepted design specification.",acceptance:"The submitted implementation satisfies all required frozen specifications.",amount:"0.01",dependency:"design"},
 {id:"handoff",title:"Production handoff",definition:"Deployment instructions and release handoff materials.",acceptance:"The public handoff evidence includes the agreed deployment and operational instructions.",amount:"0.01",dependency:"build"}
];
function CreatePage({ account, onWrite }: { account: string | null; onWrite: (method: string, args: unknown[], value?: bigint) => Promise<string | null> }) {
 const [form,setForm]=useState({projectId:`project-${Date.now().toString(36)}`,contributor:"",title:"New delivery project",scope:"Deliver the agreed project through documented and verifiable milestones.",deadlineUtc:"2099-01-01T00:00:00Z",repairBudget:"1"});
 const [stages,setStages]=useState<StageDraft[]>(SEED_STAGES);
 const [message,setMessage]=useState("");
 const update=(index:number,key:keyof StageDraft,value:string)=>setStages(p=>p.map((s,i)=>i===index?{...s,[key]:value}:s));
 const total=stages.reduce((sum,stage)=>{try{return sum+parseGen(stage.amount)}catch{return sum}},0n);
 const check=()=>{
  if(!/^0x[0-9a-fA-F]{40}$/.test(form.contributor.trim()))throw Error("Enter a valid contributor wallet address.");
  if(!/^[A-Za-z0-9._-]{1,64}$/.test(form.projectId))throw Error("Project ID must be 1–64 letters, numbers, dots, dashes or underscores.");
  if(!form.title.trim()||!form.scope.trim())throw Error("Project title and scope are required.");
  if(!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$/.test(form.deadlineUtc)||!Number.isFinite(Date.parse(form.deadlineUtc))||Date.parse(form.deadlineUtc)<=Date.now())throw Error("Enter a future deadline using YYYY-MM-DDTHH:MM:SSZ.");
  if(!/^[0-3]$/.test(form.repairBudget))throw Error("Repair allowance must be between 0 and 3.");
  if(!stages.length||stages.length>32)throw Error("Add between 1 and 32 work packages.");
  const seen=new Set<string>();
  for(const stage of stages){
   if(!/^[A-Za-z0-9._-]{1,64}$/.test(stage.id)||seen.has(stage.id))throw Error("Every milestone needs a unique identifier (letters, numbers, dots, dashes or underscores).");
   if(!stage.title.trim()||!stage.acceptance.trim()||!stage.definition.trim())throw Error("Each milestone needs a name, deliverable definition and acceptance requirement.");
   if(parseGen(stage.amount)<=0n)throw Error("Each milestone must have a positive GEN tranche.");
   if(stage.dependency&&!seen.has(stage.dependency))throw Error("A predecessor must be an earlier milestone. Review dependency order.");
   seen.add(stage.id);
  }
  if(total<=0n)throw Error("The project needs positive total funding.");
 };
 const create=async()=>{
   setMessage("");
   try{
    check();
    const created=await onWrite("create_project",[form.projectId,form.contributor.trim(),form.title.trim(),form.scope.trim()]);
    if(!created)throw Error("Project creation was not confirmed. Check the transaction status before retrying.");
    for(const stage of stages){
      const criteria=JSON.stringify([{criterion_id:"acceptance",requirement:stage.acceptance.trim(),required:true}]);
      const evidence=JSON.stringify([{evidence_id:"deliverable",requirement:"Public verifiable evidence for "+stage.title,required:true}]);
      const hash=await onWrite("add_milestone",[form.projectId,stage.id,stage.title,stage.definition,criteria,evidence,parseGen(stage.amount),JSON.stringify(stage.dependency?[stage.dependency]:[]),Number(form.repairBudget),form.deadlineUtc]);
      if(!hash)throw Error(`Stopped while adding ${stage.id}. The project already exists; inspect it before trying again.`);
    }
    navigate(`/projects/${encodeURIComponent(form.projectId)}`);
   }catch(e){setMessage(errorMessage(e));}
 };
 const add=()=>setStages(p=>[...p,{id:`stage-${p.length+1}`,title:"New work package",definition:"Describe the deliverable to be supplied.",acceptance:"The submitted evidence must satisfy the agreed deliverable.",amount:"0.01",dependency:p[p.length-1]?.id||""}]);
 return <main className="page-width control-create">
   <div className="control-app-head"><div><div className="mono-label">PLAN BUILDER / FREEZE BEFORE FUNDING</div><h1>Configure a delivery schedule</h1><p>Build the scope, predecessor chain, acceptance criteria and exact GEN funding plan before writing it onchain.</p></div><ControlState state="DRAFT"/></div>
   <div className="control-builder-grid">
     <section className="control-builder-panel">
       <div className="control-panel-top"><h2>01 / Project definition</h2><small>CLIENT WALLET IS THE CREATOR</small></div>
       <div className="control-panel-body">
         <div style={{display:"grid",gap:8}}>
           <Field label="Project reference" value={form.projectId} onChange={value=>setForm(p=>({...p,projectId:value}))}/>
           <Field label="Project title" value={form.title} onChange={value=>setForm(p=>({...p,title:value}))}/>
           <Field label="Contributor wallet" value={form.contributor} placeholder="0x…" onChange={value=>setForm(p=>({...p,contributor:value}))}/>
           <div className="control-create-settings"><Field label="UTC deadline (YYYY-MM-DDTHH:MM:SSZ)" value={form.deadlineUtc} onChange={value=>setForm(p=>({...p,deadlineUtc:value}))}/><label className="field"><span>Repair allowance per stage</span><select value={form.repairBudget} onChange={e=>setForm(p=>({...p,repairBudget:e.target.value}))}>{[0,1,2,3].map(n=><option key={n} value={String(n)}>{n} {n===1?"revision":"revisions"}</option>)}</select></label></div>
           <label className="field"><span>Scope of work</span><textarea rows={3} value={form.scope} onChange={e=>setForm(p=>({...p,scope:e.target.value}))}/></label>
         </div>
       </div>
       <div className="control-panel-top" style={{borderTop:"1px solid #e0e8f2"}}><h2>02 / Work packages</h2><button type="button" className="button button-outline" onClick={add} disabled={stages.length>=32}><Plus size={14}/> Add stage</button></div>
       <div className="control-panel-body">
         <p style={{fontSize:12,color:"#75869d",lineHeight:1.6}}>Edit each tranche, deliverable and acceptance requirement. A predecessor can only refer to an earlier stage, preventing graph cycles.</p>
         {stages.map((stage,i)=><section key={i} style={{padding:"18px 0",borderBottom:"1px solid #e4edf4"}}>
           <div className="mono-label" style={{marginBottom:10}}>WORK PACKAGE / {String(i+1).padStart(2,"0")}</div>
           <div className="control-stage-editor">
             <input aria-label={`Stage ${i+1} identifier`} value={stage.id} onChange={e=>update(i,"id",e.target.value)} placeholder="stage-id"/>
             <input aria-label={`Stage ${i+1} tranche in GEN`} value={stage.amount} onChange={e=>update(i,"amount",e.target.value)} placeholder="0.01 GEN"/>
             <select aria-label={`Stage ${i+1} predecessor`} value={stage.dependency} onChange={e=>update(i,"dependency",e.target.value)}><option value="">No predecessor</option>{stages.slice(0,i).map(p=><option key={p.id} value={p.id}>{p.id}</option>)}</select>
             <button aria-label={`Remove stage ${i+1}`} title="Remove stage" disabled={stages.length<=1} onClick={()=>setStages(p=>p.filter((_,j)=>j!==i).map(s=>s.dependency===stage.id?{...s,dependency:""}:s))}><X size={15}/></button>
           </div>
           <div style={{display:"grid",gap:11}}>
             <Field label="Milestone name" value={stage.title} onChange={value=>update(i,"title",value)}/>
             <Field label="Deliverable definition" value={stage.definition} onChange={value=>update(i,"definition",value)}/>
             <Field label="Required acceptance criterion" value={stage.acceptance} onChange={value=>update(i,"acceptance",value)}/>
           </div>
         </section>)}
         <p className="control-build-help">The contract freezes criteria, graph and tranche values on funding. The deadline and repair allowance apply to each frozen work package. Funding and activation are separate later actions.</p>
         {message&&<Notice message={message}/>}
         <button className="button button-dark wide" disabled={!account||stages.length===0} onClick={()=>void create()}><LockKeyhole size={15}/> Create project and {stages.length} milestones <ArrowRight size={15}/></button>
         {!account&&<p className="control-evidence-note">Connect a Studio Dev client wallet to create the project.</p>}
       </div>
     </section>
     <aside className="control-builder-preview">
       <div className="control-panel-top"><div><div className="mono-label">LIVE / UNSIGNED PLAN PREVIEW</div><h2 style={{marginTop:5}}>Dependency schedule</h2></div><GitBranch size={20} color="#215bd0"/></div>
       <div className="control-grid-head"><span>Stage</span><span>Execution order</span><span>GEN</span><span>State</span></div>
       {stages.map((stage,i)=><div className="control-grid-row" key={i}>
         <div className="control-grid-id"><strong>{stage.title}</strong><small>{stage.dependency?`AFTER ${stage.dependency}`:"ROOT"}</small></div>
         <div className="control-grid-track"><span className="control-grid-bar blue" style={{marginLeft:`${Math.min(i*17,65)}%`,width:`${Math.max(20,68-i*10)}%`}}/></div>
         <span className="control-amount">{stage.amount}</span><ControlState state="LOCKED"/>
       </div>)}
       <div className="control-summary-inline"><span>Exact total to fund after project creation</span><strong>{genAmount(total)}</strong></div>
       <div className="control-panel-body"><span className="mono-label">PREFLIGHT NOTE</span><p className="control-build-help">Schedule bars indicate dependency order, not fabricated completion dates. Inspect the stored packet and graph before calling the payable funding action.</p></div>
     </aside>
   </div>
 </main>;
}



function ProofPage({ project, loading, error, onRefresh }: { project?: Project; loading: boolean; error: string; onRefresh: () => void }) {
 const [focus,setFocus]=useState("m1-design-b");
 if(loading&&!project)return <main className="control-proof"><div className="page-width"><LoadingState label="Reading the canonical Studio Dev project…"/></div></main>;
 if(!project)return <main className="control-proof"><div className="page-width"><div className="control-proof-header"><div><div className="control-kicker">LIVE READ / STUDIO DEV</div><h1>Unable to load project proof</h1><p>{error||"The canonical project could not be retrieved from the deployed contract."}</p></div><button className="button button-dark" onClick={onRefresh}><RefreshCw size={15}/> Retry</button></div></div></main>;
 const ms=project.milestones||[],selected=ms.find(m=>m.milestone_id===focus)||ms[0];
 const ledger=accountingPresentation(project.accounting||{}).values;
 const rem=ledger.initialEscrow-ledger.paidTotal-ledger.refundableAmount;
 const docs=[
  ["Create and fund","0x349da5a9833ba9f51456b41f9bc7fca8aa67ab110899bf9eaf0084d60777ea45"],
  ...CANONICAL_PROOF_TRANSACTIONS
 ] as const;
 return <main className="control-proof"><div className="page-width">
  <header className="control-proof-header">
    <div><div className="control-kicker">PROOF / CANONICAL PROJECT / LIVE CHAIN READ</div>
      <h1>Four gates.<br/>One settled project.</h1>
      <p>Follow the real dependency consequences and transfers from a funded 0.04 GEN project. These states come from the deployed contract, not a simulated demo.</p></div>
    <div className="control-proof-header-meta"><ControlState state={project.state}/><span>STUDIO DEV · CHAIN 61997</span><span>{project.project_id}</span><span>WALLET NOT REQUIRED</span></div>
  </header>
  <div className="control-proof-frame">
   <div className="control-proof-split">
     <section className="control-panel">
       <div className="control-panel-top"><div><div className="mono-label">DEPENDENCY-ORDER VIEW</div><h2 style={{marginTop:8}}>Accepted, rejected, blocked, unresolved.</h2></div><span className="mono-label">LIVE STATES</span></div>
       <ControlGantt milestones={ms} selected={selected?.milestone_id||""} onSelect={setFocus} readOnly/>
       <div className="control-panel-body"><div className="control-kicker" style={{color:"#627ca2"}}>WHAT THIS PROVES</div><p style={{fontSize:12,lineHeight:1.75,color:"#687b95",marginBottom:0}}>M1 earned 0.01 GEN and unlocked M2. M2 failed a material criterion, blocking dependent M3. Independent M4 could not verify its evidence and stayed fail-closed. Closure refunded the three unearned tranches.</p></div>
     </section>
     <aside className="control-proof-ledger">
       <div className="mono-label">SETTLEMENT RECONCILIATION</div><h2>Native GEN ledger</h2>
       <div className="control-money-line"><span>Escrow funded</span><strong>{genAmount(ledger.initialEscrow)}</strong></div>
       <div className="control-money-line"><span>Earned / contributor paid</span><strong>-{genAmount(ledger.paidTotal)}</strong></div>
       <div className="control-money-line"><span>Unspent / client refunded*</span><strong>-{genAmount(ledger.refundableAmount)}</strong></div>
       <div className="control-money-line final"><span>Principal remaining</span><strong>{genAmount(project.state==="CLOSED"?rem:ledger.stillLocked)}</strong></div>
       <div className="control-proof-explainer">*The contract’s refundable classification remains a historical ledger figure after close. The actual refund is verified by the finalized native-transfer message and receipt.</div>
       <a style={{display:"flex",alignItems:"center",gap:8,marginTop:23,color:"#175bdc",fontSize:12,fontWeight:750,textDecoration:"none"}} href={explorerContract()} target="_blank" rel="noreferrer">View deployed contract <ExternalLink size={14}/></a>
     </aside>
   </div>
  </div>
  <div className="control-case-controls"><div><div className="mono-label">SELECT A MILESTONE / INSPECT THE LAW</div><h2>Decision trace</h2></div><button className="button button-outline" onClick={onRefresh}><RefreshCw size={14}/> Refresh onchain</button></div>
  <section className="control-case-grid">{ms.map((m,i)=><article key={m.milestone_id} className={`control-case ${focus===m.milestone_id?"is-selected":""}`}>
      <button className="control-case-button" onClick={()=>setFocus(m.milestone_id)}><span className="control-case-index">WORK PACKAGE / {String(i+1).padStart(2,"0")}</span><ControlState state={m.state}/><h3>{m.title}</h3><p>{m.state==="PAID"?"Accepted with exact contributor payout. Its dependent milestone could proceed.":m.state==="REJECTED"?"Material acceptance violation. No supplier payment; downstream is blocked.":m.state==="BLOCKED"?"A failed predecessor prevented activation and tranche release.":"Unavailable evidence never authorized payment."}</p></button>
      <div className="control-case-foot"><span>{genAmount(m.paid_amount||0)} PAID</span><ArrowUpRight size={15}/></div>
  </article>)}</section>
  {selected&&<section className="control-proof-evidence">
   <div className="control-proof-evidence-head"><h3>Selected: {selected.title}</h3><ControlState state={selected.state}/></div>
   <div style={{padding:"20px 23px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:18}}>
     <div><div className="mono-label">FROZEN TRANCHE</div><strong style={{display:"block",marginTop:8,fontSize:20}}>{genAmount(selected.tranche)}</strong></div>
     <div><div className="mono-label">ACTUAL PAID</div><strong style={{display:"block",marginTop:8,fontSize:20}}>{genAmount(selected.paid_amount||0)}</strong></div>
     <div><div className="mono-label">PREDECESSOR</div><strong style={{display:"block",marginTop:8,fontSize:12}}>{selected.dependencies?.length?selected.dependencies.join(", "):"None · root stage"}</strong></div>
   </div>
   {selected.adjudication?.criteria?.map((criterion:Record<string,any>)=><div key={criterion.criterion_id} style={{display:"flex",padding:"13px 23px",gap:15,borderTop:"1px solid #e5edf5",alignItems:"start",justifyContent:"space-between",flexWrap:"wrap"}}>
     <div><strong style={{fontSize:12}}>{criterion.criterion_id}</strong><p style={{color:"#73849c",fontSize:12,lineHeight:1.65,margin:"7px 0"}}>{criterion.observed_fact}</p></div><ControlState state={criterion.status}/>
   </div>)}
   <div style={{padding:"0 23px 18px"}}><button className="button button-outline" onClick={()=>navigate(`/projects/${encodeURIComponent(project.project_id)}/milestones/${encodeURIComponent(selected.milestone_id)}`)}>Open full work-package dossier <ArrowUpRight size={14}/></button></div>
  </section>}
  <section className="control-proof-evidence" style={{marginTop:30}}>
   <div className="control-proof-evidence-head"><h3>Finalized transaction evidence</h3><span className="mono-label">EXPLORER / STUDIO DEV</span></div>
   {docs.map(([title,hash])=><a key={hash} href={explorerTx(hash)} target="_blank" rel="noreferrer"><span>{title}</span><code>{short(hash,14,10)}</code><ExternalLink size={15}/></a>)}
  </section>
 </div></main>;
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
