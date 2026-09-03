import { createEntitySystemWorker } from '@daneren2005/shared-memory-ecs/worker';

import { createPatrolChaseUpdate } from '../patrol-chase';

const behavior = createPatrolChaseUpdate();
createEntitySystemWorker(self, behavior.update);
