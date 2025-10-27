import{a6 as Ee,a7 as e,d,a8 as Et}from"./vendor_misc-D3njlE7w.js";import{R as Je,L as Ze,C as Qe,X as et,Y as tt,T as st,a as gt,b as at,c as ft}from"./vendor_recharts-CjwZmx_M.js";import{c as it,b as Rt,d as At}from"./vendor_cytoscape-7uELB3X3.js";import{M as lt,E as ct}from"./vendor_ml_matrix-BRypUw0d.js";(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const u of o.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&a(u)}).observe(document,{childList:!0,subtree:!0});function r(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(i){if(i.ep)return;i.ep=!0;const o=r(i);fetch(i.href,o)}})();const he=Ee.forwardRef(({className:t,variant:s="primary",...r},a)=>{const u=`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 ${{primary:"bg-primary text-white hover:bg-primary-600 focus:ring-primary-500",secondary:"bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 focus:ring-slate-400 dark:focus:ring-slate-500",ghost:"hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-slate-400 dark:focus:ring-slate-500 text-slate-800 dark:text-slate-200",danger:"bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",subtle:"bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"}[s]} ${t}`;return e.jsx("button",{className:u,ref:a,...r})});he.displayName="Button";const we=({className:t,children:s,...r})=>{const a=`bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg shadow-sm p-4 transition-shadow hover:shadow-md ${t}`;return e.jsx("div",{className:a,...r,children:s})},nt=({className:t="w-8 h-8"})=>e.jsxs("svg",{className:`animate-spin text-[#21808D] ${t}`,xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[e.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),e.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),Lt=t=>e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",...t,children:[e.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),e.jsx("polyline",{points:"17 8 12 3 7 8"}),e.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]}),vt=t=>e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",...t,children:[e.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),e.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),yt=({isOpen:t,onClose:s,title:r,children:a,size:i="lg"})=>{if(d.useEffect(()=>{const u=y=>{y.key==="Escape"&&s()};return window.addEventListener("keydown",u),()=>{window.removeEventListener("keydown",u)}},[s]),!t)return null;const o={md:"max-w-md",lg:"max-w-lg",xl:"max-w-xl","2xl":"max-w-2xl","3xl":"max-w-3xl"};return e.jsx("div",{className:"fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4",onClick:s,"aria-modal":"true",role:"dialog",children:e.jsxs("div",{className:`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full ${o[i]} flex flex-col max-h-[90vh]`,onClick:u=>u.stopPropagation(),children:[e.jsxs("div",{className:"flex justify-between items-center p-4 border-b border-stone-200 dark:border-slate-700",children:[e.jsx("h2",{className:"text-lg font-semibold text-slate-800 dark:text-slate-100",children:r}),e.jsx("button",{onClick:s,className:"text-slate-400 hover:text-slate-600 dark:hover:text-slate-200","aria-label":"Close modal",children:e.jsx(vt,{className:"w-6 h-6"})})]}),e.jsx("div",{className:"p-6 overflow-y-auto",children:a})]})})},Ie=Ee.forwardRef(({className:t,type:s="text",...r},a)=>e.jsx("input",{type:s,className:`block w-full rounded-md border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm ${t}`,ref:a,...r}));Ie.displayName="Input";const jt=t=>e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",...t,children:[e.jsx("circle",{cx:"11",cy:"11",r:"8"}),e.jsx("line",{x1:"21",y1:"21",x2:"16.65",y2:"16.65"})]}),Ve=["#4E79A7","#F28E2B","#E15759","#76B7B2","#59A14F","#EDC948","#B07AA1","#FF9DA7","#9C755F","#BAB0AC"],kt=`
begin model
begin parameters
    p1 0.1
    p2 0.2
end parameters

begin molecule types
    A(b)
    B(a)
end molecule types

begin seed species
    A(b) 100
    B(a) 100
end seed species

begin observables
    Molecules A_free A(b)
    Molecules B_free B(a)
    Molecules AB A(b!1).B(a!1)
end observables

begin reaction rules
    A(b) + B(a) -> A(b!1).B(a!1) p1
    A(b!1).B(a!1) -> A(b) + B(a) p2
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode", t_end=>100, n_steps=>100})
end actions
end model
`,Nt=[{id:"dimerization",name:"Simple Dimerization",description:"A basic model where two molecules A and B bind to form a complex AB.",code:kt,tags:["basic","binding"]},{id:"egfr_signaling",name:"EGFR Signaling Pathway",description:"A simplified model of the Epidermal Growth Factor Receptor (EGFR) signaling cascade.",code:`
begin model
begin parameters
    k_bind 1.0
    k_unbind 0.1
    k_phos 1.0
    k_dephos 0.5
end parameters

begin molecule types
    EGF(r)
    EGFR(l,y~U~P)
end molecule types

begin seed species
    EGF(r) 100
    EGFR(l,y~U) 50
end seed species

begin reaction rules
    EGF(r) + EGFR(l) <-> EGF(r!1).EGFR(l!1) k_bind, k_unbind
    EGFR(y~U) -> EGFR(y~P) k_phos
    EGFR(y~P) -> EGFR(y~U) k_dephos
end reaction rules

begin observables
    Molecules EGF_free EGF(r)
    Molecules EGFR_free EGFR(l)
    Molecules Bound_EGFR EGFR(l!+)
    Molecules Phospho_EGFR EGFR(y~P)
end observables

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>50,n_steps=>100})
end actions
end model
    `,tags:["signaling","phosphorylation"]},{id:"michaelis-menten",name:"Michaelis-Menten Kinetics",description:"The classic model of enzyme kinetics.",code:`
begin model
begin parameters
    k1 0.001
    k2 0.0001
    k3 0.1
end parameters

begin molecule types
    E(s)
    S(e)
    P(e)
end molecule types

begin seed species
    E(s) 100
    S(e) 1000
end seed species

begin observables
    Molecules Substrate S()
    Molecules Product P()
    Molecules Enzyme E()
    Molecules Complex E(s!1).S(e!1)
end observables

begin reaction rules
    E(s) + S(e) <-> E(s!1).S(e!1) k1, k2
    E(s!1).S(e!1) -> E(s) + P(e) k3
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>200,n_steps=>200})
end actions
end model
    `,tags:["enzyme kinetics","classic"]},{id:"sir-epidemic",name:"SIR Epidemic Model",description:"Compartment model for disease spread with waning immunity.",code:`
begin model
begin parameters
    beta 0.0005
    gamma 0.1
    delta 0.01
end parameters

begin molecule types
    Human(state~S~I~R)
end molecule types

begin seed species
    Human(state~S) 990
    Human(state~I) 10
end seed species

begin observables
    Molecules Susceptible Human(state~S)
    Molecules Infected Human(state~I)
    Molecules Recovered Human(state~R)
end observables

begin reaction rules
    Human(state~S) + Human(state~I) -> Human(state~I) + Human(state~I) beta
    Human(state~I) -> Human(state~R) gamma
    Human(state~R) -> Human(state~S) delta
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>160,n_steps=>160})
end actions
end model
    `,tags:["epidemiology","population"]},{id:"gene-expression",name:"Gene Expression Toggle",description:"Minimal transcription-translation model with promoter switching.",code:`
begin model
begin parameters
    k_activate 0.002
    k_repress 0.001
    k_transcription 1.0
    k_translation 5.0
    k_mrna_deg 0.2
    k_protein_deg 0.05
end parameters

begin molecule types
    Gene(active~off~on)
    mRNA()
    Protein()
end molecule types

begin seed species
    Gene(active~off) 1
end seed species

begin observables
    Molecules Promoter_on Gene(active~on)
    Molecules Promoter_off Gene(active~off)
    Molecules Transcripts mRNA()
    Molecules Protein Protein()
end observables

begin reaction rules
    Gene(active~off) -> Gene(active~on) k_activate
    Gene(active~on) -> Gene(active~off) k_repress
    Gene(active~on) -> Gene(active~on) + mRNA() k_transcription
    mRNA() -> mRNA() + Protein() k_translation
    mRNA() -> 0 k_mrna_deg
    Protein() -> 0 k_protein_deg
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>200,n_steps=>200})
end actions
end model
    `,tags:["gene regulation","expression"]},{id:"mapk-cascade",name:"MAPK Signaling Cascade",description:"Three-tier kinase cascade with sequential activation.",code:`
begin model
begin parameters
    k_bind 1.0
    k_unbind 0.1
    k_act1 0.5
    k_deact1 0.05
    k_act2 0.4
    k_deact2 0.04
    k_act3 0.3
    k_deact3 0.03
end parameters

begin molecule types
    Ligand(r)
    Receptor(l,state~inactive~active)
    MAPKKK(state~U~P)
    MAPKK(state~U~P)
    MAPK(state~U~P)
end molecule types

begin seed species
    Ligand(r) 100
    Receptor(l,state~inactive) 50
    MAPKKK(state~U) 30
    MAPKK(state~U) 100
    MAPK(state~U) 200
end seed species

begin observables
    Molecules Active_Receptor Receptor(state~active)
    Molecules MAPKKK_P MAPKKK(state~P)
    Molecules MAPKK_P MAPKK(state~P)
    Molecules MAPK_P MAPK(state~P)
end observables

begin reaction rules
    Ligand(r) + Receptor(l,state~inactive) <-> Ligand(r!1).Receptor(l!1,state~inactive) k_bind, k_unbind
    Ligand(r!1).Receptor(l!1,state~inactive) -> Ligand(r!1).Receptor(l!1,state~active) k_act1
    Receptor(state~active) -> Receptor(state~inactive) k_deact1
    Receptor(state~active) + MAPKKK(state~U) -> Receptor(state~active) + MAPKKK(state~P) k_act2
    MAPKKK(state~P) -> MAPKKK(state~U) k_deact2
    MAPKKK(state~P) + MAPKK(state~U) -> MAPKKK(state~P) + MAPKK(state~P) k_act3
    MAPKK(state~P) -> MAPKK(state~U) k_deact3
    MAPKK(state~P) + MAPK(state~U) -> MAPKK(state~P) + MAPK(state~P) k_act3
    MAPK(state~P) -> MAPK(state~U) k_deact3
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>60,n_steps=>120})
end actions
end model
    `,tags:["signaling","cascade"]},{id:"predator-prey",name:"Predator-Prey Dynamics",description:"Lotka-Volterra style interaction with birth and death processes.",code:`
begin model
begin parameters
    k_prey_birth 1.0
    k_predation 0.002
    k_pred_birth 0.001
    k_pred_death 0.5
end parameters

begin molecule types
    Prey()
    Predator()
end molecule types

begin seed species
    Prey() 200
    Predator() 20
end seed species

begin observables
    Molecules Prey_count Prey()
    Molecules Predator_count Predator()
end observables

begin reaction rules
    Prey() -> Prey() + Prey() k_prey_birth
    Predator() + Prey() -> Predator() + Predator() k_pred_birth
    Predator() + Prey() -> Predator() k_predation
    Predator() -> 0 k_pred_death
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>100,n_steps=>200})
end actions
end model
    `,tags:["population","ecology"]},{id:"dual-phosphorylation",name:"Dual-Site Phosphorylation",description:"Sequential kinase and phosphatase control of a two-site substrate.",code:`
begin model
begin parameters
    k_bind 1.0
    k_unbind 0.1
    k_phos 0.5
    k_dephos 0.2
end parameters

begin molecule types
    Kinase(b)
    Phosphatase(b)
    Substrate(y1~U~P,y2~U~P)
end molecule types

begin seed species
    Kinase(b) 50
    Phosphatase(b) 40
    Substrate(y1~U,y2~U) 200
end seed species

begin observables
    Molecules Unphosphorylated Substrate(y1~U,y2~U)
    Molecules SingleP_y1 Substrate(y1~P,y2~U)
    Molecules SingleP_y2 Substrate(y1~U,y2~P)
    Molecules DoubleP Substrate(y1~P,y2~P)
end observables

begin reaction rules
    Kinase(b) + Substrate(y1~U) -> Kinase(b) + Substrate(y1~P) k_phos
    Kinase(b) + Substrate(y2~U) -> Kinase(b) + Substrate(y2~P) k_phos
    Phosphatase(b) + Substrate(y1~P) -> Phosphatase(b) + Substrate(y1~U) k_dephos
    Phosphatase(b) + Substrate(y2~P) -> Phosphatase(b) + Substrate(y2~U) k_dephos
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>80,n_steps=>160})
end actions
end model
    `,tags:["phosphorylation","switch"]},{id:"auto-activation-loop",name:"Auto-Activation Loop",description:"Single gene that positively regulates its own expression.",code:`
begin model
begin parameters
    k_on 0.0005
    k_off 0.0002
    k_prod 1.2
    k_deg 0.05
end parameters

begin molecule types
    Gene(prom~off~on)
    Protein()
end molecule types

begin seed species
    Gene(prom~off) 1
    Protein() 5
end seed species

begin observables
    Molecules Promoter_on Gene(prom~on)
    Molecules Promoter_off Gene(prom~off)
    Molecules Effector Protein()
end observables

begin reaction rules
    Gene(prom~off) + Protein() -> Gene(prom~on) + Protein() k_on
    Gene(prom~on) -> Gene(prom~off) k_off
    Gene(prom~on) -> Gene(prom~on) + Protein() k_prod
    Protein() -> 0 k_deg
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>150,n_steps=>150})
end actions
end model
    `,tags:["gene regulation","feedback"]},{id:"negative-feedback-loop",name:"Negative Feedback Loop",description:"Gene expression damped by its protein product.",code:`
begin model
begin parameters
    k_transcribe 1.0
    k_translate 4.0
    k_bind 0.002
    k_unbind 0.001
    k_deg_m 0.2
    k_deg_p 0.1
end parameters

begin molecule types
    Gene(state~free~bound)
    mRNA()
    Protein()
end molecule types

begin seed species
    Gene(state~free) 1
end seed species

begin observables
    Molecules Free_gene Gene(state~free)
    Molecules Bound_gene Gene(state~bound)
    Molecules Transcript mRNA()
    Molecules Protein Protein()
end observables

begin reaction rules
    Gene(state~free) -> Gene(state~free) + mRNA() k_transcribe
    mRNA() -> mRNA() + Protein() k_translate
    Protein() + Gene(state~free) -> Protein() + Gene(state~bound) k_bind
    Gene(state~bound) -> Gene(state~free) k_unbind
    mRNA() -> 0 k_deg_m
    Protein() -> 0 k_deg_p
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>200,n_steps=>200})
end actions
end model
    `,tags:["gene regulation","feedback"]},{id:"repressilator",name:"Repressilator Oscillator",description:"Three-gene synthetic oscillator with cyclic repression.",code:`
begin model
begin parameters
    k_transcribe 1.0
    k_translate 5.0
    k_repress 0.003
    k_release 0.001
    k_deg_m 0.2
    k_deg_p 0.1
end parameters

begin molecule types
    GeneA(state~free~bound)
    GeneB(state~free~bound)
    GeneC(state~free~bound)
    mRNA_A()
    mRNA_B()
    mRNA_C()
    ProteinA()
    ProteinB()
    ProteinC()
end molecule types

begin seed species
    GeneA(state~free) 1
    GeneB(state~free) 1
    GeneC(state~free) 1
end seed species

begin observables
    Molecules Protein_A ProteinA()
    Molecules Protein_B ProteinB()
    Molecules Protein_C ProteinC()
    Molecules GeneA_bound GeneA(state~bound)
end observables

begin reaction rules
    GeneA(state~free) -> GeneA(state~free) + mRNA_A() k_transcribe
    GeneB(state~free) -> GeneB(state~free) + mRNA_B() k_transcribe
    GeneC(state~free) -> GeneC(state~free) + mRNA_C() k_transcribe
    mRNA_A() -> mRNA_A() + ProteinA() k_translate
    mRNA_B() -> mRNA_B() + ProteinB() k_translate
    mRNA_C() -> mRNA_C() + ProteinC() k_translate
    ProteinC() + GeneA(state~free) -> ProteinC() + GeneA(state~bound) k_repress
    GeneA(state~bound) -> GeneA(state~free) k_release
    ProteinA() + GeneB(state~free) -> ProteinA() + GeneB(state~bound) k_repress
    GeneB(state~bound) -> GeneB(state~free) k_release
    ProteinB() + GeneC(state~free) -> ProteinB() + GeneC(state~bound) k_repress
    GeneC(state~bound) -> GeneC(state~free) k_release
    mRNA_A() -> 0 k_deg_m
    mRNA_B() -> 0 k_deg_m
    mRNA_C() -> 0 k_deg_m
    ProteinA() -> 0 k_deg_p
    ProteinB() -> 0 k_deg_p
    ProteinC() -> 0 k_deg_p
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>300,n_steps=>300})
end actions
end model
    `,tags:["oscillator","synthetic biology"]},{id:"bistable-toggle-switch",name:"Bistable Toggle Switch",description:"Mutual repression between two genes yielding bistability.",code:`
begin model
begin parameters
    k_transcribe 0.8
    k_translate 4.0
    k_bind 0.003
    k_unbind 0.0008
    k_deg_m 0.15
    k_deg_p 0.08
end parameters

begin molecule types
    GeneL(state~free~bound)
    GeneR(state~free~bound)
    mRNA_L()
    mRNA_R()
    ProteinL()
    ProteinR()
end molecule types

begin seed species
    GeneL(state~free) 1
    GeneR(state~free) 1
end seed species

begin observables
    Molecules Protein_L ProteinL()
    Molecules Protein_R ProteinR()
    Molecules GeneL_bound GeneL(state~bound)
    Molecules GeneR_bound GeneR(state~bound)
end observables

begin reaction rules
    GeneL(state~free) -> GeneL(state~free) + mRNA_L() k_transcribe
    GeneR(state~free) -> GeneR(state~free) + mRNA_R() k_transcribe
    mRNA_L() -> mRNA_L() + ProteinL() k_translate
    mRNA_R() -> mRNA_R() + ProteinR() k_translate
    ProteinR() + GeneL(state~free) -> ProteinR() + GeneL(state~bound) k_bind
    ProteinL() + GeneR(state~free) -> ProteinL() + GeneR(state~bound) k_bind
    GeneL(state~bound) -> GeneL(state~free) k_unbind
    GeneR(state~bound) -> GeneR(state~free) k_unbind
    mRNA_L() -> 0 k_deg_m
    mRNA_R() -> 0 k_deg_m
    ProteinL() -> 0 k_deg_p
    ProteinR() -> 0 k_deg_p
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>250,n_steps=>250})
end actions
end model
    `,tags:["bistable","synthetic biology"]},{id:"cooperative-binding",name:"Cooperative Binding",description:"Ligand binding with cooperativity across two sites.",code:`
begin model
begin parameters
    k_on1 0.01
    k_off1 0.005
    k_on2 0.02
    k_off2 0.003
end parameters

begin molecule types
    Ligand()
    Receptor(site1~U~B,site2~U~B)
end molecule types

begin seed species
    Ligand() 200
    Receptor(site1~U,site2~U) 50
end seed species

begin observables
    Molecules Unbound Receptor(site1~U,site2~U)
    Molecules Single_bound_site1 Receptor(site1~B,site2~U)
    Molecules Single_bound_site2 Receptor(site1~U,site2~B)
    Molecules Double_bound Receptor(site1~B,site2~B)
end observables

begin reaction rules
    Ligand() + Receptor(site1~U) -> Ligand() + Receptor(site1~B) k_on1
    Receptor(site1~B) -> Receptor(site1~U) k_off1
    Ligand() + Receptor(site2~U) -> Ligand() + Receptor(site2~B) k_on2
    Receptor(site2~B) -> Receptor(site2~U) k_off2
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>100,n_steps=>200})
end actions
end model
    `,tags:["binding","cooperativity"]},{id:"enzyme-inhibition",name:"Competitive Enzyme Inhibition",description:"Substrate competes with inhibitor for the active site.",code:`
