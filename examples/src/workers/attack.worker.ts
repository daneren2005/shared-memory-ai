import { createEntitySystemWorker } from '@daneren2005/shared-memory-ecs/worker';

import { createAttackUpdate } from '../../../src/__tests__/examples/attack';

const behavior = createAttackUpdate({ damage: 10, strikeCooldown: 500, strikeRange: 90, retreatRange: 45 });
createEntitySystemWorker(self, behavior.update);
