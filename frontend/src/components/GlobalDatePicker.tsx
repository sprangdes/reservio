import { useEffect } from 'react';

type FlatpickrInstance = { destroy: () => void };
type FlatpickrFactory = (target: HTMLInputElement, options: Record<string, unknown>) => FlatpickrInstance;
type ReactTrackedInput = HTMLInputElement & { _valueTracker?: { setValue: (value: string) => void } };

export default function GlobalDatePicker() {
  useEffect(() => {
    const flatpickr = (globalThis as { flatpickr?: FlatpickrFactory }).flatpickr;
    if (!flatpickr) return;
    const instances = new Map<HTMLInputElement, FlatpickrInstance>();
    const enhance = (input: HTMLInputElement) => {
      if (instances.has(input) || input.disabled) return;
      const picker = flatpickr(input, {
        dateFormat: 'Y-m-d', allowInput: true, disableMobile: true,
        minDate: input.min || undefined, maxDate: input.max || undefined,
        calendarClass: 'app-date-picker',
        onChange: (_dates: Date[], dateValue: string) => {
          if (input.value !== dateValue) input.value = dateValue;
          (input as ReactTrackedInput)._valueTracker?.setValue('');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      instances.set(input, picker);
    };
    const scan = (root: ParentNode = document) => root.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach(enhance);
    scan();
    const observer = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches('input[type="date"]')) enhance(node as HTMLInputElement);
      scan(node);
    })));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); instances.forEach((picker) => picker.destroy()); };
  }, []);
  return null;
}