begin model
begin parameters
    k_on 0.002
    k_off 0.0005
    k_cat 0.05
    k_on_i 0.0025
    k_off_i 0.0004
end parameters

begin molecule types
    Enzyme(s)
    Substrate(b)
    Inhibitor(b)
    Product()
end molecule types

begin seed species
    Enzyme(s) 50
    Substrate(b) 300
    Inhibitor(b) 150
end seed species

begin observables
    Molecules Free_enzyme Enzyme(s)
    Molecules Complex Enzyme(s!1).Substrate(b!1)
    Molecules Inhibited Enzyme(s!1).Inhibitor(b!1)
    Molecules Product Product()
end observables

begin reaction rules
    Enzyme(s) + Substrate(b) <-> Enzyme(s!1).Substrate(b!1) k_on, k_off
    Enzyme(s!1).Substrate(b!1) -> Enzyme(s) + Product() k_cat
    Enzyme(s) + Inhibitor(b) <-> Enzyme(s!2).Inhibitor(b!2) k_on_i, k_off_i
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>180,n_steps=>180})
end actions
end model
    `,tags:["enzyme kinetics","inhibition"]},{id:"enzyme-activation",name:"Allosteric Activation",description:"Activator binding enhances catalytic turnover.",code:`
begin model
begin parameters
    k_on 0.002
    k_off 0.0005
    k_cat 0.02
    k_cat_active 0.1
    k_on_act 0.0015
    k_off_act 0.0003
end parameters

begin molecule types
    Enzyme(s,c,a~inactive~active)
    Substrate(b)
    Activator(b)
    Product()
end molecule types

begin seed species
    Enzyme(s,c,a~inactive) 40
    Substrate(b) 200
    Activator(b) 150
end seed species

begin observables
    Molecules Active_enzyme Enzyme(a~active)
    Molecules Inactive_enzyme Enzyme(a~inactive)
    Molecules Product Product()
end observables

begin reaction rules
    Enzyme(c,a~inactive) + Activator(b) <-> Enzyme(c!1,a~active).Activator(b!1) k_on_act, k_off_act
    Enzyme(s,a~inactive) + Substrate(b) <-> Enzyme(s!2,a~inactive).Substrate(b!2) k_on, k_off
    Enzyme(s,a~active) + Substrate(b) <-> Enzyme(s!3,a~active).Substrate(b!3) k_on, k_off
    Enzyme(s!2,a~inactive).Substrate(b!2) -> Enzyme(s,a~inactive) + Product() k_cat
    Enzyme(s!3,a~active).Substrate(b!3) -> Enzyme(s,a~active) + Product() k_cat_active
    Enzyme(c!1,a~active).Activator(b!1) -> Enzyme(c,a~active) + Activator(b) k_off_act
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>150,n_steps=>150})
end actions
end model
    `,tags:["enzyme kinetics","activation"]},{id:"signal-amplification",name:"Signal Amplification Cascade",description:"Ligand binding triggers second messenger production.",code:`
begin model
begin parameters
    k_bind 0.01
    k_unbind 0.002
    k_act 0.5
    k_deact 0.1
    k_prod 5.0
    k_deg 0.5
end parameters

begin molecule types
    Ligand()
    Receptor(state~inactive~active)
    Effector(state~inactive~active)
    Messenger()
end molecule types

begin seed species
    Ligand() 100
    Receptor(state~inactive) 50
    Effector(state~inactive) 30
end seed species

begin observables
    Molecules Active_receptor Receptor(state~active)
    Molecules Active_effector Effector(state~active)
    Molecules Messenger Messenger()
end observables

begin reaction rules
    Ligand() + Receptor(state~inactive) <-> Ligand() + Receptor(state~active) k_bind, k_unbind
    Receptor(state~active) + Effector(state~inactive) -> Receptor(state~active) + Effector(state~active) k_act
    Effector(state~active) -> Effector(state~inactive) k_deact
    Effector(state~active) -> Effector(state~active) + Messenger() k_prod
    Messenger() -> 0 k_deg
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>120,n_steps=>240})
end actions
end model
    `,tags:["signaling","amplification"]},{id:"two-component-system",name:"Two-Component System",description:"Histidine kinase phosphorylates a response regulator.",code:`
begin model
begin parameters
    k_auto 0.3
    k_transfer 0.5
    k_dephos 0.1
    k_synth 0.8
    k_deg 0.05
end parameters

begin molecule types
    Kinase(state~U~P)
    Regulator(state~U~P)
    Target()
end molecule types

begin seed species
    Kinase(state~U) 40
    Regulator(state~U) 80
end seed species

begin observables
    Molecules Kinase_P Kinase(state~P)
    Molecules Reg_P Regulator(state~P)
    Molecules Target Target()
end observables

begin reaction rules
    Kinase(state~U) -> Kinase(state~P) k_auto
    Kinase(state~P) + Regulator(state~U) -> Kinase(state~U) + Regulator(state~P) k_transfer
    Regulator(state~P) -> Regulator(state~U) k_dephos
    Regulator(state~P) -> Regulator(state~P) + Target() k_synth
    Target() -> 0 k_deg
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>120,n_steps=>240})
end actions
end model
    `,tags:["signaling","phosphorelay"]},{id:"brusselator",name:"Brusselator Oscillator",description:"Classical chemical oscillator with autocatalysis.",code:`
begin model
begin parameters
    k1 1.0
    k2 1.5
    k3 1.0
    k4 1.0
end parameters

begin molecule types
    X()
    Y()
    A()
    B()
end molecule types

begin seed species
    X() 1
    Y() 1
    A() 1
    B() 2
end seed species

begin observables
    Molecules Species_X X()
    Molecules Species_Y Y()
end observables

begin reaction rules
    A() -> X() k1
    X() -> X() + X() + Y() k2
    X() + Y() -> Y() + Y() k3
    X() -> 0 k4
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>40,n_steps=>400})
end actions
end model
    `,tags:["oscillator","chemical"]},{id:"glycolysis-branch",name:"Glycolysis Branch Point",description:"Competition between ATP production and biomass channel.",code:`
begin model
begin parameters
    k_gly 2.0
    k_branch 0.8
    k_atp_use 0.5
    k_biomass_use 0.3
end parameters

begin molecule types
    Glucose()
    ATP()
    Biomass()
end molecule types

begin seed species
    Glucose() 100
end seed species

begin observables
    Molecules Glucose_pool Glucose()
    Molecules ATP_pool ATP()
    Molecules Biomass Biomass()
end observables

begin reaction rules
    Glucose() -> ATP() k_gly
    Glucose() -> Biomass() k_branch
    ATP() -> 0 k_atp_use
    Biomass() -> 0 k_biomass_use
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>60,n_steps=>120})
end actions
end model
    `,tags:["metabolism","pathway"]},{id:"calcium-spike",name:"Calcium Spike Signaling",description:"Calcium influx with pump-mediated clearance.",code:`
begin model
begin parameters
    k_influx 0.5
    k_release 0.3
    k_pump 0.4
    k_leak 0.05
end parameters

begin molecule types
    Calcium_cyto()
    Calcium_store()
    Calcium_ext()
end molecule types

begin seed species
    Calcium_cyto() 10
    Calcium_store() 200
    Calcium_ext() 500
end seed species

begin observables
    Molecules Cytosolic Calcium_cyto()
    Molecules Stored Calcium_store()
    Molecules Extracellular Calcium_ext()
end observables

begin reaction rules
    Calcium_store() -> Calcium_cyto() k_release
    Calcium_cyto() -> Calcium_ext() k_pump
    Calcium_ext() -> Calcium_cyto() k_influx
    Calcium_cyto() -> Calcium_store() k_leak
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>80,n_steps=>160})
end actions
end model
    `,tags:["signaling","calcium"]},{id:"apoptosis-cascade",name:"Apoptosis Cascade",description:"Caspase activation with feedback amplification.",code:`
begin model
begin parameters
    k_initiator 0.01
    k_effector 0.05
    k_feedback 0.02
    k_deg 0.01
end parameters

begin molecule types
    Initiator(state~inactive~active)
    Effector(state~inactive~active)
end molecule types

begin seed species
    Initiator(state~inactive) 100
    Effector(state~inactive) 200
end seed species

begin observables
    Molecules Active_initiator Initiator(state~active)
    Molecules Active_effector Effector(state~active)
end observables

begin reaction rules
    Initiator(state~inactive) -> Initiator(state~active) k_initiator
    Initiator(state~active) + Effector(state~inactive) -> Initiator(state~active) + Effector(state~active) k_effector
    Effector(state~active) + Initiator(state~inactive) -> Effector(state~active) + Initiator(state~active) k_feedback
    Effector(state~active) -> Effector(state~inactive) k_deg
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>120,n_steps=>240})
end actions
end model
    `,tags:["cell death","caspase"]},{id:"notch-delta",name:"Notch-Delta Lateral Inhibition",description:"Reciprocal signaling between neighboring cells.",code:`
begin model
begin parameters
    k_bind 0.01
    k_unbind 0.002
    k_signal 0.2
    k_decay 0.05
end parameters

begin molecule types
    CellNotch(state~inactive~active)
    CellDelta(level~low~high)
end molecule types

begin seed species
    CellNotch(state~inactive) 1
    CellDelta(level~low) 1
end seed species

begin observables
    Molecules Active_notch CellNotch(state~active)
    Molecules High_delta CellDelta(level~high)
end observables

begin reaction rules
    CellNotch(state~inactive) + CellDelta(level~high) <-> CellNotch(state~active) + CellDelta(level~high) k_bind, k_unbind
    CellNotch(state~active) -> CellNotch(state~inactive) k_decay
    CellNotch(state~inactive) -> CellNotch(state~inactive) + CellDelta(level~low) k_signal
    CellDelta(level~low) -> CellDelta(level~high) k_signal
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>150,n_steps=>300})
end actions
end model
    `,tags:["development","signaling"]},{id:"quorum-sensing",name:"Quorum Sensing Circuit",description:"Autoinducer-mediated activation of gene expression.",code:`
begin model
begin parameters
    k_synth 0.5
    k_export 0.4
    k_import 0.3
    k_activate 0.2
    k_deg 0.05
end parameters

begin molecule types
    Autoinducer()
    Autoinducer_env()
    Gene(state~off~on)
    Protein()
end molecule types

begin seed species
    Gene(state~off) 1
    Protein() 100
    Autoinducer_env() 1000
end seed species

begin observables
    Molecules Autoinducer_pool Autoinducer()
    Molecules Gene_on Gene(state~on)
    Molecules Protein Protein()
    Molecules Autoinducer_env_pool Autoinducer_env()
end observables

begin reaction rules
    Autoinducer_env() -> Autoinducer() k_synth
    Autoinducer() -> Autoinducer_env() k_deg
    Autoinducer() + Gene(state~off) -> Gene(state~on) + Autoinducer() k_activate
    Gene(state~on) -> Gene(state~on) + Protein() k_export
    Protein() -> 0 k_import
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>120,n_steps=>240})
end actions
end model
    `,tags:["bacteria","signaling"]},{id:"circadian-oscillator",name:"Circadian Oscillator",description:"Delayed negative feedback model for circadian rhythms.",code:`
begin model
begin parameters
    k_synth 0.6
    k_phos 0.3
    k_feedback 0.1
    k_deg 0.05
end parameters

begin molecule types
    mRNA()
    Protein(state~U~P)
end molecule types

begin seed species
    mRNA() 10
    Protein(state~U) 50
end seed species

begin observables
    Molecules Transcript mRNA()
    Molecules Protein_total Protein()
end observables

begin reaction rules
    Protein(state~P) -> Protein(state~U) k_deg
    mRNA() -> mRNA() + Protein(state~U) k_synth
    Protein(state~U) -> Protein(state~P) k_phos
    Protein(state~P) -> 0 k_deg
    Protein(state~P) + mRNA() -> Protein(state~P) k_feedback
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>240,n_steps=>480})
end actions
end model
    `,tags:["circadian","oscillator"]},{id:"wnt-beta-catenin",name:"Wnt/Beta-Catenin Signaling",description:"Simplified model of beta-catenin stabilization after Wnt activation.",code:`
begin model
begin parameters
    k_wnt 0.3
    k_destruction 0.2
    k_translocate 0.1
    k_transcription 0.5
    k_deg 0.05
end parameters

begin molecule types
    Wnt(state~off~on)
    BetaCatenin(loc~cyto~nuc)
    TargetGene()
end molecule types

begin seed species
    Wnt(state~off) 1
    BetaCatenin(loc~cyto) 50
end seed species

begin observables
    Molecules Active_wnt Wnt(state~on)
    Molecules Nuclear_beta BetaCatenin(loc~nuc)
    Molecules Target TargetGene()
end observables

begin reaction rules
    Wnt(state~off) -> Wnt(state~on) k_wnt
    BetaCatenin(loc~cyto) -> 0 k_destruction
    Wnt(state~on) + BetaCatenin(loc~cyto) -> Wnt(state~on) + BetaCatenin(loc~nuc) k_translocate
    BetaCatenin(loc~nuc) -> BetaCatenin(loc~cyto) k_deg
    BetaCatenin(loc~nuc) -> BetaCatenin(loc~nuc) + TargetGene() k_transcription
    TargetGene() -> 0 k_deg
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>160,n_steps=>320})
end actions
end model
    `,tags:["signaling","transcription"]},{id:"tcell-activation",name:"T Cell Activation",description:"T cell receptor engagement leading to cytokine production.",code:`
begin model
begin parameters
    k_bind 0.004
    k_unbind 0.001
    k_signal 0.3
    k_deact 0.05
    k_cyt 0.6
    k_cyt_deg 0.1
end parameters

begin molecule types
    TCR(state~inactive~active)
    Antigen()
    Cytokine()
end molecule types

begin seed species
    TCR(state~inactive) 100
    Antigen() 80
end seed species

begin observables
    Molecules Active_tcr TCR(state~active)
    Molecules Cytokine_pool Cytokine()
end observables

begin reaction rules
    TCR(state~inactive) + Antigen() <-> TCR(state~active) + Antigen() k_bind, k_unbind
    TCR(state~active) -> TCR(state~inactive) k_deact
    TCR(state~active) -> TCR(state~active) + Cytokine() k_cyt
    Cytokine() -> 0 k_cyt_deg
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>120,n_steps=>240})
end actions
end model
    `,tags:["immune","signaling"]},{id:"nfkb-feedback",name:"NF-kB Feedback",description:"NF-κB activation with inhibitor-induced negative feedback.",code:`
begin model
begin parameters
    k_activate 0.4
    k_inhibit 0.2
    k_synth 0.6
    k_deg 0.1
    k_export 0.3
end parameters

begin molecule types
    NFkB(loc~cyto~nuc)
    IkB()
end molecule types

begin seed species
    NFkB(loc~cyto) 100
end seed species

begin observables
    Molecules Nuclear NFkB(loc~nuc)
    Molecules Inhibitor IkB()
end observables

begin reaction rules
    NFkB(loc~cyto) -> NFkB(loc~nuc) k_activate
    NFkB(loc~nuc) -> NFkB(loc~cyto) k_export
    NFkB(loc~nuc) -> NFkB(loc~nuc) + IkB() k_synth
    IkB() + NFkB(loc~cyto) -> IkB() k_inhibit
    IkB() -> 0 k_deg
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>150,n_steps=>300})
end actions
end model
    `,tags:["immune","feedback"]},{id:"phosphorelay-chain",name:"Phosphorelay Chain",description:"Multi-step phosphorylation relay transmitting a signal.",code:`
begin model
begin parameters
    k1 0.4
    k2 0.3
    k3 0.2
    k_reset 0.05
end parameters

begin molecule types
    Sensor(state~U~P)
    Relay(state~U~P)
    Output(state~U~P)
end molecule types

begin seed species
    Sensor(state~U) 50
    Relay(state~U) 70
    Output(state~U) 90
end seed species

begin observables
    Molecules Sensor_P Sensor(state~P)
    Molecules Relay_P Relay(state~P)
    Molecules Output_P Output(state~P)
end observables

begin reaction rules
    Sensor(state~U) -> Sensor(state~P) k1
    Sensor(state~P) + Relay(state~U) -> Sensor(state~P) + Relay(state~P) k2
    Relay(state~P) + Output(state~U) -> Relay(state~P) + Output(state~P) k3
    Output(state~P) -> Output(state~U) k_reset
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>100,n_steps=>200})
end actions
end model
    `,tags:["signaling","phosphorelay"]},{id:"p53-mdm2",name:"p53-MDM2 Oscillator",description:"Stress-induced p53 activation with MDM2-mediated degradation.",code:`
begin model
begin parameters
    k_stress 0.4
    k_mdmsynth 0.3
    k_degrade 0.2
    k_mdmdown 0.1
    k_p53deg 0.05
end parameters

begin molecule types
    p53()
    MDM2()
end molecule types

begin seed species
    p53() 20
end seed species

begin observables
    Molecules p53_total p53()
    Molecules MDM2_total MDM2()
end observables

begin reaction rules
    0 -> p53() k_stress
    p53() -> 0 k_p53deg
    p53() -> p53() + MDM2() k_mdmsynth
    MDM2() + p53() -> MDM2() k_degrade
    MDM2() -> 0 k_mdmdown
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>160,n_steps=>320})
end actions
end model
    `,tags:["stress","feedback"]},{id:"stress-response",name:"Stress Response Adaptation",description:"Fast stress sensor inducing slow adaptive enzyme production.",code:`
begin model
begin parameters
    k_sense 0.5
    k_adapt 0.1
    k_recover 0.05
    k_deg 0.02
end parameters

begin molecule types
    Sensor(state~inactive~active)
    Adapter()
    Enzyme()
end molecule types

begin seed species
    Sensor(state~inactive) 50
end seed species

begin observables
    Molecules Active_sensor Sensor(state~active)
    Molecules Adapter Adapter()
    Molecules Enzyme Enzyme()
end observables

begin reaction rules
    Sensor(state~inactive) -> Sensor(state~active) k_sense
    Sensor(state~active) -> Sensor(state~inactive) k_recover
    Sensor(state~active) -> Sensor(state~active) + Adapter() k_adapt
    Adapter() -> Adapter() + Enzyme() k_adapt
    Enzyme() -> 0 k_deg
end reaction rules

begin actions
    generate_network({overwrite=>1})
    simulate({method=>"ode",t_end=>120,n_steps=>240})
