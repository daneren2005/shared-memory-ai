import { createComponentWorker } from '@daneren2005/shared-memory-ecs/worker';

import { createScalarTraderUpdate } from '../../../src/__tests__/examples/scalar-trader';

const behavior = createScalarTraderUpdate(1, 5);
createComponentWorker(self, behavior.update);
