import type { Database } from "@syndicate/database";
import {
  createClubLocationRepository,
  createClubRepository
} from "@syndicate/database";
import { logger } from "../../logger";

export const listClubs = async (
  db: Database,
  params?: { activeOnly?: boolean; limit?: number; offset?: number }
) => {
  const repo = createClubRepository(db);
  const [result, total] = await Promise.all([
    params?.activeOnly ? repo.listActive(params) : repo.listAll(params),
    params?.activeOnly ? repo.countActive() : repo.countAll()
  ]);
  logger.info("core.admin.clubs.list", {
    count: result.length,
    activeOnly: Boolean(params?.activeOnly)
  });
  return { data: result, total };
};

export const listClubLocations = async (
  db: Database,
  clubId: string,
  params?: { limit?: number; offset?: number }
) => {
  const repo = createClubLocationRepository(db);
  const [result, total] = await Promise.all([
    repo.listByClubId(clubId, params),
    repo.countByClubId(clubId)
  ]);
  logger.info("core.admin.clubLocations.list", {
    clubId,
    count: result.length
  });
  return { data: result, total };
};

export const createClubLocation = async (
  db: Database,
  data: Parameters<ReturnType<typeof createClubLocationRepository>["create"]>[0]
) => {
  const repo = createClubLocationRepository(db);
  const result = await repo.create(data);
  logger.info("core.admin.clubLocations.create", { clubLocationId: result.id });
  return result;
};

export const updateClubLocation = async (
  db: Database,
  id: string,
  data: Parameters<ReturnType<typeof createClubLocationRepository>["update"]>[1]
) => {
  const repo = createClubLocationRepository(db);
  const result = await repo.update(id, data);
  logger.info("core.admin.clubLocations.update", { clubLocationId: id });
  return result;
};

export const deleteClubLocation = async (db: Database, id: string) => {
  const repo = createClubLocationRepository(db);
  const result = await repo.delete(id);
  logger.info("core.admin.clubLocations.delete", { clubLocationId: id });
  return result;
};
