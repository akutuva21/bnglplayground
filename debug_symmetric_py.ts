/**
 * Test symmetric dimers with identical modifications
 */
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical';

// Both egfrs have Y1068~pY
const perm1 = 'egf(r!1).egf(r!2).egfr(Y1068~pY,Y1148~Y,l!1,r!3).egfr(Y1068~pY,Y1148~Y,l!2,r!3)';
const perm2 = 'egf(r!2).egf(r!1).egfr(Y1068~pY,Y1148~Y,l!2,r!3).egfr(Y1068~pY,Y1148~Y,l!1,r!3)';
// Another permutation - swap which egf binds which egfr
const perm3 = 'egf(r!1).egf(r!2).egfr(Y1068~pY,Y1148~Y,l!2,r!3).egfr(Y1068~pY,Y1148~Y,l!1,r!3)';

const g1 = BNGLParser.parseSpeciesGraph(perm1);
const g2 = BNGLParser.parseSpeciesGraph(perm2);
const g3 = BNGLParser.parseSpeciesGraph(perm3);

const c1 = GraphCanonicalizer.canonicalize(g1);
const c2 = GraphCanonicalizer.canonicalize(g2);
const c3 = GraphCanonicalizer.canonicalize(g3);

console.log('Perm 1:', perm1);
console.log('Canon:', c1);
console.log();
console.log('Perm 2:', perm2);
console.log('Canon:', c2);
console.log();
console.log('Perm 3:', perm3);
console.log('Canon:', c3);
console.log();
console.log('All equal:', c1 === c2 && c2 === c3);

// BNG2's species 13 from Blinov_2006.net
console.log('\n=== BNG2 reference ===');
const bng2_species13 = 'egf(r!1).egf(r!2).egfr(Y1068~pY,Y1148~Y,l!2,r!3).egfr(Y1068~pY,Y1148~Y,l!1,r!3)';
const g13 = BNGLParser.parseSpeciesGraph(bng2_species13);
const c13 = GraphCanonicalizer.canonicalize(g13);
console.log('BNG2:', bng2_species13);
console.log('Canon:', c13);
console.log('Same as perm1:', c1 === c13);
