-- Runtime application privileges.
GRANT USAGE ON SCHEMA public TO app, worker;

REVOKE CREATE ON SCHEMA public FROM app, worker;

-- Regular application CRUD.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "User",
  "Organization",
  "Membership",
  "Project",
  "Environment",
  "FeatureFlag",
  "FlagEnvironmentConfig",
  "FlagRule",
  "RefreshToken"
TO app;

-- AuditLog is append-only for the application.
GRANT SELECT, INSERT ON TABLE "AuditLog" TO app;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "AuditLog" FROM app;

-- SdkKey: restricted column-level UPDATE.
GRANT SELECT, INSERT, DELETE ON TABLE "SdkKey" TO app;
REVOKE UPDATE ON TABLE "SdkKey" FROM app;
GRANT UPDATE ("revokedAt", "lastUsedAt")
  ON TABLE "SdkKey" TO app;

-- PublishedSnapshot: restricted column-level UPDATE.
GRANT SELECT, INSERT, DELETE ON TABLE "PublishedSnapshot" TO app;
REVOKE UPDATE ON TABLE "PublishedSnapshot" FROM app;
GRANT UPDATE ("status", "activatedAt", "failureCode")
  ON TABLE "PublishedSnapshot" TO app;

-- Worker is read-only.
GRANT SELECT ON TABLE
  "User",
  "Organization",
  "Membership",
  "Project",
  "Environment",
  "FeatureFlag",
  "FlagEnvironmentConfig",
  "FlagRule",
  "RefreshToken",
  "AuditLog",
  "SdkKey",
  "PublishedSnapshot"
TO worker;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE
  "User",
  "Organization",
  "Membership",
  "Project",
  "Environment",
  "FeatureFlag",
  "FlagEnvironmentConfig",
  "FlagRule",
  "RefreshToken",
  "AuditLog",
  "SdkKey",
  "PublishedSnapshot"
FROM worker;