end actions
end model
    `,tags:["stress","adaptation"]}],Ft=[...new Set(Nt.flatMap(t=>t.tags))],It=({isOpen:t,onClose:s,onSelect:r})=>{const[a,i]=d.useState(""),[o,u]=d.useState(new Set),y=d.useMemo(()=>Nt.filter(h=>{const x=h.name.toLowerCase().includes(a.toLowerCase())||h.description.toLowerCase().includes(a.toLowerCase()),j=o.size===0||[...o].every(P=>h.tags.includes(P));return x&&j}),[a,o]),n=h=>{const x=new Set(o);x.has(h)?x.delete(h):x.add(h),u(x)};return e.jsx(yt,{isOpen:t,onClose:s,title:"Example Model Gallery",size:"3xl",children:e.jsxs("div",{className:"mt-4",children:[e.jsx("div",{className:"flex flex-col md:flex-row gap-4 mb-4",children:e.jsxs("div",{className:"relative flex-grow",children:[e.jsx(jt,{className:"absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"}),e.jsx(Ie,{type:"text",placeholder:"Search examples...",value:a,onChange:h=>i(h.target.value),className:"pl-10"})]})}),e.jsx("div",{className:"flex flex-wrap gap-2 mb-6 border-b border-stone-200 dark:border-slate-700 pb-4",children:Ft.map(h=>e.jsx("button",{onClick:()=>n(h),className:`px-3 py-1 text-xs font-medium rounded-full transition-colors ${o.has(h)?"bg-primary text-white":"bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"}`,children:h},h))}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2",children:y.length>0?y.map(h=>e.jsxs(we,{className:"flex flex-col",children:[e.jsxs("div",{className:"flex-grow",children:[e.jsx("h3",{className:"font-semibold text-slate-800 dark:text-slate-100",children:h.name}),e.jsx("p",{className:"text-sm text-slate-600 dark:text-slate-300 mt-1",children:h.description}),e.jsx("div",{className:"flex flex-wrap gap-1 mt-3",children:h.tags.map(x=>e.jsx("span",{className:"px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300 rounded-full",children:x},x))})]}),e.jsx("button",{onClick:()=>r(h.code),className:"mt-4 w-full text-center px-4 py-2 text-sm font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors text-slate-800 dark:text-slate-100",children:"Load Example"})]},h.id)):e.jsx("p",{className:"text-slate-500 dark:text-slate-400 col-span-full text-center",children:"No examples match your criteria."})})]})})},Gt=({name:t,options:s,value:r,onChange:a})=>e.jsx("div",{className:"flex items-center gap-4 py-1",children:s.map(i=>e.jsxs("label",{className:"flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer",children:[e.jsx("input",{type:"radio",name:t,value:i.value,checked:r===i.value,onChange:o=>a(o.target.value),className:"h-4 w-4 text-primary focus:ring-primary-500 border-stone-300 dark:border-slate-600 dark:bg-slate-800"}),e.jsx("span",{children:i.label})]},i.value))});let Xe=null;function Bt(){return Xe||(Xe=new Promise((t,s)=>{if(window.monaco){t(window.monaco);return}const r=document.createElement("script");r.src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js",r.async=!0,r.onload=()=>{window.require.config({paths:{vs:"https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs"}}),window.require(["vs/editor/editor.main"],()=>{t(window.monaco)})},r.onerror=s,document.head.appendChild(r)}),Xe)}const Tt=({value:t,onChange:s,language:r="bngl",theme:a="light"})=>{const i=d.useRef(null),o=d.useRef(null),u=d.useRef(null),y=d.useRef(s);return d.useEffect(()=>{y.current=s},[s]),d.useEffect(()=>{let n=!1,h=null;return Bt().then(x=>{n||!i.current||(o.current=x,x.languages.getLanguages().some(({id:j})=>j==="bngl")||(x.languages.register({id:"bngl"}),x.languages.setMonarchTokensProvider("bngl",{keywords:["begin","end","model","parameters","molecule","types","seed","species","observables","functions","reaction","rules","actions","generate_network","simulate","method","t_end","n_steps","ode","ssa","overwrite"],tokenizer:{root:[[/#.*$/,"comment"],[/[a-zA-Z_]\w*/,{cases:{"@keywords":"keyword","@default":"identifier"}}],[/([a-zA-Z_]\w*)\s*\(/,"type.identifier"],[/\d+(\.\d+)?(e[+-]?\d+)?/,"number"],[/->|<->/,"operator"],[/[()\[\]{},.!~+@]/,"delimiter"]]}})),h=x.editor.create(i.current,{value:t,language:r,theme:a==="dark"?"vs-dark":"vs",automaticLayout:!0,minimap:{enabled:!1},wordWrap:"on",fontSize:13,lineNumbers:"on",scrollBeyondLastLine:!1}),u.current=h,h.onDidChangeModelContent(()=>{y.current(h.getValue())}))}).catch(x=>{n||console.error("Failed to initialize Monaco Editor:",x)}),()=>{if(n=!0,h)try{h.dispose()}catch(x){console.warn("Error disposing Monaco editor:",x)}u.current=null}},[r,a,t]),d.useEffect(()=>{const n=u.current;if(n&&n.getValue()!==t){const h=n.getModel();h&&h.setValue(t)}},[t]),e.jsx("div",{ref:i,className:"w-full h-full border border-stone-300 dark:border-slate-700 rounded-md"})},Ut=({code:t,onCodeChange:s,onParse:r,onSimulate:a,onCancelSimulation:i,isSimulating:o,modelExists:u})=>{const[y,n]=d.useState(!1),[h,x]=d.useState("ode"),j=Ee.useRef(null),P=_=>{var X;const N=(X=_.target.files)==null?void 0:X[0];if(N){const W=new FileReader;W.onload=O=>{var xe;s((xe=O.target)==null?void 0:xe.result)},W.readAsText(N)}},C=_=>{s(_),n(!1)};return e.jsxs(we,{className:"flex flex-col h-full",children:[e.jsx("h2",{className:"text-xl font-bold mb-3 text-slate-800 dark:text-slate-100",children:"BNGL Model Editor"}),e.jsx("div",{className:"flex-grow relative",children:e.jsx(Tt,{language:"bngl",value:t,onChange:_=>s(_||"")})}),e.jsxs("div",{className:"mt-4 flex flex-wrap gap-2 items-center justify-between",children:[e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx(he,{onClick:()=>n(!0),children:"Examples"}),e.jsxs(he,{variant:"subtle",onClick:()=>{var _;return(_=j.current)==null?void 0:_.click()},children:[e.jsx(Lt,{className:"w-4 h-4 mr-2"}),"Load BNGL"]}),e.jsx("input",{type:"file",ref:j,onChange:P,className:"hidden",accept:".bngl"})]}),e.jsxs("div",{className:"flex flex-wrap gap-2 items-center",children:[e.jsx(he,{onClick:r,children:"Parse Model"}),e.jsxs("div",{className:"flex items-center gap-3 pl-2 border-l border-stone-300 dark:border-slate-600",children:[e.jsx(Gt,{name:"simulationMethod",value:h,onChange:_=>x(_),options:[{label:"ODE",value:"ode"},{label:"SSA",value:"ssa"}]}),e.jsxs(he,{onClick:()=>a({method:h,t_end:100,n_steps:100}),disabled:o||!u,variant:"primary",children:[o&&e.jsx(nt,{className:"w-4 h-4 mr-2"}),o?"Simulating...":"Run Simulation"]}),o&&e.jsx(he,{variant:"danger",onClick:i,children:"Cancel"})]})]})]}),e.jsx(It,{isOpen:y,onClose:()=>n(!1),onSelect:C})]})},ot=d.createContext(null),Dt=({children:t})=>{const[s,r]=d.useState(0);return e.jsx(ot.Provider,{value:{activeIndex:s,setActiveIndex:r},children:e.jsx("div",{children:t})})},zt=({children:t})=>{const s=d.useContext(ot);if(!s)throw new Error("TabList must be used within a Tabs component");return e.jsx("div",{className:"border-b border-stone-200 dark:border-slate-700",children:e.jsx("nav",{className:"-mb-px flex space-x-6 overflow-x-auto","aria-label":"Tabs",children:d.Children.map(t,(r,a)=>Ee.cloneElement(r,{isActive:a===s.activeIndex,onClick:()=>s.setActiveIndex(a)}))})})},$e=({children:t,isActive:s,onClick:r})=>e.jsx("button",{onClick:r,className:`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${s?"border-primary text-primary dark:text-primary-400":"border-transparent text-slate-500 hover:text-slate-700 hover:border-stone-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600"}`,children:t}),Kt=({children:t})=>{const s=d.useContext(ot);if(!s)throw new Error("TabPanels must be used within a Tabs component");return e.jsx("div",{className:"mt-4",children:d.Children.toArray(t)[s.activeIndex]})},Oe=({children:t})=>e.jsx("div",{children:t}),$t=t=>{const{payload:s,onClick:r}=t;return e.jsx("div",{className:"flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-4 px-4",children:s.map((a,i)=>e.jsxs("div",{onClick:()=>r(a),className:`flex items-center cursor-pointer transition-opacity ${a.inactive?"opacity-50":"opacity-100"}`,children:[e.jsx("div",{style:{width:12,height:12,backgroundColor:a.color,marginRight:6,borderRadius:"2px"}}),e.jsx("span",{className:"text-xs text-slate-700 dark:text-slate-300",children:a.value})]},`item-${i}`))})},Ot=({results:t,model:s,visibleSpecies:r,onVisibleSpeciesChange:a})=>{const[i,o]=d.useState([]),[u,y]=d.useState(null);if(d.useEffect(()=>{o([]),y(null)},[t]),!t||t.data.length===0)return e.jsx(we,{className:"h-96 flex items-center justify-center",children:e.jsx("p",{className:"text-slate-500",children:"Run a simulation to see the results."})});const n=N=>{const X=new Set(r),W=N.dataKey||N.value;X.has(W)?X.delete(W):X.add(W),a(X)},h=N=>{N&&N.activeLabel&&y({x1:N.activeLabel,x2:N.activeLabel,y1:N.activeCoordinate.y,y2:N.activeCoordinate.y})},x=N=>{u&&N&&N.activeLabel&&y({...u,x2:N.activeLabel})},j=()=>{if(u){const{x1:N,x2:X}=u;if(typeof N=="number"&&typeof X=="number"&&Math.abs(N-X)>.001){const W={x1:Math.min(N,X),x2:Math.max(N,X),y1:"dataMin",y2:"dataMax"};o([...i,W])}y(null)}},P=()=>{o([])},C=t.headers.filter(N=>N!=="time"),_=i.length>0?i[i.length-1]:void 0;return e.jsxs(we,{children:[e.jsx(Je,{width:"100%",height:400,children:e.jsxs(Ze,{data:t.data,margin:{top:5,right:20,left:10,bottom:5},onMouseDown:h,onMouseMove:x,onMouseUp:j,onDoubleClick:P,children:[e.jsx(Qe,{strokeDasharray:"3 3",stroke:"rgba(128, 128, 128, 0.3)"}),e.jsx(et,{dataKey:"time",label:{value:"Time",position:"insideBottom",offset:-5},type:"number",domain:_?[_.x1,_.x2]:["dataMin","dataMax"],allowDataOverflow:!0}),e.jsx(tt,{label:{value:"Concentration",angle:-90,position:"insideLeft"},domain:_?[_.y1,_.y2]:[0,"dataMax"],allowDataOverflow:!0,tickFormatter:N=>N.toFixed(0)}),e.jsx(st,{formatter:N=>(typeof N=="number"?N:parseFloat(N)).toFixed(2),labelFormatter:N=>`Time: ${typeof N=="number"?N.toFixed(2):N}`}),e.jsx(gt,{onClick:n,content:e.jsx($t,{})}),C.map((N,X)=>e.jsx(at,{type:"monotone",dataKey:N,stroke:Ve[X%Ve.length],strokeWidth:2,dot:!1,hide:!r.has(N)},N)),u&&e.jsx(ft,{x1:u.x1,x2:u.x2,strokeOpacity:.3,fill:"#8884d8",fillOpacity:.2})]})}),e.jsx("div",{className:"text-center text-xs text-slate-500 mt-2",children:"Click and drag to zoom, double-click to reset."})]})},Vt=({children:t,content:s})=>e.jsxs("div",{className:"relative group flex items-center",children:[t,e.jsx("div",{className:"absolute bottom-full mb-2 w-max max-w-xs bg-slate-800 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10",children:s})]});it.use(Rt);it.use(At);const dt="#90e0ef",mt="#f94144";function Wt(t,s,r){const a=parseInt(t.substring(1,3),16),i=parseInt(t.substring(3,5),16),o=parseInt(t.substring(5,7),16),u=parseInt(s.substring(1,3),16),y=parseInt(s.substring(3,5),16),n=parseInt(s.substring(5,7),16),h=Math.round(a+r*(u-a)),x=Math.round(i+r*(y-i)),j=Math.round(o+r*(n-o));return`#${h.toString(16).padStart(2,"0")}${x.toString(16).padStart(2,"0")}${j.toString(16).padStart(2,"0")}`}const Ht=({model:t,results:s})=>{const r=d.useRef(null),a=d.useRef(null),[i,o]=d.useState("cose"),[u,y]=d.useState("default"),[n,h]=d.useState("uniform"),[x,j]=d.useState(null),[P,C]=d.useState(null),[_,N]=d.useState(""),[X,W]=d.useState(!1),O=d.useRef(!1),xe=d.useMemo(()=>{if(!t)return null;const w=new Map,F=new Set;t.species.forEach(I=>{const H=I.name.split("(")[0];w.set(I.name,H),F.add(H)});const ie=new Map;[...F].forEach((I,H)=>{ie.set(I,Ve[H%Ve.length])});const b=t.reactions.map(I=>I.rateConstant).filter(I=>I>0),ee=b.length>0?Math.min(...b):0,S=b.length>0?Math.max(...b):0;return{speciesToMoleculeType:w,typeColorMap:ie,minRate:ee,maxRate:S}},[t]),Me=()=>{const w=a.current;if(!w||!_)return;w.elements().style({"border-width":0,opacity:1});const F=w.nodes(`[id @* "${_}"]`);F.length>0&&(w.animate({center:{eles:F},zoom:2},{duration:500}),F.style({"border-width":4,"border-color":"#f97316"}))},E=()=>{const w=a.current;w&&(w.fit(void 0,30),w.elements().style({opacity:1,"border-width":0}),N(""))};return d.useEffect(()=>{var ie;if(O.current=!0,!t||!r.current){O.current=!1,(ie=a.current)==null||ie.destroy(),a.current=null;return}const w=t.species.map(b=>({data:{id:b.name,label:b.name.replace(/\./g,`.
