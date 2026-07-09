import { djangoRequest } from "@/lib/api/http";
import type {
  ApiListResponse,
  Booking,
  BookingEvent,
  BookingQueue,
  BookingSummary,
  Encounter,
  Invoice,
} from "@/lib/types";

export async function listBookings(params?: {
  search?: string;
  status?: string;
  payment_status?: string;
  booking_type?: string;
  priority?: string;
  ordering?: string;
}) {
  return djangoRequest<ApiListResponse<Booking>>("/api/booking/bookings/", {
    query: {
      ordering: params?.ordering ?? "-created_at",
      ...params,
    },
  });
}

export async function getBooking(id: string) {
  return djangoRequest<Booking>(`/api/booking/bookings/${id}/`);
}

export async function listBookingEvents(id: string) {
  return djangoRequest<ApiListResponse<BookingEvent>>(`/api/booking/bookings/${id}/events/`);
}

export async function listBookingQueues(id: string) {
  return djangoRequest<ApiListResponse<BookingQueue>>(`/api/booking/bookings/${id}/queues/`);
}

export async function listBookingEncounters(id: string) {
  return djangoRequest<ApiListResponse<Encounter>>(`/api/booking/bookings/${id}/encounters/`);
}

export async function listBookingInvoices(id: string) {
  return djangoRequest<ApiListResponse<Invoice>>(`/api/booking/bookings/${id}/invoices/`);
}

export async function listQueueBoard(queueType?: string) {
  return djangoRequest<ApiListResponse<BookingQueue>>("/api/booking/bookings/queue-board/", {
    query: {
      queue_type: queueType,
    },
  });
}

export async function getBookingSummary() {
  return djangoRequest<BookingSummary>("/api/booking/bookings/reports/summary/");
}
