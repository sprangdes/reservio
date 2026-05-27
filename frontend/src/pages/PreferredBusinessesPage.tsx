import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../state/ToastContext';

type Business = {
  id: number;
  name: string;
  category?: string;
};

export default function PreferredBusinessesPage() {
  const { setSuccessMessage, setErrorMessage } = useToast();
  const navigate = useNavigate();
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
        setSelectedIds((prev) => {
          const merged = new Set<number>(prev);
          preferredList.forEach((item) => merged.add(Number(item.id)));
          return Array.from(merged);
        });
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
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-gradient text-white text-white-strong p-4">
                <h4 className="mb-0 fw-bold"><i className="bi bi-bookmark-heart me-2"></i>管理想預約店家</h4>
                <p className="mb-0 mt-2 opacity-75">選取後，建立預約時只顯示你想預約的店家</p>
              </div>
              <div className="card-body p-4">
                {loading ? (
                  <div className="text-center py-5 text-muted">載入中...</div>
                ) : (
                  <>
                    <ul className="nav nav-tabs mb-4">
                      {categories.map((category) => (
                        <li className="nav-item" key={category}>
                          <button
                            type="button"
                            className={`nav-link ${activeCategory === category ? 'active' : ''}`}
                            onClick={() => setActiveCategory(category)}
                          >
                            {category}
                          </button>
                        </li>
                      ))}
                    </ul>

                    {categories.length === 0 ? (
                      <div className="alert alert-warning mb-0">目前沒有可用的商家分類</div>
                    ) : categoryLoading ? (
                      <div className="text-center py-4 text-muted">載入分類店家中...</div>
                    ) : activeBusinesses.length === 0 ? (
                      <div className="alert alert-light border mb-0">此分類目前沒有店家</div>
                    ) : (
                      <div className="row g-3">
                        {activeBusinesses.map((business) => {
                          const checked = selectedIds.includes(Number(business.id));
                          return (
                            <div className="col-md-6" key={business.id}>
                              <button
                                type="button"
                                className={`card h-100 w-100 text-start border shadow-sm ${checked ? 'border-primary bg-primary-subtle' : 'border-light'}`}
                                onClick={() => toggleBusiness(Number(business.id))}
                              >
                                <div className="card-body d-flex justify-content-between align-items-center">
                                  <div className="fw-bold">{business.name}</div>
                                  {checked ? <span className="badge text-bg-primary">已選取</span> : null}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
                <button type="button" className="btn btn-link text-muted text-decoration-none" onClick={() => navigate(-1)}>
                  <i className="bi bi-arrow-left me-1"></i>返回
                </button>
                <button type="button" className="btn btn-gradient fw-bold px-4" onClick={handleSave} disabled={loading || categoryLoading || saving}>
                  {saving ? '儲存中...' : '儲存設定'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
