import { createEntitySystemWorker } from '@daneren2005/shared-memory-ecs/worker';

import { movementUpdate } from '../movement-update';

createEntitySystemWorker(self, movementUpdate);