`)}}));t.reactions.forEach(b=>{b.reactants.forEach(ee=>{b.products.forEach(S=>{t.species.find(I=>I.name===ee)&&t.species.find(I=>I.name===S)&&w.push({data:{source:ee,target:S,rate:b.rateConstant}})})})}),a.current=it({container:r.current,elements:w,style:[{selector:"node",style:{label:"data(label)",color:"white","text-outline-color":"#333","text-outline-width":2,"font-size":10,"text-valign":"center","text-halign":"center",width:60,height:60,"text-wrap":"wrap","text-max-width":"80px","border-width":0,"border-color":"#f97316","transition-property":"background-color, opacity, border-width","transition-duration":300}},{selector:"edge",style:{"line-color":"#ccc","target-arrow-color":"#ccc","target-arrow-shape":"triangle","curve-style":"bezier","transition-property":"width, line-color, target-arrow-color, opacity","transition-duration":300}}]});const F=a.current;return F.on("tap","node",b=>{const ee=b.target;F.elements().style("opacity",.2),ee.neighborhood().add(ee).style("opacity",1)}),F.on("tap",b=>{b.target===F&&F.elements().style("opacity",1)}),F.on("mouseover","node, edge",b=>{const ee=b.target,S=ee.isNode()?`<b>Species:</b> ${ee.id()}`:`<b>Rate:</b> ${ee.data("rate")}`;C({content:S,x:b.renderedPosition.x,y:b.renderedPosition.y})}),F.on("mouseout","node, edge",()=>C(null)),F.on("drag","node",()=>C(null)),F.on("zoom pan",()=>C(null)),()=>{var b;O.current=!1,(b=a.current)==null||b.destroy(),a.current=null}},[t]),d.useEffect(()=>{const w=a.current;if(!w||!t||!xe)return;if(u==="concentration"&&s){const S=s.data[s.data.length-1];if(S){const I=t.species.map(be=>S[be.name]).filter(be=>typeof be<"u"),H=I.length>0?Math.min(...I):0,oe=I.length>0?Math.max(...I):0;j({min:H,max:oe}),w.nodes().forEach(be=>{const Ue=be.id(),Re=S[Ue];let te="#ccc";if(typeof Re<"u"&&Re!==null){const Se=oe>H?(Re-H)/(oe-H):.5;te=Wt(dt,mt,Se)}be.style("background-color",te)})}}else u==="moleculeType"?(j(null),w.nodes().forEach(S=>{const I=S.id(),H=xe.speciesToMoleculeType.get(I),oe=H?xe.typeColorMap.get(H):"#ccc";S.style("background-color",oe)})):(j(null),w.nodes().forEach((S,I)=>{S.style("background-color",Ve[I%Ve.length])}));if(n==="rate"){const{minRate:S,maxRate:I}=xe;w.edges().forEach(H=>{const oe=H.data("rate");let be=2;typeof oe<"u"&&oe!==null&&I>S?be=1+(oe-S)/(I-S)*7:I>0&&I===S&&(be=4),H.style("width",be)})}else w.edges().style("width",2);O.current&&W(!0);const F={name:i==="cose"||i==="cola"?"cose-bilkent":i,animate:!0,animationDuration:500,padding:30,nodeRepulsion:4500,idealEdgeLength:100,edgeLength:120},ie=w.layout(F),b=()=>{O.current&&(W(!1),ie.removeListener("layoutstop",b))};ie.on("layoutstop",b);const ee=window.setTimeout(()=>ie.run(),10);return()=>{ie.stop(),ie.removeListener("layoutstop",b),clearTimeout(ee)}},[t,s,u,n,i,xe]),t?e.jsxs("div",{className:"w-full flex flex-col",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2 p-2 bg-slate-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-md",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-sm font-medium",children:"Layout:"}),e.jsx(he,{variant:i==="cose"?"secondary":"ghost",onClick:()=>o("cose"),className:"text-xs px-2 py-1",children:"Cose"}),e.jsx(he,{variant:i==="cola"?"secondary":"ghost",onClick:()=>o("cola"),className:"text-xs px-2 py-1",children:"Cola"}),e.jsx(he,{variant:i==="circle"?"secondary":"ghost",onClick:()=>o("circle"),className:"text-xs px-2 py-1",children:"Circle"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-sm font-medium",children:"Node Color:"}),e.jsx(he,{variant:u==="moleculeType"?"secondary":"ghost",onClick:()=>y("moleculeType"),className:"text-xs px-2 py-1",children:"Type"}),e.jsx(Vt,{content:s?"Color by final concentration":"Run simulation to enable",children:e.jsx("span",{className:s?"":"cursor-not-allowed",children:e.jsx(he,{variant:u==="concentration"?"secondary":"ghost",onClick:()=>y("concentration"),disabled:!s,className:"text-xs px-2 py-1",children:"Conc."})})})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-sm font-medium",children:"Edge Width:"}),e.jsx(he,{variant:n==="uniform"?"secondary":"ghost",onClick:()=>h("uniform"),className:"text-xs px-2 py-1",children:"Uniform"}),e.jsx(he,{variant:n==="rate"?"secondary":"ghost",onClick:()=>h("rate"),className:"text-xs px-2 py-1",children:"Rate"})]}),e.jsxs("div",{className:"lg:col-span-2 xl:col-span-1 flex items-center gap-2",children:[e.jsx(Ie,{type:"text",placeholder:"Find species...",className:"h-8 text-xs",value:_,onChange:w=>N(w.target.value),onKeyPress:w=>w.key==="Enter"&&Me()}),e.jsx(he,{onClick:Me,variant:"secondary",className:"text-xs px-2 py-1 h-8",children:e.jsx(jt,{className:"w-4 h-4"})})]}),e.jsx("div",{className:"flex items-center gap-2",children:e.jsx(he,{onClick:E,variant:"subtle",className:"text-xs px-2 py-1 h-8",children:"Reset View"})})]}),e.jsxs("div",{className:"relative w-full",children:[e.jsx("div",{ref:r,className:"w-full h-96 border border-stone-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"}),P&&e.jsx("div",{style:{position:"absolute",top:P.y,left:P.x,pointerEvents:"none"},className:"p-1 px-2 bg-slate-800 text-white text-xs rounded-md shadow-lg z-10 transform -translate-y-full -translate-x-1/2",dangerouslySetInnerHTML:{__html:P.content}}),e.jsx("div",{className:"absolute bottom-2 right-2 flex flex-col items-end gap-2",children:u==="concentration"&&x&&s&&e.jsxs("div",{className:"bg-white/80 dark:bg-slate-800/80 p-2 rounded-md shadow-lg text-slate-800 dark:text-slate-200",children:[e.jsx("div",{className:"text-xs font-bold mb-1 text-center",children:"Concentration"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-xs w-12 text-left",children:x.min.toPrecision(2)}),e.jsx("div",{className:"w-24 h-3 rounded-full",style:{background:`linear-gradient(to right, ${dt}, ${mt})`}}),e.jsx("span",{className:"text-xs w-12 text-right",children:x.max.toPrecision(2)})]})]})}),X&&e.jsx("div",{className:"absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 rounded-lg z-20",children:e.jsxs("div",{className:"flex flex-col items-center gap-2",children:[e.jsx(nt,{className:"w-12 h-12"}),e.jsx("div",{className:"text-xs text-slate-700 dark:text-slate-200",children:"Laying out network..."})]})}),e.jsx("div",{className:"absolute bottom-2 left-2 flex flex-col items-start gap-2",children:u==="moleculeType"&&xe&&e.jsxs("div",{className:"bg-white/80 dark:bg-slate-800/80 p-2 rounded-md shadow-lg",children:[e.jsx("div",{className:"text-xs font-bold mb-1 text-slate-800 dark:text-slate-200",children:"Molecule Types"}),e.jsx("div",{className:"flex flex-col gap-1 max-h-32 overflow-y-auto",children:[...xe.typeColorMap.entries()].map(([w,F])=>e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-3 h-3 rounded-full",style:{backgroundColor:F}}),e.jsx("span",{className:"text-xs text-slate-800 dark:text-slate-200",children:w})]},w))})]})})]})]}):e.jsx("div",{className:"h-96 flex items-center justify-center text-slate-500 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg",children:"Parse a model to generate network graph."})},wt=({headers:t,rows:s})=>e.jsx("div",{className:"overflow-x-auto border border-stone-200 dark:border-slate-700 rounded-lg",children:e.jsxs("table",{className:"min-w-full divide-y divide-stone-200 dark:divide-slate-700",children:[e.jsx("thead",{className:"bg-slate-50 dark:bg-slate-800",children:e.jsx("tr",{children:t.map((r,a)=>e.jsx("th",{scope:"col",className:"px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider",children:r},a))})}),e.jsx("tbody",{className:"bg-white dark:bg-slate-900 divide-y divide-stone-200 dark:divide-slate-700",children:s.length>0?s.map((r,a)=>e.jsx("tr",{className:"hover:bg-slate-50 dark:hover:bg-slate-800/50",children:r.map((i,o)=>e.jsx("td",{className:"px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200",children:i},o))},a)):e.jsx("tr",{children:e.jsx("td",{colSpan:t.length,className:"text-center px-6 py-4 text-sm text-slate-500 dark:text-slate-400",children:"No data available."})})})]})});function qt(t){const s=[],r=new Map;t.species.forEach(i=>r.set(i.name,0)),t.reactions.forEach(i=>{new Set([...i.reactants,...i.products]).forEach(u=>{r.has(u)&&r.set(u,r.get(u)+1)})}),r.forEach((i,o)=>{s.push({species:o,degree:i})});const a=[];return t.moleculeTypes.forEach(i=>{const o=t.species.filter(u=>u.name.startsWith(i.name+"(")||u.name===i.name).map(u=>u.name);if(o.length>1){let u=!0;t.reactions.forEach(y=>{const n=y.reactants.some(x=>o.includes(x)),h=y.products.some(x=>o.includes(x));if(n||h){const x=new Set([...y.reactants,...y.products]);for(const j of x)if(!o.includes(j)){u=!1;break}}}),u&&a.push(`${i.name}_total = ${o.join(" + ")}`)}}),{connectivity:s,conservationLaws:a}}const Xt=({model:t})=>{const s=d.useMemo(()=>t?qt(t):null,[t]);return t?s?e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-lg font-medium mb-2 text-slate-800 dark:text-slate-200",children:"Species Connectivity"}),e.jsx("p",{className:"text-sm text-slate-600 dark:text-slate-400 mb-4",children:'The "degree" of a species is the number of reactions it participates in (as either a reactant or a product).'}),e.jsx(wt,{headers:["Species","Degree"],rows:s.connectivity.sort((r,a)=>a.degree-r.degree).map(r=>[r.species,r.degree])})]}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-lg font-medium mb-2 text-slate-800 dark:text-slate-200",children:"Conservation Laws (Approximated)"}),e.jsx("p",{className:"text-sm text-slate-600 dark:text-slate-400 mb-4",children:"Lists of species whose total concentration remains constant throughout the simulation. This is a simplified analysis for basic cases."}),s.conservationLaws.length>0?e.jsx("ul",{className:"list-disc list-inside bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-slate-700 dark:text-slate-200 font-mono text-sm",children:s.conservationLaws.map((r,a)=>e.jsx("li",{children:r},a))}):e.jsx("p",{className:"text-slate-500 dark:text-slate-400",children:"No simple conservation laws were detected."})]})]}):e.jsx("div",{children:"Calculating properties..."}):e.jsx("div",{className:"text-slate-500 dark:text-slate-400",children:"Parse a model to analyze its structure."})},_t=t=>e.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",...t,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"})}),Yt=({model:t,onSimulate:s,onCancelSimulation:r,isSimulating:a})=>{if(!t)return e.jsx("div",{className:"text-slate-500 dark:text-slate-400",children:"Parse a model to run a steady-state analysis."});const i=()=>{s({method:"ode",t_end:2e3,n_steps:800,steadyState:!0,steadyStateTolerance:1e-6,steadyStateWindow:12})};return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"p-4 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 flex items-start gap-3",children:[e.jsx(_t,{className:"w-5 h-5 mt-0.5 flex-shrink-0"}),e.jsxs("p",{className:"text-sm",children:[e.jsx("b",{children:"Steady-state finder:"}),' Runs an adaptive ODE sweep until consecutive RK4 sub-steps change by less than 1e-6 (12 times in a row). The final point in the "Time Course" tab is the detected steady state.']})]}),e.jsxs("div",{className:"mt-6 flex gap-2",children:[e.jsxs(he,{onClick:i,disabled:a,children:[a&&e.jsx(nt,{className:"w-4 h-4 mr-2"}),a?"Running…":"Run to Steady State"]}),a&&e.jsx(he,{variant:"danger",onClick:r,children:"Cancel"})]})]})},We=Ee.forwardRef(({className:t,children:s,...r},a)=>e.jsx("select",{className:`block w-full rounded-md border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${t}`,ref:a,...r,children:s}));We.displayName="Select";const Jt=3e4,Mt=t=>{if(t&&typeof t=="object"&&"message"in t&&typeof t.message=="string"||t instanceof Error)return t.message;if(typeof t=="string")return t;try{return JSON.stringify(t)}catch{return"Worker error"}},Zt=(t,s)=>{const r=Mt(s)||`${t} failed`;if(s&&typeof s=="object"){const a=s,i=typeof a.name=="string"?a.name:void 0,o=typeof a.stack=="string"?a.stack:void 0,u=typeof a.filename=="string"?a.filename:void 0,y=typeof a.lineno=="number"?a.lineno:void 0,n=typeof a.colno=="number"?a.colno:void 0;if(i==="AbortError")return new DOMException(r||"Operation cancelled","AbortError");if(i==="TimeoutError"){const x=new Error(r);x.name="TimeoutError",o&&(x.stack=o);try{x.cause=s}catch{}return x}const h=new Error(r+(u?` (${u}:${y??"?"}:${n??"?"})`:""));i&&(h.name=String(i)),o&&(h.stack=o);try{h.cause=s}catch{}return h}return new Error(r)};class Qt{constructor(){this.messageId=0,this.promises=new Map,this.terminated=!1,this.progressListeners=new Set,this.warningListeners=new Set,this.worker=new Worker(new URL("/bnglplayground/assets/bnglWorker-BXMfec9Q.js",import.meta.url),{type:"module"}),this.worker.addEventListener("message",s=>{const{id:r,type:a,payload:i}=s.data??{},o=a;if(o==="progress"){for(const y of this.progressListeners)try{y(i)}catch(n){console.warn("[BnglService] progress listener error",n)}return}if(o==="warning"){for(const y of this.warningListeners)try{y(i)}catch(n){console.warn("[BnglService] warning listener error",n)}return}if(r===-1&&a==="worker_internal_error"){const y=Mt(i),n=i&&typeof i=="object"?`${i.filename??"unknown"}:${i.lineno??"?"}:${i.colno??"?"}`:"unknown:?",h=i&&typeof i=="object"&&"stack"in i&&typeof i.stack=="string"?i.stack:void 0;console.error(h?`[Worker] ${y} (${n})
${h}`:`[Worker] ${y} (${n})`);return}if(typeof r!="number"){console.warn("[BnglService] Received response without numeric id:",s.data);return}if(!this.promises.has(r)){console.warn("[BnglService] Received response for unknown message id:",s.data);return}const u=this.promises.get(r);if(this.promises.delete(r),u.cleanup(),a==="parse_success"||a==="simulate_success"){u.resolve(i);return}if(a==="cache_model_success"){u.resolve(i);return}if(a==="parse_error"||a==="simulate_error"||a==="cache_model_error"){const n=Zt((a==="parse_error"?"parse":a==="simulate_error"?"simulate":"cache_model")==="parse"?"parse":"simulate",i);u.reject(n);return}console.warn("[BnglService] Received response with unexpected type:",s.data),u.reject(new Error("Unexpected worker response type"))}),this.worker.addEventListener("error",s=>{const a=`Worker error: ${s.message||s.error&&s.error.message||"unknown error"} at ${s.filename??"unknown file"}:${s.lineno??"?"}:${s.colno??"?"}`;s.error&&s.error.stack?console.error(a,`
`,s.error.stack):console.error(a,s),this.rejectAllPending(a)}),this.worker.addEventListener("messageerror",s=>{console.error("[BnglService] Worker failed to deserialize message:",s.data),this.rejectAllPending("Worker posted an unserializable message")})}sendCancel(s){if(!this.terminated)try{const r={id:this.messageId++,type:"cancel",payload:{targetId:s}};this.worker.postMessage(r)}catch(r){console.warn("[BnglService] Failed to post cancel message",r)}}rejectAllPending(s){const r=new Error(s);this.promises.forEach((a,i)=>{this.promises.delete(i),a.cleanup(),a.reject(r)})}postMessage(s,r,a){if(this.terminated)return Promise.reject(new Error("Worker has been terminated"));const i=this.messageId++;return new Promise((o,u)=>{const y=(a==null?void 0:a.timeoutMs)??Jt,n=(a==null?void 0:a.signal)??null;let h,x;const j=()=>{h&&(clearTimeout(h),h=void 0),n&&x&&(n.removeEventListener("abort",x),x=void 0)},P={resolve:_=>o(_),reject:u,cleanup:j,description:a==null?void 0:a.description};if(this.promises.set(i,P),y>0&&Number.isFinite(y)&&(h=setTimeout(()=>{if(!this.promises.has(i))return;this.promises.delete(i),j(),this.sendCancel(i);const _=new Error(`${(a==null?void 0:a.description)??s} timed out after ${y} ms`);_.name="TimeoutError",u(_)},y)),n){if(n.aborted){this.promises.delete(i),j(),this.sendCancel(i),u(new DOMException(n.reason??"The operation was aborted.","AbortError"));return}x=()=>{this.promises.has(i)&&(this.promises.delete(i),j(),this.sendCancel(i),u(new DOMException(n.reason??"The operation was aborted.","AbortError")))},n.addEventListener("abort",x)}let C;s==="parse"?C={id:i,type:s,payload:r}:s==="simulate"?C={id:i,type:s,payload:r}:s==="cache_model"?C={id:i,type:s,payload:r}:C={id:i,type:s,payload:r};try{this.worker.postMessage(C)}catch(_){this.promises.delete(i),j(),u(_ instanceof Error?_:new Error(String(_)))}})}terminate(s){if(!this.terminated){this.terminated=!0;try{this.worker.terminate()}catch(r){console.warn("[BnglService] Error terminating worker",r)}this.rejectAllPending(s??"Worker terminated")}}cancelAllPending(s){const r=new DOMException(s??"Requests cancelled","AbortError");this.promises.forEach((a,i)=>{this.promises.delete(i),this.sendCancel(i),a.cleanup(),a.reject(r)})}parse(s,r){return this.postMessage("parse",s,{...r,description:(r==null?void 0:r.description)??"Parse request"})}simulate(s,r,a){return this.postMessage("simulate",{model:s,options:r},{...a,description:(a==null?void 0:a.description)??`Simulation (${r.method})`})}prepareModel(s,r){const a=this.lastCachedModelId;return typeof a=="number"&&this.releaseModel(a).catch(i=>{console.warn("[BnglService] Failed to release previous cached model",a,i)}),this.postMessage("cache_model",{model:s},{...r,description:"Cache model"}).then(i=>{const o=i.modelId;return this.lastCachedModelId=o,o})}simulateCached(s,r,a,i){return this.postMessage("simulate",{modelId:s,parameterOverrides:r,options:a},{...i,description:(i==null?void 0:i.description)??`Simulation (${a.method}) (cached)`})}releaseModel(s,r){return this.postMessage("release_model",{modelId:s},{...r,description:"Release cached model"})}onProgress(s){return this.progressListeners.add(s),()=>this.progressListeners.delete(s)}onWarning(s){return this.warningListeners.add(s),()=>this.warningListeners.delete(s)}}const fe=new Qt,Ye=t=>Number.isFinite(t)?(Math.round(t*1e6)/1e6).toString():"",es=.1,ut=t=>{if(!Number.isFinite(t)||t<0)return[0,0];if(t===0)return[0,es];const s=Math.max(0,t*.9),r=t*1.1;return[s,r]},ht=(t,s,r)=>{if(r<=1)return[t];const a=(s-t)/(r-1);return Array.from({length:r},(i,o)=>Number((t+o*a).toPrecision(12)))},Fe=t=>Number.isFinite(t)?Math.abs(t)>=1e3||Math.abs(t)<.001?t.toExponential(2):t.toFixed(3):"0",ts=({model:t})=>{const[s,r]=d.useState("1d"),[a,i]=d.useState(""),[o,u]=d.useState(""),[y,n]=d.useState(""),[h,x]=d.useState(""),[j,P]=d.useState("5"),[C,_]=d.useState(""),[N,X]=d.useState(""),[W,O]=d.useState("5"),[xe,Me]=d.useState("ode"),[E,w]=d.useState("100"),[F,ie]=d.useState("100"),[b,ee]=d.useState(""),[S,I]=d.useState(null),[H,oe]=d.useState(null),[be,Ue]=d.useState(!1),[Re,te]=d.useState({current:0,total:0}),[Se,_e]=d.useState(null),je=d.useRef(null),ke=d.useRef(!0),Ge=d.useRef(null),ze=d.useRef(null),Ae=d.useRef(null),Le=d.useRef(null),Ce=d.useMemo(()=>t?Object.keys(t.parameters):[],[t]),Ne=d.useMemo(()=>t?t.observables.map(l=>l.name):[],[t]);d.useEffect(()=>{if(!t){i(""),u(""),ee(""),I(null),oe(null),n(""),x(""),_(""),X(""),ze.current=null,Ae.current=null,Le.current=null;return}if(ze.current!==t&&(n(""),x(""),_(""),X(""),Ae.current=null,Le.current=null,ze.current=t),Ce.includes(a)||i(Ce[0]??""),!Ce.includes(o)||o===a){const l=Ce.find(f=>f!==a);u(l??Ce[0]??"")}(!b||!Ne.includes(b))&&ee(Ne[0]??"")},[t,a,o,Ce,Ne,b]),d.useEffect(()=>{t&&a&&Ae.current!==a&&(Ae.current=a,n(""),x(""))},[t,a]),d.useEffect(()=>{t&&o&&Le.current!==o&&(Le.current=o,_(""),X(""))},[t,o]),d.useEffect(()=>{I(null),oe(null)},[s]);const Be=d.useCallback(l=>{const f=je.current;f&&(f.abort(l??"Parameter scan cancelled."),je.current=null)},[]),c=d.useMemo(()=>!S||!b?[]:S.values.map(l=>({parameterValue:l.parameterValue,observableValue:l.observables[b]??0})),[S,b]),k=d.useMemo(()=>{if(!c||c.length===0)return[0,1];const l=c.map(ne=>ne.parameterValue).filter(Number.isFinite);if(l.length===0)return[0,1];let f=Math.min(...l),L=Math.max(...l);if(Number.isFinite(f)||(f=0),Number.isFinite(L)||(L=f+1),f===L){const ne=Math.abs(f)*.1||.01;return[Number((f-ne).toPrecision(12)),Number((L+ne).toPrecision(12))]}const z=Math.max(0,f*.9),le=L*1.1;return[Number(z.toPrecision(12)),Number(le.toPrecision(12))]},[c]),g=d.useMemo(()=>{if(!c||c.length===0)return["auto","auto"];const l=c.map(ne=>ne.observableValue).filter(Number.isFinite);if(l.length===0)return["auto","auto"];let f=Math.min(...l),L=Math.max(...l);if(!Number.isFinite(f)||!Number.isFinite(L))return["auto","auto"];if(f===L){const ne=Math.abs(f)*.1||.01;return[Number((f-ne).toPrecision(12)),Number((L+ne).toPrecision(12))]}const z=f*.9,le=L*1.1;return[Number(z.toPrecision(12)),Number(le.toPrecision(12))]},[c]),v=d.useMemo(()=>{if(!H||!b)return null;const l=H.grid[b];if(!l)return null;let f=1/0,L=-1/0;return l.forEach(z=>{z.forEach(le=>{le<f&&(f=le),le>L&&(L=le)})}),(!Number.isFinite(f)||!Number.isFinite(L))&&(f=0,L=0),{matrix:l,min:f,max:L}},[H,b]),D=a&&t?t.parameters[a]:void 0,Y=o&&t?t.parameters[o]:void 0,[J,m]=d.useMemo(()=>D===void 0?[0,0]:ut(D),[D]),[p,M]=d.useMemo(()=>Y===void 0?[0,0]:ut(Y),[Y]),R=D!==void 0?Ye(J):"",T=D!==void 0?Ye(m):"",G=Y!==void 0?Ye(p):"",V=Y!==void 0?Ye(M):"",q=y!==""?y:R,U=h!==""?h:T,B=C!==""?C:G,A=N!==""?N:V,se=()=>!(!a||!q||!U||!j||s==="2d"&&(!o||o===a||!B||!A||!W)),Z=async()=>{var $;if(!se())return;if(!t){_e("No model is loaded to run the scan.");return}Be("Parameter scan replaced by a new request.");const l=Number(q),f=Number(U),L=Math.max(1,Math.floor(Number(j)));if(!Number.isFinite(l)||!Number.isFinite(f)||Number.isNaN(L)||L<1){_e("Please provide valid numeric settings for the primary parameter.");return}const z=Number(E),le=Math.max(1,Math.floor(Number(F)));if(!Number.isFinite(z)||z<=0||Number.isNaN(le)||le<1){_e("Simulation settings must have positive numeric values for t_end and steps.");return}const ne=ht(l,f,L);let ye=ne.length,de=[];if(s==="2d"){const ce=Number(B),ae=Number(A),me=Math.max(1,Math.floor(Number(W)));if(!Number.isFinite(ce)||!Number.isFinite(ae)||Number.isNaN(me)||me<1){_e("Please provide valid numeric settings for the second parameter.");return}if(o===a){_e("Select two different parameters for a 2D scan.");return}de=ht(ce,ae,me),ye=ne.length*de.length}if(ye>400){_e("Please reduce the number of combinations (limit 400) to keep the scan responsive.");return}_e(null),Ue(!0),te({current:0,total:ye}),I(null),oe(null);const Q={method:xe,t_end:z,n_steps:le},re=new AbortController;je.current=re;let K=null;try{if(K=await fe.prepareModel(t,{signal:re.signal}),Ge.current=K,s==="1d"){const ce={parameterName:a,values:[]};let ae=0;for(const me of ne){const Te={[a]:me},He=(await fe.simulateCached(K,Te,Q,{signal:re.signal,description:`Parameter scan (${a}=${me})`})).data.at(-1)??{},qe=Ne.reduce((ge,pe)=>{const ve=He[pe],De=typeof ve=="number"?ve:Number(ve??0);return ge[pe]=Number.isFinite(De)?De:0,ge},{});ce.values.push({parameterValue:me,observables:qe}),ae+=1,ke.current&&te({current:ae,total:ye})}ke.current&&I(ce)}else{const ce={};Ne.forEach(me=>{ce[me]=de.map(()=>new Array(ne.length).fill(0))});let ae=0;for(let me=0;me<de.length;me+=1)for(let Te=0;Te<ne.length;Te+=1){const Ke={[a]:ne[Te],[o]:de[me]},qe=(await fe.simulateCached(K,Ke,Q,{signal:re.signal,description:`2D parameter scan (${a}, ${o})`})).data.at(-1)??{};Ne.forEach(ge=>{const pe=qe[ge],ve=typeof pe=="number"?pe:Number(pe??0);ce[ge][me][Te]=Number.isFinite(ve)?ve:0}),ae+=1,ke.current&&te({current:ae,total:ye})}ke.current&&oe({parameterNames:[a,o],xValues:ne,yValues:de,grid:ce})}}catch(ce){if(ce instanceof DOMException&&ce.name==="AbortError"){const ae=($=ce.message)==null?void 0:$.includes("cancelled by user");ke.current&&_e(ae?"Parameter scan was cancelled.":null)}else{const ae=ce instanceof Error?ce.message:String(ce);ke.current&&_e(`Parameter scan failed: ${ae}`),ke.current&&I(null),ke.current&&oe(null)}}finally{ke.current&&Ue(!1);const ce=re.signal.aborted;je.current===re&&(je.current=null),typeof K=="number"&&(fe.releaseModel(K).catch(ae=>{console.warn("Failed to release cached model after parameter scan",K,ae)}),Ge.current===K&&(Ge.current=null)),ce||ke.current&&te(ae=>({...ae,current:ae.total}))}};d.useEffect(()=>(ke.current=!0,()=>{ke.current=!1;const l=je.current;if(l){try{l.abort("Component unmounted: aborting parameter scan.")}catch{}je.current=null}const f=Ge.current;typeof f=="number"&&(fe.releaseModel(f).catch(L=>{console.warn("Failed to release cached model on ParameterScanTab unmount",f,L)}),Ge.current=null)}),[t]);const ue=(l,f,L)=>{if(L<=f)return"rgba(33,128,141,0.2)";const z=(l-f)/(L-f);return`rgba(33,128,141,${(.15+.75*Math.min(Math.max(z,0),1)).toFixed(2)})`},Pe=t?Ce.length===0?"The current model does not declare any parameters to scan.":null:"Parse a model to set up a parameter scan.";return Ee.useEffect(()=>{console.debug("ParameterScanTab render",{modelKeys:t?Object.keys(t.parameters):null,parameter1:a,parameter2:o,oneDValues:S?S.values.length:0,xAxisDomain:k,yAxisDomain:g})},[t,a,o,S,k,g]),e.jsxs("div",{className:"space-y-6",children:[e.jsxs(we,{className:"space-y-6",children:[e.jsx("div",{children:e.jsxs("div",{className:"flex flex-wrap gap-4 items-center",children:[e.jsxs("label",{className:"flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200",children:[e.jsx("input",{type:"radio",value:"1d",checked:s==="1d",onChange:()=>r("1d")}),"1D Scan"]}),e.jsxs("label",{className:"flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200",children:[e.jsx("input",{type:"radio",value:"2d",checked:s==="2d",onChange:()=>r("2d")}),"2D Scan"]})]})}),e.jsxs("div",{className:"grid gap-6 md:grid-cols-2",children:[e.jsxs("div",{className:"space-y-3",children:[e.jsx("h4",{className:"text-sm font-semibold text-slate-800 dark:text-slate-100",children:"Parameter 1"}),e.jsx(We,{value:a,onChange:l=>i(l.target.value),children:Ce.map(l=>e.jsx("option",{value:l,children:l},l))}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-3",children:[e.jsx(Ie,{type:"number",value:y,onChange:l=>n(l.target.value),placeholder:R||"Start"}),e.jsx(Ie,{type:"number",value:h,onChange:l=>x(l.target.value),placeholder:T||"End"}),e.jsx(Ie,{type:"number",value:j,min:1,onChange:l=>P(l.target.value),placeholder:"Steps"})]})]}),s==="2d"&&e.jsxs("div",{className:"space-y-3",children:[e.jsx("h4",{className:"text-sm font-semibold text-slate-800 dark:text-slate-100",children:"Parameter 2"}),e.jsx(We,{value:o,onChange:l=>u(l.target.value),children:Ce.map(l=>e.jsx("option",{value:l,children:l},l))}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-3",children:[e.jsx(Ie,{type:"number",value:C,onChange:l=>_(l.target.value),placeholder:G||"Start"}),e.jsx(Ie,{type:"number",value:N,onChange:l=>X(l.target.value),placeholder:V||"End"}),e.jsx(Ie,{type:"number",value:W,min:1,onChange:l=>O(l.target.value),placeholder:"Steps"})]})]})]}),e.jsxs("div",{className:"grid gap-3 md:grid-cols-3",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-300",children:"Solver"}),e.jsxs(We,{value:xe,onChange:l=>Me(l.target.value),children:[e.jsx("option",{value:"ode",children:"ODE"}),e.jsx("option",{value:"ssa",children:"SSA"})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-300",children:"t_end"}),e.jsx(Ie,{type:"number",value:E,min:0,onChange:l=>w(l.target.value)})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-300",children:"Steps"}),e.jsx(Ie,{type:"number",value:F,min:1,onChange:l=>ie(l.target.value)})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-3 items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400",children:[e.jsx("span",{children:"Select an observable:"}),e.jsx(We,{value:b,onChange:l=>ee(l.target.value),className:"w-48",children:Ne.map(l=>e.jsx("option",{value:l,children:l},l))})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(he,{variant:"subtle",onClick:()=>{Be("Parameter scan cancelled by user."),I(null),oe(null),_e(null),te({current:0,total:0})},children:"Clear Results"}),be&&e.jsx(he,{variant:"danger",onClick:()=>Be("Parameter scan cancelled by user."),children:"Cancel Scan"}),e.jsx(he,{onClick:Z,disabled:be||!se(),children:be?"Running…":"Run Scan"})]})]})]}),Se&&e.jsx("div",{className:"border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30 text-red-700 dark:text-red-200 px-4 py-3 rounded-md",children:Se}),be&&e.jsxs("div",{className:"flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300",children:[e.jsx(nt,{className:"w-5 h-5"}),e.jsxs("span",{children:["Running simulations… ",Re.current," / ",Re.total]})]}),Pe?e.jsx("div",{className:"text-slate-500 dark:text-slate-400",children:Pe}):S&&S.values.length>0&&e.jsxs(we,{className:"space-y-6",children:[e.jsx("h3",{className:"text-lg font-semibold text-slate-800 dark:text-slate-100",children:"1D Scan Results"}),b&&c.length>0?e.jsx(Je,{width:"100%",height:360,children:e.jsxs(Ze,{data:c,margin:{top:10,right:20,left:0,bottom:0},children:[e.jsx(Qe,{strokeDasharray:"3 3",stroke:"rgba(148, 163, 184, 0.35)"}),e.jsx(et,{dataKey:"parameterValue",label:{value:S.parameterName,position:"insideBottom",offset:-6},type:"number",domain:[k[0],k[1]],tickFormatter:l=>Fe(l)}),e.jsx(tt,{label:{value:b,angle:-90,position:"insideLeft",offset:16},domain:g,tickFormatter:l=>Fe(l)}),e.jsx(st,{formatter:l=>Fe(l),labelFormatter:l=>`${S.parameterName}: ${Fe(l)}`,trigger:"hover",cursor:{stroke:"rgba(148, 163, 184, 0.45)",strokeDasharray:"4 4"}}),e.jsx(gt,{verticalAlign:"bottom",align:"center",wrapperStyle:{paddingTop:16}}),e.jsx(at,{type:"monotone",dataKey:"observableValue",name:b,stroke:Ve[0],strokeWidth:2,dot:{r:2},activeDot:{r:4}})]})}):e.jsx("p",{className:"text-sm text-slate-500",children:"Select an observable to visualize the scan."}),e.jsx(wt,{headers:[S.parameterName,...Ne],rows:S.values.map(l=>[Fe(l.parameterValue),...Ne.map(f=>Fe(l.observables[f]??0))])})]}),H&&v&&e.jsxs(we,{className:"space-y-6",children:[e.jsx("h3",{className:"text-lg font-semibold text-slate-800 dark:text-slate-100",children:"2D Scan Heatmap"}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"min-w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsxs("th",{className:"px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-300",children:[H.parameterNames[1]," ↓ / ",H.parameterNames[0]," →"]}),H.xValues.map((l,f)=>e.jsx("th",{className:"px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-300",children:Fe(l)},f))]})}),e.jsx("tbody",{children:H.yValues.map((l,f)=>e.jsxs("tr",{children:[e.jsx("td",{className:"px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-300",children:Fe(l)}),v.matrix[f].map((L,z)=>e.jsx("td",{className:"px-4 py-2 text-sm text-slate-800 dark:text-slate-100 text-center",style:{backgroundColor:ue(L,v.min,v.max)},children:Fe(L)},z))]},f))})]})}),e.jsxs("div",{className:"text-xs text-slate-500 dark:text-slate-400",children:["Range: ",Fe(v.min)," – ",Fe(v.max)," (",b,")"]})]})]})};function rt(t,s=100,r=1e-12){const a=t.length,i=Array.from({length:a},(h,x)=>Array.from({length:a},(j,P)=>x===P?1:0)),o=t.map(h=>h.slice()),u=()=>{let h=0,x=0,j=1;for(let P=0;P<a;P++)for(let C=P+1;C<a;C++){const _=Math.abs(o[P][C]);_>h&&(h=_,x=P,j=C)}return{max:h,p:x,q:j}};for(let h=0;h<s;h++){const{max:x,p:j,q:P}=u();if(x<r)break;const C=o[j][j],_=o[P][P],N=o[j][P],X=.5*Math.atan2(2*N,_-C),W=Math.cos(X),O=Math.sin(X);for(let E=0;E<a;E++)if(E!==j&&E!==P){const w=o[E][j],F=o[E][P];o[E][j]=W*w-O*F,o[j][E]=o[E][j],o[E][P]=O*w+W*F,o[P][E]=o[E][P]}const xe=W*W*C-2*O*W*N+O*O*_,Me=O*O*C+2*O*W*N+W*W*_;o[j][j]=xe,o[P][P]=Me,o[j][P]=0,o[P][j]=0;for(let E=0;E<a;E++){const w=i[E][j],F=i[E][P];i[E][j]=W*w-O*F,i[E][P]=O*w+W*F}}return{eigenvalues:o.map((h,x)=>h[x]),eigenvectors:i}}function ss(t){const s=-39.6968302866538,r=220.946098424521,a=-275.928510446969,i=138.357751867269,o=-30.6647980661472,u=2.50662827745924,y=-54.4760987982241,n=161.585836858041,h=-155.698979859887,x=66.8013118877197,j=-13.2806815528857;let P,C;return P=t-.5,C=P*P,(((((s*C+r)*C+a)*C+i)*C+o)*C+u)*P/(((((y*C+n)*C+h)*C+x)*C+j)*C+1)}function Pt(t,s=1){if(s===1){const a=ss(t);return a*a}return Pt(t,1)*(s/1)}async function as(t,s,r,a,i,o=!0,u=!1,y=!1,n=!1){if(!t)throw new Error("No model provided");if(!s||s.length===0)throw new Error("No parameters specified");const h=performance.now();let x;try{const j=performance.now();x=await fe.prepareModel(t,{signal:a});const P=performance.now(),C=await fe.simulateCached(x,void 0,r,{signal:a}),_=C.data.length,N=C.data.at(-1)??{},X=Object.keys(N).filter(m=>m!=="time"),W=X.length,O=s.length;if(W===0)throw new Error("No observables found in simulation results to compute sensitivities.");const xe=o?Math.max(1,_):1,Me=W*xe,E=Array.from({length:Me},()=>new Array(O).fill(0));let w=0;const F=1+O*2;let ie=0;const b=async m=>{const p=performance.now(),M=await m(),R=performance.now();return ie+=R-p,M};i==null||i(0,F);for(let m=0;m<O;m++){if(a!=null&&a.aborted)throw new DOMException("Aborted","AbortError");const p=s[m],M=t.parameters[p];if(u&&M>0){const A=Math.max(1e-8,1e-4),se=M*(1+A),Z=M*Math.max(0,1-A),ue=await b(()=>fe.simulateCached(x,{[p]:se},r,{signal:a}));w+=1,i==null||i(w,F);const Pe=await b(()=>fe.simulateCached(x,{[p]:Z},r,{signal:a}));w+=1,i==null||i(w,F);const l=ue.data,f=Pe.data,L=2*A;for(let z=0;z<xe;z++){const le=o?z:l.length-1,ne=l[le]??{},ye=f[le]??{};for(let de=0;de<W;de++){const Q=X[de],re=typeof ne[Q]=="number"?ne[Q]:Number(ne[Q]??0),K=typeof ye[Q]=="number"?ye[Q]:Number(ye[Q]??0),$=(re-K)/L,ce=z*W+de;E[ce][m]=Number.isFinite($)?$:0}}continue}const R=Math.max(1e-8,Math.abs(M)*1e-4,1e-8),T=M+R,G=Math.max(0,M-R),V=await b(()=>fe.simulateCached(x,{[p]:T},r,{signal:a}));w+=1,i==null||i(w,F);const q=await b(()=>fe.simulateCached(x,{[p]:G},r,{signal:a}));w+=1,i==null||i(w,F);const U=V.data,B=q.data;for(let A=0;A<xe;A++){const se=o?A:U.length-1,Z=U[se]??{},ue=B[se]??{};for(let Pe=0;Pe<W;Pe++){const l=X[Pe],f=typeof Z[l]=="number"?Z[l]:Number(Z[l]??0),L=typeof ue[l]=="number"?ue[l]:Number(ue[l]??0),z=(f-L)/(T-G||R),le=A*W+Pe;E[le][m]=Number.isFinite(z)?z:0}}}const ee=Array.from({length:O},()=>new Array(O).fill(0));for(let m=0;m<O;m++)for(let p=m;p<O;p++){let M=0;for(let R=0;R<Me;R++)M+=E[R][m]*E[R][p];ee[m][p]=M,ee[p][m]=M}let S=[],I=[];try{try{const m=new lt(ee),p=new ct(m),M=p.realEigenvalues?p.realEigenvalues.slice():[],R=p.eigenvectorMatrix;if(M&&R){const T=M.map((G,V)=>({val:G,vec:R.getColumn(V)}));T.sort((G,V)=>V.val-G.val),S=T.map(G=>G.val),I=T.map(G=>Array.from(G.vec))}else throw new Error("EVD failed")}catch{const{eigenvalues:p,eigenvectors:M}=rt(ee,Math.max(100,O*20)),R=p.map((T,G)=>({val:T,vec:M.map(V=>V[G])}));R.sort((T,G)=>G.val-T.val),S=R.map(T=>T.val),I=R.map(T=>T.vec)}}catch{const{eigenvalues:p,eigenvectors:M}=rt(ee,Math.max(100,O*20)),R=p.map((T,G)=>({val:T,vec:M.map(V=>V[G])}));R.sort((T,G)=>G.val-T.val),S=R.map(T=>T.val),I=R.map(T=>T.vec)}const H=S[0]??0,oe=S[S.length-1]??0,be=H>0&&oe>0?H/oe:1/0,Ue=Math.max(Math.abs(H)*1e-12,1e-16),Re=H/Math.max(oe,Ue),te=O,Se=Array.from({length:te},()=>new Array(te).fill(0)),_e=Math.max(1e-12,H*1e-12);for(let m=0;m<te;m++)for(let p=0;p<te;p++){let M=0;for(let R=0;R<te;R++){const T=S[R];T>_e&&(M+=I[R][m]*I[R][p]/T)}Se[m][p]=M}const je=Array.from({length:te},()=>new Array(te).fill(0));for(let m=0;m<te;m++)for(let p=0;p<te;p++){const M=Se[m][m],R=Se[p][p];M>0&&R>0?je[m][p]=Se[m][p]/Math.sqrt(M*R):je[m][p]=0}const ke=ee.map(m=>m.slice()),Ge=E.map(m=>m.slice()),ze=s.map((m,p)=>({name:m,timeProfile:E.map(M=>M[p])})),Ae=[],Le=[],Ce=H*1e-6;for(let m=0;m<te;m++)I.reduce((M,R,T)=>{const G=S[T];return G>_e?M+R[m]*R[m]*G:M},0)>Ce?Ae.push(s[m]):Le.push(s[m]);let Ne=new Array(te).fill(0),Be=[];try{let m=[],p=[];try{const G=new lt(je),V=new ct(G);m=V.realEigenvalues?V.realEigenvalues.slice():[];const q=V.eigenvectorMatrix;if(m&&q){const U=m.map((B,A)=>({val:B,vec:q.getColumn(A)}));U.sort((B,A)=>A.val-B.val),m=U.map(B=>B.val),p=U.map(B=>Array.from(B.vec))}else throw new Error("corr EVD failed")}catch{const{eigenvalues:V,eigenvectors:q}=rt(je,Math.max(100,te*20)),U=V.map((B,A)=>({val:B,vec:q.map(se=>se[A])}));U.sort((B,A)=>A.val-B.val),m=U.map(B=>B.val),p=U.map(B=>B.vec)}const M=m[0]??0,R=Math.max(1e-12,Math.abs(M)*1e-12),T=Array.from({length:te},()=>new Array(te).fill(0));for(let G=0;G<te;G++)for(let V=0;V<te;V++){let q=0;for(let U=0;U<te;U++){const B=m[U];B>R&&(q+=p[U][G]*p[U][V]/B)}T[G][V]=q}Ne=new Array(te).fill(0).map((G,V)=>Number.isFinite(T[V][V])?T[V][V]:1/0),Be=Ne.map((G,V)=>G>10?s[V]:null).filter(G=>G)}catch{}const c=[],k=Math.max(1e-12,Math.abs(H)*1e-4);for(let m=S.length-1;m>=0;m--){const p=S[m];if(p>k)break;const M=I[m]??[],R=M.map(q=>Math.abs(q)),G=Math.max(...R,0)*.1,V=[];for(let q=0;q<M.length;q++)Math.abs(M[q])>=G&&Number.isFinite(M[q])&&!Number.isNaN(M[q])&&V.push({name:s[q],loading:M[q]});V.sort((q,U)=>Math.abs(U.loading)-Math.abs(q.loading)),c.push({eigenvalue:p,components:V})}const g={},v={};if(y){const m=C.data,p=[];for(let U=0;U<(o?m.length:1);U++){const B=o?U:m.length-1,A=m[B]??{};for(const se of X)p.push(Number(A[se]??0))}const M=[];for(const U of c)for(const B of U.components){const A=s.indexOf(B.name);A>=0&&!M.includes(A)&&M.push(A)}const T=M.slice(0,8),G=(U,B)=>{let A=0;for(let se=0;se<Math.min(U.length,B.length);se++){const Z=U[se]-B[se];A+=Z*Z}return A},V=async(U,B,A)=>{const se=(A==null?void 0:A.maxIter)??50,Z=(A==null?void 0:A.maxEvals)??200,ue=B.length,Pe=(A==null?void 0:A.initialStep)??.1,l=[B.slice()];for(let K=0;K<ue;K++){const $=B.slice();$[K]=$[K]+(Math.abs($[K])>0?Math.abs($[K])*Pe:Pe),l.push($)}const f=[],L=async K=>await U(K);for(let K=0;K<l.length;K++)f[K]=await L(l[K]);let z=l.length;const le=1,ne=2,ye=.5,de=.5,Q=(K,$)=>{const ce=new Array(ue).fill(0);for(let ae=0;ae<K.length;ae++)if(ae!==$)for(let me=0;me<ue;me++)ce[me]+=K[ae][me];for(let ae=0;ae<ue;ae++)ce[ae]/=K.length-1;return ce};for(let K=0;K<se;K++){const $=f.map((ge,pe)=>pe).sort((ge,pe)=>f[ge]-f[pe]),ce=l[$[0]],ae=l[$[l.length-1]],me=Q(l,$[l.length-1]),Te=me.map((ge,pe)=>ge+le*(ge-ae[pe])),Ke=await L(Te);if(z++,Ke<f[$[0]]){const ge=me.map((ve,De)=>ve+ne*(ve-ae[De])),pe=await L(ge);z++,pe<Ke?(l[$[l.length-1]]=ge,f[$[l.length-1]]=pe):(l[$[l.length-1]]=Te,f[$[l.length-1]]=Ke)}else if(Ke<f[$[l.length-2]])l[$[l.length-1]]=Te,f[$[l.length-1]]=Ke;else{const ge=me.map((ve,De)=>ve+ye*(ae[De]-ve)),pe=await L(ge);if(z++,pe<f[$[l.length-1]])l[$[l.length-1]]=ge,f[$[l.length-1]]=pe;else for(let ve=1;ve<l.length;ve++)l[ve]=l[0].map((De,St)=>De+de*(l[ve][St]-De)),f[ve]=await L(l[ve]),z++}if(z>=Z)break;const He=f.reduce((ge,pe)=>ge+pe,0)/f.length;if(Math.sqrt(f.reduce((ge,pe)=>ge+(pe-He)*(pe-He),0)/f.length)<1e-9)break}const re=f.map((K,$)=>({v:K,i:$})).sort((K,$)=>K.v-$.v)[0].i;return{x:l[re],fx:f[re]}},q=async(U,B,A,se,Z)=>{const ue=s.map((z,le)=>le).filter(z=>z!==B),Pe=ue.map(z=>se[s[z]]),f=await V(async z=>{const le={...se};le[s[B]]=A;for(let de=0;de<ue.length;de++)le[s[ue[de]]]=z[de];const ne=await b(()=>fe.simulateCached(U,le,r,{signal:a})),ye=[];for(let de=0;de<(o?ne.data.length:1);de++){const Q=o?de:ne.data.length-1,re=ne.data[Q]??{};for(const K of X)ye.push(Number(re[K]??0))}return G(ye,p)},Pe,{maxIter:(Z==null?void 0:Z.maxIter)??50,maxEvals:(Z==null?void 0:Z.maxEvals)??200,initialStep:(Z==null?void 0:Z.initialStep)??.25}),L={...se};L[s[B]]=A;for(let z=0;z<ue.length;z++)L[s[ue[z]]]=f.x[z];return{params:L,ssr:f.fx}};for(const U of T){const B=s[U],A=t.parameters[B],se=[];if(A>0){const Q=[.2,.5,.8,.9,1,1.1,1.5,2,5];for(const re of Q)se.push(A*re)}else{const Q=[-.01,-.001,-1e-4,0,1e-4,.001,.01];for(const re of Q)se.push(A+re)}const Z=[];for(const Q of se){if(a!=null&&a.aborted)throw new DOMException("Aborted","AbortError");if(n){const re={};for(const $ of s)re[$]=t.parameters[$];const K=await q(x,U,Q,re,{maxIter:30,maxEvals:120,initialStep:.25});Z.push(K.ssr)}else{const re=await b(()=>fe.simulateCached(x,{[B]:Q},r,{signal:a})),K=[];for(let $=0;$<(o?re.data.length:1);$++){const ce=o?$:re.data.length-1,ae=re.data[ce]??{};for(const me of X)K.push(Number(ae[me]??0))}Z.push(G(K,p))}}const ue=Math.min(...Z),l=(Math.max(...Z)-ue)/(Math.abs(ue)+1e-12)<.01;g[B]={grid:se,ssr:Z,min:ue,flat:l};const f=.05;let L=0,z=Math.abs(se[0]-A);for(let Q=1;Q<se.length;Q++){const re=Math.abs(se[Q]-A);re<z&&(z=re,L=Q)}const ne=(Number.isFinite(Z[L])?Z[L]:ue)+Pt(1-f,1),ye=[];for(let Q=0;Q<Z.length;Q++)Z[Q]<=ne&&ye.push(Q);let de;if(ye.length>0){const Q=ye.map(re=>se[re]);de={lower:Math.min(...Q),upper:Math.max(...Q)}}v[B]={grid:se,ssr:Z,min:ue,flat:l,alpha:f,ci:de}}}const D=[];for(let m=0;m<te;m++)for(let p=m+1;p<te;p++){const M=je[m][p]??0;D.push({i:m,j:p,names:[s[m],s[p]],corr:M})}D.sort((m,p)=>Math.abs(p.corr)-Math.abs(m.corr));const Y=D.slice(0,Math.min(20,D.length)),J=performance.now();return{eigenvalues:S,eigenvectors:I,paramNames:s.slice(),conditionNumber:be,regularizedConditionNumber:Re,maxEigenvalue:H,minEigenvalue:oe,covarianceMatrix:Se,correlations:je,nullspaceCombinations:c.length>0?c:void 0,topCorrelatedPairs:Y,profileApprox:Object.keys(g).length>0?g:void 0,profileApproxExtended:Object.keys(v).length>0?v:void 0,fimMatrix:ke,jacobian:Ge,sensitivityProfiles:ze,identifiableParams:Ae.length>0?Ae:void 0,unidentifiableParams:Le.length>0?Le:void 0,vif:Ne.length>0?Ne:void 0,highVIFParams:Be.length>0?Be:void 0,benchmark:{prepareModelMs:P-j,totalSimMs:ie,simCount:F,totalMs:J-h,perSimMs:ie/Math.max(1,F)}}}finally{if(typeof x=="number")try{await fe.releaseModel(x)}catch(j){console.warn("Failed to release FIM cached model:",j)}}}function xt(t){return{format:"FIM-v1",conditionNumber:t.conditionNumber,regularizedConditionNumber:t.regularizedConditionNumber,eigenvalues:t.eigenvalues,eigenvectors:t.eigenvectors,covariance:t.covarianceMatrix,correlations:t.correlations,fimMatrix:t.fimMatrix,jacobian:t.jacobian}}const ns=({model:t})=>{var Ue,Re,te,Se,_e,je,ke,Ge,ze,Ae,Le,Ce,Ne,Be;const s=d.useMemo(()=>t?Object.keys(t.parameters):[],[t]),[r,a]=d.useState(()=>[]),[i,o]=d.useState(!1),[u,y]=d.useState({current:0,total:0}),[n,h]=d.useState(null),[x,j]=d.useState(null),[P,C]=d.useState(null),[_,N]=d.useState(!0),[X,W]=d.useState(null),[O,xe]=d.useState(!1),[Me,E]=d.useState(!1),[w,F]=d.useState(!1),ie=Ee.useRef(null);Ee.useEffect(()=>()=>{const c=ie.current;typeof c=="number"&&(fe.releaseModel(c).catch(k=>{console.warn("Failed to release cached model on FIMTab unmount",c,k)}),ie.current=null)},[]),Ee.useEffect(()=>{t?s.length>0&&r.length===0&&a(s.length<=20?s.slice():s.slice(0,20)):(a([]),h(null),j(null))},[t]);const b=c=>{const k=c.target.selectedOptions,g=Array.from(k??[]).map(v=>v.value);a(g)},ee=d.useCallback(async()=>{if(!t){j("No model loaded");return}if(!r||r.length===0){j("Select at least one parameter");return}if(r.length>80){j("Please select fewer parameters (<=80) to keep computation reasonable.");return}j(null),h(null),o(!0),y({current:0,total:0});const c=new AbortController;C(c);try{const k={method:"ode",t_end:100,n_steps:100},g=(D,Y)=>y({current:D,total:Y}),v=await as(t,r,k,c.signal,g,!0,_);v!=null&&v.benchmark&&v.benchmark.modelId&&(ie.current=v.benchmark.modelId),h(v)}catch(k){k instanceof DOMException&&k.name==="AbortError"?j("Computation cancelled"):j(k instanceof Error?k.message:String(k))}finally{o(!1),C(null)}},[t,r,_]),S=d.useCallback(()=>{P&&P.abort()},[P]),I=()=>{if(!(n!=null&&n.nullspaceCombinations))return;const c=[["Combination","Eigenvalue","Parameter","Loading"].join(","),...n.nullspaceCombinations.flatMap((D,Y)=>D.components.map(J=>[Y+1,D.eigenvalue,J.name,J.loading].join(",")))].join(`
`),k=new Blob([c],{type:"text/csv"}),g=URL.createObjectURL(k),v=document.createElement("a");v.href=g,v.download="nullspace_combinations.csv",v.click(),URL.revokeObjectURL(g)},H=()=>{if(!(n!=null&&n.vif))return;const c=[["Parameter","VIF"].join(","),...n.paramNames.map((D,Y)=>{var J;return[D,((J=n.vif)==null?void 0:J[Y])||"N/A"].join(",")})].join(`
`),k=new Blob([c],{type:"text/csv"}),g=URL.createObjectURL(k),v=document.createElement("a");v.href=g,v.download="vif_table.csv",v.click(),URL.revokeObjectURL(g)},oe=()=>{if(!(n!=null&&n.correlations))return;const c=[["",...n.paramNames].join(","),...n.correlations.map((D,Y)=>[n.paramNames[Y],...D].join(","))].join(`
`),k=new Blob([c],{type:"text/csv"}),g=URL.createObjectURL(k),v=document.createElement("a");v.href=g,v.download="correlations.csv",v.click(),URL.revokeObjectURL(g)},be=()=>{if(!(n!=null&&n.fimMatrix))return;const c=[["",...n.paramNames].join(","),...n.fimMatrix.map((D,Y)=>[n.paramNames[Y],...D].join(","))].join(`
`),k=new Blob([c],{type:"text/csv"}),g=URL.createObjectURL(k),v=document.createElement("a");v.href=g,v.download="fim_matrix.csv",v.click(),URL.revokeObjectURL(g)};return e.jsxs("div",{className:"space-y-6",children:[e.jsx(we,{children:e.jsxs("div",{className:"grid gap-4 md:grid-cols-2",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-300",children:"Parameters (multi-select)"}),e.jsx(We,{multiple:!0,size:Math.min(12,Math.max(4,s.length)),value:r,onChange:b,className:"h-40",children:s.map(c=>e.jsx("option",{value:c,children:c},c))}),e.jsxs("div",{className:"mt-2 text-xs text-slate-500",children:["Selected: ",r.length]})]}),e.jsxs("div",{className:"flex flex-col gap-3",children:[e.jsx("div",{className:"text-sm text-slate-600",children:"Compute the Fisher Information Matrix (FIM) using central finite differences across all time points. This performs 2×P simulations where P is the number of selected parameters."}),e.jsxs("label",{className:"mt-2 flex items-center gap-2 text-sm",children:[e.jsx("input",{type:"checkbox",checked:_,onChange:c=>N(c.target.checked)}),e.jsx("span",{className:"text-sm text-slate-600",children:"Use log-parameter sensitivities (d/d ln p)"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(he,{onClick:ee,disabled:i||!t||r.length===0,children:"Run Identifiability Analysis"}),i&&e.jsx(he,{variant:"danger",onClick:S,children:"Cancel"})]}),i&&e.jsxs("div",{className:"flex items-center gap-3 p-4 bg-blue-50 rounded-lg mb-4",children:[e.jsx("div",{className:"animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("p",{className:"text-sm font-medium text-blue-800",children:["Computing FIM... ",u.current," / ",u.total," simulations"]}),e.jsx("div",{className:"w-full bg-blue-200 rounded-full h-2 mt-2",children:e.jsx("div",{className:"bg-blue-600 h-2 rounded-full transition-all",style:{width:`${u.total>0?u.current/u.total*100:0}%`}})})]})]}),x&&e.jsx("div",{className:"text-sm text-red-600",children:x})]})]})}),n&&e.jsxs(we,{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-start justify-between",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-lg font-semibold",children:"Identifiability Analysis Results"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("span",{title:"Ratio of largest to smallest eigenvalue. Higher values indicate numerical instability and ill-conditioning.",children:"Condition number:"})," ",Number.isFinite(n.conditionNumber)?n.conditionNumber.toExponential(3):"∞"]})]}),e.jsx("div",{className:"flex items-center gap-2",children:e.jsx(he,{onClick:()=>{try{const c=xt(n),k=new Blob([JSON.stringify(c,null,2)],{type:"application/json"}),g=URL.createObjectURL(k),v=document.createElement("a");v.href=g,v.download="fim_analysis.json",document.body.appendChild(v),v.click(),v.remove(),URL.revokeObjectURL(g)}catch(c){console.warn("Failed to export FIM",c)}},children:"Export JSON"})})]}),n.benchmark&&e.jsxs("div",{className:"text-xs text-slate-500",children:["Benchmark: prepareModel ",Math.round(n.benchmark.prepareModelMs)," ms · sims ",Math.round(n.benchmark.totalSimMs)," ms for ",n.benchmark.simCount," runs · total ",Math.round(n.benchmark.totalMs)," ms"]}),e.jsxs("div",{className:"text-xs text-slate-500 text-right",children:["Analysis completed: ",new Date().toLocaleString(),e.jsx("br",{}),"Computation time: ",(Ue=n.benchmark)!=null&&Ue.totalMs?Math.round(n.benchmark.totalMs):"N/A"," ms"]}),e.jsxs("div",{className:"bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6",children:[e.jsx("h3",{className:"font-semibold text-yellow-800",children:"Model Identifiability Summary"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4 mt-2 text-sm",children:[e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:"Condition Number:"})," ",e.jsx("span",{className:n.conditionNumber>1e3?"text-red-600":"text-green-600",children:n.conditionNumber.toExponential(2)}),n.conditionNumber>1e3&&" (⚠️ Ill-conditioned)"]}),e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:"Identifiable Params:"})," ",e.jsx("span",{className:"text-green-600",children:((Re=n.identifiableParams)==null?void 0:Re.length)||0})," / ",n.paramNames.length]}),e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:"High VIF Count:"})," ",e.jsx("span",{className:"text-red-600",children:((te=n.highVIFParams)==null?void 0:te.length)||0}),n.highVIFParams&&n.highVIFParams.length>0&&" (⚠️ Collinear)"]}),e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:"Max Correlation:"})," ",e.jsx("span",{className:"text-red-600",children:n.topCorrelatedPairs&&n.topCorrelatedPairs.length>0?Math.max(...n.topCorrelatedPairs.map(c=>Math.abs(c.corr))).toFixed(3):"N/A"})]})]})]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"min-w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-2 py-1 text-left",children:"#"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Eigenvalue"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Top contributors"})]})}),e.jsx("tbody",{children:n.eigenvalues.map((c,k)=>{const g=n.eigenvectors[k]??[],v=n.paramNames.map((J,m)=>({name:J,v:Math.abs(g[m]??0),signed:g[m]??0}));v.sort((J,m)=>m.v-J.v);const D=v.slice(0,6),Y=X===k;return e.jsxs(Ee.Fragment,{children:[e.jsxs("tr",{className:"border-t cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800",onClick:()=>W(Y?null:k),children:[e.jsx("td",{className:"px-2 py-1 align-top",children:k+1}),e.jsx("td",{className:"px-2 py-1 align-top",children:c.toExponential(3)}),e.jsx("td",{className:"px-2 py-1",children:e.jsx("div",{className:"flex flex-wrap gap-2",children:D.map(J=>e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-40 truncate text-xs text-slate-600",children:J.name}),e.jsx("div",{className:"text-xs",children:J.signed.toFixed(4)})]},J.name))})})]}),Y&&e.jsx("tr",{className:"bg-slate-50 dark:bg-slate-900",children:e.jsxs("td",{colSpan:3,className:"px-4 py-3",children:[e.jsxs("div",{className:"mb-2 text-sm font-medium",children:["Eigenvector ",k+1," — full parameter loadings"]}),e.jsx("div",{className:"text-xs text-slate-500 mb-2",children:"Parameters are sorted by absolute loading. Parameters highlighted are those with |loading| ≥ 20% of the top contributor for this eigenvector."}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"min-w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-2 py-1 text-left",children:"Parameter"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Loading"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Magnitude"})]})}),e.jsx("tbody",{children:v.map(J=>{var T;const m=((T=v[0])==null?void 0:T.v)??1,p=m*.2,M=J.v>=p,R=m>0?Math.round(J.v/m*100):0;return e.jsxs("tr",{className:M?"bg-yellow-50 dark:bg-yellow-900/20":"",children:[e.jsx("td",{className:"px-2 py-1 align-top w-64 truncate",children:J.name}),e.jsx("td",{className:"px-2 py-1 align-top",children:e.jsx("code",{className:"text-xs",children:J.signed.toFixed(6)})}),e.jsxs("td",{className:"px-2 py-1 align-top",children:[e.jsx("div",{className:"w-full bg-slate-200 dark:bg-slate-800 h-3 rounded overflow-hidden",children:e.jsx("div",{style:{width:`${R}%`},className:"h-3 bg-sky-500"})}),e.jsxs("div",{className:"text-xs text-slate-500 mt-1",children:[J.v.toExponential(3)," (",R,"%) ",M?"· group":""]})]})]},J.name)})})]})})]})})]},k)})})]})}),e.jsxs("div",{className:"mt-2 flex gap-3 items-center",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-slate-500",children:"Identifiable"}),e.jsxs("div",{className:"flex flex-wrap gap-2 mt-1",children:[(Se=n.identifiableParams)==null?void 0:Se.slice(0,50).map(c=>e.jsx("div",{className:"px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium",children:c},c)),n.identifiableParams&&n.identifiableParams.length>50&&e.jsxs("div",{className:"text-xs text-slate-500",children:["+",n.identifiableParams.length-50," more"]})]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-slate-500",children:"Unidentifiable"}),e.jsxs("div",{className:"flex flex-wrap gap-2 mt-1",children:[(_e=n.unidentifiableParams)==null?void 0:_e.slice(0,50).map(c=>e.jsx("div",{className:"px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-medium",children:c},c)),n.unidentifiableParams&&n.unidentifiableParams.length>50&&e.jsxs("div",{className:"text-xs text-slate-500",children:["+",n.unidentifiableParams.length-50," more"]})]})]})]})]}),(n==null?void 0:n.vif)&&e.jsxs(we,{className:"space-y-3",children:[n.highVIFParams&&n.highVIFParams.length>0&&e.jsxs("div",{className:"bg-red-50 border-l-4 border-red-500 p-4 mb-4",children:[e.jsx("p",{className:"text-red-700 font-semibold",children:"⚠️ Severe Multicollinearity Detected"}),e.jsx("p",{className:"text-red-600 text-sm mb-3",children:"VIF values above 100 indicate parameters are nearly perfectly correlated. This means individual parameter values cannot be uniquely determined, though model predictions remain reliable."}),e.jsxs("div",{className:"bg-white border border-red-200 rounded p-3",children:[e.jsx("p",{className:"text-sm text-red-700 font-semibold mb-2",children:"General Recommendations:"}),e.jsxs("ul",{className:"text-sm text-red-600 space-y-1.5 list-disc list-inside",children:[e.jsxs("li",{children:["Use ",e.jsx("strong",{children:"parameter ratios"})," instead of individual values where mechanistically appropriate"]}),e.jsxs("li",{children:["Apply ",e.jsx("strong",{children:"Bayesian priors"})," from literature if available"]}),e.jsxs("li",{children:["Design ",e.jsx("strong",{children:"new experiments"})," that independently perturb each pathway"]}),e.jsxs("li",{children:["Consider ",e.jsx("strong",{children:"sensitivity analysis"})," to identify which combinations matter most for your predictions"]})]})]})]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("h3",{className:"text-lg font-semibold",children:["📊 ",e.jsx("span",{title:"Variance Inflation Factor - measures multicollinearity. Values > 10 indicate severe correlation between parameters.",children:"Variance Inflation Factors (VIF)"})]}),e.jsx("button",{onClick:H,className:"text-sm text-teal-600 hover:text-teal-700 underline",children:"Export CSV ↓"})]}),e.jsx("div",{className:"text-sm text-slate-600",children:"VIF > 10 suggests strong multicollinearity."}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"min-w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-2 py-1 text-left",children:"Parameter"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"VIF"})]})}),e.jsx("tbody",{children:n.paramNames.map((c,k)=>{var D;const g=((D=n.vif)==null?void 0:D[k])??0,v=Number.isFinite(g)&&g>10;return e.jsxs("tr",{className:`border-t ${v?"bg-amber-50 dark:bg-amber-900/20":""}`,children:[e.jsx("td",{className:"px-2 py-1 font-mono text-xs",children:c}),e.jsx("td",{className:"px-2 py-1",children:e.jsxs("div",{className:"flex items-center justify-end gap-2",children:[e.jsx("span",{children:Number.isFinite(g)?g.toFixed(3):"∞"}),Number.isFinite(g)&&g>1e3&&e.jsx("span",{className:"text-red-500 text-xs",children:"🔴 Extreme"}),Number.isFinite(g)&&g>10&&g<=1e3&&e.jsx("span",{className:"text-orange-500 text-xs",children:"🟠 High"}),Number.isFinite(g)&&g>5&&g<=10&&e.jsx("span",{className:"text-yellow-500 text-xs",children:"🟡 Moderate"})]})})]},c)})})]})})]}),n&&e.jsxs(we,{className:"space-y-4",children:[e.jsxs("div",{className:"bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-6 mb-6 shadow-sm",children:[e.jsx("h3",{className:"text-xl font-bold text-teal-800 mb-4",children:"Identifiability Summary"}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"bg-white rounded p-3 shadow-sm",children:[e.jsx("div",{className:"text-2xl font-bold text-red-600",children:((je=n.unidentifiableParams)==null?void 0:je.length)||0}),e.jsx("div",{className:"text-xs text-gray-600 uppercase",children:"Unidentifiable"})]}),e.jsxs("div",{className:"bg-white rounded p-3 shadow-sm",children:[e.jsx("div",{className:"text-2xl font-bold text-green-600",children:((ke=n.identifiableParams)==null?void 0:ke.length)||0}),e.jsx("div",{className:"text-xs text-gray-600 uppercase",children:"Identifiable"})]}),e.jsxs("div",{className:"bg-white rounded p-3 shadow-sm",children:[e.jsx("div",{className:"text-2xl font-bold text-orange-600",children:n.conditionNumber.toExponential(0)}),e.jsx("div",{className:"text-xs text-gray-600 uppercase",children:"Condition Number"}),e.jsx("div",{className:"text-xs mt-1",children:n.conditionNumber<100?e.jsx("span",{className:"text-green-600 font-medium",children:"Well-conditioned"}):n.conditionNumber<1e4?e.jsx("span",{className:"text-yellow-600 font-medium",children:"Moderately ill-conditioned"}):e.jsx("span",{className:"text-red-600 font-medium",children:"Severely ill-conditioned"})})]}),e.jsxs("div",{className:"bg-white rounded p-3 shadow-sm",children:[e.jsx("div",{className:"text-2xl font-bold text-purple-600",children:((Ge=n.nullspaceCombinations)==null?void 0:Ge.length)||0}),e.jsx("div",{className:"text-xs text-gray-600 uppercase",children:"Problem Combos"})]})]}),e.jsx("div",{className:"mt-4 p-3 bg-white rounded border border-teal-200",children:e.jsxs("p",{className:"text-sm text-gray-700",children:[e.jsx("strong",{children:"Overall Assessment:"})," ",e.jsx("span",{className:"text-red-600 font-semibold",children:((ze=n.unidentifiableParams)==null?void 0:ze.length)===n.paramNames.length?"Severe identifiability issues detected.":((Ae=n.identifiableParams)==null?void 0:Ae.length)===n.paramNames.length?"All parameters are identifiable.":"Mixed identifiability - some parameters can be estimated."})," ","Model predictions are reliable, but individual parameter values"," ",((Le=n.identifiableParams)==null?void 0:Le.length)===n.paramNames.length?"can be uniquely determined":"cannot be uniquely determined"," from current data."]})}),e.jsxs("div",{className:"mt-4",children:[e.jsx("div",{className:"h-3 bg-gray-200 rounded-full overflow-hidden",children:e.jsx("div",{className:"h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500",style:{width:`${(((Ce=n.identifiableParams)==null?void 0:Ce.length)||0)/n.paramNames.length*100}%`}})}),e.jsxs("p",{className:"text-xs text-gray-600 mt-1 text-center",children:["Overall Identifiability: ",((((Ne=n.identifiableParams)==null?void 0:Ne.length)||0)/n.paramNames.length*100).toFixed(0),"%"]})]}),n.eigenvalues&&n.eigenvalues.length>0&&e.jsxs("div",{className:"mt-4",children:[e.jsx("p",{className:"text-sm font-medium text-gray-700 mb-2",children:"Eigenvalue Spectrum"}),e.jsx("div",{style:{width:"100%",height:120},children:e.jsx(Je,{children:e.jsxs(Ze,{data:n.eigenvalues.map((c,k)=>({index:k+1,eigenvalue:c})),margin:{top:5,right:5,left:5,bottom:5},children:[e.jsx(Qe,{strokeDasharray:"3 3",stroke:"rgba(128,128,128,0.15)"}),e.jsx(et,{dataKey:"index",tick:{fontSize:10},label:{value:"Index",position:"insideBottom",offset:-5,style:{textAnchor:"middle",fontSize:10}}}),e.jsx(tt,{tick:{fontSize:10},tickFormatter:c=>Number(c).toExponential(1),label:{value:"Eigenvalue",angle:-90,position:"insideLeft",style:{textAnchor:"middle",fontSize:10}}}),e.jsx(st,{formatter:c=>[Number(c).toExponential(3),"Eigenvalue"],labelFormatter:c=>`Index ${c}`}),e.jsx(at,{type:"monotone",dataKey:"eigenvalue",stroke:"#7c3aed",strokeWidth:2,dot:{r:3}})]})})}),e.jsx("p",{className:"text-xs text-gray-600 mt-1 text-center",children:"Small eigenvalues indicate directions of non-identifiability"})]}),e.jsxs("div",{className:"flex gap-2 mt-4",children:[e.jsx("button",{className:"px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm",onClick:()=>{var k;const c=["# Unidentifiable parameters detected:",...((k=n.unidentifiableParams)==null?void 0:k.map(g=>`# ${g}`))||[],"","# Suggested approaches:","# 1. Fix one parameter per null-space combination using literature","# 2. Reparameterize using ratios where appropriate","# 3. Use Bayesian inference with informative priors"].join(`
`);navigator.clipboard.writeText(c),alert("General guidance copied to clipboard!")},children:"📋 Copy Analysis Summary"}),e.jsx("button",{className:"px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm",onClick:()=>{const c=xt(n),k=new Blob([JSON.stringify(c,null,2)],{type:"application/json"}),g=URL.createObjectURL(k),v=document.createElement("a");v.href=g,v.download="fim_analysis.json",document.body.appendChild(v),v.click(),URL.revokeObjectURL(g)},children:"💾 Export Full Analysis"})]})]}),n.unidentifiableParams&&n.unidentifiableParams.length>0&&e.jsxs("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6",children:[e.jsx("h3",{className:"font-semibold text-blue-800 mb-3",children:"🎯 Recommended Next Steps"}),e.jsxs("ol",{className:"list-decimal list-inside space-y-2 text-sm text-blue-700",children:[e.jsxs("li",{children:["Review ",e.jsx("strong",{children:"Top Correlated Pairs"})," to understand which parameters co-vary"]}),e.jsxs("li",{children:["Check ",e.jsx("strong",{children:"Non-identifiable Combinations"})," to see which groups are problematic"]}),e.jsx("li",{children:"Consider fixing one parameter per combination using literature data"}),e.jsx("li",{children:"Export results and consult with domain experts about which parameters can be fixed"}),e.jsx("li",{children:"Re-run identifiability analysis after making changes to verify improvement"})]})]}),e.jsx("h3",{className:"text-lg font-semibold",children:"🎯 Parameter Identifiability Analysis"}),e.jsx("div",{className:"text-sm text-slate-600",children:"Analysis of parameter uncertainty and correlations. Non-identifiable parameters appear in combinations that cannot be resolved from the available data."}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"min-w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-2 py-1 text-left",children:"Parameter"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Value"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"FIM Contribution"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Identifiable"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Top Correlations"})]})}),e.jsx("tbody",{children:n.paramNames.map((c,k)=>{var R,T,G,V;const g=(t==null?void 0:t.parameters[c])??0,v=n.correlations[k]??[],D=((R=n.identifiableParams)==null?void 0:R.includes(c))??!1,J=n.paramNames.map((q,U)=>({name:q,corr:Math.abs(v[U]??0)})).filter(q=>q.name!==c).sort((q,U)=>U.corr-q.corr).slice(0,3),m=((G=(T=n.fimMatrix)==null?void 0:T[k])==null?void 0:G[k])??0,p=((V=n.fimMatrix)==null?void 0:V.reduce((q,U,B)=>q+(U[B]??0),0))??1,M=p>0?m/p*100:0;return e.jsxs("tr",{className:"border-t",children:[e.jsx("td",{className:"px-2 py-1 align-top font-mono text-xs",children:c}),e.jsx("td",{className:"px-2 py-1 align-top",children:g.toExponential(3)}),e.jsxs("td",{className:"px-2 py-1 align-top",children:[M.toFixed(1),"%"]}),e.jsx("td",{className:"px-2 py-1 align-top font-medium",children:D?e.jsx("span",{className:"text-green-600",children:"✓ Yes"}):e.jsx("span",{className:"text-red-600",children:"✗ No"})}),e.jsx("td",{className:"px-2 py-1",children:e.jsx("div",{className:"flex flex-wrap gap-1",children:J.map(q=>e.jsxs("div",{className:"text-xs",children:[q.name,": ",(q.corr*100).toFixed(0),"%"]},q.name))})})]},c)})})]})})]}),(n==null?void 0:n.nullspaceCombinations)&&n.nullspaceCombinations.length>0&&e.jsxs(we,{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("h3",{className:"text-lg font-semibold",children:"Non-identifiable parameter combinations"}),e.jsx("button",{onClick:I,className:"text-sm text-teal-600 hover:text-teal-700 underline",children:"Export CSV ↓"})]}),e.jsx("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4",children:e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"text-blue-600 text-2xl",children:"ℹ️"}),e.jsxs("div",{children:[e.jsxs("h4",{className:"font-semibold text-blue-800 mb-2",children:[((Be=n.nullspaceCombinations)==null?void 0:Be.length)||0," unidentifiable combination(s) detected"]}),e.jsx("p",{className:"text-sm text-blue-700",children:"These parameter combinations cannot be uniquely determined from the available data. Changes along these directions do not affect model predictions."}),e.jsxs("p",{className:"text-sm text-blue-700 mt-2",children:[e.jsx("strong",{children:"What to do:"})," Fix one parameter per combination using literature values, or design experiments that independently perturb each parameter."]}),e.jsxs("p",{className:"text-xs text-gray-600 mt-2",children:["Threshold: eigenvalues below 0.01% of maximum (",n.eigenvalues&&n.eigenvalues.length>0?(Math.max(...n.eigenvalues)*1e-4).toExponential(1):"1e-12",")"]})]})]})}),e.jsx("div",{className:"space-y-6",children:n.nullspaceCombinations.map((c,k)=>e.jsxs("div",{className:"border border-gray-200 rounded-lg p-4 bg-gray-50",children:[e.jsxs("h4",{className:"font-medium text-gray-800 mb-3",children:["Combination ",k+1," — eigenvalue: ",c.eigenvalue.toExponential(2)]}),e.jsxs("div",{className:"grid grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-semibold text-gray-600 mb-2",children:"Parameter loadings"}),e.jsx("div",{className:"space-y-1",children:c.components.map((g,v)=>e.jsxs("div",{className:"flex justify-between items-center text-sm",children:[e.jsx("span",{className:"font-mono",children:g.name}),e.jsx("span",{className:"font-mono text-gray-700",children:g.loading.toFixed(6)})]},v))})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-semibold text-gray-600 mb-2",children:"Loading magnitudes"}),e.jsx("div",{className:"space-y-2",children:c.components.map((g,v)=>{const D=Math.max(...c.components.map(J=>Math.abs(J.loading))),Y=Math.abs(g.loading)/D*100;return e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-xs font-mono w-20 text-right truncate",children:g.name}),e.jsxs("div",{className:"flex-1 bg-gray-200 rounded h-5 relative",children:[e.jsx("div",{className:`h-full rounded ${g.loading>0?"bg-teal-500":"bg-orange-500"}`,style:{width:`${Y}%`}}),e.jsx("span",{className:"absolute right-2 top-0.5 text-xs font-mono text-gray-700",children:Math.abs(g.loading).toFixed(3)})]})]},v)})})]})]}),e.jsxs("div",{className:"mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-sm",children:[e.jsxs("p",{className:"text-yellow-800 mb-2",children:[e.jsx("strong",{children:"What this means:"})," These ",c.components.length," parameters appear in a linear combination that the data cannot resolve."]}),e.jsx("p",{className:"text-yellow-700",children:e.jsx("strong",{children:"Options:"})}),e.jsxs("ul",{className:"text-xs text-yellow-700 mt-1 space-y-0.5 list-disc list-inside ml-2",children:[e.jsx("li",{children:"Fix one parameter using external data (literature, independent experiments)"}),e.jsx("li",{children:"Reformulate as a ratio if mechanistically justified"}),e.jsx("li",{children:"Accept uncertainty and report parameter ranges instead of point estimates"})]})]})]},k))})]}),(n==null?void 0:n.topCorrelatedPairs)&&n.topCorrelatedPairs.length>0&&e.jsxs(we,{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("h3",{className:"text-lg font-semibold",children:["🔗 ",e.jsx("span",{title:"Parameters with high absolute correlation values (>0.8) may be difficult to estimate independently.",children:"Top correlated parameter pairs"})]}),e.jsx("button",{onClick:oe,className:"text-sm text-teal-600 hover:text-teal-700 underline",children:"Export CSV ↓"})]}),e.jsx("div",{className:"text-sm text-slate-600",children:"Strong correlations (by absolute Pearson correlation from covariance) suggest parameters that co-vary and may be difficult to estimate independently."}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"min-w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-2 py-1 text-left",children:"#"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Parameter A"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Parameter B"}),e.jsx("th",{className:"px-2 py-1 text-left",children:"Correlation"})]})}),e.jsx("tbody",{children:n.topCorrelatedPairs.map((c,k)=>e.jsxs("tr",{className:`border-t ${Math.abs(c.corr)>.95?"bg-red-50":""}`,children:[e.jsx("td",{className:"px-2 py-1 align-top",children:k+1}),e.jsx("td",{className:"px-2 py-1 align-top font-mono text-xs",children:c.names[0]}),e.jsx("td",{className:"px-2 py-1 align-top font-mono text-xs",children:c.names[1]}),e.jsx("td",{className:"px-2 py-1 align-top font-medium",children:e.jsxs("span",{className:Math.abs(c.corr)>.95?"text-red-600 font-bold":"",children:[c.corr.toFixed(3),Math.abs(c.corr)>.95&&" ⚠️"]})})]},`${c.names[0]}-${c.names[1]}`))})]})})]}),(n==null?void 0:n.profileApproxExtended)&&Object.keys(n.profileApproxExtended).length>0&&e.jsxs(we,{className:"space-y-3",children:[e.jsx("h3",{className:"text-lg font-semibold",children:"Profile plots (approx)"}),e.jsx("div",{className:"text-sm text-slate-600",children:"SSR vs parameter grid for profiled parameters. Shaded region shows approximate confidence interval (χ², df=1)."}),e.jsx("div",{className:"grid gap-4 grid-cols-1 md:grid-cols-2",children:Object.entries(n.profileApproxExtended).slice(0,6).map(([c,k])=>{var J,m;const g=k,v=g.grid.map((p,M)=>({x:p,y:g.ssr[M]})),D=(J=g.ci)==null?void 0:J.lower,Y=(m=g.ci)==null?void 0:m.upper;return e.jsxs("div",{className:"p-2",children:[e.jsx("div",{className:"text-sm font-medium mb-1",children:c}),e.jsx("div",{style:{width:"100%",height:220},children:e.jsx(Je,{children:e.jsxs(Ze,{data:v,margin:{top:8,right:8,left:8,bottom:20},children:[e.jsx(Qe,{strokeDasharray:"3 3",stroke:"rgba(128,128,128,0.15)"}),e.jsx(et,{dataKey:"x",tickFormatter:p=>Number(p).toFixed(3)}),e.jsx(tt,{}),e.jsx(st,{formatter:p=>typeof p=="number"?p.toFixed(6):p}),D!==void 0&&Y!==void 0&&e.jsx(ft,{x1:D,x2:Y,strokeOpacity:.1,fill:"#a7f3d0",fillOpacity:.35}),e.jsx(at,{type:"monotone",dataKey:"y",stroke:"#4E79A7",strokeWidth:2,dot:!1})]})})})]},c)})})]}),(n==null?void 0:n.fimMatrix)&&e.jsx(we,{className:"space-y-3",children:e.jsxs("div",{className:"border border-gray-200 rounded-lg",children:[e.jsxs("button",{onClick:()=>xe(!O),className:"w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("h3",{className:"font-semibold",children:"Fisher Information Matrix (heatmap)"}),e.jsx("button",{onClick:c=>{c.stopPropagation(),be()},className:"text-sm text-teal-600 hover:text-teal-700 underline",children:"Export CSV ↓"})]}),e.jsx("span",{className:"text-xl",children:O?"▼":"▶"})]}),O&&e.jsxs("div",{className:"p-4",children:[e.jsx("div",{className:"text-sm text-slate-600",children:"Raw Fisher Information Matrix (rows/cols = parameters). Colors indicate magnitude."}),e.jsx("div",{className:"overflow-auto mt-2",children:e.jsx("div",{className:"inline-block align-top",children:e.jsxs("table",{className:"border-collapse",style:{borderSpacing:0},children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-2 py-1"}),n.paramNames.map(c=>e.jsx("th",{className:"px-2 py-1 text-xs font-mono",children:c},c))]})}),e.jsx("tbody",{children:n.fimMatrix.map((c,k)=>{const g=Math.max(...c.map(v=>Math.abs(v)));return e.jsxs("tr",{className:"align-top",children:[e.jsx("td",{className:"px-2 py-1 text-xs font-mono",children:n.paramNames[k]}),c.map((v,D)=>{const Y=Math.abs(v),J=g>0?Math.min(1,Y/g):0,p=`rgb(${Math.round(240-J*140)},240,240)`;return e.jsx("td",{className:"px-1 py-1 text-xs",style:{background:p},children:e.jsx("div",{className:"px-2",children:v.toExponential(2)})},D)})]},k)})})]})})})]})]})}),(n==null?void 0:n.correlations)&&e.jsx(we,{className:"space-y-3",children:e.jsxs("div",{className:"border border-gray-200 rounded-lg",children:[e.jsxs("button",{onClick:()=>E(!Me),className:"w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("h3",{className:"font-semibold",children:"Parameter correlations (heatmap)"}),e.jsx("button",{onClick:c=>{c.stopPropagation(),oe()},className:"text-sm text-teal-600 hover:text-teal-700 underline",children:"Export CSV ↓"})]}),e.jsx("span",{className:"text-xl",children:Me?"▼":"▶"})]}),Me&&e.jsxs("div",{className:"p-4",children:[e.jsx("div",{className:"text-sm text-slate-600",children:"Pearson correlations between parameter estimates. Red indicates strong correlations (potential identifiability issues)."}),e.jsx("div",{className:"overflow-auto mt-2",children:e.jsx("div",{className:"inline-block align-top",children:e.jsxs("table",{className:"border-collapse",style:{borderSpacing:0},children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-2 py-1"}),n.paramNames.map(c=>e.jsx("th",{className:"px-2 py-1 text-xs font-mono",children:c},c))]})}),e.jsx("tbody",{children:n.correlations.map((c,k)=>e.jsxs("tr",{className:"align-top",children:[e.jsx("td",{className:"px-2 py-1 text-xs font-mono",children:n.paramNames[k]}),c.map((g,v)=>{const D=Math.abs(g);let Y="rgb(245, 245, 245)";return D>.95?Y="rgb(192, 21, 47)":D>.8?Y="rgb(255, 84, 89)":D>.5?Y="rgb(230, 129, 97)":D>.2&&(Y="rgb(50, 184, 198)"),e.jsx("td",{className:"px-1 py-1 text-xs",style:{background:Y},children:e.jsx("div",{className:"px-2",children:g.toFixed(3)})},v)})]},k))})]})})})]})]})}),(n==null?void 0:n.jacobian)&&e.jsx(we,{className:"space-y-3",children:e.jsxs("div",{className:"border border-gray-200 rounded-lg",children:[e.jsxs("button",{onClick:()=>F(!w),className:"w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100",children:[e.jsx("h3",{className:"font-semibold",children:"Jacobian (sensitivity) heatmap"}),e.jsx("span",{className:"text-xl",children:w?"▼":"▶"})]}),w&&e.jsxs("div",{className:"p-4",children:[e.jsx("div",{className:"text-sm text-slate-600",children:"Rows: observables×time, Columns: parameters. Showing first 20 rows for readability."}),e.jsx("div",{className:"overflow-auto mt-2",children:e.jsxs("table",{className:"border-collapse",style:{borderSpacing:0},children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-2 py-1",children:"#"}),n.paramNames.map(c=>e.jsx("th",{className:"px-2 py-1 text-xs font-mono",children:c},c))]})}),e.jsx("tbody",{children:n.jacobian.slice(0,20).map((c,k)=>e.jsxs("tr",{className:"align-top border-t",children:[e.jsx("td",{className:"px-2 py-1 text-xs",children:k+1}),c.map((g,v)=>{const D=Math.abs(g),Y=Math.min(1,D/1),J=Math.round(240-Math.min(220,Y*220)),m=`rgb(255,${J},${J})`;return e.jsx("td",{className:"px-1 py-1 text-xs",style:{background:m},children:e.jsx("div",{className:"px-2",children:g.toExponential(2)})},v)})]},k))})]})})]})]})}),e.jsxs("details",{className:"border border-gray-200 rounded-lg p-4 mt-6",children:[e.jsx("summary",{className:"font-semibold cursor-pointer",children:"📖 How to interpret these results"}),e.jsxs("div",{className:"mt-3 space-y-3 text-sm text-gray-700",children:[e.jsxs("div",{children:[e.jsx("strong",{className:"text-teal-700",children:"Condition Number:"}),e.jsxs("ul",{className:"ml-4 mt-1 list-disc",children:[e.jsx("li",{children:"< 100: Well-conditioned (good)"}),e.jsx("li",{children:"100 - 10,000: Moderately ill-conditioned"}),e.jsx("li",{children:"> 10,000: Severely ill-conditioned (problematic)"})]})]}),e.jsxs("div",{children:[e.jsx("strong",{className:"text-teal-700",children:"VIF (Variance Inflation Factor):"}),e.jsxs("ul",{className:"ml-4 mt-1 list-disc",children:[e.jsx("li",{children:"< 5: No multicollinearity"}),e.jsx("li",{children:"5 - 10: Moderate multicollinearity"}),e.jsx("li",{children:"> 10: High multicollinearity (fix required)"})]})]}),e.jsxs("div",{children:[e.jsx("strong",{className:"text-teal-700",children:"Parameter Correlations:"}),e.jsxs("ul",{className:"ml-4 mt-1 list-disc",children:[e.jsx("li",{children:"Close to ±1: Parameters are highly correlated"}),e.jsx("li",{children:"Close to 0: Parameters are independent"})]})]}),e.jsxs("div",{children:[e.jsx("strong",{className:"text-teal-700",children:"Identifiability:"}),e.jsxs("ul",{className:"ml-4 mt-1 list-disc",children:[e.jsx("li",{children:"Identifiable parameters can be uniquely estimated from data"}),e.jsx("li",{children:"Unidentifiable parameters appear in combinations that don't affect predictions"}),e.jsx("li",{children:"Fix one parameter per unidentifiable combination using external data"})]})]})]}),e.jsx("p",{className:"text-xs text-gray-500 mt-4",children:e.jsx("a",{href:"https://en.wikipedia.org/wiki/Identifiability_analysis",target:"_blank",className:"text-teal-600 hover:underline",children:"Learn more about identifiability analysis →"})})]}),e.jsx("button",{onClick:()=>window.scrollTo({top:0,behavior:"smooth"}),className:"fixed bottom-6 right-6 bg-teal-600 hover:bg-teal-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-10",title:"Scroll to top",children:"↑"})]})},pt=t=>{var i;const s=t.split("("),r=s[0],a=((i=s[1])==null?void 0:i.replace(")","").split(",").map(o=>o.trim()).filter(Boolean))||[];return e.jsxs("div",{className:"flex items-center gap-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800",children:[e.jsx("span",{className:"font-bold text-primary-600 dark:text-primary-400",children:r}),a.length>0&&e.jsx("div",{className:"flex gap-1",children:a.map(o=>{const u=o.includes("!"),y=o.includes("~")?o.split("~")[1]:null,n=o.split("~")[0].split("!")[0];return e.jsxs("div",{className:`px-2 py-0.5 text-xs rounded-full ${u?"bg-red-200 dark:bg-red-800":"bg-green-200 dark:bg-green-800"}`,children:[n,y&&`~${y}`]},n)})})]})},rs=({rule:t})=>e.jsx("div",{className:"p-4 border border-stone-200 dark:border-slate-700 rounded-lg",children:e.jsxs("div",{className:"flex items-center justify-center gap-4 flex-wrap",children:[e.jsx("div",{className:"flex items-center gap-2",children:t.reactants.map((s,r)=>e.jsxs(Ee.Fragment,{children:[pt(s),r<t.reactants.length-1&&e.jsx("span",{className:"text-2xl font-light text-slate-400",children:"+"})]},r))}),e.jsxs("div",{className:"flex flex-col items-center",children:[e.jsx("span",{className:"text-sm font-mono text-slate-500",children:t.rate}),e.jsx("svg",{className:"w-12 h-6",viewBox:"0 0 24 12",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:e.jsx("path",{d:"M1 6H22M22 6L17 1M22 6L17 11",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})}),t.isBidirectional&&t.reverseRate&&e.jsxs(e.Fragment,{children:[e.jsx("svg",{className:"w-12 h-6 rotate-180",viewBox:"0 0 24 12",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:e.jsx("path",{d:"M1 6H22M22 6L17 1M22 6L17 11",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})}),e.jsx("span",{className:"text-sm font-mono text-slate-500",children:t.reverseRate})]})]}),e.jsx("div",{className:"flex items-center gap-2",children:t.products.map((s,r)=>e.jsxs(Ee.Fragment,{children:[pt(s),r<t.products.length-1&&e.jsx("span",{className:"text-2xl font-light text-slate-400",children:"+"})]},r))})]})}),is=({model:t})=>t?t.reactionRules.length===0?e.jsx("div",{className:"text-slate-500 dark:text-slate-400",children:"This model has no reaction rules defined."}):e.jsx("div",{className:"space-y-6 max-h-[60vh] overflow-y-auto pr-2",children:t.reactionRules.map((s,r)=>e.jsx(rs,{rule:s},r))}):e.jsx("div",{className:"text-slate-500 dark:text-slate-400",children:"Parse a model to visualize reaction rules."}),os=({model:t,results:s,onSimulate:r,isSimulating:a,onCancelSimulation:i})=>{const[o,u]=d.useState(new Set);return Ee.useEffect(()=>{u(t?new Set(t.observables.map(y=>y.name)):new Set)},[t]),e.jsx("div",{className:"h-full",children:e.jsxs(Dt,{children:[e.jsxs(zt,{children:[e.jsx($e,{children:"Time Course"}),e.jsx($e,{children:"Network Graph"}),e.jsx($e,{children:"Rule Cartoons"}),e.jsx($e,{children:"Structure"}),e.jsx($e,{children:"Steady State"}),e.jsx($e,{children:"Parameter Scan"}),e.jsx($e,{children:"Identifiability"})]}),e.jsxs(Kt,{children:[e.jsx(Oe,{children:e.jsx(Ot,{results:s,model:t,visibleSpecies:o,onVisibleSpeciesChange:u})}),e.jsx(Oe,{children:e.jsx(Ht,{model:t,results:s})}),e.jsx(Oe,{children:e.jsx(is,{model:t})}),e.jsx(Oe,{children:e.jsx(Xt,{model:t})}),e.jsx(Oe,{children:e.jsx(Yt,{model:t,onSimulate:r,onCancelSimulation:i,isSimulating:a})}),e.jsx(Oe,{children:e.jsx(ts,{model:t})}),e.jsx(Oe,{children:e.jsx(ns,{model:t})})]})]})})};function ls(){const[t,s]=d.useState(()=>localStorage.getItem("theme")||"light"),r=()=>{s(a=>a==="light"?"dark":"light")};return d.useEffect(()=>{const a=window.document.documentElement;a.classList.remove("light","dark"),a.classList.add(t),localStorage.setItem("theme",t)},[t]),[t,r]}const cs=t=>e.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",...t,children:e.jsx("path",{d:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"})}),ds=t=>e.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",...t,children:[e.jsx("circle",{cx:"12",cy:"12",r:"5"}),e.jsx("line",{x1:"12",y1:"1",x2:"12",y2:"3"}),e.jsx("line",{x1:"12",y1:"21",x2:"12",y2:"23"}),e.jsx("line",{x1:"4.22",y1:"4.22",x2:"5.64",y2:"5.64"}),e.jsx("line",{x1:"18.36",y1:"18.36",x2:"19.78",y2:"19.78"}),e.jsx("line",{x1:"1",y1:"12",x2:"3",y2:"12"}),e.jsx("line",{x1:"21",y1:"12",x2:"23",y2:"12"}),e.jsx("line",{x1:"4.22",y1:"19.78",x2:"5.64",y2:"18.36"}),e.jsx("line",{x1:"18.36",y1:"5.64",x2:"19.78",y2:"4.22"})]}),ms=({onAboutClick:t})=>{const[s,r]=ls();return e.jsx("header",{className:"bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 shadow-sm sticky top-0 z-40",children:e.jsx("div",{className:"container mx-auto px-4 sm:px-6 lg:px-8",children:e.jsxs("div",{className:"flex justify-between items-center py-3",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("svg",{width:"32",height:"32",viewBox:"0 0 100 100",xmlns:"http://www.w3.org/2000/svg",className:"text-primary",children:[e.jsx("circle",{cx:"50",cy:"50",r:"45",fill:"none",stroke:"currentColor",strokeWidth:"10"}),e.jsx("path",{d:"M25 50 A 25 25 0 0 1 75 50",fill:"none",stroke:"currentColor",strokeWidth:"8"}),e.jsx("path",{d:"M50 25 A 25 25 0 0 1 50 75",fill:"none",stroke:"currentColor",strokeWidth:"8"})]}),e.jsx("h1",{className:"text-2xl font-bold text-slate-800 dark:text-slate-100",children:"BioNetGen Playground"})]}),e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx(he,{onClick:t,variant:"ghost",children:"About"}),e.jsx("button",{onClick:r,className:"p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700","aria-label":"Toggle theme",children:s==="light"?e.jsx(cs,{className:"w-6 h-6"}):e.jsx(ds,{className:"w-6 h-6"})})]})]})})})},us=t=>e.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",...t,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})}),bt=t=>e.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",...t,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"})}),hs={success:e.jsx(us,{className:"w-6 h-6 text-green-500"}),error:e.jsx(bt,{className:"w-6 h-6 text-red-500"}),warning:e.jsx(bt,{className:"w-6 h-6 text-yellow-500"}),info:e.jsx(_t,{className:"w-6 h-6 text-blue-500"})},xs={success:"bg-green-100 dark:bg-green-900/50 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200",error:"bg-red-100 dark:bg-red-900/50 border-red-400 dark:border-red-600 text-red-800 dark:text-red-200",warning:"bg-yellow-100 dark:bg-yellow-900/50 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200",info:"bg-blue-100 dark:bg-blue-900/50 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200"},ps=({status:t,onClose:s})=>(d.useEffect(()=>{const r=setTimeout(()=>{s()},5e3);return()=>clearTimeout(r)},[s,t]),e.jsxs("div",{className:`flex items-center gap-4 p-4 rounded-lg border shadow-lg ${xs[t.type]} animate-fade-in-up`,children:[hs[t.type],e.jsx("p",{className:"text-sm font-medium",children:t.message}),e.jsx("button",{onClick:s,className:"ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg focus:ring-2 inline-flex h-8 w-8 hover:bg-black/10 dark:hover:bg-white/10","aria-label":"Dismiss",children:e.jsx(vt,{className:"w-5 h-5"})})]})),bs=({isOpen:t,onClose:s})=>e.jsx(yt,{isOpen:t,onClose:s,title:"About BioNetGen Playground",children:e.jsxs("div",{className:"prose dark:prose-invert max-w-none",children:[e.jsx("p",{children:"This is an interactive web-based playground for the BioNetGen Language (BNGL), a language for specifying rule-based models of biochemical systems."}),e.jsx("p",{children:"You can write, edit, and simulate BNGL models directly in your browser. The application provides visualizations of simulation results and the underlying reaction network."}),e.jsx("h4",{children:"Features:"}),e.jsxs("ul",{children:[e.jsx("li",{children:"BNGL code editor with example gallery."}),e.jsx("li",{children:"ODE-based simulation performed in a web worker."}),e.jsx("li",{children:"Interactive time-course plots of species concentrations."}),e.jsx("li",{children:"Network graph visualization of species and reactions."}),e.jsx("li",{children:"Steady-state finder that automatically stops when concentrations converge."})]}),e.jsx("p",{children:"This project is for educational and demonstration purposes. The BNGL parser and simulator are simplified and may not support all features of the official BioNetGen software."})]})});function gs({isGenerating:t,progressMessage:s,onCancel:r}){return t?e.jsx("div",{className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",children:e.jsxs("div",{className:"bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h3",{className:"text-lg font-semibold text-gray-900",children:"Generating Network..."}),e.jsx("div",{className:"animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"})]}),e.jsx("p",{className:"text-sm text-gray-700 mb-4 min-h-[3rem]",children:s||"Initializing..."}),e.jsx("div",{className:"w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden",children:e.jsx("div",{className:"h-full bg-gradient-to-r from-teal-400 to-teal-600 animate-pulse",style:{width:"100%"}})}),e.jsx("div",{className:"flex gap-2",children:e.jsx("button",{onClick:r,className:"flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium",children:"Cancel Simulation"})}),e.jsx("p",{className:"text-xs text-gray-500 mt-3 text-center",children:"Large models may take up to 60 seconds to generate"})]})}):null}function fs(){const[t,s]=d.useState(kt),[r,a]=d.useState(null),[i,o]=d.useState(null),[u,y]=d.useState(null),[n,h]=d.useState(!1),[x,j]=d.useState(""),[P,C]=d.useState(!1),_=d.useRef(null),N=d.useRef(null);d.useEffect(()=>()=>{try{fe.terminate("App unmounted")}catch(E){console.warn("Error terminating bnglService on App unmount",E)}},[]);const X=d.useCallback(async()=>{o(null),_.current&&_.current.abort("Parse request replaced.");const E=new AbortController;_.current=E;try{const w=await fe.parse(t,{signal:E.signal,description:"Parse BNGL model"});a(w),y({type:"success",message:"Model parsed successfully!"})}catch(w){if(w instanceof DOMException&&w.name==="AbortError")return;a(null);const F=w instanceof Error?w.message:"An unknown error occurred.";y({type:"error",message:`Parsing failed: ${F}`})}finally{_.current===E&&(_.current=null)}},[t]),W=d.useCallback(async E=>{if(!r){y({type:"warning",message:"Please parse a model before simulating."});return}const F=(b=>{var H,oe,be;const ee=((H=b.reactions)==null?void 0:H.length)??0,S=((oe=b.species)==null?void 0:oe.length)??0,I=((be=b.moleculeTypes)==null?void 0:be.length)??0;return S*Math.pow(Math.max(1,ee),1.5)*Math.max(1,I)})(r);if(F>150&&!window.confirm(`⚠️ Large Model Detected

