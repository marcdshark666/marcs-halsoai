// Demoanvändaren för den lokala körningen. All klinisk data ligger i
// src/api/realdata/*.json och seedas till localStorage av base44Client.js.

import { PATIENT } from "@/data/content";

export const seedUser = {
  id: "local-user-1",
  full_name: PATIENT.full_name,
  email: PATIENT.email,
  role: "admin",
};
