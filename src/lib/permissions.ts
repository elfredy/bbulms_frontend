import type { UserProfile } from "./api";

export const PERMS = {
  ROLES_MANAGE: "roles.manage",
  PLANNING: "planning.manage",
  ORG_STUDENTS: "org.students",
  ORG_ORDERS: "org.orders",
  ORG_STAFF: "org.staff",
  ORG_GROUPS: "org.groups",
  ORG_DEPARTMENTS: "org.departments",
  EDU_CATALOG: "edu.catalog",
  EDU_PLANS: "edu.plans",
  EDU_TIMETABLE: "edu.timetable",
  EDU_JOURNAL: "edu.journal",
  EDU_EXAM: "edu.exam",
  EDU_TRANSCRIPT: "edu.transcript",
} as const;

export type PermCode = (typeof PERMS)[keyof typeof PERMS];

/** Path prefix (after /dashboard/admin/) → required permission */
export const ADMIN_ROUTE_PERMS: { match: RegExp | string; perm: PermCode }[] = [
  { match: /^edu-years/, perm: PERMS.PLANNING },
  { match: /^academic-calendar/, perm: PERMS.PLANNING },
  { match: /^evaluation/, perm: PERMS.PLANNING },
  { match: /^subject-blocks/, perm: PERMS.PLANNING },
  { match: /^orders/, perm: PERMS.ORG_ORDERS },
  { match: /^students/, perm: PERMS.ORG_STUDENTS },
  { match: /^teachers/, perm: PERMS.ORG_STAFF },
  { match: /^user-roles/, perm: PERMS.ROLES_MANAGE },
  { match: /^groups/, perm: PERMS.ORG_GROUPS },
  { match: /^departments/, perm: PERMS.ORG_DEPARTMENTS },
  { match: /^subject-catalog/, perm: PERMS.EDU_CATALOG },
  { match: /^education-plans/, perm: PERMS.EDU_PLANS },
  { match: /^subject-groups/, perm: PERMS.EDU_PLANS },
  { match: /^courses/, perm: PERMS.EDU_TIMETABLE },
  { match: /^journal/, perm: PERMS.EDU_JOURNAL },
  { match: /^exams/, perm: PERMS.EDU_EXAM },
  { match: /^student-transcript/, perm: PERMS.EDU_TRANSCRIPT },
];

export function hasPerm(me: Pick<UserProfile, "permissions" | "is_superadmin"> | null | undefined, ...needed: string[]): boolean {
  if (!me) return false;
  if (me.is_superadmin) return true;
  const have = new Set(me.permissions ?? []);
  if (!needed.length) return have.size > 0;
  return needed.some((p) => have.has(p));
}

export function canAccessAdmin(me: Pick<UserProfile, "permissions" | "is_superadmin" | "can_access_admin"> | null | undefined): boolean {
  if (!me) return false;
  if (me.can_access_admin || me.is_superadmin) return true;
  return (me.permissions?.length ?? 0) > 0;
}

export function canAccessAdminPath(
  me: Pick<UserProfile, "permissions" | "is_superadmin" | "can_access_admin"> | null | undefined,
  adminPath: string,
): boolean {
  if (!canAccessAdmin(me)) return false;
  const rel = adminPath.replace(/^\/+/, "").replace(/^admin\/?/, "");
  if (!rel || rel === "") return true;
  for (const rule of ADMIN_ROUTE_PERMS) {
    if (typeof rule.match === "string" ? rel.startsWith(rule.match) : rule.match.test(rel)) {
      return hasPerm(me, rule.perm);
    }
  }
  return canAccessAdmin(me);
}
