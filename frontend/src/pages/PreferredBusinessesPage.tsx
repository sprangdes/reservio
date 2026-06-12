import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../state/ToastContext';

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

  let categoryContent = <div className="alert alert-warning mb-0">目前沒有可用的商家分類</div>;
  if (categoryLoading) {
    categoryContent = <div className="text-center py-4 text-muted">載入分類店家中...</div>;
  } else if (activeBusinesses.length === 0 && categories.length > 0) {
    categoryContent = <div className="alert alert-light border mb-0">此分類目前沒有店家</div>;
  } else if (categories.length > 0) {
    categoryContent = (
      <div className="row g-3">
        {activeBusinesses.map((business) => {
          const checked = selectedIds.includes(Number(business.id));
          return (
            <div className="col-md-6" key={business.id}>
              <button
                type="button"
                className={`card h-100 w-100 text-start border shadow-sm preferred-business-card ${checked ? 'preferred-business-card--selected' : 'border-light'}`}
                onClick={() => toggleBusiness(Number(business.id))}
              >
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div className="fw-bold">{business.name}</div>
                  {checked ? <span className="badge preferred-business-card__badge">已選取</span> : null}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <p className="text-muted mb-4">選取後，建立預約時只顯示你想預約的店家。</p>
      <div className="settings-panel-section">
        {loading ? (
          <div className="text-center py-5 text-muted">載入中...</div>
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
      <div className="d-flex justify-content-between align-items-center mt-4">
        {onCancel ? (
          <button type="button" className="btn btn-link text-muted text-decoration-none" onClick={onCancel}>
            取消
          </button>
        ) : <span />}
        <button type="button" className="btn btn-gradient fw-bold px-4" onClick={handleSave} disabled={loading || categoryLoading || saving}>
          {saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>
    </>
  );
}

export default function PreferredBusinessesPage() {
  const navigate = useNavigate();

  return (
    <main>
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-gradient text-white text-white-strong p-4">
                <h4 className="mb-0 fw-bold"><i className="bi bi-bookmark-heart me-2"></i>管理想預約店家</h4>
              </div>
              <div className="card-body p-4">
                <PreferredBusinessesPanel onCancel={() => navigate(-1)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
