export type DictItem = { id: string; name_az?: string | null; code?: string | null; name?: string | null };

export type InstitutionLookups = {
  order_types: DictItem[];
  order_forms: DictItem[];
  order_statuses: DictItem[];
  education_levels: DictItem[];
  genders: DictItem[];
  education_types: DictItem[];
  payment_types: DictItem[];
  education_langs: DictItem[];
  student_statuses: DictItem[];
  staff_types: DictItem[];
  positions: DictItem[];
  contract_types: DictItem[];
  in_actions: DictItem[];
  departments: { id: string; name_az?: string | null; faculty_name_az?: string | null }[];
  organizations: { id: string; name_az?: string | null; faculty_name_az?: string | null }[];
  groups: { id: string; name?: string | null; education_year_name?: string | null; specialty_name_az?: string | null }[];
  orders: { id: string; serial?: string | null; order_date?: string | null; type_name_az?: string | null }[];
  education_years: { id: string; name?: string | null }[];
  tutors: { id: string; name?: string | null }[];
};

export type SubjectCatalogTopic = {
  id: string;
  subject_catalog_id: string;
  lesson_type_id: string | null;
  lesson_type_az: string | null;
  topic: string | null;
};

export type SubjectCatalogTopicsData = {
  catalog: {
    id: string;
    subject_name_az?: string | null;
    department_name_az?: string | null;
    department_id?: string | null;
  };
  lesson_types: DictItem[];
  items: SubjectCatalogTopic[];
  total: number;
  limit: number;
  offset: number;
};

export type UserRoleListItem = {
  person_id: string;
  fullname: string | null;
  pincode: string | null;
  username: string | null;
  user_type: string | null;
  user_type_label: string;
  department_name_az: string | null;
  has_student: boolean;
  has_teacher: boolean;
};

export type UserRoleDetail = {
  person_id: string;
  fullname: string | null;
  firstname?: string | null;
  lastname?: string | null;
  patronymic?: string | null;
  pincode: string | null;
  gender_name_az?: string | null;
  account_id: string | null;
  username: string | null;
  user_id: string | null;
  user_type: string | null;
  user_type_label: string;
  is_blocked?: number;
  department_id: string | null;
  department_name_az: string | null;
  faculty_name_az: string | null;
  student_id: string | null;
  teacher_id: string | null;
  staff_type_id?: string | null;
  position_id?: string | null;
  contract_type_id?: string | null;
  in_action_id?: string | null;
  has_login: boolean;
  must_change_password?: boolean;
  notes: string[];
};

export function pageList(current: number, last: number) {
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
}

export function dictLabel(item?: { name_az?: string | null; name?: string | null; id?: string } | null) {
  return item?.name_az || item?.name || item?.id || "—";
}
