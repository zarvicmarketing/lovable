import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { Search, ShieldCheck, Bike, Settings, LogOut, Plus, Pencil, X, Save, Wrench, Tags, Package, ClipboardList, LayoutDashboard, RefreshCw } from "lucide-react";

type Model = { id: string; name: string; slug: string; engine_cc: number | null; category_id: string | null; description: string | null; image_url: string | null; status: string; featured: boolean };
type Category = { id: string; name: string; slug: string; visible: boolean };
type ModuleName = "models" | "categories" | "parts" | "revisions";
const moduleLabels: Record<ModuleName,string> = { models:"Modelos", categories:"Categorias", parts:"Peças", revisions:"Revisões" };

export default function App() {
  const [models,setModels] = useState<Model[]>([]);
  const [categories,setCategories] = useState<Category[]>([]);
  const [query,setQuery] = useState("");
  const [categoryFilter,setCategoryFilter] = useState("all");
  const [admin,setAdmin] = useState(false);
  const [session,setSession] = useState<any>(null);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [loginError,setLoginError] = useState("");
  const [module,setModule] = useState<ModuleName>("models");
  const [editing,setEditing] = useState<any>(null);
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);

  async function loadPublic() {
    if (!supabaseConfigured) return;
    const [{data:ms},{data:cs}] = await Promise.all([
      supabase.from("models").select("*").eq("status","published").order("sort_order"),
      supabase.from("categories").select("*").eq("visible",true).order("sort_order")
    ]);
    setModels((ms || []) as Model[]);
    setCategories((cs || []) as Category[]);
  }
  useEffect(() => {
    loadPublic();
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  const filtered = useMemo(()=>models.filter(m=>
    (m.name.toLowerCase().includes(query.toLowerCase()) || String(m.engine_cc || "").includes(query)) &&
    (categoryFilter==="all" || m.category_id===categoryFilter)
  ),[models,query,categoryFilter]);

  async function signIn(e:React.FormEvent) {
    e.preventDefault(); setLoginError(""); setBusy(true);
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error) setLoginError("Não foi possível entrar. Confira suas credenciais e permissões.");
    setBusy(false);
  }
  async function signOut(){await supabase.auth.signOut();setAdmin(false);setEditing(null);}
  async function saveRecord(e:React.FormEvent) {
    e.preventDefault(); if(!editing) return;
    setBusy(true); setNotice("");
    const {id,...payload}=editing;
    const table=module;
    const result=id ? await supabase.from(table).update(payload).eq("id",id) : await supabase.from(table).insert(payload);
    if(result.error) setNotice("Erro ao salvar: "+result.error.message);
    else {setNotice("Registro salvo com sucesso.");setEditing(null);if(module==="models"||module==="categories") await loadPublic();}
    setBusy(false);
  }
  async function deleteRecord(id:string) {
    if(!confirm("Confirma arquivar este registro?")) return;
    const {error}=await supabase.from(module).update({status:"archived"}).eq("id",id);
    setNotice(error ? "Não foi possível arquivar: "+error.message : "Registro arquivado.");
  }
  async function openAdmin(){
    if(!session){setAdmin(true);return;}
    const {data}=await supabase.from("user_roles").select("role").eq("user_id",session.user.id).maybeSingle();
    if(data?.role==="admin") setAdmin(true);
    else setNotice("Seu usuário ainda não possui permissão administrativa.");
  }
  async function loadModule(){
    const {data,error}=await supabase.from(module).select("*").order("created_at",{ascending:false}).limit(100);
    if(error){setNotice(error.message);return [];}
    return data||[];
  }
  const [records,setRecords]=useState<any[]>([]);
  useEffect(()=>{if(admin && session) loadModule().then(setRecords)},[admin,module,session]);
  useEffect(()=>{if(admin && session) loadModule().then(setRecords)},[notice,admin]);
  const fields:Record<ModuleName,string[]> = {
    models:["name","slug","engine_cc","category_id","description","image_url","status","featured"],
    categories:["name","slug","description","visible","sort_order"],
    parts:["code","name","description","category","unit_price","image_url","status"],
    revisions:["model_id","revision_number","mileage_km","interval_months","labor_price","notes","status"]
  };
  const labels:Record<string,string>={name:"Nome",slug:"Slug",engine_cc:"Cilindrada (cc)",category_id:"ID da categoria",description:"Descrição",image_url:"URL da imagem",status:"Status",featured:"Destaque",visible:"Visível",sort_order:"Ordem",code:"Código",category:"Categoria",unit_price:"Preço unitário (R$)",model_id:"ID do modelo",revision_number:"Número da revisão",mileage_km:"Quilometragem",interval_months:"Intervalo (meses)",labor_price:"Mão de obra (R$)",notes:"Observações"};
  function blankRecord(){return Object.fromEntries(fields[module].map(f=>[f, f==="status"?"draft":f==="visible"?true:f==="featured"?false:f==="sort_order"?0:""]));}

  if(admin && !session) return <main className="login-page"><form className="login-card" onSubmit={signIn}><div className="brand-mark">RODA<span>LEVE</span></div><p className="eyebrow">ÁREA RESTRITA</p><h1>Acesso administrativo</h1><p>Entre com sua conta autorizada para gerenciar o conteúdo.</p><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>{loginError&&<p className="error">{loginError}</p>}<button className="primary full" disabled={busy}>Entrar no gestor</button><button type="button" className="text-button" onClick={()=>setAdmin(false)}>Voltar ao site</button></form></main>;

  if(admin && session) return <div className="admin-shell"><aside className="sidebar"><div className="brand-mark">RODA<span>LEVE</span></div><p className="eyebrow">GESTOR ADMINISTRATIVO</p>{(["models","categories","parts","revisions"] as ModuleName[]).map((m)=><button key={m} className={module===m?"side-link active":"side-link"} onClick={()=>setModule(m)}>{m==="models"?<Bike/>:m==="categories"?<Tags/>:m==="parts"?<Package/>:<ClipboardList/>}{moduleLabels[m]}</button>)}<button className="side-link" onClick={()=>setAdmin(false)}><LayoutDashboard/>Visão pública</button><button className="side-link logout" onClick={signOut}><LogOut/>Sair</button></aside><section className="admin-main"><header className="admin-top"><div><p className="eyebrow">RODALEVE HONDA / GESTÃO</p><h1>{moduleLabels[module]}</h1></div><button className="primary" onClick={()=>setEditing(blankRecord())}><Plus size={17}/> Novo cadastro</button></header>{notice&&<div className="notice">{notice}<button onClick={()=>setNotice("")}><X size={16}/></button></div>}<div className="data-panel"><div className="panel-heading"><div><h2>Registros cadastrados</h2><p>Gerencie os dados que alimentam o site público.</p></div><button className="icon-button" onClick={()=>loadModule().then(setRecords)}><RefreshCw size={17}/></button></div>{records.length===0?<div className="empty"><Package size={28}/><strong>Nenhum registro encontrado</strong><span>Cadastre o primeiro item deste módulo.</span></div>:<div className="table-wrap"><table><thead><tr><th>Identificação</th><th>Status</th><th>Ações</th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td><strong>{r.name||r.code||("Revisão "+r.revision_number)||r.id}</strong><small>{r.slug||r.description||r.mileage_km&&r.mileage_km+" km"||r.code}</small></td><td><span className="status">{r.status|| (r.visible?"Visível":"Oculto")}</span></td><td><div className="actions"><button className="icon-button" onClick={()=>setEditing(r)} aria-label="Editar"><Pencil size={16}/></button><button className="icon-button danger" onClick={()=>deleteRecord(r.id)} aria-label="Arquivar"><X size={16}/></button></div></td></tr>)}</tbody></table></div>}</div>{editing&&<div className="modal-backdrop"><form className="edit-modal" onSubmit={saveRecord}><div className="modal-head"><div><p className="eyebrow">CADASTRO</p><h2>{editing.id?"Editar registro":"Novo registro"}</h2></div><button type="button" className="icon-button" onClick={()=>setEditing(null)}><X/></button></div><div className="form-grid">{fields[module].map(f=><label key={f}>{labels[f]||f}{["description","notes"].includes(f)?<textarea value={editing[f]??""} onChange={e=>setEditing({...editing,[f]:e.target.value})}/>:["featured","visible"].includes(f)?<select value={String(editing[f])} onChange={e=>setEditing({...editing,[f]:e.target.value==="true"})}><option value="true">Sim</option><option value="false">Não</option></select>:<input type={["engine_cc","unit_price","revision_number","mileage_km","interval_months","labor_price","sort_order"].includes(f)?"number":"text"} step={["unit_price","labor_price"].includes(f)?"0.01":"1"} value={editing[f]??""} onChange={e=>setEditing({...editing,[f]:e.target.value===""?"":(["engine_cc","unit_price","revision_number","mileage_km","interval_months","labor_price","sort_order"].includes(f)?Number(e.target.value):e.target.value)})}/>}</label>)}</div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditing(null)}>Cancelar</button><button className="primary" disabled={busy}><Save size={16}/>Salvar</button></div></form></div>}</section></div>;

  return <div className="site"><header className="site-header"><a className="brand-mark" href="#">RODA<span>LEVE</span><small>HONDA</small></a><nav><a href="#catalogo">Modelos</a><a href="#revisoes">Revisões</a><a href="#contato">Contato</a></nav><button className="outline" onClick={openAdmin}><ShieldCheck size={16}/> Gestor</button></header><section className="hero"><div className="hero-content"><p className="eyebrow light">CUIDADO GENUÍNO. CONFIANÇA EM CADA QUILÔMETRO.</p><h1>O cuidado certo para sua Honda <em>seguir em frente.</em></h1><p>Consulte as informações de manutenção e revisões programadas da sua motocicleta.</p><a className="primary hero-cta" href="#catalogo">Consultar revisões <span>→</span></a></div><div className="hero-art"><div className="hero-ring"></div><Bike size={210} strokeWidth={0.65}/><span>RODALEVE HONDA</span></div></section><main><section id="catalogo" className="catalog-section"><div className="section-heading"><div><p className="eyebrow">CATÁLOGO HONDA</p><h2>Encontre sua motocicleta</h2><p>Selecione o modelo para consultar as revisões disponíveis.</p></div><div className="search-box"><Search size={18}/><input placeholder="Buscar modelo ou cilindrada..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="filters"><button className={categoryFilter==="all"?"filter active":"filter"} onClick={()=>setCategoryFilter("all")}>Todos os modelos</button>{categories.map(c=><button key={c.id} className={categoryFilter===c.id?"filter active":"filter"} onClick={()=>setCategoryFilter(c.id)}>{c.name}</button>)}</div>{!supabaseConfigured?<div className="setup-warning">Conecte o projeto Supabase para carregar o catálogo real. Consulte o README para configurar as variáveis de ambiente.</div>:filtered.length===0?<div className="empty public-empty"><Bike size={30}/><strong>Nenhum modelo publicado ainda</strong><span>As motocicletas aparecerão aqui após o cadastro e a publicação no gestor.</span></div>:<div className="model-grid">{filtered.map(m=><article className="model-card" key={m.id}><div className="model-image">{m.image_url?<img src={m.image_url} alt={m.name}/>:<Bike size={74}/>} {m.featured&&<span className="featured">DESTAQUE</span>}</div><div className="model-info"><p className="eyebrow">{m.engine_cc?m.engine_cc+" CC":"HONDA"}</p><h3>{m.name}</h3><p>{m.description||"Consulte as revisões programadas deste modelo."}</p><a href={`#contato`} className="card-link">Consultar revisões <span>→</span></a></div></article>)}</div>}</section><section id="revisoes" className="maintenance"><p className="eyebrow light">MANUTENÇÃO PREVENTIVA</p><h2>Revisar é cuidar do que move você.</h2><p>As revisões programadas ajudam a preservar o desempenho, a segurança e a durabilidade da sua motocicleta. Consulte os dados disponíveis e confirme valores com uma unidade Rodaleve.</p></section><section id="contato" className="contact"><div><p className="eyebrow">FALE COM A RODALEVE</p><h2>Conte com quem entende de Honda.</h2><p>Entre em contato com nossa equipe para tirar dúvidas e agendar sua revisão.</p></div><a className="primary" href="https://wa.me/" target="_blank" rel="noreferrer">Falar com a equipe <span>↗</span></a></section></main><footer><span>© {new Date().getFullYear()} Rodaleve Honda</span><span>Informações e valores sujeitos à confirmação pela concessionária.</span></footer></div>;
}