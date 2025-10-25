import { Example } from './types';

export const CHART_COLORS = [
  '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
  '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'
];

export const INITIAL_BNGL_CODE = `
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
`;

export const EXAMPLES: Example[] = [
  {
    id: 'dimerization',
    name: 'Simple Dimerization',
    description: 'A basic model where two molecules A and B bind to form a complex AB.',
    code: INITIAL_BNGL_CODE,
    tags: ['basic', 'binding'],
  },
  {
    id: 'egfr_signaling',
    name: 'EGFR Signaling Pathway',
    description: 'A simplified model of the Epidermal Growth Factor Receptor (EGFR) signaling cascade.',
    code: `
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
    `,
    tags: ['signaling', 'phosphorylation'],
  },
  {
    id: 'michaelis-menten',
    name: 'Michaelis-Menten Kinetics',
    description: 'The classic model of enzyme kinetics.',
    code: `
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
    `,
    tags: ['enzyme kinetics', 'classic'],
  },
  {
    id: 'sir-epidemic',
    name: 'SIR Epidemic Model',
    description: 'Compartment model for disease spread with waning immunity.',
    code: `
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
    `,
    tags: ['epidemiology', 'population'],
  },
  {
    id: 'gene-expression',
    name: 'Gene Expression Toggle',
    description: 'Minimal transcription-translation model with promoter switching.',
    code: `
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
    `,
    tags: ['gene regulation', 'expression'],
  },
  {
    id: 'mapk-cascade',
    name: 'MAPK Signaling Cascade',
    description: 'Three-tier kinase cascade with sequential activation.',
    code: `
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
    `,
    tags: ['signaling', 'cascade'],
  },
  {
    id: 'predator-prey',
    name: 'Predator-Prey Dynamics',
    description: 'Lotka-Volterra style interaction with birth and death processes.',
    code: `
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
    `,
    tags: ['population', 'ecology'],
  },
  {
    id: 'dual-phosphorylation',
    name: 'Dual-Site Phosphorylation',
    description: 'Sequential kinase and phosphatase control of a two-site substrate.',
    code: `
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
    `,
    tags: ['phosphorylation', 'switch'],
  },
  {
    id: 'auto-activation-loop',
    name: 'Auto-Activation Loop',
    description: 'Single gene that positively regulates its own expression.',
    code: `
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
    `,
    tags: ['gene regulation', 'feedback'],
  },
  {
    id: 'negative-feedback-loop',
    name: 'Negative Feedback Loop',
    description: 'Gene expression damped by its protein product.',
    code: `
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
    `,
    tags: ['gene regulation', 'feedback'],
  },
  {
    id: 'repressilator',
    name: 'Repressilator Oscillator',
    description: 'Three-gene synthetic oscillator with cyclic repression.',
    code: `
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
    `,
    tags: ['oscillator', 'synthetic biology'],
  },
  {
    id: 'bistable-toggle-switch',
    name: 'Bistable Toggle Switch',
    description: 'Mutual repression between two genes yielding bistability.',
    code: `
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
    `,
    tags: ['bistable', 'synthetic biology'],
  },
  {
    id: 'cooperative-binding',
    name: 'Cooperative Binding',
    description: 'Ligand binding with cooperativity across two sites.',
    code: `
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
    `,
    tags: ['binding', 'cooperativity'],
  },
  {
    id: 'enzyme-inhibition',
    name: 'Competitive Enzyme Inhibition',
    description: 'Substrate competes with inhibitor for the active site.',
    code: `
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
    `,
    tags: ['enzyme kinetics', 'inhibition'],
  },
  {
    id: 'enzyme-activation',
    name: 'Allosteric Activation',
    description: 'Activator binding enhances catalytic turnover.',
    code: `
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
    `,
    tags: ['enzyme kinetics', 'activation'],
  },
  {
    id: 'signal-amplification',
    name: 'Signal Amplification Cascade',
    description: 'Ligand binding triggers second messenger production.',
    code: `
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
    `,
    tags: ['signaling', 'amplification'],
  },
  {
    id: 'two-component-system',
    name: 'Two-Component System',
    description: 'Histidine kinase phosphorylates a response regulator.',
    code: `
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
    `,
    tags: ['signaling', 'phosphorelay'],
  },
  {
    id: 'brusselator',
    name: 'Brusselator Oscillator',
    description: 'Classical chemical oscillator with autocatalysis.',
    code: `
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
    `,
    tags: ['oscillator', 'chemical'],
  },
  {
    id: 'glycolysis-branch',
    name: 'Glycolysis Branch Point',
    description: 'Competition between ATP production and biomass channel.',
    code: `
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
    `,
    tags: ['metabolism', 'pathway'],
  },
  {
    id: 'calcium-spike',
    name: 'Calcium Spike Signaling',
    description: 'Calcium influx with pump-mediated clearance.',
    code: `
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
    `,
    tags: ['signaling', 'calcium'],
  },
  {
    id: 'apoptosis-cascade',
    name: 'Apoptosis Cascade',
    description: 'Caspase activation with feedback amplification.',
    code: `
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
    `,
    tags: ['cell death', 'caspase'],
  },
  {
    id: 'notch-delta',
    name: 'Notch-Delta Lateral Inhibition',
    description: 'Reciprocal signaling between neighboring cells.',
    code: `
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
    `,
    tags: ['development', 'signaling'],
  },
  {
    id: 'quorum-sensing',
    name: 'Quorum Sensing Circuit',
    description: 'Autoinducer-mediated activation of gene expression.',
    code: `
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
    `,
    tags: ['bacteria', 'signaling'],
  },
  {
    id: 'circadian-oscillator',
    name: 'Circadian Oscillator',
    description: 'Delayed negative feedback model for circadian rhythms.',
    code: `
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
    `,
    tags: ['circadian', 'oscillator'],
  },
  {
    id: 'wnt-beta-catenin',
    name: 'Wnt/Beta-Catenin Signaling',
    description: 'Simplified model of beta-catenin stabilization after Wnt activation.',
    code: `
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
    `,
    tags: ['signaling', 'transcription'],
  },
  {
    id: 'tcell-activation',
    name: 'T Cell Activation',
    description: 'T cell receptor engagement leading to cytokine production.',
    code: `
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
    `,
    tags: ['immune', 'signaling'],
  },
  {
    id: 'nfkb-feedback',
    name: 'NF-kB Feedback',
    description: 'NF-κB activation with inhibitor-induced negative feedback.',
    code: `
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
    `,
    tags: ['immune', 'feedback'],
  },
  {
    id: 'phosphorelay-chain',
    name: 'Phosphorelay Chain',
    description: 'Multi-step phosphorylation relay transmitting a signal.',
    code: `
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
    `,
    tags: ['signaling', 'phosphorelay'],
  },
  {
    id: 'p53-mdm2',
    name: 'p53-MDM2 Oscillator',
    description: 'Stress-induced p53 activation with MDM2-mediated degradation.',
    code: `
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
    `,
    tags: ['stress', 'feedback'],
  },
  {
    id: 'stress-response',
    name: 'Stress Response Adaptation',
    description: 'Fast stress sensor inducing slow adaptive enzyme production.',
    code: `
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
    `,
    tags: ['stress', 'adaptation'],
  }
];