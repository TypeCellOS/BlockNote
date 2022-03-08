const PORT = 3000;
export const BASE_URL = process.env.RUN_IN_DOCKER
  ? `http://localhost:${PORT}`
  : `http://host.docker.internal:${PORT}`;
