export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
export const SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000";
export const SYSTEM_ROLE = "admin";

export const getSystemContext = () => ({
  userId: SYSTEM_USER_ID,
  organizationId: SYSTEM_ORG_ID,
  role: SYSTEM_ROLE,
});
