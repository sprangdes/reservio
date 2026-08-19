import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useToast } from '../state/ToastContext';
import CustomerWorkspaceHeader from '../features/customer-workspace/CustomerWorkspaceHeader';
import ToastContainer from '../components/ToastContainer';

type Business = {
  id: number;
  name: string;
  category?: string;
};

const mergePreferredBusinessIds = (currentIds: number[], preferredBusinesses: Business[]) => {
  const merged = new Set<number>(currentIds);
  preferredBusinesses.forEach((item) => merged.add(Number(item.id)));
  return Array.from(merged);
};

interface PreferredBusinessesPanelProps {
  onCancel?: () => void;
  onSaved?: () => void;
}

export function PreferredBusinessesPanel({ onCancel, onSaved }: Readonly<PreferredBusinessesPanelProps>) {
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [businessesByCategory, setBusinessesByCategory] = useState<Record<string, Business[]>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const categoryRes = await api.businessCategories();
        const categoryList = (categoryRes?.data || []) as string[];
        setCategories(categoryList);
        if (categoryList.length > 0) {
          setActiveCategory(categoryList[0]);
        }
      } catch (err) {
        const error = err as Error;
        setErrorMessage(error.message || '載入偏好店家設定失敗');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [setErrorMessage]);

  useEffect(() => {
    if (!activeCategory) {
      return;
    }

    const loadCategoryData = async () => {
      try {
        setCategoryLoading(true);
        const [businessRes, preferredRes] = await Promise.all([
          api.businessesByCategory(activeCategory),
          api.getPreferredBusinesses()
        ]);
        const businessList = (businessRes?.data || []) as Business[];
        const preferredList = (preferredRes?.data || []) as Business[];
        setBusinessesByCategory((prev) => ({ ...prev, [activeCategory]: businessList }));
        setSelectedIds((prev) => mergePreferredBusinessIds(prev, preferredList));
      } catch (err) {
        const error = err as Error;
        setErrorMessage(error.message || '載入分類店家失敗');
      } finally {
        setCategoryLoading(false);
      }
    };

    void loadCategoryData();
  }, [activeCategory, setErrorMessage]);

  const activeBusinesses = useMemo(
    () => businessesByCategory[activeCategory] || [],
    [activeCategory, businessesByCategory]
  );

  const toggleBusiness = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.setPreferredBusinesses({ preferredBusinesses: selectedIds });
      setSuccessMessage('想預約店家已儲存');
      onSaved?.();
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  let categoryContent = <div className="preferred-businesses-panel__state is-warning">目前沒有可用的商家分類</div>;
  if (categoryLoading) {
    categoryContent = <div className="preferred-businesses-panel__state">載入分類店家中...</div>;
  } else if (activeBusinesses.length === 0 && categories.length > 0) {
    categoryContent = <div className="preferred-businesses-panel__state">此分類目前沒有店家</div>;
  } else if (categories.length > 0) {
    categoryContent = (
      <div className="row g-3 preferred-businesses-panel__list">
        {activeBusinesses.map((business) => {
          const checked = selectedIds.includes(Number(business.id));
          return (
            <div className="col-md-6" key={business.id}>
              <button
                type="button"
                aria-pressed={checked}
                className={`card h-100 w-100 text-start border shadow-sm preferred-business-card ${checked ? 'preferred-business-card--selected' : 'border-light'}`}
                onClick={() => toggleBusiness(Number(business.id))}
              >
                <div className="card-body d-flex justify-content-between align-items-center">
                  <span className="fw-bold">{business.name}</span>
                  <span className="preferred-business-card__selection"><i className={`bi ${checked ? 'bi-check-lg' : 'bi-plus-lg'}`} aria-hidden="true" />{checked ? '已選取' : '加入偏好'}</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="preferred-businesses-panel">
      <div className="preferred-businesses-panel__intro">
        <p>選取後，建立預約時只顯示你想預約的店家。</p>
        <strong aria-live="polite">已選擇 {selectedIds.length} 間</strong>
      </div>
      <div className="settings-panel-section">
        {loading ? (
          <div className="preferred-businesses-panel__state">載入中...</div>
        ) : (
          <>
            <div className="preferred-category-tabs mb-4" role="tablist" aria-label="店家分類">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  role="tab"
                  aria-selected={activeCategory === category}
                  className={`preferred-category-tab ${activeCategory === category ? 'preferred-category-tab--active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            {categoryContent}
          </>
        )}
      </div>
      <div className="preferred-businesses-panel__actions">
        {onCancel ? (
          <button type="button" className="preferred-businesses-panel__cancel" onClick={onCancel}>
            返回
          </button>
        ) : <span />}
        <button type="button" className="btn btn-gradient fw-bold px-4 preferred-businesses-panel__save" onClick={handleSave} disabled={loading || categoryLoading || saving}>
          {saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>
    </div>
  );
}

export default function PreferredBusinessesPage() {
  return (
    <main className="customer-preferences-workspace">
      <CustomerWorkspaceHeader title="想預約店家" />
      <section className="customer-preferences-workspace__content" aria-labelledby="preferred-businesses-title">
        <header className="customer-preferences-workspace__header">
          <p>預約偏好</p>
          <h1 id="preferred-businesses-title">管理想預約店家</h1>
          <span>選擇你想在建立預約時優先看到的店家。</span>
        </header>
        <div className="customer-preferences-workspace__panel">
          <PreferredBusinessesPanel />
        </div>
      </section>
      <ToastContainer />
    </main>
  );
}
