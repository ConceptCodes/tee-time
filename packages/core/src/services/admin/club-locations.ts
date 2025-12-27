import type { Database } from "@syndicate/database";
import {
  createClubLocationRepository,
  createClubRepository
} from "@syndicate/database";
import { logger } from "../../logger";

export const listClubs = async (db: Database, params?: { activeOnly?: boolean }) => {
  const repo = createClubRepository(db);
  const result = params?.activeOnly ? await repo.listActive() : await repo.listAll();
  logger.info("core.admin.clubs.list", {
    count: result.length,
    activeOnly: Boolean(params?.activeOnly)
  });
  return result;
};

export const listClubLocations = async (db: Database, clubId: string) => {
  const repo = createClubLocationRepository(db);
  const result = await repo.listByClubId(clubId);
  logger.info("core.admin.clubLocations.list", {
    clubId,
    count: result.length
  });
  return result;
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