Complexity score: ${Math.round(F)}
• ${r.reactions.length} rules
• ${r.species.length} seed species
• ${r.moleculeTypes.length} molecule types

Network generation may take 30-60 seconds. Continue?`))return;N.current&&N.current.abort("Simulation replaced.");const ie=new AbortController;N.current=ie,h(!0);try{const b=await fe.simulate(r,E,{signal:ie.signal,description:`Simulation (${E.method})`});o(b),y({type:"success",message:`Simulation (${E.method}) completed.`})}catch(b){if(b instanceof DOMException&&b.name==="AbortError"){b.message.includes("cancelled by user")&&(y({type:"info",message:"Simulation cancelled."}),o(null));return}o(null);const ee=b instanceof Error?b.message:"An unknown error occurred.";y({type:"error",message:`Simulation failed: ${ee}`})}finally{N.current===ie&&(N.current=null),h(!1)}},[r]),O=d.useCallback(()=>{N.current&&(N.current.abort("Simulation cancelled by user."),N.current=null)},[]);d.useEffect(()=>{if(!n)return;const E=b=>{if(!b)return;const ee=b.message??`Generated ${b.speciesCount??0} species, ${b.reactionCount??0} reactions`;j(String(ee))},w=b=>{b&&j(`⚠️ ${String(b.message??"Warning during generation")}`)},F=fe.onProgress(E),ie=fe.onWarning(w);return()=>{F(),ie(),j("")}},[n]);const xe=E=>{s(E),a(null),o(null)},Me=()=>{y(null)};return e.jsxs("div",{className:"min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans",children:[e.jsx(ms,{onAboutClick:()=>C(!0)}),e.jsxs("main",{className:"container mx-auto p-4 sm:p-6 lg:p-8",children:[e.jsx("div",{className:"fixed top-20 right-8 z-50 w-full max-w-sm",children:u&&e.jsx(ps,{status:u,onClose:Me})}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6 h-full",children:[e.jsx("div",{className:"lg:h-[calc(100vh-120px)]",children:e.jsx(Ut,{code:t,onCodeChange:xe,onParse:X,onSimulate:W,onCancelSimulation:O,isSimulating:n,modelExists:!!r})}),e.jsx("div",{className:"lg:h-[calc(100vh-120px)] overflow-y-auto",children:e.jsx(os,{model:r,results:i,onSimulate:W,isSimulating:n,onCancelSimulation:O})})]}),e.jsx(gs,{isGenerating:n,progressMessage:x,onCancel:O})]}),e.jsx(bs,{isOpen:P,onClose:()=>C(!1)})]})}const Ct=document.getElementById("root");if(!Ct)throw new Error("Could not find root element to mount to");const vs=Et.createRoot(Ct);vs.render(e.jsx(fs,{}));
