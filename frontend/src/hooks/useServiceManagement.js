import { useState } from 'react';
import { api } from '../api.js';

export function useServiceManagement({ load, setSuccessMessage, setErrorMessage }) {
    const [form, setForm] = useState({ name: '', duration: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', duration: '' });
    const [busyId, setBusyId] = useState(null);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await api.addServiceItem({ name: form.name, duration: Number(form.duration) });
            setSuccessMessage('服務項目新增成功');
            setForm({ name: '', duration: '' });
            await load();
        } catch (err) {
            setErrorMessage(err.message || '服務項目新增失敗');
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ name: item.name, duration: String(item.duration) });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: '', duration: '' });
    };

    const handleEditChange = (event) => {
        const { name, value } = event.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (id) => {
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
            setErrorMessage(err.message || '服務項目更新失敗');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!globalThis.confirm('確定要刪除此服務項目嗎？')) {
            return;
        }

        try {
            setBusyId(id);
            await api.deleteServiceItem(id);
            setSuccessMessage('服務項目刪除成功');
            await load();
        } catch (err) {
            setErrorMessage(err.message || '服務項目刪除失敗');
        } finally {
            setBusyId(null);
        }
    };

    const handleToggle = async (item) => {
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
            setErrorMessage(err.message || '服務狀態切換失敗');
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