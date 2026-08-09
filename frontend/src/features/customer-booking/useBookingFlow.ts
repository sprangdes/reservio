import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { emptyBookingDraft, selectBookingBusiness, selectBookingDate, selectBookingService } from './bookingDraft';
import { addMinutesToTime, isLocalDate } from './bookingDates';
import type { BookingBusiness, BookingDraft, BookingService, BookingSlot } from './domain';
import { normalizeBusiness, normalizeDisabledDates, normalizeService, normalizeSlots } from './normalizers';
import { createRequestGuard, isIntentionalAbort } from './requestGuards';

type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

function responseData(value: unknown): unknown {
  return value && typeof value === 'object' && 'data' in value ? (value as { data: unknown }).data : value;
}

export function useBookingFlow() {
  const [draft, setDraft] = useState<BookingDraft>(emptyBookingDraft);
  const [businesses, setBusinesses] = useState<BookingBusiness[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [businessState, setBusinessState] = useState<LoadState>('loading');
  const [serviceState, setServiceState] = useState<LoadState>('idle');
  const [disabledDateState, setDisabledDateState] = useState<LoadState>('idle');
  const [slotState, setSlotState] = useState<LoadState>('idle');
  const businessGuard = useRef(createRequestGuard());
  const serviceGuard = useRef(createRequestGuard());
  const disabledDateGuard = useRef(createRequestGuard());
  const slotGuard = useRef(createRequestGuard());

  const loadBusinesses = useCallback(async () => {
    const request = businessGuard.current.begin();
    setBusinessState('loading');
    try {
      const response = await api.getPreferredBusinesses({ signal: request.signal });
      if (!businessGuard.current.isCurrent(request)) return;
      const rawItems = responseData(response);
      const items = Array.isArray(rawItems) ? rawItems.flatMap((value) => normalizeBusiness(value) ? [normalizeBusiness(value) as BookingBusiness] : []) : [];
      setBusinesses(items);
      setBusinessState(items.length ? 'ready' : 'empty');
    } catch (error) {
      if (!businessGuard.current.isCurrent(request) || isIntentionalAbort(error)) return;
      setBusinessState('error');
    }
  }, []);

  const loadServices = useCallback(async (businessId: string) => {
    const request = serviceGuard.current.begin();
    setServiceState('loading');
    try {
      const response = await api.businessServices(businessId, { signal: request.signal });
      if (!serviceGuard.current.isCurrent(request)) return;
      const rawItems = responseData(response);
      const items = Array.isArray(rawItems) ? rawItems.flatMap((value) => normalizeService(value) ? [normalizeService(value) as BookingService] : []).filter((service) => service.active) : [];
      setServices(items);
      setServiceState(items.length ? 'ready' : 'empty');
    } catch (error) {
      if (!serviceGuard.current.isCurrent(request) || isIntentionalAbort(error)) return;
      setServices([]);
      setServiceState('error');
    }
  }, []);

  const loadDisabledDates = useCallback(async (businessId: string) => {
    const request = disabledDateGuard.current.begin();
    setDisabledDateState('loading');
    try {
      const response = await api.disabledDates(businessId, { signal: request.signal });
      if (!disabledDateGuard.current.isCurrent(request)) return;
      setDisabledDates(normalizeDisabledDates(responseData(response)));
      setDisabledDateState('ready');
    } catch (error) {
      if (!disabledDateGuard.current.isCurrent(request) || isIntentionalAbort(error)) return;
      setDisabledDates([]);
      setDisabledDateState('error');
    }
  }, []);

  const loadSlots = useCallback(async (currentDraft: BookingDraft) => {
    if (!currentDraft.business || !currentDraft.service || !isLocalDate(currentDraft.date)) return;
    const request = slotGuard.current.begin();
    setSlotState('loading');
    try {
      const response = await api.slots(currentDraft.date, currentDraft.service.durationMinutes, currentDraft.business.id, { signal: request.signal });
      if (!slotGuard.current.isCurrent(request)) return;
      const items = normalizeSlots(responseData(response));
      setSlots(items);
      setSlotState(items.some((slot) => slot.available) ? 'ready' : 'empty');
    } catch (error) {
      if (!slotGuard.current.isCurrent(request) || isIntentionalAbort(error)) return;
      setSlots([]);
      setSlotState('error');
    }
  }, []);

  useEffect(() => { void loadBusinesses(); return () => businessGuard.current.dispose(); }, [loadBusinesses]);
  useEffect(() => () => { serviceGuard.current.dispose(); disabledDateGuard.current.dispose(); slotGuard.current.dispose(); }, []);

  const selectBusiness = useCallback((business: BookingBusiness) => {
    slotGuard.current.abort();
    setServices([]); setDisabledDates([]); setSlots([]); setServiceState('loading'); setDisabledDateState('loading'); setSlotState('idle');
    setDraft((current) => selectBookingBusiness(current, business));
    void loadServices(business.id); void loadDisabledDates(business.id);
  }, [loadDisabledDates, loadServices]);

  const selectService = useCallback((service: BookingService) => {
    slotGuard.current.abort(); setSlots([]); setSlotState('idle');
    setDraft((current) => selectBookingService(current, service));
  }, []);

  const selectDate = useCallback((date: string) => {
    slotGuard.current.abort(); setSlots([]); setSlotState('idle');
    setDraft((current) => selectBookingDate(current, date));
  }, []);

  useEffect(() => { if (draft.business && draft.service && draft.date) void loadSlots(draft); }, [draft.business?.id, draft.service?.id, draft.service?.durationMinutes, draft.date, loadSlots]);

  const selectSlot = useCallback((slot: BookingSlot) => {
    if (!slot.available || !draft.service) return;
    const estimatedEndTime = addMinutesToTime(slot.startTime, draft.service.durationMinutes);
    if (!estimatedEndTime) return;
    setDraft((current) => ({ ...current, startTime: slot.startTime, estimatedEndTime }));
  }, [draft.service]);

  return {
    draft, businesses, services, disabledDates, slots, businessState, serviceState, disabledDateState, slotState,
    selectBusiness, selectService, selectDate, selectSlot,
    retryBusinesses: loadBusinesses,
    retryServices: () => draft.business && loadServices(draft.business.id),
    retryDisabledDates: () => draft.business && loadDisabledDates(draft.business.id),
    retrySlots: () => loadSlots(draft)
  };
}
