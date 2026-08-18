export type RoleName =
  | "Admin"
  | "Doctor"
  | "Nurse"
  | "Lab Technician"
  | "Pharmacist"
  | "Receptionist"
  | "Accountant";

export type UUID = string;

export interface RoleRecord {
  id: UUID;
  clinic: UUID;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SessionUser {
  id: UUID;
  clinic: UUID;
  email: string;
  phone: string;
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean;
  role_names: RoleName[];
  created_at?: string;
  updated_at?: string;
}

export interface Clinic {
  id: UUID;
  code: string;
  name: string;
  registration_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Department extends BaseResource {
  name: string;
  code: string;
}

export interface PractitionerProfile {
  id: UUID;
  clinic: UUID;
  user: UUID;
  license_number: string;
  specialty: string;
  qualifications: string;
  signature_file: string | null;
  is_verified: boolean;
  is_active: boolean;
  photo: string | null;
  bio: string;
  department: UUID | null;
  public_slug: string | null;
  is_online: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BillingReport {
  total_invoices: number;
  total_revenue: string;
  avg_invoice: string;
  by_status: { status: string; count: number; revenue: string | null }[];
  by_payment_method: { payment_method: string; count: number; total: string | null }[];
}

export interface JwtTokenPair {
  access: string;
  refresh: string;
}

export interface AuthEnvelope extends JwtTokenPair {
  user: SessionUser;
}

export interface BaseResource {
  id: UUID;
  clinic: UUID;
  created_at: string;
  updated_at: string;
  created_by: UUID | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
}

export interface Patient extends BaseResource {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | "unknown";
  phone: string;
  email: string;
  national_id: string;
  sha_number: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface PatientAlert extends BaseResource {
  patient: UUID;
  alert_type: "allergy" | "medication" | "clinical" | "administrative" | "other";
  severity: "info" | "warning" | "critical";
  message: string;
  flagged_by: UUID | null;
}

export interface PatientDocument extends BaseResource {
  patient: UUID;
  document_type: "report" | "scan" | "form" | "referral" | "consent" | "other";
  title: string;
  description: string;
  file: string;
  file_url: string | null;
  is_finalised: boolean;
}

export interface PatientIdentifier extends BaseResource {
  patient: UUID;
  identifier_type: "national_id" | "sha" | "passport";
  identifier_value: string;
}

export interface Allergy extends BaseResource {
  patient: UUID;
  substance: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe";
}

export interface ChronicCondition extends BaseResource {
  patient: UUID;
  diagnosis: string;
  icd10_code: string;
  diagnosed_date: string | null;
}

export interface Appointment extends BaseResource {
  patient: UUID;
  practitioner: UUID;
  scheduled_time: string;
  encounter_type: "in_person" | "video" | "audio";
  status: "scheduled" | "cancelled" | "completed";
}

export interface AvailabilitySlot extends BaseResource {
  practitioner: UUID;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface Encounter extends BaseResource {
  patient: UUID;
  practitioner: UUID;
  appointment: UUID | null;
  encounter_type: "in_person" | "video" | "audio";
  triage_score: number | null;
  triage_level: "green" | "yellow" | "orange" | "red";
  physical_escalation_required: boolean;
  status: "active" | "completed" | "cancelled";
  start_time: string;
  end_time: string | null;
}

export interface ClinicalNote extends BaseResource {
  encounter: UUID;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Diagnosis extends BaseResource {
  encounter: UUID;
  icd10_code: string;
  description: string;
  is_primary: boolean;
}

export interface Observation extends BaseResource {
  encounter: UUID;
  loinc_code: string;
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  abnormal_flag: string;
}

export interface Medication extends BaseResource {
  name: string;
  generic_name: string;
  strength: string;
  dosage_form: string;
  manufacturer: string;
  unit_price: string;
  reorder_level: number;
  is_controlled: boolean;
  is_available: boolean;
}

export interface StockBatch extends BaseResource {
  medication: UUID;
  batch_number: string;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
}

export interface Prescription extends BaseResource {
  encounter: UUID;
  prescribed_by: UUID;
  status: "active" | "dispensed" | "cancelled";
  hash_signature: string;
}

export interface PrescriptionItem extends BaseResource {
  prescription: UUID;
  medication: UUID;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
}

export interface LabTest extends BaseResource {
  name: string;
  loinc_code: string;
  price: string;
  sample_type: string;
}

export interface LabOrder extends BaseResource {
  encounter: UUID;
  ordered_by: UUID;
  status: "ordered" | "collected" | "processing" | "completed";
  priority: "routine" | "urgent" | "stat";
}

export interface LabOrderItem extends BaseResource {
  lab_order: UUID;
  lab_test: UUID;
}

export interface LabResult extends BaseResource {
  lab_order_item: UUID;
  result_value: string;
  unit: string;
  reference_range: string;
  abnormal_flag: string;
  verified_by: UUID | null;
  verified_at: string | null;
}

export interface ServiceCatalogue extends BaseResource {
  name: string;
  code: string;
  price: string;
  category: "consultation" | "lab_test" | "medication" | "other";
}

export interface Invoice extends BaseResource {
  encounter: UUID | null;
  patient: UUID;
  total_amount: string;
  status: "draft" | "unpaid" | "paid" | "void";
  due_date: string | null;
}

export interface Payment extends BaseResource {
  invoice: UUID;
  amount: string;
  payment_method: "mpesa" | "cash" | "card";
  mpesa_receipt_number: string;
  phone_number: string;
  status: "pending" | "successful" | "failed";
  transaction_date: string;
  callback_payload: Record<string, unknown>;
}

export interface TelemedicineSession extends BaseResource {
  patient: UUID;
  encounter: UUID;
  session_type: "video" | "chat";
  session_link: string;
  status: string;
  start_time: string;
  end_time: string | null;
}

export interface ChatSessionState extends BaseResource {
  patient_phone: string;
  current_state: string;
  last_interaction_at: string;
  encounter: UUID | null;
}

export interface Booking extends BaseResource {
  patient: UUID;
  appointment: UUID | null;
  assigned_practitioner: UUID | null;
  booking_number: string;
  booking_type: "walk_in" | "scheduled" | "telemedicine";
  source: "reception" | "public_portal" | "call_center" | "internal_referral";
  encounter_type: "in_person" | "video" | "audio";
  priority: "routine" | "urgent" | "emergency";
  status:
    | "pending"
    | "confirmed"
    | "arrived"
    | "waiting_triage"
    | "in_triage"
    | "waiting_consultation"
    | "in_consultation"
    | "awaiting_disposition"
    | "waiting_lab"
    | "in_lab"
    | "waiting_pharmacy"
    | "in_pharmacy"
    | "waiting_billing"
    | "not_paid"
    | "ready_for_checkout"
    | "completed"
    | "cancelled"
    | "no_show";
  payment_status: "not_paid" | "partially_paid" | "paid";
  triage_required: boolean;
  reason_for_visit: string;
  notes: string;
  scheduled_time: string | null;
  arrival_time: string | null;
  check_in_time: string | null;
  triage_start_time: string | null;
  triage_end_time: string | null;
  consultation_start_time: string | null;
  consultation_end_time: string | null;
  checkout_time: string | null;
}

export interface BookingEvent extends BaseResource {
  booking: UUID;
  event_type: string;
  from_status: string;
  to_status: string;
  occurred_at: string;
  performed_by: UUID | null;
  notes: string;
  payload: Record<string, unknown>;
}

export interface BookingQueue extends BaseResource {
  booking: UUID;
  queue_type: "reception" | "triage" | "consultation" | "laboratory" | "pharmacy" | "billing";
  status: "waiting" | "called" | "in_progress" | "completed" | "cancelled";
  position: number | null;
  assigned_practitioner: UUID | null;
  assigned_user: UUID | null;
  entered_at: string;
  called_at: string | null;
  completed_at: string | null;
}

export interface BookingSummary {
  total_bookings: number;
  active_bookings: number;
  completed_today: number;
  by_status: Array<{ status: string; count: number }>;
  by_payment_status: Array<{ payment_status: string; count: number }>;
  average_wait_time: string | null;
  average_turnaround_time: string | null;
  open_queues: Array<{ queue_type: string; count: number }>;
}

export interface AppModuleSummary {
  title: string;
  href: string;
  description: string;
  accent: string;
}

export interface ComplianceRecord extends BaseResource {
  resource_type: string;
  resource_id: UUID;
  flag_reason: string;
  status: "open" | "resolved" | "dismissed";
  reviewed_by: UUID | null;
  reviewed_at: string | null;
}

export interface AuditLog extends BaseResource {
  user: UUID | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW";
  model_name: string;
  object_id: string;
  before_snapshot: Record<string, unknown>;
  after_snapshot: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

export interface Policy extends BaseResource {
  title: string;
  category: string;
  body: string;
  version: string;
  effective_date: string;
  expiry_date: string | null;
  status: "draft" | "active" | "archived";
}

export interface PolicyVersion extends BaseResource {
  policy: UUID;
  version_label: string;
  title: string;
  category: string;
  body: string;
  status: string;
  effective_date: string | null;
  expiry_date: string | null;
  changed_by: UUID | null;
}
