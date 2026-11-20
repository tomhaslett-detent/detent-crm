const environments = {
  Dev: { origin: "https://crm-dev.mialab.co.uk", port: 3085, database: "Detent-CRM-Dev" },
  Live: { origin: "https://crm.mialab.co.uk", port: 3084, database: "Detent-CRM-Live" },
};

export function iisEnvironment(env = process.env) {
  const environment = env.CRM_ENVIRONMENT;
  if (!Object.hasOwn(environments, environment)) throw new Error("Select the CRM Dev or Live environment");
  if (environment === "Live" && env.CRM_LIVE_ENABLED !== "true") {
    throw new Error("Enable Live only after verifying Dev sign-in through IIS");
  }
  const expected = environments[environment];
  const port = Number(env.CRM_PORT ?? expected.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 ||
      Object.entries(environments).some(([key, value]) => key !== environment && value.port === port)) {
    throw new Error("Set a valid loopback port reserved for this CRM environment");
  }
  const origin = new URL(env.CRM_PUBLIC_ORIGIN ?? expected.origin);
  if (origin.origin !== expected.origin || origin.href !== expected.origin + "/") {
    throw new Error("The CRM HTTPS origin must match the selected environment");
  }
  return { environment, port, origin: origin.origin, database: expected.database };
}
