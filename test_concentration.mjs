import { parseBNGL } from './services/bnglService';

const testModel = `
begin model
begin parameters
  A_bind_B 0.1
  AB_unbind 0.2
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
  A_free A(b)
  B_free B(a)
  AB A(b!1).B(a!1)
end observables

begin reaction rules
  A(b) + B(a) -> A(b!1).B(a!1) A_bind_B
  A(b!1).B(a!1) -> A(b) + B(a) AB_unbind
end reaction rules

end model
`;

async function testConcentrationPreservation() {
  console.log('Testing concentration preservation...');

  try {
    const model = parseBNGL(testModel);
    console.log('Parsed model species:', model.species.map(s => `${s.name}: ${s.initialConcentration}`));

    // Simulate using the worker
    const worker = new Worker('./services/bnglWorker.ts', { type: 'module' });

    worker.postMessage({
      id: 1,
      type: 'simulate',
      payload: {
        model,
        options: {
          method: 'ode',
          t_end: 10,
          n_steps: 100
        }
      }
    });

    worker.onmessage = (event) => {
      const { id, type, payload } = event.data;
      if (type === 'simulate_success') {
        console.log('Simulation successful!');
        console.log('First few data points:');
        payload.data.slice(0, 5).forEach(point => {
          console.log(`Time ${point.time}: A_free=${point.A_free}, B_free=${point.B_free}, AB=${point.AB}`);
        });
      } else if (type === 'simulate_error') {
        console.error('Simulation failed:', payload);
      }
    };

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConcentrationPreservation();