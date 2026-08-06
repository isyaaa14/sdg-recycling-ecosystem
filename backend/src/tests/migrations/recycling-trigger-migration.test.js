import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(
  __dirname,
  "../../../prisma/migrations/20260806153000_fix_recycling_approval_trigger_points/migration.sql"
);

describe("recycling approval trigger migration", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("calculates missing approval points from PointRate before inserting a PointsEvent", () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION "prepare_recycling_approval_points"');
    expect(sql).toContain('FROM "PointRate"');
    expect(sql).toContain('raw_points := FLOOR(NEW.quantity * rate_per_kg)::integer');
    expect(sql).toContain('NEW."pointsAwarded" := LEAST(raw_points, remaining_points)');
  });

  it("repairs existing zero-point approved recycling rows and matching events", () => {
    expect(sql).toContain('UPDATE "RecyclingSubmission" rs');
    expect(sql).toContain('UPDATE "PointsEvent" pe');
    expect(sql).toContain('AND pe.points = 0');
  });
});
