-- Seed the two app roles used by authentication.
INSERT INTO "roles" ("id", "displayName", "name")
VALUES
  (uuidv7(), 'USER', 'user'),
  (uuidv7(), 'ADMIN', 'admin')
ON CONFLICT ("name") DO NOTHING;

-- Existing users become normal users; new registrations connect to admin/user.
ALTER TABLE "users" ADD COLUMN "roleId" UUID;

UPDATE "users"
SET "roleId" = (
  SELECT "id"
  FROM "roles"
  WHERE "name" = 'user'
)
WHERE "roleId" IS NULL;

ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;

ALTER TABLE "users"
ADD CONSTRAINT "users_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "roles"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
