export type BookingBusiness = Readonly<{ id: string; name: string }>;
export type BookingService = Readonly<{ id: string; name: string; durationMinutes: number; active: boolean }>;
export type BookingSlot = Readonly<{ startTime: string; available: boolean }>;

export type BookingDraft = Readonly<{
  business: BookingBusiness | null;
  service: Pick<BookingService, 'id' | 'name' | 'durationMinutes'> | null;
  date: string | null;
  startTime: string | null;
  estimatedEndTime: string | null;
  remark: string;
}>;

export type BookingCreateResult = Readonly<{
  businessName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING';
  remark: string | null;
}>;

export type BookingCreateRequest = Readonly<{
  businessId: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  title: string;
  remark: string;
}>;
