import React, { useState } from 'react';
import { api } from '../api';

interface ServiceForm {
  name: string;
  duration: string;
}

export interface ServiceItem {
  id: string | number;
  name: string;
  duration: string | number;
  active?: boolean;
}

interface Params {
  load: () => Promise<void>;
  setSuccessMessage: (message: string) => void;
  setErrorMessage: (message: string) => void;
}

export function useServiceManagement({ load, setSuccessMessage, setErrorMessage }: Params) {
  const [form, setForm] = useState<ServiceForm>({ name: '', duration: '' });
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<ServiceForm>({ name: '', duration: '' });
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    try {
      await api.addServiceItem({ name: form.name, duration: Number(form.duration) });
      setSuccessMessage('服務項目新增成功');
      setForm({ name: '', duration: '' });
      await load();
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '服務項目新增失敗');
    }
  };

  const startEdit = (item: ServiceItem) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, duration: String(item.duration) });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', duration: '' });
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (id: string | number) => {
    try {
      setBusyId(id);
      await api.modifyServiceItem(id, {
        name: editForm.name,
        duration: Number(editForm.duration)
      });
      setSuccessMessage('服務項目更新成功');
      setEditingId(null);
      await load();
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '服務項目更新失敗');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!globalThis.confirm('確定要刪除此服務項目嗎？')) return;
    try {
      setBusyId(id);
      await api.deleteServiceItem(id);
      setSuccessMessage('服務項目刪除成功');
      await load();
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '服務項目刪除失敗');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (item: ServiceItem) => {
    const nextActive = !item.active;
    try {
      setBusyId(item.id);
      if (nextActive) {
        await api.serviceOn(item.id);
        setSuccessMessage('服務項目啟用成功');
      } else {
        await api.serviceOff(item.id);
        setSuccessMessage('服務項目停用成功');
      }
      await load();
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '服務狀態切換失敗');
    } finally {
      setBusyId(null);
    }
  };

  return {
    form,
    setForm,
    editingId,
    editForm,
    busyId,
    handleChange,
    handleSubmit,
    startEdit,
    cancelEdit,
    handleEditChange,
    handleSave,
    handleDelete,
    handleToggle
  };
}
