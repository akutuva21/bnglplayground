import { Example } from './types';

import simpleDimerizationBNGL from './example-models/simple-dimerization.bngl?raw';
import egfrSignalingBNGL from './example-models/egfr-signaling-pathway.bngl?raw';
import michaelisMentenBNGL from './example-models/michaelis-menten-kinetics.bngl?raw';
import sirEpidemicBNGL from './example-models/sir-epidemic-model.bngl?raw';
import geneExpressionToggleBNGL from './example-models/gene-expression-toggle.bngl?raw';
import mapkCascadeBNGL from './example-models/mapk-signaling-cascade.bngl?raw';
import predatorPreyBNGL from './example-models/predator-prey-dynamics.bngl?raw';
import dualSitePhosphorylationBNGL from './example-models/dual-site-phosphorylation.bngl?raw';
import autoActivationBNGL from './example-models/auto-activation-loop.bngl?raw';
import negativeFeedbackBNGL from './example-models/negative-feedback-loop.bngl?raw';
import repressilatorBNGL from './example-models/repressilator-oscillator.bngl?raw';
import bistableToggleBNGL from './example-models/bistable-toggle-switch.bngl?raw';
import cooperativeBindingBNGL from './example-models/cooperative-binding.bngl?raw';
import competitiveEnzymeInhibitionBNGL from './example-models/competitive-enzyme-inhibition.bngl?raw';
import allostericActivationBNGL from './example-models/allosteric-activation.bngl?raw';
import signalAmplificationBNGL from './example-models/signal-amplification-cascade.bngl?raw';
import twoComponentBNGL from './example-models/two-component-system.bngl?raw';
import brusselatorBNGL from './example-models/brusselator-oscillator.bngl?raw';
import glycolysisBranchBNGL from './example-models/glycolysis-branch-point.bngl?raw';
import calciumSpikeBNGL from './example-models/calcium-spike-signaling.bngl?raw';
import apoptosisCascadeBNGL from './example-models/apoptosis-cascade.bngl?raw';
import notchDeltaBNGL from './example-models/notch-delta-lateral-inhibition.bngl?raw';
import quorumSensingBNGL from './example-models/quorum-sensing-circuit.bngl?raw';
import circadianBNGL from './example-models/circadian-oscillator.bngl?raw';
import wntBetaCateninBNGL from './example-models/wnt-beta-catenin-signaling.bngl?raw';
import tCellActivationBNGL from './example-models/t-cell-activation.bngl?raw';
import nfkbFeedbackBNGL from './example-models/nfkb-feedback.bngl?raw';
import phosphorelayBNGL from './example-models/phosphorelay-chain.bngl?raw';
import p53Mdm2BNGL from './example-models/p53-mdm2-oscillator.bngl?raw';
import stressResponseBNGL from './example-models/stress-response-adaptation.bngl?raw';
import lacOperonBNGL from './example-models/lac-operon-regulation.bngl?raw';
import insulinGlucoseBNGL from './example-models/insulin-glucose-homeostasis.bngl?raw';
import hypoxiaResponseBNGL from './example-models/hypoxia-response-signaling.bngl?raw';
import complementActivationBNGL from './example-models/complement-activation-cascade.bngl?raw';
import jakStatBNGL from './example-models/jak-stat-cytokine-signaling.bngl?raw';
import aktSignalingBNGL from './example-models/akt-signaling.bngl?raw';
import betaAdrenergicResponseBNGL from './example-models/beta-adrenergic-response.bngl?raw';
import bloodCoagulationThrombinBNGL from './example-models/blood-coagulation-thrombin.bngl?raw';
import cellCycleCheckpointBNGL from './example-models/cell-cycle-checkpoint.bngl?raw';
import chemotaxisSignalTransductionBNGL from './example-models/chemotaxis-signal-transduction.bngl?raw';
import dnaDamageRepairBNGL from './example-models/dna-damage-repair.bngl?raw';
import erStressResponseBNGL from './example-models/er-stress-response.bngl?raw';
import hematopoieticGrowthFactorBNGL from './example-models/hematopoietic-growth-factor.bngl?raw';
import immuneSynapseFormationBNGL from './example-models/immune-synapse-formation.bngl?raw';
import inflammasomeActivationBNGL from './example-models/inflammasome-activation.bngl?raw';
import interferonSignalingBNGL from './example-models/interferon-signaling.bngl?raw';
import lipidMediatedPIP3SignalingBNGL from './example-models/lipid-mediated-pip3-signaling.bngl?raw';
import mtorSignalingBNGL from './example-models/mtor-signaling.bngl?raw';
import myogenicDifferentiationBNGL from './example-models/myogenic-differentiation.bngl?raw';
import neurotransmitterReleaseBNGL from './example-models/neurotransmitter-release.bngl?raw';
import oxidativeStressResponseBNGL from './example-models/oxidative-stress-response.bngl?raw';
import plateletActivationBNGL from './example-models/platelet-activation.bngl?raw';
import rabGTPaseCycleBNGL from './example-models/rab-gtpase-cycle.bngl?raw';
import retinoicAcidSignalingBNGL from './example-models/retinoic-acid-signaling.bngl?raw';
import smadTGFBetaSignalingBNGL from './example-models/smad-tgf-beta-signaling.bngl?raw';
import synapticPlasticityLtpBNGL from './example-models/synaptic-plasticity-ltp.bngl?raw';
import tnfInducedApoptosisBNGL from './example-models/tnf-induced-apoptosis.bngl?raw';
import vegfAngiogenesisBNGL from './example-models/vegf-angiogenesis.bngl?raw';
import viralSensingInnateImmunityBNGL from './example-models/viral-sensing-innate-immunity.bngl?raw';
import woundHealingPDGFBNGL from './example-models/wound-healing-pdgf-signaling.bngl?raw';

