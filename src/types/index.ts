export type InspectionStatus = 'pass' | 'warning' | 'fail';

export interface Store {
  id: string;
  name: string;
  report_emails: string[];
  warning_emails: string[];
  overdue_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  zone: string;
  order: number;
  label: string;
  active: boolean;
}

export interface Inspection {
  id: string;
  store_id: string;
  inspector_email: string;
  submitted_at: string;
  pdf_url: string | null;
  stores?: Store;
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  item_id: string;
  status: InspectionStatus;
  photo_url: string | null;
  notes: string | null;
  checklist_items?: ChecklistItem;
}

export interface InspectionFormItem {
  itemId: string;
  status: InspectionStatus | null;
  photoUrl: string | null;
  notes: string;
}

export interface ZoneGroup {
  zone: string;
  items: ChecklistItem[];
}