export const CHART_COLORS = [
  '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
  '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'
];
export const INITIAL_BNGL_CODE = simpleDimerizationBNGL;

const CURATED_EXAMPLES: Example[] = [
  {
    id: 'dimerization',
    name: 'Simple Dimerization',
    description: 'A basic model where two molecules A and B bind to form a complex AB.',
    code: simpleDimerizationBNGL,
    tags: ['basic', 'binding'],
  },
  {
    id: 'egfr_signaling',
    name: 'EGFR Signaling Pathway',
    description: 'A simplified model of the Epidermal Growth Factor Receptor (EGFR) signaling cascade.',
    code: egfrSignalingBNGL,
    tags: ['signaling', 'phosphorylation'],
  },
  {
    id: 'michaelis-menten',
    name: 'Michaelis-Menten Kinetics',
    description: 'The classic model of enzyme kinetics.',
    code: michaelisMentenBNGL,
    tags: ['enzyme kinetics', 'classic'],
  },
  {
    id: 'sir-epidemic',
    name: 'SIR Epidemic Model',
    description: 'Compartment model for disease spread with waning immunity.',
    code: sirEpidemicBNGL,
    tags: ['epidemiology', 'population'],
  },
  {
    id: 'gene-expression',
    name: 'Gene Expression Toggle',
    description: 'Minimal transcription-translation model with promoter switching.',
    code: geneExpressionToggleBNGL,
    tags: ['gene regulation', 'expression'],
  },
  {
    id: 'mapk-cascade',
    name: 'MAPK Signaling Cascade',
    description: 'Three-tier kinase cascade with sequential activation.',
    code: mapkCascadeBNGL,
    tags: ['signaling', 'cascade'],
  },
  {
    id: 'predator-prey',
    name: 'Predator-Prey Dynamics',
    description: 'Lotka-Volterra style interaction with birth and death processes.',
    code: predatorPreyBNGL,
    tags: ['population', 'ecology'],
  },
  {
    id: 'dual-phosphorylation',
    name: 'Dual-Site Phosphorylation',
    description: 'Sequential kinase and phosphatase control of a two-site substrate.',
    code: dualSitePhosphorylationBNGL,
    tags: ['phosphorylation', 'switch'],
  },
  {
    id: 'auto-activation-loop',
    name: 'Auto-Activation Loop',
    description: 'Single gene that positively regulates its own expression.',
    code: autoActivationBNGL,
    tags: ['gene regulation', 'feedback'],
  },
  {
    id: 'negative-feedback-loop',
    name: 'Negative Feedback Loop',
    description: 'Gene expression damped by its protein product.',
    code: negativeFeedbackBNGL,
    tags: ['gene regulation', 'feedback'],
  },
  {
    id: 'repressilator',
    name: 'Repressilator Oscillator',
    description: 'Three-gene synthetic oscillator with cyclic repression.',
    code: repressilatorBNGL,
    tags: ['oscillator', 'synthetic biology'],
  },
  {
    id: 'bistable-toggle-switch',
    name: 'Bistable Toggle Switch',
    description: 'Mutual repression between two genes yielding bistability.',
    code: bistableToggleBNGL,
    tags: ['bistable', 'synthetic biology'],
  },
  {
    id: 'cooperative-binding',
    name: 'Cooperative Binding',
    description: 'Ligand binding with cooperativity across two sites.',
    code: cooperativeBindingBNGL,
    tags: ['binding', 'cooperativity'],
  },
  {
    id: 'enzyme-inhibition',
    name: 'Competitive Enzyme Inhibition',
    description: 'Substrate competes with inhibitor for the active site.',
    code: competitiveEnzymeInhibitionBNGL,
    tags: ['enzyme kinetics', 'inhibition'],
  },
  {
    id: 'enzyme-activation',
    name: 'Allosteric Activation',
    description: 'Activator binding enhances catalytic turnover.',
    code: allostericActivationBNGL,
    tags: ['enzyme kinetics', 'activation'],
  },
  {
    id: 'signal-amplification',
    name: 'Signal Amplification Cascade',
    description: 'Ligand binding triggers second messenger production.',
    code: signalAmplificationBNGL,
    tags: ['signaling', 'amplification'],
  },
  {
    id: 'two-component-system',
    name: 'Two-Component System',
    description: 'Histidine kinase phosphorylates a response regulator.',
    code: twoComponentBNGL,
    tags: ['signaling', 'phosphorelay'],
  },
  {
    id: 'brusselator',
    name: 'Brusselator Oscillator',
    description: 'Classical chemical oscillator with autocatalysis.',
    code: brusselatorBNGL,
    tags: ['oscillator', 'chemical'],
  },
  {
    id: 'glycolysis-branch',
    name: 'Glycolysis Branch Point',
    description: 'Competition between ATP production and biomass channel.',
    code: glycolysisBranchBNGL,
    tags: ['metabolism', 'pathway'],
  },
  {
    id: 'calcium-spike',
    name: 'Calcium Spike Signaling',
    description: 'Calcium influx with pump-mediated clearance.',
    code: calciumSpikeBNGL,
    tags: ['signaling', 'calcium'],
  },
  {
    id: 'apoptosis-cascade',
    name: 'Apoptosis Cascade',
    description: 'Caspase activation with feedback amplification.',
    code: apoptosisCascadeBNGL,
    tags: ['cell death', 'caspase'],
  },
  {
    id: 'notch-delta',
    name: 'Notch-Delta Lateral Inhibition',
    description: 'Reciprocal signaling between neighboring cells.',
    code: notchDeltaBNGL,
    tags: ['development', 'signaling'],
  },
  {
    id: 'quorum-sensing',
    name: 'Quorum Sensing Circuit',
    description: 'Autoinducer-mediated activation of gene expression.',
    code: quorumSensingBNGL,
    tags: ['bacteria', 'signaling'],
  },
  {
    id: 'circadian-oscillator',
    name: 'Circadian Oscillator',
    description: 'Delayed negative feedback model for circadian rhythms.',
    code: circadianBNGL,
    tags: ['circadian', 'oscillator'],
  },
  {
    id: 'wnt-beta-catenin',
    name: 'Wnt/Beta-Catenin Signaling',
    description: 'Simplified model of beta-catenin stabilization after Wnt activation.',
    code: wntBetaCateninBNGL,
    tags: ['signaling', 'transcription'],
  },
  {
    id: 'tcell-activation',
    name: 'T Cell Activation',
    description: 'T cell receptor engagement leading to cytokine production.',
    code: tCellActivationBNGL,
    tags: ['immune', 'signaling'],
  },
  {
    id: 'nfkb-feedback',
    name: 'NF-kB Feedback',
    description: 'NF-κB activation with inhibitor-induced negative feedback.',
    code: nfkbFeedbackBNGL,
    tags: ['immune', 'feedback'],
  },
  {
    id: 'phosphorelay-chain',
    name: 'Phosphorelay Chain',
    description: 'Multi-step phosphorylation relay transmitting a signal.',
    code: phosphorelayBNGL,
    tags: ['signaling', 'phosphorelay'],
  },
  {
    id: 'p53-mdm2',
    name: 'p53-MDM2 Oscillator',
    description: 'Stress-induced p53 activation with MDM2-mediated degradation.',
    code: p53Mdm2BNGL,
    tags: ['stress', 'feedback'],
  },
  {
    id: 'stress-response',
    name: 'Stress Response Adaptation',
    description: 'Fast stress sensor inducing slow adaptive enzyme production.',
    code: stressResponseBNGL,
    tags: ['stress', 'adaptation'],
  },
  {
    id: 'lac-operon',
    name: 'Lac Operon Regulation',
    description: 'Bacterial lactose utilization with inducible promoter control.',
    code: lacOperonBNGL,
    tags: ['metabolism', 'gene regulation'],
  },
  {
    id: 'insulin-glucose',
    name: 'Insulin-Glucose Homeostasis',
    description: 'Pancreatic sensing of blood glucose with insulin-mediated uptake.',
    code: insulinGlucoseBNGL,
    tags: ['metabolism', 'endocrine'],
  },
  {
    id: 'hypoxia-response',
    name: 'Hypoxia Response Signaling',
    description: 'HIF-1 stabilization under low oxygen leading to VEGF production.',
    code: hypoxiaResponseBNGL,
    tags: ['signaling', 'angiogenesis'],
  },
  {
    id: 'complement-activation',
    name: 'Complement Activation Cascade',
    description: 'Innate immune cascade producing membrane attack complexes.',
    code: complementActivationBNGL,
    tags: ['immune', 'cascade'],
  },
  {
    id: 'jak-stat',
    name: 'JAK-STAT Cytokine Signaling',
    description: 'Cytokine-driven receptor activation and STAT nuclear cycling.',
    code: jakStatBNGL,
    tags: ['immune', 'signaling'],
  },
  {
    id: 'akt-signaling',
    name: 'AKT Signaling',
    description: 'Growth factor activation of PI3K leading to AKT phosphorylation.',
    code: aktSignalingBNGL,
    tags: ['signaling', 'pi3k', 'growth factor'],
  },
  {
    id: 'beta-adrenergic-response',
    name: 'Beta-Adrenergic Response',
    description: 'GPCR-driven cAMP burst through beta-adrenergic receptor stimulation.',
    code: betaAdrenergicResponseBNGL,
    tags: ['signaling', 'gpcr', 'camp'],
  },
  {
    id: 'blood-coagulation-thrombin',
    name: 'Blood Coagulation Thrombin Burst',
    description: 'Factor Xa mediated thrombin generation and fibrin formation.',
    code: bloodCoagulationThrombinBNGL,
    tags: ['hemostasis', 'cascade', 'enzyme kinetics'],
  },
  {
    id: 'cell-cycle-checkpoint',
    name: 'Cell-Cycle Checkpoint Control',
    description: 'Cyclin-CDK regulation of checkpoint activation and reset.',
    code: cellCycleCheckpointBNGL,
    tags: ['cell cycle', 'checkpoint', 'regulation'],
  },
  {
    id: 'chemotaxis-signal-transduction',
    name: 'Chemotaxis Signal Transduction',
    description: 'Bacterial receptor adaptation relaying attractant signals to CheY.',
    code: chemotaxisSignalTransductionBNGL,
    tags: ['bacterial', 'chemotaxis', 'signaling'],
  },
  {
    id: 'dna-damage-repair',
    name: 'DNA Damage Repair',
    description: 'ATM sensing of double-strand breaks coordinating repair complex recruitment.',
    code: dnaDamageRepairBNGL,
    tags: ['dna repair', 'stress', 'checkpoint'],
  },
  {
    id: 'er-stress-response',
    name: 'ER Stress Response',
    description: 'Unfolded protein load activates PERK and chaperone production.',
    code: erStressResponseBNGL,
    tags: ['stress', 'unfolded protein response', 'signaling'],
  },
  {
    id: 'hematopoietic-growth-factor',
    name: 'Hematopoietic Growth Factor Signaling',
    description: 'EPO receptor activation driving STAT5 nuclear translocation.',
    code: hematopoieticGrowthFactorBNGL,
    tags: ['hematopoiesis', 'signaling', 'jak-stat'],
  },
  {
    id: 'immune-synapse-formation',
    name: 'Immune Synapse Formation',
    description: 'TCR engagement recruits Lck and phosphorylates ZAP-70.',
    code: immuneSynapseFormationBNGL,
    tags: ['immune', 'synapse', 'signaling'],
  },
  {
    id: 'inflammasome-activation',
    name: 'Inflammasome Activation',
    description: 'Sensor priming assembles ASC inflammasomes to mature IL-1beta.',
    code: inflammasomeActivationBNGL,
    tags: ['immune', 'inflammasome', 'inflammation'],
  },
  {
    id: 'interferon-signaling',
    name: 'Interferon Antiviral Signaling',
    description: 'Type I interferon receptor triggers TYK2-STAT1 transcription.',
    code: interferonSignalingBNGL,
    tags: ['immune', 'jak-stat', 'signaling'],
  },
  {
    id: 'lipid-mediated-pip3',
    name: 'Lipid-Mediated PIP3 Signaling',
    description: 'PI3K-PIP3 axis recruits PDK1 with PTEN antagonism.',
    code: lipidMediatedPIP3SignalingBNGL,
    tags: ['lipid', 'signaling', 'pi3k'],
  },
  {
    id: 'mtor-signaling',
    name: 'mTOR Nutrient Signaling',
    description: 'Rheb GTP loading activates mTORC1 and S6 kinase.',
    code: mtorSignalingBNGL,
    tags: ['metabolism', 'mtor', 'signaling'],
  },
  {
    id: 'myogenic-differentiation',
    name: 'Myogenic Differentiation',
    description: 'MYOD/MYOG feedback establishes muscle transcriptional programs.',
    code: myogenicDifferentiationBNGL,
    tags: ['development', 'gene regulation', 'muscle'],
  },
  {
    id: 'neurotransmitter-release',
    name: 'Neurotransmitter Release',
    description: 'Calcium-triggered SNARE fusion drives vesicle exocytosis.',
    code: neurotransmitterReleaseBNGL,
    tags: ['neuroscience', 'synapse', 'calcium'],
  },
  {
    id: 'oxidative-stress-response',
    name: 'Oxidative Stress Response',
    description: 'ROS release NRF2 from KEAP1 to induce antioxidant genes.',
    code: oxidativeStressResponseBNGL,
    tags: ['stress', 'antioxidant', 'transcription'],
  },
  {
    id: 'platelet-activation',
    name: 'Platelet Activation',
    description: 'ADP-P2Y12 signaling opens integrins and amplifies thromboxane.',
    code: plateletActivationBNGL,
    tags: ['hemostasis', 'platelet', 'signaling'],
  },
  {
    id: 'rab-gtpase-cycle',
    name: 'Rab GTPase Trafficking Cycle',
    description: 'GEF/GAP control RAB switching and effector engagement.',
    code: rabGTPaseCycleBNGL,
    tags: ['trafficking', 'gtpase', 'membrane'],
  },
  {
    id: 'retinoic-acid-signaling',
    name: 'Retinoic Acid Signaling',
    description: 'RA-bound RAR/RXR displaces corepressors to activate transcription.',
    code: retinoicAcidSignalingBNGL,
    tags: ['development', 'nuclear receptor', 'signaling'],
  },
  {
    id: 'smad-tgf-beta-signaling',
    name: 'SMAD TGF-beta Signaling',
    description: 'Active TGF-beta receptors phosphorylate SMAD2 to form nuclear complexes.',
    code: smadTGFBetaSignalingBNGL,
    tags: ['tgf-beta', 'signaling', 'transcription'],
  },
  {
    id: 'synaptic-plasticity-ltp',
    name: 'Synaptic Plasticity LTP',
    description: 'NMDA-driven CaMKII activation retains AMPA receptors at synapses.',
    code: synapticPlasticityLtpBNGL,
    tags: ['neuroscience', 'plasticity', 'signaling'],
  },
  {
    id: 'tnf-induced-apoptosis',
    name: 'TNF-Induced Apoptosis',
    description: 'Death receptor ligation activates caspase-8 and executioner caspases.',
    code: tnfInducedApoptosisBNGL,
    tags: ['apoptosis', 'immune', 'death receptor'],
  },
  {
    id: 'vegf-angiogenesis',
    name: 'VEGF Angiogenesis Signaling',
    description: 'VEGF stimulates VEGFR-ERK to mobilize endothelial migration.',
    code: vegfAngiogenesisBNGL,
    tags: ['angiogenesis', 'signaling', 'growth factor'],
  },
  {
    id: 'viral-sensing-innate-immunity',
    name: 'Viral Sensing Innate Immunity',
    description: 'RIG-I detection of viral RNA activates MAVS and IFN-beta output.',
    code: viralSensingInnateImmunityBNGL,
    tags: ['immune', 'antiviral', 'signal transduction'],
  },
  {
    id: 'wound-healing-pdgf-signaling',
    name: 'Wound Healing PDGF Signaling',
    description: 'PDGF receptor signaling mobilizes STAT3 and fibroblast motility.',
    code: woundHealingPDGFBNGL,
    tags: ['wound healing', 'signaling', 'growth factor'],
  },
];

export const EXAMPLES: Example[] = CURATED_EXAMPLES;